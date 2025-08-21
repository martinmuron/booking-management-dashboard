import { NextRequest, NextResponse } from 'next/server';
import { ubyPortService } from '@/services/ubyport.service';

// GET /api/ubyport/exports - Get all UbyPort exports with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Getting UbyPort exports...', { status, limit, offset });

    if (status === 'pending') {
      // Get pending exports that need to be submitted
      const result = await ubyPortService.getPendingExports();
      return NextResponse.json(result);
    }

    // Get stats if requested
    if (searchParams.get('stats') === 'true') {
      const result = await ubyPortService.getExportStats();
      return NextResponse.json(result);
    }

    // Default: get all exports (could add pagination later)
    return NextResponse.json({
      success: true,
      message: 'UbyPort exports endpoint ready',
      note: 'Use ?stats=true for statistics or ?status=pending for pending exports'
    });

  } catch (error) {
    console.error('❌ Error getting UbyPort exports:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to get UbyPort exports'
    }, { status: 500 });
  }
}

// POST /api/ubyport/exports - Create UbyPort export for a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'bookingId is required'
      }, { status: 400 });
    }

    console.log(`📤 Creating UbyPort export for booking ${bookingId}...`);

    const result = await ubyPortService.generateExportOnCheckIn(bookingId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        exportId: result.exportId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to create UbyPort export'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error creating UbyPort export:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create UbyPort export'
    }, { status: 500 });
  }
}