import { NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

export async function GET() {
  try {
    const apiKey = process.env.NUKI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, data: [] });
    }
    const res = await fetch(`${NUKI_BASE}/smartlock`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return NextResponse.json({ success: true, data: [] });
    const devices: unknown = await res.json();
    const safeDevices = Array.isArray(devices) ? devices : [];
    return NextResponse.json({ success: true, data: safeDevices });
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}