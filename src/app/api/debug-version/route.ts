import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: 'v2-with-debugging',
    timestamp: new Date().toISOString(),
    message: 'Debug version is deployed'
  });
}