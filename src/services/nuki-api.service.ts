import { VirtualKeyType } from '@/types';

const PRAGUE_TIMEZONE = 'Europe/Prague';

const pad = (value: number) => value.toString().padStart(2, '0');

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
};

type CreateKeyResult = {
  keyType: VirtualKeyType;
  deviceId: number;
  deviceName?: string;
  nukiAuth: NukiAuth;
};

export class NukiApiService {
  private readonly baseUrl = 'https://api.nuki.io';
  private readonly apiKey: string;

  // Default device IDs - these would need to be configured for your actual Nuki devices
  private readonly deviceIds = {
    [VirtualKeyType.MAIN_ENTRANCE]: process.env.NUKI_MAIN_ENTRANCE_ID || '123456789', // Replace with actual device ID
    [VirtualKeyType.ROOM]: process.env.NUKI_ROOM_ID || '123456790', // Replace with actual device ID  
    [VirtualKeyType.LUGGAGE_ROOM]: process.env.NUKI_LUGGAGE_ROOM_ID || '123456791', // Replace with actual device ID
    [VirtualKeyType.LAUNDRY_ROOM]: process.env.NUKI_LAUNDRY_ROOM_ID || '123456792', // Replace with actual device ID
  };

  constructor() {
    this.apiKey = process.env.NUKI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('NUKI_API_KEY environment variable is required');
    }
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nuki API error (${response.status}): ${error}`);
    }

    return response.json();
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

  getKeyTypesForProperty(propertyName?: string): VirtualKeyType[] {
    if (!propertyName) {
      return [
        VirtualKeyType.MAIN_ENTRANCE,
        VirtualKeyType.ROOM,
        VirtualKeyType.LUGGAGE_ROOM,
        VirtualKeyType.LAUNDRY_ROOM,
      ];
    }

    if (propertyName === 'Bořivojova 50' || propertyName === 'Řehořova') {
      return [VirtualKeyType.MAIN_ENTRANCE];
    }

    return [
      VirtualKeyType.MAIN_ENTRANCE,
      VirtualKeyType.ROOM,
      VirtualKeyType.LUGGAGE_ROOM,
      VirtualKeyType.LAUNDRY_ROOM,
    ];
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

    return this.makeRequest<NukiAuth>('/smartlock/auth', {
      method: 'PUT',
      body: JSON.stringify(authRequest),
    });
  }

  // Delete/revoke authorization
  async revokeVirtualKey(authId: string): Promise<void> {
    await this.makeRequest(`/smartlock/auth/${authId}`, {
      method: 'DELETE',
    });
  }

  // Lock device
  async lockDevice(keyType: VirtualKeyType): Promise<void> {
    const deviceId = this.deviceIds[keyType];
    await this.makeRequest(`/smartlock/${deviceId}/action/lock`, {
      method: 'POST',
    });
  }

  // Unlock device
  async unlockDevice(keyType: VirtualKeyType): Promise<void> {
    const deviceId = this.deviceIds[keyType];
    await this.makeRequest(`/smartlock/${deviceId}/action/unlock`, {
      method: 'POST',
    });
  }

  // Get device logs
  async getDeviceLogs(keyType: VirtualKeyType): Promise<unknown[]> {
    const deviceId = this.deviceIds[keyType];
    return this.makeRequest(`/smartlock/${deviceId}/log`);
  }

  // Create multiple virtual keys for a booking with universal keypad code
  async createVirtualKeysForBooking(
    guestName: string,
    checkInDate: Date,
    checkOutDate: Date,
    roomNumber: string,
    propertyName?: string,
    options: CreateKeyOptions = {}
  ): Promise<{
    results: CreateKeyResult[];
    universalKeypadCode: string;
    attemptedKeyTypes: VirtualKeyType[];
    failures: CreateKeyFailure[];
  }> {
    const attemptedKeyTypes = options.keyTypes ?? this.getKeyTypesForProperty(propertyName);
    const universalKeypadCode = options.keypadCode ?? this.generateKeypadCode();
    const devices = await this.getDevices();
    const failures: CreateKeyFailure[] = [];
    const results: CreateKeyResult[] = [];

    const allowedFromISO = toPragueDateTime(checkInDate, 15, 0);
    const allowedUntilISO = toPragueDateTime(checkOutDate, 22, 0);

    const resolveDevice = (keyType: VirtualKeyType): { deviceId: number; deviceName?: string } => {
      if (keyType === VirtualKeyType.ROOM) {
        const roomDevice = devices.find(device => device.name === roomNumber);
        if (!roomDevice) {
          throw new Error(`Room device not found for ${roomNumber}`);
        }
        return { deviceId: roomDevice.smartlockId, deviceName: roomDevice.name };
      }

      const configuredId = this.deviceIds[keyType];
      if (!configuredId) {
        throw new Error(`No Nuki device configured for key type ${keyType}`);
      }

      return { deviceId: Number.parseInt(configuredId, 10), deviceName: keyType };
    };

    for (const keyType of attemptedKeyTypes) {
      let deviceContext: { deviceId: number; deviceName?: string } | null = null;

      try {
        deviceContext = resolveDevice(keyType);

        const nukiAuth = await this.createVirtualKey(
          deviceContext.deviceId,
          keyType,
          guestName,
          universalKeypadCode,
          allowedFromISO,
          allowedUntilISO,
          roomNumber
        );

        results.push({
          keyType,
          deviceId: deviceContext.deviceId,
          deviceName: deviceContext.deviceName,
          nukiAuth,
        });
      } catch (error) {
        failures.push({
          keyType,
          deviceId: deviceContext?.deviceId,
          deviceName: deviceContext?.deviceName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results, universalKeypadCode, attemptedKeyTypes, failures };
  }

  // Generate a random 6-digit keypad code
  private generateKeypadCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
  async checkAllDevicesStatus(): Promise<Record<VirtualKeyType, boolean>> {
    const statusChecks = Object.entries(this.deviceIds).map(async ([keyType, deviceId]) => {
      const isOnline = await this.isDeviceOnline(parseInt(deviceId));
      return [keyType as VirtualKeyType, isOnline];
    });

    const results = await Promise.all(statusChecks);
    return Object.fromEntries(results) as Record<VirtualKeyType, boolean>;
  }
}

// Singleton instance
export const nukiApiService = new NukiApiService();
