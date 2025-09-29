import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';
import { stripe } from '@/lib/stripe-server';
import { calculateCityTaxForStay } from '@/lib/city-tax';
import type { CityTaxGuestInput } from '@/lib/city-tax';
import { z } from 'zod';
import { ensureNukiKeysForBooking, EnsureNukiKeysResult } from '@/services/auto-key.service';

const canonicalizePragueAddress = (value?: string | null): string | undefined => {
  if (!value) {
    return value ?? undefined;
  }

  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalized.includes('prokopova')) {
    return 'Prokopova 197/9, 130 00 Praha 3-Žižkov';
  }

  return value;
};

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
    
    // Try to enrich booking with property address and listing ID from HostAway
    let enrichedBooking = booking;
    try {
      if (booking.hostAwayId) {
        const reservationId = Number(booking.hostAwayId.replace(/[^0-9]/g, ''));
        if (reservationId) {
          const [reservation, listings] = await Promise.all([
            hostAwayService.getReservationById(reservationId),
            hostAwayService.getListings()
          ]);

          if (reservation?.listingMapId) {
            const matchingListing = listings.find(l => l.id === reservation.listingMapId);
            if (matchingListing) {
              const canonical = canonicalizePragueAddress(matchingListing.address);
              enrichedBooking = Object.assign({}, booking, {
                propertyAddress: canonical ?? matchingListing.address,
                listingId: matchingListing.id
              });
            }
          }
        }
      }
    } catch (addressError) {
      console.log('Could not fetch property details from HostAway, continuing without:', addressError);
      // Continue without address/listingId - this is not critical
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
      console.error('Check-in validation failed:', parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Guest information is invalid',
          details: parsed.error.flatten(),
          issues: parsed.error.issues
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
      booking.checkOutDate,
      { propertyName: booking.propertyName }
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

    // Set status to PAYMENT_COMPLETED since payment requirement (if any) has been satisfied
    // - Prague guests: cityTaxAmount = 0, no payment required → PAYMENT_COMPLETED
    // - Non-Prague guests: cityTaxAmount > 0, payment verified above → PAYMENT_COMPLETED

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'PAYMENT_COMPLETED',
        updatedAt: new Date(),
        ...(leadGuest.email ? { guestLeaderEmail: leadGuest.email } : {}),
        ...(leadGuest.phone ? { guestLeaderPhone: leadGuest.phone } : {}),
      }
    });

    let keyDistribution: EnsureNukiKeysResult | null = null;
    try {
      keyDistribution = await ensureNukiKeysForBooking(booking.id, { force: true });
    } catch (keyError) {
      console.error('Failed to ensure NUKI keys during check-in:', keyError);
    }

    const keyStatus = keyDistribution?.status;
    const distributedKeys = keyStatus === 'created' || keyStatus === 'already';
    const nextStatus = distributedKeys ? 'KEYS_DISTRIBUTED' : 'CHECKED_IN';

    const bookingUpdateData: Parameters<typeof prisma.booking.update>[0]['data'] = {
      status: nextStatus,
      updatedAt: new Date(),
    };

    if (keyDistribution && 'universalKeypadCode' in keyDistribution) {
      const universalCode = keyDistribution.universalKeypadCode;
      if (universalCode) {
        bookingUpdateData.universalKeypadCode = universalCode;
      }
    }

    const finalizedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: bookingUpdateData,
      select: {
        status: true,
        universalKeypadCode: true,
      },
    });

    const keySummary = keyDistribution
      ? {
          status: keyDistribution.status,
          reason: 'reason' in keyDistribution ? keyDistribution.reason : undefined,
          keyCount: 'keys' in keyDistribution ? keyDistribution.keys.length : undefined,
          universalKeypadCode:
            'universalKeypadCode' in keyDistribution
              ? keyDistribution.universalKeypadCode
              : finalizedBooking.universalKeypadCode ?? null,
          error: keyDistribution.status === 'failed' ? keyDistribution.error : undefined,
        }
      : null;

    const responseMessage = keyDistribution?.status === 'created'
      ? 'Check-in completed and digital keys generated'
      : keyDistribution?.status === 'already'
        ? 'Check-in completed; digital keys already prepared'
        : 'Check-in completed successfully';

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: finalizedBooking.status,
        cityTaxAmount,
        universalKeypadCode: finalizedBooking.universalKeypadCode ?? null,
        keyDistribution: keySummary,
      },
      message: responseMessage,
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
