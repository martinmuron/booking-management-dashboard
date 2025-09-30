import { VirtualKeyType } from '@/types';
import { getNukiPropertyMapping } from '@/utils/nuki-properties-mapping';

const PRAGUE_TIMEZONE = 'Europe/Prague';
const DEFAULT_AUTHORIZATION_LIMIT = Number.parseInt(process.env.NUKI_AUTHORIZATION_LIMIT ?? '190', 10);
const LOOKUP_RETRY_SCHEDULE_MS = [0, 400, 900, 1800, 3200, 5000];
const AUTH_MATCH_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes drift tolerance

const pad = (value: number) => value.toString().padStart(2, '0');

const sleep = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));

const getPragueOffset = (date: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PRAGUE_TIMEZONE,
    hour12: false,
    timeZoneName: 'short'
  });

  const tzName = formatter
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value ?? 'GMT+00';

  const offsetMatch = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);

  if (!offsetMatch) {
    return '+00:00';
  }

  const sign = offsetMatch[1] ?? '+';
  const hours = pad(Number.parseInt(offsetMatch[2] ?? '0', 10));
  const minutes = pad(Number.parseInt(offsetMatch[3] ?? '0', 10));

  return `${sign}${hours}:${minutes}`;
};

const toPragueDateTime = (input: Date, hours: number, minutes: number): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRAGUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(input);
  const year = parts.find(part => part.type === 'year')?.value ?? '1970';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  const offset = getPragueOffset(input);

  return `${year}-${month}-${day}T${pad(hours)}:${pad(minutes)}:00${offset}`;
};

export interface NukiDevice {
  smartlockId: number;
  name: string;
  type: number;
  serverState: number; // 0 = online, 4 = offline
  state: number;
}

export interface NukiAuth {
  id: string;
  name: string;
  type: number;
  smartlockId: number;
  accountUserId?: string;
  code?: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  allowedWeekDays?: number;
}

export interface NukiAuthorization extends NukiAuth {
  typeName?: string;
  enabled?: boolean;
  creationDate?: string;
  lastActiveDate?: string;
}

export interface NukiCreateAuthRequest {
  name: string;
  type: number; // 0: App user, 13: Keypad code, 15: Virtual
  smartlockIds: number[];
  accountUserId?: string;
  code?: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  allowedWeekDays?: number;
}

type CreateKeyOptions = {
  keyTypes?: VirtualKeyType[];
  keypadCode?: string;
};

type CreateKeyFailure = {
  keyType: VirtualKeyType;
  deviceId?: number;
  deviceName?: string;
  error: string;
  currentCount?: number;
  limit?: number;
};

type CreateKeyResult = {
  keyType: VirtualKeyType;
  deviceId: number;
  deviceName?: string;
  nukiAuth: NukiAuth;
};

type AuthorizationLookupOptions = {
  deviceId: number;
  keypadCode?: string;
  allowedFromISO?: string;
  allowedUntilISO?: string;
  nameHint?: string;
  retryScheduleMs?: number[];
};

export class NukiApiService {
  private readonly baseUrl = 'https://api.nuki.io';
  private readonly apiKey: string;

  // Device IDs - must be configured via environment variables
  private readonly deviceIds = {
    [VirtualKeyType.MAIN_ENTRANCE]: process.env.NUKI_MAIN_ENTRANCE_ID,
    [VirtualKeyType.LUGGAGE_ROOM]: process.env.NUKI_LUGGAGE_ROOM_ID,
    [VirtualKeyType.LAUNDRY_ROOM]: process.env.NUKI_LAUNDRY_ROOM_ID,
  };

