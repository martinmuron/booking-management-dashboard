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

async function fetchJson<T>(url: string, apiKey: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const apiKey = process.env.NUKI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, data: [] });
    }
    const token = String(apiKey);

    // Fetch devices first
    const devices = await fetchJson<unknown[]>(`${NUKI_BASE}/smartlock`, token);
    const safeDevices = Array.isArray(devices) ? (devices as Array<Record<string, unknown>>) : [];

    const deviceMap = new Map<number, Record<string, unknown>>();
    const deviceIds: number[] = [];
    for (const d of safeDevices) {
      const id = (d.smartlockId as number) ?? (d.id as number);
      if (typeof id === 'number') {
        deviceMap.set(id, d);
        deviceIds.push(id);
      }
    }

    // Rate-limited per-device auth fetch (concurrency 3)
    const results: Array<{ deviceId: number; auths: Array<Record<string, unknown>> }> = [];
    const concurrency = 3;
    let index = 0;

    async function worker() {
      while (index < deviceIds.length) {
        const i = index++;
        const devId = deviceIds[i];
        const auths = await fetchJson<unknown[]>(`${NUKI_BASE}/smartlock/${devId}/auth`, token);
        results.push({ deviceId: devId, auths: Array.isArray(auths) ? (auths as Array<Record<string, unknown>>) : [] });
        // tiny delay to be gentle
        await new Promise(r => setTimeout(r, 150));
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, deviceIds.length) }, () => worker()));

    const now = Date.now();

    // Flatten and enrich
    const keys = results.flatMap(({ deviceId, auths }) => {
      return auths.map(a => {
        const id = (a.id as number) ?? 0;
        const name = (a.name as string) ?? 'Authorization';
        const enabled = !!(a.enabled as boolean);
        const type = (a.type as number) ?? 0;
        const typeName = (a.typeName as string) ?? 'Authorization';
        const creationDate = (a.creationDate as string) ?? '';
        const lastActiveDate = (a.lastActiveDate as string) ?? '';
        const allowedFromDate = (a.allowedFromDate as string) || undefined;
        const allowedUntilDate = (a.allowedUntilDate as string) || undefined;
        const allowedWeekDays = (a.allowedWeekDays as number) || undefined;
        const allowedFromTime = (a.allowedFromTime as number) || undefined;
        const allowedUntilTime = (a.allowedUntilTime as number) || undefined;

        const rawFrom = (allowedFromDate ?? '') as string;
        const rawUntil = (allowedUntilDate ?? '') as string;
        const isExpired = rawUntil ? new Date(rawUntil).getTime() < now : false;
        const isActiveWindow = rawFrom && rawUntil
          ? new Date(rawFrom).getTime() <= now && new Date(rawUntil).getTime() >= now
          : enabled;

        const dev = deviceMap.get(deviceId);

        return {
          id,
          name,
          enabled,
          type,
          typeName,
          deviceId,
          deviceName: (dev?.name as string) || `Device ${deviceId}`,
          deviceStateName: (dev?.stateName as string) || undefined,
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
    });

    return NextResponse.json({ success: true, data: keys });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
} 