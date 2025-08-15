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
    const lockedDevices = safeDevices.filter(d => (d.state ?? 0) === 1).length;
    const unlockedDevices = safeDevices.filter(d => (d.state ?? 0) === 3).length;

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
    const devicesOut = safeDevices.map(d => ({
      smartlockId: d.smartlockId ?? d.id ?? 0,
      name: d.name ?? 'Unknown',
      type: d.type ?? 0,
      deviceTypeName: d.deviceTypeName ?? 'Smart Lock',
      state: d.state ?? 0,
      stateName: d.stateName ?? 'Unknown',
      serverState: d.serverState ?? 4,
      serverStateName: d.serverStateName ?? 'offline',
      batteryCritical: !!d.batteryCritical,
      batteryCharging: !!d.batteryCharging,
      batteryChargeState: d.batteryChargeState ?? 0,
      keypadBatteryCritical: !!d.keypadBatteryCritical,
      doorsensorState: d.doorsensorState ?? 255,
      doorsensorStateName: d.doorsensorStateName ?? 'Undefined',
      dateCreated: d.dateCreated ?? new Date().toISOString(),
      dateUpdated: d.dateUpdated ?? new Date().toISOString(),
      virtualDevice: !!d.virtualDevice,
      recentLogs: [] as unknown[],
      authorizations: [] as unknown[],
      authCount: 0,
      activeAuthCount: 0,
    }));

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