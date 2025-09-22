import { NextResponse } from 'next/server';
import { hostAwayService, type HostAwayListing } from '@/services/hostaway.service';

// Cache properties for 10 minutes to improve mobile performance
let cachedProperties: HostAwayListing[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export async function GET() {
  try {
    // Check if cache is still valid
    const now = Date.now();
    if (cachedProperties && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📋 Serving cached properties data');
      return NextResponse.json({
        success: true,
        data: cachedProperties,
        cached: true
      });
    }

    console.log('🔄 Cache miss or expired, fetching fresh properties data');
    const properties: HostAwayListing[] = await hostAwayService.getListings();
    
    // Update cache
    cachedProperties = properties;
    cacheTimestamp = now;
    
    return NextResponse.json({
      success: true,
      data: properties,
      cached: false
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
