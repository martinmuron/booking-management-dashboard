import { NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET() {
  console.log('🔧 HostAway Debug endpoint called');
  
  try {
    // Test authentication first
    console.log('🔑 Testing HostAway authentication...');
    
    // Test basic reservations call with minimal params
    console.log('📋 Testing reservations API...');
    const reservations = await hostAwayService.getReservations({
      limit: 10
    });
    
    console.log('📋 Testing listings API...');
    const listings = await hostAwayService.getListings();
    
    return NextResponse.json({
      success: true,
      debug: {
        reservationsCount: reservations.length,
        listingsCount: listings.length,
        reservations: reservations.slice(0, 2), // Show first 2 for debugging
        listings: listings.slice(0, 2) // Show first 2 for debugging
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ HostAway debug error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}