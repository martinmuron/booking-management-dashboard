import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'nick@investmentsolutions.cz';
const ADMIN_PASSWORD = '123456';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    const res = NextResponse.json({ success: true });
    // Minimal cookie-based auth token (non-secure; replace with NextAuth later)
    res.cookies.set('admin_session', 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    });
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
} 