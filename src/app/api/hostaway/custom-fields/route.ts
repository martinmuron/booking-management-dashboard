import { NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET() {
  try {
    console.log('🔍 API: Getting HostAway custom fields...');
    
    const result = await hostAwayService.getCustomFields();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Custom fields retrieved',
        fields: result.fields,
        nickJennyFieldId: result.nickJennyFieldId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Failed to get custom fields'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Custom fields API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Custom fields API failed'
    }, { status: 500 });
  }
}