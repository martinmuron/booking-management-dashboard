import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'eur', bookingId, guestCount } = await request.json();

    if (!amount || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount and bookingId' },
        { status: 400 }
      );
    }

    // Create payment intent for city tax
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
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