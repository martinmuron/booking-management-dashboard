import { NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

function decodeWeekdays(bitmask?: number): string[] {
  if (typeof bitmask !== 'number') return [];
  const map: Array<{ name: string; bit: number }> = [
    { name: 'Mon', bit: 64 },
    { name: 'Tue', bit: 32 },
    { name: 'Wed', bit: 16 },
    { name: 'Thu', bit: 8 },
    { name: 'Fri', bit: 4 },
    { name: 'Sat', bit: 2 },
    { name: 'Sun', bit: 1 },
  ];
  return map.filter(d => (bitmask & d.bit) !== 0).map(d => d.name);
}

export async function GET() {
  try {
    const apiKey = process.env.NUKI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch devices and authorizations
    const [devRes, authRes] = await Promise.all([
      fetch(`${NUKI_BASE}/smartlock`, { headers: { Authorization: `Bearer ${apiKey}` } }),
      fetch(`${NUKI_BASE}/smartlock/auth`, { headers: { Authorization: `Bearer ${apiKey}` } })
    ]);

    if (!devRes.ok || !authRes.ok) {
      return NextResponse.json({ success: true, data: [] });
    }

    const devices: unknown = await devRes.json();
    const auths: unknown = await authRes.json();

    const safeDevices = Array.isArray(devices) ? devices as Array<Record<string, unknown>> : [];
    const safeAuths = Array.isArray(auths) ? auths as Array<Record<string, unknown>> : [];

    const deviceMap = new Map<number, Record<string, unknown>>();
    for (const d of safeDevices) {
      const id = (d.smartlockId as number) ?? (d.id as number);
      if (typeof id === 'number') deviceMap.set(id, d);
    }

    const now = Date.now();

    const keys = safeAuths.map(a => {
      const id = (a.id as number) ?? 0;
      const name = (a.name as string) ?? 'Authorization';
      const enabled = !!(a.enabled as boolean);
      const type = (a.type as number) ?? 0;
      const typeName = (a.typeName as string) ?? 'Authorization';
      const smartlockIds = Array.isArray(a.smartlockIds) ? (a.smartlockIds as number[]) : [];
      const creationDate = (a.creationDate as string) ?? '';
      const lastActiveDate = (a.lastActiveDate as string) ?? '';
      const allowedFromDate = (a.allowedFromDate as string) || undefined;
      const allowedUntilDate = (a.allowedUntilDate as string) || undefined;
      const allowedWeekDays = (a.allowedWeekDays as number) || undefined;
      const allowedFromTime = (a.allowedFromTime as number) || undefined; // minutes since midnight
      const allowedUntilTime = (a.allowedUntilTime as number) || undefined;

      const isExpired = allowedUntilDate ? new Date(allowedUntilDate).getTime() < now : false;
      const isActiveWindow = allowedFromDate && allowedUntilDate
        ? new Date(allowedFromDate).getTime() <= now && new Date(allowedUntilDate).getTime() >= now
        : enabled;

      return {
        id,
        name,
        enabled,
        type,
        typeName,
        smartlockIds,
        devices: smartlockIds.map(id => ({
          id,
          name: (deviceMap.get(id)?.name as string) || `Device ${id}`,
          stateName: (deviceMap.get(id)?.stateName as string) || undefined,
        })),
        creationDate,
        lastActiveDate,
        allowedFromDate,
        allowedUntilDate,
        allowedWeekDays,
        allowedWeekDaysDecoded: decodeWeekdays(allowedWeekDays),
        allowedFromTime,
        allowedUntilTime,
        isActive: !!enabled && !!isActiveWindow && !isExpired,
        isExpired,
      };
    });

    return NextResponse.json({ success: true, data: keys });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
} 