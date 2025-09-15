import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId, customFieldId, value } = body;

    if (!reservationId || !customFieldId || !value) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: reservationId, customFieldId, value'
      }, { status: 400 });
    }

    console.log(`🔄 API: Updating custom field ${customFieldId} for reservation ${reservationId}`);
    
    // If it's the Nick Jenny field, use the specialized method
    if (customFieldId === 81717) {
      const result = await hostAwayService.updateNickJennyCheckInLink(
        parseInt(reservationId),
        value
      );
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Custom field updated for reservation ${reservationId}`
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to update custom field'
        }, { status: 400 });
      }
    } else {
      // For other custom fields, use a generic update (if needed in future)
      return NextResponse.json({
        success: false,
        error: 'Only Nick Jenny check-in link field is currently supported'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Update custom field API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}