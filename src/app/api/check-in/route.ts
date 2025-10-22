import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';
import { stripe } from '@/lib/stripe-server';
import { calculateCityTaxForStay } from '@/lib/city-tax';
import type { CityTaxGuestInput } from '@/lib/city-tax';
import { z } from 'zod';
import { ensureNukiKeysForBooking, EnsureNukiKeysResult } from '@/services/auto-key.service';
import { guestSchema, type GuestSubmission } from '@/lib/guest-validation';
import { DEFAULT_PHONE_CODE } from '@/data/phone-codes';
import type { Guest as PrismaGuest, Payment as PrismaPayment, VirtualKey as PrismaVirtualKey } from '@prisma/client';

const NUKI_LEAD_TIME_MS = 3 * 24 * 60 * 60 * 1000;

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

const paymentIntentSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

const requestSchema = z.object({
  token: z.string().trim().min(1, 'Check-in token is required'),
  guests: z.array(guestSchema).min(1, 'At least one guest is required'),
  paymentIntentId: paymentIntentSchema,
});

const CHECKIN_COMPLETE_STATUSES = new Set(['CHECKED_IN', 'KEYS_DISTRIBUTED', 'COMPLETED']);

const extractRelationArray = <T>(record: unknown, key: string): T[] => {
  if (!record || typeof record !== 'object') {
    return [];
  }
  const value = (record as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as T[]) : [];
};

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
          payments: true,
          virtualKeys: true,
        }
      });
    } catch (guestError) {
      console.log('Failed to fetch guests, trying without:', guestError);
      // If guests table has issues, fetch booking without guests
      try {
        booking = await prisma.booking.findUnique({
          where: { checkInToken: token },
          include: {
            payments: true,
            virtualKeys: true,
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
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Prague'
    });

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Prague'
    });

    const bookingGuests = extractRelationArray<PrismaGuest>(booking, 'guests');
    const bookingPayments = extractRelationArray<PrismaPayment>(booking, 'payments');
    const bookingVirtualKeys = extractRelationArray<PrismaVirtualKey>(booking, 'virtualKeys');

    const cityTaxGuests = bookingGuests.map((guest) => ({
      dateOfBirth: guest.dateOfBirth,
      residenceCity: guest.residenceCity,
    }));

    const cityTaxAmount = calculateCityTaxForStay(
      cityTaxGuests,
      booking.checkInDate,
      booking.checkOutDate,
      { propertyName: booking.propertyName, propertyAddress: booking.roomNumber ?? undefined }
    );

    const normalizedStatus = booking.status?.toUpperCase?.();
    const hasPaidTax = bookingPayments.some(payment => payment.status?.toLowerCase() === 'paid');
    const hasSettledCityTax = cityTaxAmount === 0 || hasPaidTax;
    const canRevealAccess = Boolean(
      normalizedStatus && CHECKIN_COMPLETE_STATUSES.has(normalizedStatus) && hasSettledCityTax
    );

    const responseBooking = Object.assign({}, enrichedBooking, {
      checkInDateLabel: dateFormatter.format(new Date(booking.checkInDate)),
      checkOutDateLabel: dateFormatter.format(new Date(booking.checkOutDate)),
      checkInTimeLabel: timeFormatter.format(new Date(booking.checkInDate)),
      checkOutTimeLabel: timeFormatter.format(new Date(booking.checkOutDate))
    });

    Object.assign(responseBooking, {
      guests: bookingGuests,
      payments: bookingPayments,
      virtualKeys: canRevealAccess ? bookingVirtualKeys : [],
    });
    if (!canRevealAccess) {
      responseBooking.universalKeypadCode = null;
    }

    return NextResponse.json({
      success: true,
      data: { booking: responseBooking },
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
      phoneCountryCode: guest.phoneCountryCode ?? DEFAULT_PHONE_CODE,
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

    const now = new Date();
    const checkInDateValue = booking.checkInDate;
    const msUntilCheckIn = checkInDateValue.getTime() - now.getTime();
    const withinLeadWindow = msUntilCheckIn <= NUKI_LEAD_TIME_MS;

    let keyDistribution: EnsureNukiKeysResult | null = null;
    if (withinLeadWindow) {
      try {
        keyDistribution = await ensureNukiKeysForBooking(booking.id, { force: true });
      } catch (keyError) {
        console.error('Failed to ensure NUKI keys during check-in:', keyError);
      }
    } else {
      console.log('[NUKI] Skipping key generation outside lead window', {
        bookingId: booking.id,
        checkInDate: checkInDateValue.toISOString(),
        msUntilCheckIn,
      });
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

    const availability = {
      availableFrom: new Date(Math.max(checkInDateValue.getTime() - NUKI_LEAD_TIME_MS, now.getTime())).toISOString(),
      checkInDate: checkInDateValue.toISOString(),
      leadTimeDays: 3,
    };

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
          keys: 'keys' in keyDistribution
            ? keyDistribution.keys.map(key => ({
                id: key.id,
                keyType: key.keyType,
                nukiKeyId: key.nukiKeyId,
                isActive: key.isActive,
                createdAt: key.createdAt,
                deactivatedAt: key.deactivatedAt,
              }))
            : undefined,
          ...availability,
        }
      : {
          status: withinLeadWindow ? 'pending' : 'scheduled',
          reason: withinLeadWindow ? 'generation_pending' : 'outside_lead_window',
          universalKeypadCode: finalizedBooking.universalKeypadCode ?? null,
          ...availability,
        };

    const responseMessage = keyDistribution?.status === 'created'
      ? 'Check-in completed and digital keys generated'
      : keyDistribution?.status === 'already'
        ? 'Check-in completed; digital keys already prepared'
        : keyDistribution?.status === 'too_early'
          ? 'Check-in completed successfully. Your access codes will be available 3 days before your check-in date.'
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
