import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { stripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/database';

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

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        numberOfGuests: true
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is cancelled' },
        { status: 400 }
      );
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Booking is already completed' },
        { status: 400 }
      );
    }

    const guests = await prisma.guest.findMany({
      where: { bookingId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        residenceCity: true,
        residenceCountry: true,
        documentNumber: true
      }
    });

    if (guests.length !== booking.numberOfGuests) {
      return NextResponse.json(
        {
          error: `Please register exactly ${booking.numberOfGuests} guest${booking.numberOfGuests === 1 ? '' : 's'} before paying the city tax.`
        },
        { status: 400 }
      );
    }

    const incompleteGuest = guests.find((guest) => (
      !guest.firstName
      || !guest.lastName
      || !guest.dateOfBirth
      || !guest.residenceCity
      || !guest.residenceCountry
      || !guest.documentNumber
    ));

    if (incompleteGuest) {
      return NextResponse.json(
        {
          error: 'Guest registration is incomplete. Please verify all guest details before paying the city tax.'
        },
        { status: 400 }
      );
    }

    if (booking.status === 'PENDING' || booking.status === 'PAYMENT_PENDING') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'PAYMENT_PENDING' },
      });
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
    const stripeError = error as Stripe.errors.StripeError;

    console.error('Error creating payment intent:', {
      message: stripeError?.message,
      type: stripeError?.type,
      code: stripeError?.code,
      statusCode: stripeError?.statusCode,
      detail: stripeError,
    });

    return NextResponse.json(
      {
        error: 'Failed to create payment intent',
        message: stripeError?.message || 'Unknown error',
        type: stripeError?.type,
        code: stripeError?.code,
        statusCode: stripeError?.statusCode,
      },
      { status: 500 }
    );
  }
}
