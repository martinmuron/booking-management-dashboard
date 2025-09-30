import { NextResponse } from 'next/server';
import { ubyPortService } from '@/services/ubyport.service';

export async function GET() {
  try {
    console.log('🧪 Testing UbyPort connection...');

    const result = await ubyPortService.testConnection();

    // Include more debug info with character inspection
    const username = process.env.UBYPORT_USERNAME || '';
    const password = process.env.UBYPORT_PASSWORD || '';

    const debugInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasUsername: !!username,
      hasPassword: !!password,
      usernameLength: username.length,
      passwordLength: password.length,
      usernameFirstChar: username.charCodeAt(0) || 0,
      usernameLastChar: username.charCodeAt(username.length - 1) || 0,
      passwordFirstChar: password.charCodeAt(0) || 0,
      passwordLastChar: password.charCodeAt(password.length - 1) || 0,
      usernameHex: Buffer.from(username).toString('hex'),
      passwordHex: Buffer.from(password).toString('hex')
    };

    return NextResponse.json({
      success: result.success,
      message: result.message,
      error: result.error,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing UbyPort connection:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test UbyPort connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
