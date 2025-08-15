import { NextResponse } from 'next/server';

const NUKI_BASE = 'https://api.nuki.io';

export async function GET() {
  try {
    const apiKey = process.env.NUKI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, data: { authorizations: [] } });
    }
    const res = await fetch(`${NUKI_BASE}/smartlock/auth`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return NextResponse.json({ success: true, data: { authorizations: [] } });
    const auths: unknown = await res.json();
    const safeAuths = Array.isArray(auths) ? auths : [];
    return NextResponse.json({ success: true, data: { authorizations: safeAuths } });
  } catch {
    return NextResponse.json({ success: true, data: { authorizations: [] } });
  }
}