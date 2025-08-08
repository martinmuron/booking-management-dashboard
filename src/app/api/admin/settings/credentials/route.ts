import { NextRequest, NextResponse } from 'next/server';

const defaults = {
  email: 'nick@investmentsolutions.cz',
  password: '123456',
};

// Use a global to persist in-memory across requests in dev server
const store = globalThis as unknown as { __adminCreds?: { email: string; password: string } };

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }
    store.__adminCreds = { email, password };
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
}

export async function GET() {
  const creds = store.__adminCreds || defaults;
  return NextResponse.json({ success: true, data: { email: creds.email, hasPassword: true } });
} 