  // Room-specific device IDs
  private readonly roomDeviceIds: { [key: string]: string | undefined } = {
    '001': process.env.NUKI_ROOM_001_ID,
    '004': process.env.NUKI_ROOM_004_ID,
    '101': process.env.NUKI_ROOM_101_ID,
    '102': process.env.NUKI_ROOM_102_ID,
    '103': process.env.NUKI_ROOM_103_ID,
    '104': process.env.NUKI_ROOM_104_ID,
    '201': process.env.NUKI_ROOM_201_ID,
    '202': process.env.NUKI_ROOM_202_ID,
    '203': process.env.NUKI_ROOM_203_ID,
    '204': process.env.NUKI_ROOM_204_ID,
    '301': process.env.NUKI_ROOM_301_ID,
    '302': process.env.NUKI_ROOM_302_ID,
    '303': process.env.NUKI_ROOM_303_ID,
    '304': process.env.NUKI_ROOM_304_ID,
    '401': process.env.NUKI_ROOM_401_ID,
    '402': process.env.NUKI_ROOM_402_ID,
    '403': process.env.NUKI_ROOM_403_ID,
    '404': process.env.NUKI_ROOM_404_ID,
    '501': process.env.NUKI_ROOM_501_ID,
    '502': process.env.NUKI_ROOM_502_ID,
    '503': process.env.NUKI_ROOM_503_ID,
    '504': process.env.NUKI_ROOM_504_ID,
    '601': process.env.NUKI_ROOM_601_ID,
    '602': process.env.NUKI_ROOM_602_ID,
    '604': process.env.NUKI_ROOM_604_ID,
  };

  // Special location device IDs
  private readonly specialDeviceIds = {
    'BORIVOJOVA_ENTRY': process.env.NUKI_BORIVOJOVA_ENTRY_ID,
    'LAUNDRY': process.env.NUKI_LAUNDRY_ID,
    'LUGGAGE': process.env.NUKI_LUGGAGE_ID,
    'MAIN_DOOR': process.env.NUKI_MAIN_DOOR_ID,
    'REHOROVA': process.env.NUKI_REHOROVA_ID,
  };

