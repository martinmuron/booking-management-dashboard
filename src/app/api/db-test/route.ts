import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', dbTest);
    
    // Count bookings
    const bookingCount = await prisma.booking.count();
    console.log('📊 Total bookings in database:', bookingCount);
    
    // Get first booking
    const firstBooking = await prisma.booking.findFirst({
      select: {
        id: true,
        hostAwayId: true,
        propertyName: true,
        guestLeaderName: true,
        checkInDate: true
      }
    });
    console.log('👤 First booking:', firstBooking);
    
    // Get all booking IDs to see what's there
    const allBookingIds = await prisma.booking.findMany({
      select: { id: true, hostAwayId: true },
      take: 10
    });
    console.log('🆔 First 10 booking IDs:', allBookingIds);
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        totalBookings: bookingCount,
        firstBooking: firstBooking,
        sampleIds: allBookingIds
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}