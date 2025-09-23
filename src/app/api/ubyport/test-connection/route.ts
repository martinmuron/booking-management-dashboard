import { NextResponse } from 'next/server';
import { ubyPortService } from '@/services/ubyport.service';

export const runtime = 'nodejs';

// GET /api/ubyport/test-connection - Test UbyPort API connection
export async function GET() {
  try {
    console.log('🧪 Testing UbyPort API connection...');

    const result = await ubyPortService.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'UbyPort API connection successful',
        environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Test',
        apiUrl: process.env.NODE_ENV === 'production' 
          ? 'https://ubyport.pcr.cz/ws_uby/ws_uby.svc'
          : 'https://ubyport.pcr.cz/ws_uby_test/ws_uby.svc'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'UbyPort API connection failed'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error testing UbyPort connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test UbyPort API connection'
    }, { status: 500 });
  }
}
