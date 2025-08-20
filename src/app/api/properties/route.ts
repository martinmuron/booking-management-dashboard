import { NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET() {
  try {
    const properties = await hostAwayService.getListings();
    
    return NextResponse.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch properties',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}