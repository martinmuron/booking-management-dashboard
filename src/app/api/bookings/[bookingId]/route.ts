import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guests: true,
        payments: true
      }
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    
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
    
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: body.status,
        updatedAt: new Date()
      },
      include: {
        guests: true,
        payments: true
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}