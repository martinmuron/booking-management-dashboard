import { VirtualKeyType } from '@/types';

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

  // Create virtual key authorization
  async createVirtualKey(
    keyType: VirtualKeyType,
    guestName: string,
    checkInDate: Date,
    checkOutDate: Date,
    keypadCode?: string,
    roomNumber?: string
  ): Promise<NukiAuth> {
    let deviceId: number;
    
    // For room type, use the specific room number. Otherwise use configured defaults
    if (keyType === VirtualKeyType.ROOM && roomNumber) {
      // Find the device ID by room number from the actual devices
      const devices = await this.getDevices();
      const roomDevice = devices.find(device => device.name === roomNumber);
      if (roomDevice) {
        deviceId = roomDevice.smartlockId;
      } else {
        throw new Error(`Room device not found for room number: ${roomNumber}`);
      }
    } else {
      deviceId = parseInt(this.deviceIds[keyType]);
    }
    
    // Create time-limited access from check-in to check-out + 1 day buffer
    const checkOutWithBuffer = new Date(checkOutDate);
    checkOutWithBuffer.setDate(checkOutWithBuffer.getDate() + 1);

    const authRequest: NukiCreateAuthRequest = {
      name: `${guestName} - ${roomNumber ? `Room ${roomNumber}` : keyType} - ${keypadCode}`,
      type: keypadCode ? 13 : 15, // 13: Keypad code, 15: Virtual
      smartlockIds: [deviceId],
      allowedFromDate: checkInDate.toISOString(),
      allowedUntilDate: checkOutWithBuffer.toISOString(),
      allowedWeekDays: 127, // All days (Mon-Sun: 64+32+16+8+4+2+1 = 127)
    };

    if (keypadCode) {
      authRequest.code = keypadCode;
    }

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
    keyTypes?: VirtualKeyType[]
  ): Promise<{
    results: Array<{ keyType: VirtualKeyType; nukiAuth: NukiAuth }>;
    universalKeypadCode: string;
  }> {
    // Determine key types based on property
    if (!keyTypes) {
      if (propertyName === 'Bořivojova 50' || propertyName === 'Řehořova') {
        // Standalone properties - only main entrance
        keyTypes = [VirtualKeyType.MAIN_ENTRANCE];
      } else {
        // Z apartments - full suite of keys
        keyTypes = [
          VirtualKeyType.MAIN_ENTRANCE,
          VirtualKeyType.ROOM,
          VirtualKeyType.LUGGAGE_ROOM,
          VirtualKeyType.LAUNDRY_ROOM,
        ];
      }
    }
    // Generate ONE keypad code for all doors
    const universalKeypadCode = this.generateKeypadCode();
    const results = [];

    for (const keyType of keyTypes) {
      try {
        // Use the SAME keypad code for all key types
        const nukiAuth = await this.createVirtualKey(
          keyType,
          guestName,
          checkInDate,
          checkOutDate,
          universalKeypadCode,
          roomNumber
        );

        results.push({ keyType, nukiAuth });
      } catch (error) {
        console.error(`Failed to create virtual key for ${keyType}:`, error);
        // Continue with other keys even if one fails
      }
    }

    return { results, universalKeypadCode };
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