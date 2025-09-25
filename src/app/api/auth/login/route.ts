import { NextRequest, NextResponse } from 'next/server';
import { validateAdminLogin } from '@/services/admin-credentials.service';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const isValid = await validateAdminLogin(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set('admin_session', 'ok', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (error) {
    console.error('Failed to process admin login:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process login' },
      { status: 400 }
    );
  }
}
