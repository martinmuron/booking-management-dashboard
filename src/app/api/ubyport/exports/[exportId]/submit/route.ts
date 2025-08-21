import { NextRequest, NextResponse } from 'next/server';
import { ubyPortService } from '@/services/ubyport.service';

// POST /api/ubyport/exports/[exportId]/submit - Mark export as submitted to Czech police
export async function POST(
  request: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const { exportId } = params;

    console.log(`✅ Marking UbyPort export ${exportId} as submitted...`);

    const result = await ubyPortService.markAsSubmitted(exportId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to mark export as submitted'
      }, { status: 400 });
    }

  } catch (error) {
    console.error(`❌ Error marking export ${params.exportId} as submitted:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to mark export as submitted'
    }, { status: 500 });
  }
}