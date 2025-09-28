import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'development-secret';

  return NextResponse.json({
    authHeader,
    cronSecretLength: cronSecret.length,
    cronSecretFirst10: cronSecret.substring(0, 10),
    cronSecretLast10: cronSecret.substring(cronSecret.length - 10),
    expectedAuth: `Bearer ${cronSecret}`,
    matches: authHeader === `Bearer ${cronSecret}`,
  });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'development-secret';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        debug: {
          authHeader,
          cronSecretLength: cronSecret.length,
          expectedAuth: `Bearer ${cronSecret}`,
          matches: authHeader === `Bearer ${cronSecret}`,
        }
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Authentication successful!',
    cronSecretLength: cronSecret.length,
  });
}