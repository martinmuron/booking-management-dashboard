import { NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/database';

export async function GET() {
  try {
    const dbHealth = await getDatabaseHealth();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      environment: process.env.NODE_ENV,
      version: '2.0.0-webhooks'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}