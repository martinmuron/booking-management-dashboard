import { NextResponse } from 'next/server';
import { nukiApiService } from '@/services/nuki-api.service';

// POST /api/cron/nuki-cleanup - Permanently delete expired Nuki authorizations
export async function POST() {
  try {
    console.log('🧹 Running Nuki expired authorization cleanup cron...');

    const result = await nukiApiService.cleanupExpiredAuthorizations();

    console.log('✅ Nuki cleanup cron completed:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Nuki cleanup cron failed:', error);
    return NextResponse.json({
      success: false,
      error: `Nuki cleanup cron failed: ${message}`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
