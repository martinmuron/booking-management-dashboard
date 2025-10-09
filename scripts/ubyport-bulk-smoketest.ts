import 'dotenv/config';

import { ubyPortService } from '@/services/ubyport.service';

type AnyService = Record<string, unknown>;

type SoapGuest = {
  cFrom: string;
  cUntil: string;
  cSurN: string;
  cFirstN: string;
  cDate: string;
  cNati: string;
  cDocN: string;
  cVisN?: string;
  cResi?: string;
  cPurp?: number;
  cNote?: string;
};

type AccommodationPayload = {
  VracetPDF: boolean;
  uIdub: string;
  uMark: string;
  uName: string;
  uCont: string;
  uOkr: string;
  uOb: string;
  uObCa?: string;
  uStr?: string;
  uHomN: string;
  uOriN?: string;
  uPsc: string;
  Ubytovani: SoapGuest[];
};

function assertAccess<T>(maybeFn: unknown, name: string): T {
  if (typeof maybeFn !== 'function') {
    throw new Error(`Unable to access ${name} from UbyPort service`);
  }
  return maybeFn as T;
}

function toLocalIso(date: Date): string {
  const tz = process.env.UBYPORT_TIME_ZONE || 'Europe/Prague';
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '00';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function formatBirthday(index: number): string {
  const baseYear = 1980 + (index % 30);
  const month = ((index % 12) + 1).toString().padStart(2, '0');
  const day = ((index % 28) + 1).toString().padStart(2, '0');
  return `${day}${month}${baseYear}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  const service = ubyPortService as unknown as AnyService;
  const getAccommodationInfo = assertAccess<() => AccommodationPayload>(service.getAccommodationInfo, 'getAccommodationInfo');
  const submitToUbyPortApi = assertAccess<(payload: AccommodationPayload) => Promise<unknown>>(service.submitToUbyPortApi, 'submitToUbyPortApi');

  const accommodationTemplate = getAccommodationInfo.call(ubyPortService);

  const now = new Date();
  const arrival = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 3 days ago
  const departure = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago

  const nationalities = [
    'SVK', 'POL', 'DEU', 'HUN', 'AUT', 'USA', 'GBR', 'FRA', 'ESP', 'ITA',
    'NLD', 'BEL', 'CHE', 'CAN', 'MEX', 'BRA', 'AUS', 'NZL', 'JPN', 'KOR',
    'CHN', 'IND', 'IRL', 'DNK', 'NOR', 'SWE', 'FIN', 'PRT', 'GRC', 'HRV'
  ];

  const residenceCities = [
    'Testville', 'Sample City', 'Mocktown', 'Faketon', 'Demo City', 'Placeholder Bay',
    'Alpha City', 'Beta Borough', 'Gamma Grove', 'Delta Downs'
  ];

  const guests: SoapGuest[] = [];
  for (let i = 0; i < 100; i += 1) {
    const suffix = String.fromCharCode('A'.charCodeAt(0) + (i % 26)) + String.fromCharCode('A'.charCodeAt(0) + Math.floor(i / 26));
    const firstName = `Testname${suffix}`;
    const lastName = `Testsurname${suffix}`;
    const nationality = nationalities[i % nationalities.length];
    const residenceCity = residenceCities[i % residenceCities.length];

    guests.push({
      cFrom: toLocalIso(arrival),
      cUntil: toLocalIso(departure),
      cSurN: lastName,
      cFirstN: firstName,
      cDate: formatBirthday(i),
      cNati: nationality,
      cDocN: `TSTDOC${(i + 1).toString().padStart(4, '0')}`,
      cResi: `${(100 + i)} Fictional Street, ${residenceCity}, ZZ`,
      cPurp: 99,
      cNote: 'BULK TEST - DO NOT PROCESS'
    });
  }

  const batches = chunk(guests, 32);
  console.log(`Prepared ${guests.length} synthetic guests in ${batches.length} batches.`);

  let processed = 0;
  for (const [index, batch] of batches.entries()) {
    const payload: AccommodationPayload = {
      ...accommodationTemplate,
      VracetPDF: true,
      Ubytovani: batch
    };

    console.log(`Submitting batch ${index + 1}/${batches.length} with ${batch.length} guests...`);
    const response = await submitToUbyPortApi.call(ubyPortService, payload);
    console.log(`Batch ${index + 1} response:`);
    console.log(JSON.stringify(response, null, 2));
    processed += batch.length;
  }

  console.log(`Completed submission of ${processed} guests.`);
}

main().catch((error) => {
  console.error('UbyPort bulk smoke test failed:', error);
  process.exitCode = 1;
});
