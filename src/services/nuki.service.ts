interface NukiDevice {
  smartlockId: number;
  accountId: number;
  authId: number;
  name: string;
  type: number;
  deviceTypeName?: string;
  serverStateName?: string;
  lngLat: {
    lng: number;
    lat: number;
  };
  webConfigId: number;
  serverState: number;
  adminPinState: number;
  virtualDevice: boolean;
  dateCreated: string;
  dateUpdated: string;
  state: number;
  stateName: string;
  batteryCritical: boolean;
  batteryCharging: boolean;
  batteryChargeState: number;
  keypadBatteryCritical: boolean;
  doorsensorState: number;
  doorsensorStateName: string;
  ringactionState: number;
  ringactionTimestamp: string;
  config: {
    name: string;
    latitude: number;
    longitude: number;
    autoUnlatch: boolean;
    pairingEnabled: boolean;
    buttonEnabled: boolean;
    ledEnabled: boolean;
    ledBrightness: number;
    fobPaired: boolean;
    fobAction1: number;
    fobAction2: number;
    fobAction3: number;
    singleLock: boolean;
    advertisingMode: number;
    keypadPaired: boolean;
    homekitState: number;
    timezoneId: number;
    dstMode: boolean;
  };
}

interface NukiLogEntry {
  date: string;
  type: number;
  data: {
    action: number;
    trigger: number;
    state: number;
    stateName: string;
    completionStatus: number;
    doorSensorState: number;
    doorSensorStateName: string;
    ringactionState: number;
    ringactionTimestamp: string;
    keypadBatteryCritical: boolean;
    batteryCritical: boolean;
    batteryCharging: boolean;
    batteryChargeState: number;
    actionName?: string;
    triggerName?: string;
  };
  name: string;
  authId: number;
}

interface NukiAuth {
  id: number;
  name: string;
  enabled: boolean;
  remoteAllowed: boolean;
  lockCount: number;
  type: number;
  typeName?: string;
  smartlockIds: number[];
  lastActiveDate: string;
  creationDate: string;
  updateDate: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  allowedWeekDays?: number;
  allowedFromTime?: number;
  allowedUntilTime?: number;
  code?: string;
  accountUserId?: number;
}

interface NukiServerInfo {
  currentTime: string;
  serverState: number;
  serverStateName: string;
}

class NukiService {
  private readonly baseUrl = 'https://api.nuki.io';
  private readonly apiKey = process.env.NUKI_API_KEY;

  // Device type mapping
  private readonly deviceTypes: Record<number, string> = {
    0: 'Smart Lock 1/2',
    1: 'Box', 
    2: 'Opener',
    3: 'Smart Door',
    4: 'Smart Lock 3/4',
    5: 'Smart Lock Ultra'
  };

  // Server state mapping
  private readonly serverStates: Record<number, string> = {
    0: 'Online',
    4: 'Offline'
  };

  // Smart Lock states
  private readonly smartLockStates: Record<number, string> = {
    0: 'Uncalibrated',
    1: 'Locked',
    2: 'Unlocking', 
    3: 'Unlocked',
    4: 'Locking',
    5: 'Unlatched',
    6: 'Unlocked (Lock\'n\'Go)',
    7: 'Unlatching',
    254: 'Motor blocked',
    255: 'Undefined'
  };

  // Door sensor states
  private readonly doorSensorStates: Record<number, string> = {
    0: 'Unavailable',
    1: 'Deactivated',
    2: 'Door closed',
    3: 'Door opened',
    4: 'Door state unknown',
    5: 'Calibrating'
  };

  // Authorization types
  private readonly authTypes: Record<number, string> = {
    0: 'App user',
    1: 'Bridge',
    2: 'Fob', 
    3: 'Keypad',
    13: 'Keypad code',
    14: 'Z-key',
    15: 'Virtual'
  };

