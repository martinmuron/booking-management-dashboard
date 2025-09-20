import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';
import { stripe } from '@/lib/stripe-server';
import { calculateCityTaxForStay } from '@/lib/city-tax';
import type { CityTaxGuestInput } from '@/lib/city-tax';
import { z } from 'zod';

const NAME_CHAR_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;
const ISO_ALPHA3_REGEX = /^[A-Z]{3}$/;
const DOCUMENT_NUMBER_REGEX = /^[A-Z0-9]{4,30}$/;
const PHONE_REGEX = /^[0-9+()\s-]{6,20}$/;

const isoAlpha3Schema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => ISO_ALPHA3_REGEX.test(value), {
    message: 'Must be a three-letter ISO 3166-1 alpha-3 code'
  });

const optionalIsoAlpha3Schema = z.string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => value === '' || ISO_ALPHA3_REGEX.test(value), {
    message: 'Must be a three-letter ISO 3166-1 alpha-3 code'
  })
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(64).refine((value) => NAME_CHAR_REGEX.test(value), {
    message: 'Only letters, spaces, apostrophes and hyphens are allowed'
  }),
  lastName: z.string().trim().min(1, 'Last name is required').max(64).refine((value) => NAME_CHAR_REGEX.test(value), {
    message: 'Only letters, spaces, apostrophes and hyphens are allowed'
  }),
  email: z.string().trim().max(128).email('Invalid email address').optional().or(z.literal('')).transform((value) => value ? value : undefined),
  phone: z.string().trim().refine((value) => value === '' || PHONE_REGEX.test(value), {
    message: 'Invalid phone number'
  }).optional().or(z.literal('')).transform((value) => value ? value : undefined),
  phoneCountryCode: z.string().trim().regex(/^\+[0-9]{1,6}$/, {
    message: 'Country code must start with + followed by up to 6 digits'
  }).optional().default('+420'),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required').transform((value, ctx) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date',
        path: ['dateOfBirth']
      });
      return z.NEVER;
    }

    if (parsed > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date of birth cannot be in the future',
        path: ['dateOfBirth']
      });
      return z.NEVER;
    }

    return parsed;
  }),
  nationality: isoAlpha3Schema,
  citizenship: optionalIsoAlpha3Schema,
  residenceCountry: isoAlpha3Schema,
  residenceCity: z.string().trim().min(1, 'Residence city is required').max(64),
  residenceAddress: z.string().trim().min(1, 'Residence address is required').max(128),
  purposeOfStay: z.string().trim().regex(/^\d{2}$/, { message: 'Use a two-digit purpose of stay code' }).transform((value) => value.padStart(2, '0')),
  documentType: z.string().trim().min(1, 'Document type is required').transform((value) => value.toUpperCase()),
  documentNumber: z.string().trim().transform((value) => value.toUpperCase()).refine((value) => DOCUMENT_NUMBER_REGEX.test(value), {
    message: 'Document number must be 4-30 characters (letters and numbers only)'
  }),
  visaNumber: z.string().trim().max(15).optional().or(z.literal('')).transform((value) => {
    if (!value) {
      return undefined;
    }
    return value.toUpperCase();
  }),
  notes: z.string().trim().max(255).optional().or(z.literal('')).transform((value) => value ? value : undefined)
}).transform((guest) => ({
  ...guest,
  citizenship: guest.citizenship ?? guest.nationality,
  phoneCountryCode: guest.phoneCountryCode && guest.phoneCountryCode !== '' ? guest.phoneCountryCode : '+420'
})).refine((guest) => {
  if (guest.documentNumber === 'INPASS' && !guest.notes) {
    return false;
  }
  return true;
}, {
  message: 'Notes are required when using INPASS',
  path: ['notes']
});

const requestSchema = z.object({
  token: z.string().trim().min(1, 'Check-in token is required'),
  guests: z.array(guestSchema).min(1, 'At least one guest is required'),
  paymentIntentId: z.string().trim().optional().transform((value) => value && value !== '' ? value : undefined)
});

type GuestSubmission = z.infer<typeof guestSchema>;