  constructor() {
    this.apiKey = process.env.NUKI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('NUKI_API_KEY environment variable is required');
    }
  }

  getAuthorizationWindow(checkInDate: Date, checkOutDate: Date) {
    return {
      allowedFromISO: toPragueDateTime(checkInDate, 15, 0),
      allowedUntilISO: toPragueDateTime(checkOutDate, 10, 0),
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Nuki API error (${response.status}): ${text}`);
    }

    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Failed to parse Nuki API response: ${error instanceof Error ? error.message : 'Unknown error'} | Body: ${text}`);
    }
  }

  private normalizeName(value?: string | null) {
    return value?.trim().toLowerCase() ?? '';
  }

  private datesRoughlyMatch(expectedISO?: string, actualISO?: string): boolean {
    if (!expectedISO || !actualISO) {
      return false;
    }

    const expected = new Date(expectedISO).getTime();
    const actual = new Date(actualISO).getTime();

    if (Number.isNaN(expected) || Number.isNaN(actual)) {
      return false;
    }

    return Math.abs(actual - expected) <= AUTH_MATCH_TOLERANCE_MS;
  }

  private async locateAuthorization(options: AuthorizationLookupOptions): Promise<NukiAuthorization | null> {
    const {
      deviceId,
      keypadCode,
      allowedFromISO,
      allowedUntilISO,
      nameHint,
      retryScheduleMs = LOOKUP_RETRY_SCHEDULE_MS,
    } = options;

    const normalizedCode = keypadCode ? String(keypadCode) : undefined;
    const normalizedNameHint = this.normalizeName(nameHint);

    const matches = (auth: NukiAuthorization) => {
      const codeMatches = normalizedCode !== undefined && auth.code !== undefined
        ? String(auth.code) === normalizedCode
        : false;

      const nameMatches = normalizedNameHint
        ? ((): boolean => {
            const candidate = this.normalizeName(auth.name);
            if (!candidate) {
              return false;
            }
            return candidate === normalizedNameHint
              || candidate.startsWith(normalizedNameHint)
              || normalizedNameHint.startsWith(candidate);
          })()
        : false;

      const windowMatches = this.datesRoughlyMatch(allowedFromISO, auth.allowedFromDate)
        && this.datesRoughlyMatch(allowedUntilISO, auth.allowedUntilDate);

      if (codeMatches && (!allowedFromISO || !allowedUntilISO)) {
        return true;
      }

      if (codeMatches && windowMatches) {
        return true;
      }

      if (nameMatches && windowMatches) {
        return true;
      }

      return false;
    };

    for (const delay of retryScheduleMs) {
      if (delay > 0) {
        await sleep(delay);
      }

      try {
        const authorizations = await this.makeRequest<NukiAuthorization[]>(`/smartlock/${deviceId}/auth`);
        const match = authorizations.find(matches);
        if (match) {
          return match;
        }
      } catch (error) {
        console.warn(`[NUKI] Failed to poll authorizations for device ${deviceId}:`, error);
      }
    }

    return null;
  }

  async findAuthorizationOnDevice(options: AuthorizationLookupOptions): Promise<NukiAuthorization | null> {
    return this.locateAuthorization(options);
  }

  // Get all smart locks
  async getDevices(): Promise<NukiDevice[]> {
    return this.makeRequest<NukiDevice[]>('/smartlock');
  }

  // Get specific device details
  async getDevice(deviceId: number): Promise<NukiDevice> {
    return this.makeRequest<NukiDevice>(`/smartlock/${deviceId}`);
  }

  // Check if device is online
  async isDeviceOnline(deviceId: number): Promise<boolean> {
    try {
      const device = await this.getDevice(deviceId);
      return device.serverState === 0; // 0 = online
    } catch {
      return false;
    }
  }

  async getKeyTypesForProperty(listingId?: string | number): Promise<VirtualKeyType[]> {
    // Use HostAway listing ID mapping for 100% accurate identification
    if (listingId) {
      const mapping = getNukiPropertyMapping(listingId);
      if (mapping) {
        switch (mapping.propertyType) {
          case 'prokopova':
            // Prokopova properties get all 4 key types
            return [
              VirtualKeyType.MAIN_ENTRANCE,
              VirtualKeyType.ROOM,
              VirtualKeyType.LUGGAGE_ROOM,
              VirtualKeyType.LAUNDRY_ROOM,
            ];
          case 'rehorova':
          case 'borivojova':
            // Other Nuki properties get main entrance only
            return [VirtualKeyType.MAIN_ENTRANCE];
          default:
            return [];
        }
      }
    }

    // No listing ID or mapping found - no Nuki access
    return [];
  }

  private async createVirtualKey(
    deviceId: number,
    keyType: VirtualKeyType,
    guestName: string,
    keypadCode: string,
    allowedFromISO: string,
    allowedUntilISO: string,
    roomNumber?: string
  ): Promise<NukiAuth> {
    const authRequest: NukiCreateAuthRequest = {
      name: `${guestName} – ${keyType}${roomNumber ? ` ${roomNumber}` : ''}`,
      type: 13,
      smartlockIds: [deviceId],
      code: keypadCode,
      allowedFromDate: allowedFromISO,
      allowedUntilDate: allowedUntilISO,
      allowedWeekDays: 127,
    };

    const created = await this.makeRequest<NukiAuth | undefined>('/smartlock/auth', {
      method: 'PUT',
      body: JSON.stringify(authRequest),
    });

    if (created && created.id) {
      return created;
    }

    const located = await this.locateAuthorization({
      deviceId,
      keypadCode,
      allowedFromISO,
      allowedUntilISO,
      nameHint: authRequest.name,
    });

    if (located) {
      return located;
    }

    throw new Error('nuki_authorization_not_found');
  }

  // Delete/revoke authorization
  async revokeVirtualKey(authId: string): Promise<void> {
    await this.makeRequest(`/smartlock/auth/${authId}`, {
      method: 'DELETE',
    });
  }

  // Fetch all authorizations across devices
  async getAllAuthorizations(): Promise<Array<NukiAuthorization & { deviceId: number; deviceName: string }>> {
    const devices = await this.getDevices();
    const results: Array<NukiAuthorization & { deviceId: number; deviceName: string }> = [];

    let index = 0;
    const concurrency = 3;

    const worker = async () => {
      while (index < devices.length) {
        const current = devices[index++];
        const deviceId = current.smartlockId;
        try {
          const auths = await this.makeRequest<NukiAuthorization[]>(`/smartlock/${deviceId}/auth`);
          if (Array.isArray(auths)) {
            for (const auth of auths) {
              results.push({
                ...auth,
                deviceId,
                deviceName: current.name,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch authorizations for device ${deviceId}:`, error);
        }
        // small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, devices.length) }, () => worker());
    await Promise.all(workers);

    return results;
  }

  async cleanupExpiredAuthorizations(now: Date = new Date()): Promise<{
    processed: number;
    expired: number;
    deleted: number;
    failed: number;
    details: Array<{ id: string; deviceId: number; deviceName: string; status: 'deleted' | 'failed'; reason?: string }>;
  }> {
    const allAuths = await this.getAllAuthorizations();
    const nowMs = now.getTime();

    let deleted = 0;
    let failed = 0;
    const details: Array<{ id: string; deviceId: number; deviceName: string; status: 'deleted' | 'failed'; reason?: string }> = [];

    for (const auth of allAuths) {
      const expiry = auth.allowedUntilDate ? new Date(auth.allowedUntilDate).getTime() : null;
      if (expiry !== null && expiry < nowMs) {
        try {
          await this.revokeVirtualKey(String(auth.id));
          deleted += 1;
          details.push({
            id: String(auth.id),
            deviceId: auth.deviceId,
            deviceName: auth.deviceName,
            status: 'deleted',
          });
        } catch (error) {
          failed += 1;
          details.push({
            id: String(auth.id),
            deviceId: auth.deviceId,
            deviceName: auth.deviceName,
            status: 'failed',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    const expired = deleted + failed;

    return {
      processed: allAuths.length,
      expired,
      deleted,
      failed,
      details,
    };
  }

  // Lock device
  async lockDevice(keyType: VirtualKeyType): Promise<void> {
    if (keyType === VirtualKeyType.ROOM) {
      throw new Error('Cannot lock ROOM devices - device ID depends on property code');
    }
    const deviceId = this.deviceIds[keyType];
    if (!deviceId) {
      throw new Error(`No device ID configured for key type: ${keyType}`);
    }
    await this.makeRequest(`/smartlock/${deviceId}/action/lock`, {
      method: 'POST',
    });
  }

  // Unlock device
  async unlockDevice(keyType: VirtualKeyType): Promise<void> {
    if (keyType === VirtualKeyType.ROOM) {
      throw new Error('Cannot unlock ROOM devices - device ID depends on property code');
    }
    const deviceId = this.deviceIds[keyType];
    if (!deviceId) {
      throw new Error(`No device ID configured for key type: ${keyType}`);
    }
    await this.makeRequest(`/smartlock/${deviceId}/action/unlock`, {
      method: 'POST',
    });
  }

  // Get device logs
  async getDeviceLogs(keyType: VirtualKeyType): Promise<unknown[]> {
    if (keyType === VirtualKeyType.ROOM) {
      throw new Error('Cannot get logs for ROOM devices - device ID depends on property code');
    }
    const deviceId = this.deviceIds[keyType];
    if (!deviceId) {
      throw new Error(`No device ID configured for key type: ${keyType}`);
    }
    return this.makeRequest(`/smartlock/${deviceId}/log`);
  }

  // Create multiple virtual keys for a booking with universal keypad code
  async createVirtualKeysForBooking(
    guestName: string,
    checkInDate: Date,
    checkOutDate: Date,
    roomNumber: string,
    listingId?: string | number,
    options: CreateKeyOptions = {}
  ): Promise<{
    results: CreateKeyResult[];
    universalKeypadCode: string;
    attemptedKeyTypes: VirtualKeyType[];
    failures: CreateKeyFailure[];
  }> {
    const attemptedKeyTypes = options.keyTypes ?? await this.getKeyTypesForProperty(listingId);
    let universalKeypadCode = options.keypadCode ?? this.generateKeypadCode();
    const failures: CreateKeyFailure[] = [];
    const results: CreateKeyResult[] = [];
    const deviceAuthCounts = new Map<number, number>();

    const getAuthorizationCount = async (deviceId: number): Promise<number> => {
      if (!deviceAuthCounts.has(deviceId)) {
        try {
          const auths = await this.makeRequest<NukiAuthorization[]>(`/smartlock/${deviceId}/auth`);
          deviceAuthCounts.set(deviceId, Array.isArray(auths) ? auths.length : 0);
        } catch (error) {
          console.error(`Failed to fetch authorization count for device ${deviceId}:`, error);
          deviceAuthCounts.set(deviceId, 0);
        }
      }
      return deviceAuthCounts.get(deviceId) ?? 0;
    };

    const { allowedFromISO, allowedUntilISO } = this.getAuthorizationWindow(checkInDate, checkOutDate);

    // Extract actual room number from property name or room number field
    const extractRoomNumber = (roomNumber: string, propertyName?: string): string => {
      // Try to extract from property name first (e.g., "8 bed apartment in Zizkov (402)" -> "402")
      if (propertyName) {
        const propertyMatch = propertyName.match(/\((\d+)\)$/);
        if (propertyMatch) {
          return propertyMatch[1];
        }
      }

      // Try to extract from room number field (e.g., "Prokopova 197/9" -> look for numbers)
      const roomMatch = roomNumber.match(/(\d+)/);
      if (roomMatch) {
        return roomMatch[1];
      }

      return roomNumber; // fallback to original
    };

    const resolveDevice = (keyType: VirtualKeyType): { deviceId: number; deviceName?: string } => {
      const mapping = listingId ? getNukiPropertyMapping(listingId) : null;

      if (keyType === VirtualKeyType.ROOM) {
        // Only Prokopova properties have room keys
        if (mapping?.propertyType === 'prokopova' && mapping.roomCode) {
          const roomDeviceId = this.roomDeviceIds[mapping.roomCode];
          if (!roomDeviceId) {
            throw new Error(`No Nuki device configured for room ${mapping.roomCode}`);
          }
          return {
            deviceId: Number.parseInt(roomDeviceId, 10),
            deviceName: `Room ${mapping.roomCode}`
          };
        } else {
          // Fallback: try to extract room number from roomNumber parameter
          const roomMatch = roomNumber.match(/(\d{3})/);
          if (roomMatch) {
            const roomCode = roomMatch[1];
            const roomDeviceId = this.roomDeviceIds[roomCode];
            if (!roomDeviceId) {
              throw new Error(`No Nuki device configured for room ${roomCode}`);
            }
            return {
              deviceId: Number.parseInt(roomDeviceId, 10),
              deviceName: `Room ${roomCode}`
            };
          }
          throw new Error(`Cannot resolve room device for ${roomNumber}`);
        }
      }

      // Handle property-specific devices for MAIN_ENTRANCE keys
      if (keyType === VirtualKeyType.MAIN_ENTRANCE && mapping) {
        switch (mapping.propertyType) {
          case 'borivojova':
            const borivojovaId = this.specialDeviceIds.BORIVOJOVA_ENTRY;
            if (!borivojovaId) {
              throw new Error('No Nuki device configured for Bořivojova Entry');
            }
            return {
              deviceId: Number.parseInt(borivojovaId, 10),
              deviceName: 'Bořivojova Entry'
            };

          case 'rehorova':
            const rehorovaId = this.specialDeviceIds.REHOROVA;
            if (!rehorovaId) {
              throw new Error('No Nuki device configured for Řehořova');
            }
            return {
              deviceId: Number.parseInt(rehorovaId, 10),
              deviceName: 'Řehořova'
            };

          case 'prokopova':
            const prokopovaId = this.deviceIds[VirtualKeyType.MAIN_ENTRANCE];
            if (!prokopovaId) {
              throw new Error('No Nuki device configured for Prokopova main entrance');
            }
            return {
              deviceId: Number.parseInt(prokopovaId, 10),
              deviceName: 'Prokopova Main Entrance'
            };
        }
      }

      // Default to configured device for the key type
      const configuredId = this.deviceIds[keyType];
      if (!configuredId) {
        throw new Error(`No Nuki device configured for key type ${keyType}`);
      }

      return { deviceId: Number.parseInt(configuredId, 10), deviceName: keyType };
    };

    const deviceContexts = attemptedKeyTypes.map((keyType) => ({
      keyType,
      ...resolveDevice(keyType),
    }));

    const uniqueDeviceIds = Array.from(new Set(deviceContexts.map(context => context.deviceId)));

    const codeExistsOnDevices = async (code: string): Promise<boolean> => {
      if (!code) {
        return false;
      }

      for (const deviceId of uniqueDeviceIds) {
        const existing = await this.findAuthorizationOnDevice({
          deviceId,
          keypadCode: code,
          retryScheduleMs: [0],
        });

        if (existing) {
          return true;
        }
      }

      return false;
    };

    if (await codeExistsOnDevices(universalKeypadCode)) {
      console.warn(`[NUKI] Supplied keypad code ${universalKeypadCode} already exists on one of the target devices. Generating a new code.`);

      let attempts = 0;
      let candidate = this.generateKeypadCode();

      while (attempts < 10 && (await codeExistsOnDevices(candidate))) {
        candidate = this.generateKeypadCode();
        attempts += 1;
      }

      if (attempts >= 10 && (await codeExistsOnDevices(candidate))) {
        throw new Error('nuki_code_conflict');
      }

      universalKeypadCode = candidate;
    }

    for (const keyType of attemptedKeyTypes) {
      let deviceContext: { deviceId: number; deviceName?: string } | null = null;
      const authorizationName = `${guestName} – ${keyType}${roomNumber ? ` ${roomNumber}` : ''}`;

      try {
        deviceContext = resolveDevice(keyType);

        const capacityLimit = Number.isFinite(DEFAULT_AUTHORIZATION_LIMIT) ? DEFAULT_AUTHORIZATION_LIMIT : 190;
        const currentCount = await getAuthorizationCount(deviceContext.deviceId);

        if (currentCount >= capacityLimit) {
          failures.push({
            keyType,
            deviceId: deviceContext.deviceId,
            deviceName: deviceContext.deviceName,
            error: 'authorization_capacity_reached',
            currentCount,
            limit: capacityLimit,
          });
          continue;
        }

        const nukiAuth = await this.createVirtualKey(
          deviceContext.deviceId,
          keyType,
          guestName,
          universalKeypadCode,
          allowedFromISO,
          allowedUntilISO,
          roomNumber
        );

        console.log('[NUKI] Created authorization', {
          keyType,
          deviceId: deviceContext.deviceId,
          authId: nukiAuth?.id,
          code: nukiAuth?.code,
        });

        results.push({
          keyType,
          deviceId: deviceContext.deviceId,
          deviceName: deviceContext.deviceName,
          nukiAuth,
        });

        deviceAuthCounts.set(deviceContext.deviceId, currentCount + 1);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (deviceContext && errorMessage === 'nuki_authorization_not_found') {
          try {
            const reconciliation = await this.findAuthorizationOnDevice({
              deviceId: deviceContext.deviceId,
              keypadCode: universalKeypadCode,
              allowedFromISO,
              allowedUntilISO,
              nameHint: authorizationName,
            });

            if (reconciliation) {
              console.warn('[NUKI] Recovered authorization after delayed listing', {
                keyType,
                deviceId: deviceContext.deviceId,
                authId: reconciliation.id,
              });

              results.push({
                keyType,
                deviceId: deviceContext.deviceId,
                deviceName: deviceContext.deviceName,
                nukiAuth: reconciliation,
              });

              deviceAuthCounts.delete(deviceContext.deviceId);
              continue;
            }
          } catch (lookupError) {
            console.warn('[NUKI] Follow-up authorization lookup failed', {
              keyType,
              deviceId: deviceContext.deviceId,
              error: lookupError instanceof Error ? lookupError.message : lookupError,
            });
          }
        }

        failures.push({
          keyType,
          deviceId: deviceContext?.deviceId,
          deviceName: deviceContext?.deviceName,
          error: errorMessage,
          currentCount: deviceContext?.deviceId ? await getAuthorizationCount(deviceContext.deviceId) : undefined,
          limit: Number.isFinite(DEFAULT_AUTHORIZATION_LIMIT) ? DEFAULT_AUTHORIZATION_LIMIT : undefined,
        });
      }
    }

    return { results, universalKeypadCode, attemptedKeyTypes, failures };
  }

  // Generate a random 6-digit keypad code that meets Nuki validation requirements
  private generateKeypadCode(): string {
    const generateValidCode = (): string => {
      const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      let attempts = 0;

      while (attempts < 100) {
        let code = '';

        for (let i = 0; i < 6; i += 1) {
          const candidate = digits[Math.floor(Math.random() * digits.length)];

          if (
            code.length >= 2 &&
            candidate === code[code.length - 1] &&
            candidate === code[code.length - 2]
          ) {
            i -= 1;
            continue;
          }

          code += candidate;
        }

        if (this.isValidKeypadCode(code)) {
          return code;
        }

        attempts += 1;
      }

      return '685247';
    };

    return generateValidCode();
  }

  // Validate keypad code against common Nuki requirements
  private isValidKeypadCode(code: string): boolean {
    if (!/^\d{6}$/.test(code)) {
      return false;
    }

    // Check for obvious patterns that might be rejected
    const digits = code.split('');

    // Avoid all same digits (1111, 0000, etc.)
    if (new Set(digits).size === 1) {
      return false;
    }

    // Avoid simple sequences (1234, 4321, etc.)
    const isAscending = digits.every((digit, i) =>
      i === 0 || parseInt(digit) === parseInt(digits[i - 1]) + 1
    );
    const isDescending = digits.every((digit, i) =>
      i === 0 || parseInt(digit) === parseInt(digits[i - 1]) - 1
    );

    if (isAscending || isDescending) {
      return false;
    }

    // Avoid codes with too many repeated digits (more than half)
    const digitCounts = new Map<string, number>();
    digits.forEach(digit => {
      digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1);
    });

    const maxRepeats = Math.max(...digitCounts.values());
    if (maxRepeats > Math.ceil(digits.length / 2)) {
      return false;
    }

    return true;
  }

  // Batch revoke all keys for a booking
  async revokeAllKeysForBooking(nukiAuthIds: string[]): Promise<void> {
    const revokePromises = nukiAuthIds.map(authId => 
      this.revokeVirtualKey(authId).catch(error => 
        console.error(`Failed to revoke key ${authId}:`, error)
      )
    );

    await Promise.all(revokePromises);
  }

  // Check device status for all key types
  async checkAllDevicesStatus(): Promise<Record<string, boolean>> {
    const statusChecks: Promise<[string, boolean]>[] = [];

    // Check main device types
    Object.entries(this.deviceIds).forEach(([keyType, deviceId]) => {
      if (deviceId) {
        statusChecks.push(
          this.isDeviceOnline(parseInt(deviceId)).then(isOnline => [keyType, isOnline])
        );
      }
    });

    // Check all room devices
    Object.entries(this.roomDeviceIds).forEach(([roomNumber, deviceId]) => {
      if (deviceId) {
        statusChecks.push(
          this.isDeviceOnline(parseInt(deviceId)).then(isOnline => [`ROOM_${roomNumber}`, isOnline])
        );
      }
    });

    // Check special location devices
    Object.entries(this.specialDeviceIds).forEach(([deviceName, deviceId]) => {
      if (deviceId) {
        statusChecks.push(
          this.isDeviceOnline(parseInt(deviceId)).then(isOnline => [deviceName, isOnline])
        );
      }
    });

    const results = await Promise.all(statusChecks);
    return Object.fromEntries(results);
  }
}

// Singleton instance
export const nukiApiService = new NukiApiService();
