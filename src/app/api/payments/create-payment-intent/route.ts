import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const { amount, bookingId, guestCount } = await request.json();

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields: amount and bookingId' },
        { status: 400 }
      );
    }

    // Create payment intent for city tax
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert CZK to haléře
      currency: 'czk',
      metadata: {
        bookingId,
        guestCount: guestCount?.toString() || '1',
        type: 'city_tax'
      },
      description: `City Tax Payment - Booking ${bookingId}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
