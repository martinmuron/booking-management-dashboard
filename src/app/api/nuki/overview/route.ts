import { NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

interface RawDevice {
  smartlockId?: number;
  id?: number;
  name?: string;
  type?: number;
  deviceTypeName?: string;
  state?: number;
  stateName?: string;
  serverState?: number;
  serverStateName?: string;
  batteryCritical?: boolean;
  batteryCharging?: boolean;
  batteryChargeState?: number;
  keypadBatteryCritical?: boolean;
  doorsensorState?: number;
  doorsensorStateName?: string;
  dateCreated?: string;
  dateUpdated?: string;
  virtualDevice?: boolean;
}

interface RawAuth {
  id?: number;
  name?: string;
  enabled?: boolean;
  type?: number;
  typeName?: string;
  smartlockIds?: number[];
  lastActiveDate?: string;
  creationDate?: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  isExpired?: boolean;
  isActive?: boolean;
  hasTimeRestriction?: boolean;
}

async function nukiFetch<T>(path: string): Promise<T | null> {
  const apiKey = process.env.NUKI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${NUKI_BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Fetch devices and authorizations in parallel
    const [devices, auths] = await Promise.all([
      nukiFetch<unknown[]>("/smartlock"),
      nukiFetch<unknown[]>("/smartlock/auth"),
    ]);

    const safeDevices: RawDevice[] = Array.isArray(devices) ? (devices as RawDevice[]) : [];
    const safeAuths: RawAuth[] = Array.isArray(auths) ? (auths as RawAuth[]) : [];

    const onlineDevices = safeDevices.filter(d => (d.serverState ?? 4) === 0).length;
    const offlineDevices = safeDevices.filter(d => (d.serverState ?? 4) !== 0).length;
    
    // Handle nested state object - Nuki API returns state as {state: 1, mode: 2, ...}
    const getActualState = (stateData: unknown): number => {
      if (typeof stateData === 'object' && stateData !== null && 'state' in stateData) {
        return (stateData as any).state ?? 0;
      }
      return typeof stateData === 'number' ? stateData : 0;
    };
    
    const lockedDevices = safeDevices.filter(d => getActualState(d.state) === 1).length;
    const unlockedDevices = safeDevices.filter(d => getActualState(d.state) === 3).length;

    const stats = {
      totalDevices: safeDevices.length,
      onlineDevices,
      offlineDevices,
      lockedDevices,
      unlockedDevices,
      totalAuthorizations: safeAuths.length,
      activeAuthorizations: safeAuths.filter(a => !!a.enabled).length,
      criticalBatteries: safeDevices.filter(d => !!d.batteryCritical || !!d.keypadBatteryCritical).length,
    };

    // Transform devices minimally to what UI expects, with safe defaults
    const devicesOut = safeDevices.map(d => {
      const actualState = getActualState(d.state);
      const stateNames: Record<number, string> = {
        0: 'Uncalibrated',
        1: 'Locked', 
        2: 'Unlocking',
        3: 'Unlocked',
        4: 'Locking',
        5: 'Unlatched',
        6: "Unlocked (Lock 'n' Go)",
        7: 'Unlatching',
        254: 'Motor blocked',
        255: 'Undefined'
      };
      
      // Parse battery info from nested state object
      const getBatteryInfo = (stateData: unknown) => {
        if (typeof stateData === 'object' && stateData !== null) {
          const state = stateData as any;
          return {
            batteryCharge: state.batteryCharge ?? d.batteryChargeState ?? 0,
            batteryCritical: state.batteryCritical ?? d.batteryCritical ?? false,
            batteryCharging: state.batteryCharging ?? d.batteryCharging ?? false,
            keypadBatteryCritical: state.keypadBatteryCritical ?? d.keypadBatteryCritical ?? false,
            doorState: state.doorState ?? 0,
          };
        }
        return {
          batteryCharge: d.batteryChargeState ?? 0,
          batteryCritical: d.batteryCritical ?? false,
          batteryCharging: d.batteryCharging ?? false,
          keypadBatteryCritical: d.keypadBatteryCritical ?? false,
          doorState: 0,
        };
      };
      
      const batteryInfo = getBatteryInfo(d.state);
      
      // Improve door sensor state names
      const doorSensorNames: Record<number, string> = {
        0: 'Deactivated',
        1: 'Closed',
        2: 'Open', 
        3: 'Unknown',
        4: 'Calibrating',
        255: 'Unavailable'
      };
      
      return {
        smartlockId: d.smartlockId ?? d.id ?? 0,
        name: d.name ?? 'Unknown',
        type: d.type ?? 0,
        deviceTypeName: d.deviceTypeName ?? 'Smart Lock',
        state: actualState,
        stateName: stateNames[actualState] || 'Unknown',
        serverState: d.serverState ?? 4,
        serverStateName: (d.serverState ?? 4) === 0 ? 'Online' : 'Offline',
        batteryCritical: batteryInfo.batteryCritical,
        batteryCharging: batteryInfo.batteryCharging,
        batteryChargeState: batteryInfo.batteryCharge,
        keypadBatteryCritical: batteryInfo.keypadBatteryCritical,
        doorsensorState: d.doorsensorState ?? 255,
        doorsensorStateName: doorSensorNames[d.doorsensorState ?? 255] || 'Unavailable',
        doorState: batteryInfo.doorState,
        dateCreated: d.dateCreated ?? new Date().toISOString(),
        dateUpdated: d.dateUpdated ?? new Date().toISOString(),
        virtualDevice: !!d.virtualDevice,
        recentLogs: [] as unknown[],
        authorizations: [] as unknown[],
        authCount: 0,
        activeAuthCount: 0,
      };
    });

    // We won’t load activity in overview for now
    const recentActivity: unknown[] = [];

    return NextResponse.json({
      success: true,
      data: {
        stats,
        devices: devicesOut,
        recentActivity,
        authorizations: safeAuths.map(a => ({
          id: a.id ?? 0,
          name: a.name ?? 'Authorization',
          enabled: !!a.enabled,
          type: a.type ?? 0,
          typeName: a.typeName ?? 'Authorization',
          smartlockIds: Array.isArray(a.smartlockIds) ? a.smartlockIds : [],
          lastActiveDate: a.lastActiveDate ?? '',
          creationDate: a.creationDate ?? '',
          allowedFromDate: a.allowedFromDate,
          allowedUntilDate: a.allowedUntilDate,
          isExpired: !!a.isExpired,
          isActive: !!a.isActive,
          hasTimeRestriction: !!a.hasTimeRestriction,
          devices: [] as unknown[],
        }))
      }
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: { stats: null, devices: [], recentActivity: [], authorizations: [] },
      message: 'NUKI_API_KEY missing or Nuki API unavailable'
    });
  }
}