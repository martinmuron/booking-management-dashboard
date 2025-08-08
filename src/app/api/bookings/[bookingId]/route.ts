import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    
    console.log('🔍 Looking for booking with ID:', bookingId);
    
    // First try to find by internal database ID
    let booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true
      }
    });
    
    // If not found, try to find by HostAway ID
    if (!booking) {
      console.log('🔍 Not found by database ID, trying HostAway ID...');
      booking = await prisma.booking.findUnique({
        where: { hostAwayId: bookingId },
        include: {
          guests: true,
          payments: true,
          virtualKeys: true
        }
      });
    }
    
    if (!booking) {
      console.log('❌ Booking not found with either ID:', bookingId);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    console.log('✅ Found booking:', {
      id: booking.id,
      hostAwayId: booking.hostAwayId,
      propertyName: booking.propertyName
    });

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('❌ Error fetching booking:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const body = await request.json();
    
    console.log('🔄 Updating booking with ID:', bookingId);
    
    // First check if booking exists by database ID
    let booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    
    // If not found, try HostAway ID
    if (!booking) {
      booking = await prisma.booking.findUnique({
        where: { hostAwayId: bookingId }
      });
    }
    
    if (!booking) {
      console.log('❌ Booking not found for update:', bookingId);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update using the actual database ID
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: body.status,
        updatedAt: new Date()
      },
      include: {
        guests: true,
        payments: true,
        virtualKeys: true
      }
    });

    console.log('✅ Updated booking:', {
      id: updatedBooking.id,
      status: updatedBooking.status
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking
    });

  } catch (error) {
    console.error('❌ Error updating booking:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}