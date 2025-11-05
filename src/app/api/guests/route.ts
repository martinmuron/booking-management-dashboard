import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/database';
import { guestSchema, type GuestSubmission } from '@/lib/guest-validation';
import { DEFAULT_PHONE_CODE } from '@/data/phone-codes';

const saveGuestsSchema = z.object({
  token: z.string().trim().min(1, 'Check-in token is required'),
  guests: z.array(guestSchema).min(1, 'At least one guest is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveGuestsSchema.safeParse(body);

    if (!parsed.success) {
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

    const { token, guests } = parsed.data;

    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token },
      select: {
        id: true,
        numberOfGuests: true,
        status: true,
        guestLeaderEmail: true,
        guestLeaderPhone: true
      }
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in token' },
        { status: 404 }
      );
    }

    // Allow partial guest saves - users can save 1+ guests and add more later
    // Check-in completion will still require all guests to be registered

    await prisma.$transaction(async (tx) => {
      await tx.guest.deleteMany({
        where: { bookingId: booking.id }
      });

      await tx.guest.createMany({
        data: guests.map((guest: GuestSubmission, index: number) => ({
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
        }))
      });

      // Keep lead contact in sync when provided
      const leadGuest = guests[0];
      if (leadGuest) {
        const contactUpdates: Record<string, string | null> = {};
        if (leadGuest.email && leadGuest.email !== booking.guestLeaderEmail) {
          contactUpdates.guestLeaderEmail = leadGuest.email;
        }
        if (leadGuest.phone && leadGuest.phone !== booking.guestLeaderPhone) {
          contactUpdates.guestLeaderPhone = leadGuest.phone;
        }

        if (Object.keys(contactUpdates).length > 0) {
          await tx.booking.update({
            where: { id: booking.id },
            data: contactUpdates
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        guestCount: guests.length
      },
      message: 'Guest details saved successfully'
    });
  } catch (error) {
    console.error('Error saving guest information:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save guest information' },
      { status: 500 }
    );
  }
}
