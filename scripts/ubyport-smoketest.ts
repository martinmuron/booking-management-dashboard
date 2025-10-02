import 'dotenv/config';

import { ubyPortService } from '@/services/ubyport.service';

type AnyService = Record<string, unknown>;

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
  Ubytovani: Array<Record<string, unknown>>;
};

async function main() {
  const service = ubyPortService as AnyService;
  const getAccommodationInfo = service.getAccommodationInfo as (() => AccommodationPayload) | undefined;
  const submitToUbyPortApi = service.submitToUbyPortApi as ((payload: AccommodationPayload) => Promise<unknown>) | undefined;

  if (!getAccommodationInfo || !submitToUbyPortApi) {
    throw new Error('Unable to access UbyPort internals for smoke test');
  }

  const base = getAccommodationInfo.call(ubyPortService);

  const now = new Date();
  const arrival = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const departure = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const toLocalIso = (date: Date) => {
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
  };

  const guest = {
    cDate: '05041992',
    cDocN: 'TESTDOC1234',
    cFirstN: 'Test',
    cFrom: toLocalIso(arrival),
    cNati: 'SVK',
    cNote: 'SMOKE TEST AUTOMATION',
    cPurp: '01',
    cResi: 'Fiktivní 321, Bratislava, SVK',
    cSurN: 'Testerová',
    cUntil: toLocalIso(departure)
  };

  const request: AccommodationPayload = {
    ...base,
    VracetPDF: true,
    Ubytovani: [guest]
  };

  console.log('Submitting fabricated payload to UbyPort...');
  const response = await submitToUbyPortApi.call(ubyPortService, request);
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error('UbyPort smoke test failed:', error);
  process.exitCode = 1;
});
