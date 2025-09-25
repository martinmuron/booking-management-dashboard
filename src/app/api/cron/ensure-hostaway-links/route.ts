import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';

const CHECK_IN_FIELD_ID = 81717;
const CHECK_IN_BASE_URL = 'https://www.nickandjenny.cz';
const MAX_BOOKINGS_PER_RUN = 50;

function getExpectedLink(token: string) {
  return `${CHECK_IN_BASE_URL}/checkin/${token}`;
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const createdWindow = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3); // last 3 days
    const upcomingWindow = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14); // next 14 days

    const candidateBookings = await prisma.booking.findMany({
      where: {
        hostAwayId: { not: '' },
        checkInToken: { not: '' },
        OR: [
          { createdAt: { gte: createdWindow } },
          { checkInDate: { lte: upcomingWindow } }
        ]
      },
      select: {
        id: true,
        hostAwayId: true,
        checkInToken: true,
        checkInDate: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_BOOKINGS_PER_RUN
    });

    let processed = 0;
    let alreadyCorrect = 0;
    let updated = 0;
    let skipped = 0;
    const details: Array<Record<string, unknown>> = [];

    for (const booking of candidateBookings) {
      processed += 1;

      const hostAwayId = Number(booking.hostAwayId);
      if (!hostAwayId || Number.isNaN(hostAwayId)) {
        skipped += 1;
        details.push({ bookingId: booking.id, reason: 'invalid_hostaway_id' });
        continue;
      }

      try {
        const reservation = await hostAwayService.getReservationById(hostAwayId);
        if (!reservation) {
          skipped += 1;
          details.push({ bookingId: booking.id, hostAwayId, reason: 'reservation_not_found' });
          continue;
        }

        const expectedLink = getExpectedLink(booking.checkInToken);

        const existingField = reservation.customFieldValues?.find(
          field => field.customFieldId === CHECK_IN_FIELD_ID
        );

        const currentValue = existingField?.value?.trim() ?? '';
        const matches = currentValue === expectedLink || currentValue === expectedLink.replace('https://www.', 'https://');

        if (matches) {
          alreadyCorrect += 1;
          continue;
        }

        const updateResult = await hostAwayService.updateNickJennyCheckInLink(hostAwayId, expectedLink);

        if (updateResult.success) {
          updated += 1;
          details.push({ bookingId: booking.id, hostAwayId, action: 'updated' });
        } else {
          skipped += 1;
          details.push({
            bookingId: booking.id,
            hostAwayId,
            reason: 'update_failed',
            error: updateResult.error
          });
        }
      } catch (error) {
        skipped += 1;
        details.push({
          bookingId: booking.id,
          hostAwayId,
          reason: 'exception',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      updated,
      alreadyCorrect,
      skipped,
      timestamp: now.toISOString(),
      details
    });
  } catch (error) {
    console.error('❌ ensure-hostaway-links cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
