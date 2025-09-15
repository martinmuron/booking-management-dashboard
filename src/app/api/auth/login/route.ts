import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_EMAIL = 'nick@investmentsolutions.cz';
const DEFAULT_PASSWORD = '123456';

// Read overrides stored in global
const store = globalThis as unknown as { __adminCreds?: { email: string; password: string } };

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const creds = store.__adminCreds || { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
    if (email !== creds.email || password !== creds.password) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_session', 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
} 