  constructor() {
    if (!this.apiKey) {
      console.warn('⚠️ NUKI_API_KEY not configured');
    }
  }

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error('NUKI_API_KEY is not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Nuki API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all Nuki devices
   */
  async getAllDevices(): Promise<NukiDevice[]> {
    try {
      const devices = await this.makeRequest<NukiDevice[]>('/smartlock');
      
      // Enhance devices with readable state names
      return devices.map(device => ({
        ...device,
        stateName: this.getStateName(device.state, device.type),
        serverStateName: this.serverStates[device.serverState] || 'Unknown',
        deviceTypeName: this.deviceTypes[device.type] || 'Unknown',
        doorsensorStateName: this.doorSensorStates[device.doorsensorState] || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching Nuki devices:', error);
      throw error;
    }
  }

  /**
   * Get specific device details
   */
  async getDevice(deviceId: number): Promise<NukiDevice> {
    try {
      const device = await this.makeRequest<NukiDevice>(`/smartlock/${deviceId}`);
      
      return {
        ...device,
        stateName: this.getStateName(device.state, device.type),
        serverStateName: this.serverStates[device.serverState] || 'Unknown',
        deviceTypeName: this.deviceTypes[device.type] || 'Unknown',
        doorsensorStateName: this.doorSensorStates[device.doorsensorState] || 'Unknown'
      };
    } catch (error) {
      console.error(`Error fetching Nuki device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device activity logs
   */
  async getDeviceLogs(deviceId: number, limit: number = 50): Promise<NukiLogEntry[]> {
    try {
      const logs = await this.makeRequest<NukiLogEntry[]>(`/smartlock/${deviceId}/log?limit=${limit}`);
      
      // Enhance logs with readable action names
      return logs.map(log => ({
        ...log,
        data: {
          ...log.data,
          actionName: this.getActionName(log.data.action),
          triggerName: this.getTriggerName(log.data.trigger),
          stateName: log.data.stateName || this.smartLockStates[log.data.state] || 'Unknown',
          doorSensorStateName: log.data.doorSensorStateName || this.doorSensorStates[log.data.doorSensorState] || 'Unknown'
        }
      }));
    } catch (error) {
      console.error(`Error fetching logs for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get all authorizations
   */
  async getAllAuthorizations(): Promise<NukiAuth[]> {
    try {
      const auths = await this.makeRequest<NukiAuth[]>('/smartlock/auth');
      
      return auths.map(auth => ({
        ...auth,
        typeName: this.authTypes[auth.type] || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching Nuki authorizations:', error);
      throw error;
    }
  }

  /**
   * Get authorizations for specific device
   */
  async getDeviceAuthorizations(deviceId: number): Promise<NukiAuth[]> {
    try {
      const allAuths = await this.getAllAuthorizations();
      return allAuths.filter(auth => auth.smartlockIds.includes(deviceId));
    } catch (error) {
      console.error(`Error fetching authorizations for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<NukiServerInfo> {
    try {
      // This endpoint might not exist, but we'll try to get general account info
      await this.makeRequest<Record<string, unknown>>('/account');
      return {
        currentTime: new Date().toISOString(),
        serverState: 0,
        serverStateName: 'Connected'
      };
    } catch (error) {
      console.error('Error fetching server info:', error);
      return {
        currentTime: new Date().toISOString(),
        serverState: 4,
        serverStateName: 'Error'
      };
    }
  }

  /**
   * Get overview statistics
   */
  async getOverviewStats(): Promise<{
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    lockedDevices: number;
    unlockedDevices: number;
    totalAuthorizations: number;
    activeAuthorizations: number;
    criticalBatteries: number;
  }> {
    try {
      const [devices, auths] = await Promise.all([
        this.getAllDevices(),
        this.getAllAuthorizations()
      ]);

      return {
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.serverState === 0).length,
        offlineDevices: devices.filter(d => d.serverState === 4).length,
        lockedDevices: devices.filter(d => d.state === 1).length,
        unlockedDevices: devices.filter(d => d.state === 3).length,
        totalAuthorizations: auths.length,
        activeAuthorizations: auths.filter(a => a.enabled).length,
        criticalBatteries: devices.filter(d => d.batteryCritical || d.keypadBatteryCritical).length
      };
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Get readable state name based on device type
   */
  private getStateName(state: number, deviceType: number): string {
    switch (deviceType) {
      case 0: // Smart Lock 1/2
      case 3: // Smart Door  
      case 4: // Smart Lock 3/4
      case 5: // Smart Lock Ultra
        return this.smartLockStates[state] || 'Unknown';
      case 2: // Opener
        const openerStates: Record<number, string> = {
          0: 'Untrained',
          1: 'Online', 
          3: 'Ring to Open active',
          5: 'Open',
          7: 'Opening',
          255: 'Undefined'
        };
        return openerStates[state] || 'Unknown';
      default:
        return this.smartLockStates[state] || 'Unknown';
    }
  }

  /**
   * Helper: Get readable action name
   */
  private getActionName(action: number): string {
    const actions: Record<number, string> = {
      1: 'Unlock',
      2: 'Lock',
      3: 'Unlatch',
      4: 'Lock\'n\'Go',
      5: 'Lock\'n\'Go with unlatch'
    };
    return actions[action] || `Action ${action}`;
  }

  /**
   * Helper: Get readable trigger name
   */
  private getTriggerName(trigger: number): string {
    const triggers: Record<number, string> = {
      0: 'System',
      1: 'Manual',
      2: 'Button',
      3: 'Automatic',
      4: 'WEB',
      5: 'APP'
    };
    return triggers[trigger] || `Trigger ${trigger}`;
  }
}

export const nukiService = new NukiService();
export type { NukiDevice, NukiLogEntry, NukiAuth, NukiServerInfo };