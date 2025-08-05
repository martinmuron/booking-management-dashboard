import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Debug database endpoint called');

    // Test basic database connectivity
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic DB connectivity test:', dbTest);

    // Count total bookings
    const totalBookings = await prisma.booking.count();
    console.log('📊 Total bookings count:', totalBookings);

    // Get first 5 bookings with full details
    const sampleBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    console.log('📋 Sample bookings:', sampleBookings.length);

    // Check if there are any bookings at all
    const anyBooking = await prisma.booking.findFirst();
    console.log('🔍 First booking exists:', !!anyBooking);

    // Get all booking IDs to see what's in there
    const allBookingIds = await prisma.booking.findMany({
      select: { id: true, hostAwayId: true, guestLeaderName: true, createdAt: true },
      take: 10
    });
    console.log('🆔 All booking IDs (first 10):', allBookingIds);

    return NextResponse.json({
      success: true,
      database: {
        connectivity: 'OK',
        totalBookings,
        sampleBookingsCount: sampleBookings.length,
        hasAnyBooking: !!anyBooking,
        allBookingIds: allBookingIds,
        sampleBookings: sampleBookings.map(b => ({
          id: b.id,
          hostAwayId: b.hostAwayId,
          guestName: b.guestLeaderName,
          checkInDate: b.checkInDate,
          createdAt: b.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}