// GET /api/check-in - Get booking details for check-in
export async function GET(request: NextRequest) {
  let token: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Check-in token is required' },
        { status: 400 }
      );
    }
    
    let booking;
    try {
      // Try to fetch with guests first
      booking = await prisma.booking.findUnique({
        where: { checkInToken: token },
        include: {
          guests: true,
          payments: true
        }
      });
    } catch (guestError) {
      console.log('Failed to fetch guests, trying without:', guestError);
      // If guests table has issues, fetch booking without guests
      try {
        booking = await prisma.booking.findUnique({
          where: { checkInToken: token },
          include: {
            payments: true
          }
        });
        // Add empty guests array to maintain expected structure
        if (booking) {
          Object.assign(booking, { guests: [] });
        }
      } catch (bookingError) {
        console.log('Failed to fetch booking at all, trying minimal:', bookingError);
        // Last resort: try to get just the booking without any includes
        booking = await prisma.booking.findUnique({
          where: { checkInToken: token }
        });
        if (booking) {
          Object.assign(booking, { guests: [], payments: [] });
        }
      }
    }
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in token' },
        { status: 404 }
      );
    }
    
    // Try to enrich booking with property address from HostAway
    let enrichedBooking = booking;
    try {
      if (booking.hostAwayId) {
        // Get all listings to find the address
        const listings = await hostAwayService.getListings();
        const matchingListing = listings.find(l => l.id.toString() === booking.hostAwayId);
        if (matchingListing?.address) {
          // Add property address to booking response
          enrichedBooking = Object.assign({}, booking, { 
            propertyAddress: matchingListing.address 
          });
        }
      }
    } catch (addressError) {
      console.log('Could not fetch property address, continuing without:', addressError);
      // Continue without address - this is not critical
    }
    
    return NextResponse.json({
      success: true,
      data: { booking: enrichedBooking },
      message: 'Booking details fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching check-in details:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      token: token || 'undefined',
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: `Failed to fetch check-in details: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST /api/check-in - Complete check-in process
export async function POST(request: NextRequest) {
  let token: string | undefined;
  let guests: GuestSubmission[] | undefined;
  try {
    const body = await request.json();

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Guest information is invalid',
          details: parsed.error.flatten()
        },
        { status: 422 }
      );
    }

    token = parsed.data.token;
    guests = parsed.data.guests;
    const paymentIntentId = parsed.data.paymentIntentId;
    
    // Validate token and get booking
    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token }
    });
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in token' },
        { status: 404 }
      );
    }
    
    // Save guest information
    await prisma.guest.deleteMany({
      where: { bookingId: booking.id }
    });
    
    const guestData = guests.map((guest: GuestSubmission, index: number) => ({
      bookingId: booking.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      phoneCountryCode: guest.phoneCountryCode ?? '+420',
      dateOfBirth: guest.dateOfBirth,
      nationality: guest.nationality,
      citizenship: guest.citizenship ?? guest.nationality,
      residenceCountry: guest.residenceCountry,
      residenceCity: guest.residenceCity,
      residenceAddress: guest.residenceAddress,
      purposeOfStay: guest.purposeOfStay,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      visaNumber: guest.visaNumber ?? null,
      notes: guest.notes ?? null,
      isLeadGuest: index === 0
    }));

    const cityTaxAmount = calculateCityTaxForStay(
      guests as Array<CityTaxGuestInput>,
      booking.checkInDate,
      booking.checkOutDate
    );

    if (cityTaxAmount > 0) {
      if (!paymentIntentId) {
        return NextResponse.json(
          { success: false, error: 'City tax payment is required before completing check-in.' },
          { status: 400 }
        );
      }

      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (!paymentIntent) {
          return NextResponse.json(
            { success: false, error: 'Payment intent not found.' },
            { status: 400 }
          );
        }

        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json(
            { success: false, error: 'Payment has not been completed yet.' },
            { status: 400 }
          );
        }

        const expectedAmountMinor = Math.round(cityTaxAmount * 100);
        const amountReceived = paymentIntent.amount_received ?? 0;

        if (amountReceived !== expectedAmountMinor) {
          return NextResponse.json(
            { success: false, error: 'Paid amount does not match the required city tax.' },
            { status: 400 }
          );
        }

        if (paymentIntent.currency?.toLowerCase() !== 'czk') {
          return NextResponse.json(
            { success: false, error: 'Payment must be completed in CZK.' },
            { status: 400 }
          );
        }

        if (paymentIntent.metadata?.bookingId && paymentIntent.metadata.bookingId !== booking.id) {
          return NextResponse.json(
            { success: false, error: 'Payment intent does not belong to this booking.' },
            { status: 400 }
          );
        }

        const amountInCzk = Math.round(amountReceived / 100);

        await prisma.payment.upsert({
          where: { stripePaymentIntentId: paymentIntentId },
          update: {
            bookingId: booking.id,
            amount: amountInCzk,
            currency: paymentIntent.currency?.toUpperCase() || 'CZK',
            status: 'paid',
            paidAt: paymentIntent.status === 'succeeded'
              ? new Date((paymentIntent.created || Math.floor(Date.now() / 1000)) * 1000)
              : null,
          },
          create: {
            bookingId: booking.id,
            amount: amountInCzk,
            currency: paymentIntent.currency?.toUpperCase() || 'CZK',
            status: 'paid',
            stripePaymentIntentId: paymentIntentId,
            paidAt: new Date((paymentIntent.created || Math.floor(Date.now() / 1000)) * 1000)
          }
        });
      } catch (paymentError) {
        console.error('Error verifying Stripe payment intent:', paymentError);
        return NextResponse.json(
          {
            success: false,
            error: paymentError instanceof Error
              ? `Failed to verify Stripe payment: ${paymentError.message}`
              : 'Failed to verify Stripe payment.'
          },
          { status: 400 }
        );
      }
    }

    await prisma.guest.createMany({
      data: guestData
    });

    const leadGuest = guestData[0];

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CHECKED_IN',
        updatedAt: new Date(),
        ...(leadGuest.email ? { guestLeaderEmail: leadGuest.email } : {}),
        ...(leadGuest.phone ? { guestLeaderPhone: leadGuest.phone } : {}),
      }
    });
    
    // Save payment if provided
    if (paymentIntentId) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: 0, // Will be updated by Stripe webhook
          currency: 'eur',
          status: 'paid',
          stripePaymentIntentId: paymentIntentId
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: 'CHECKED_IN',
        cityTaxAmount
      },
      message: 'Check-in completed successfully'
    });
  } catch (error) {
    console.error('Error completing check-in:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      token: token || 'undefined',
      guestsCount: guests?.length,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: `Failed to complete check-in: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
