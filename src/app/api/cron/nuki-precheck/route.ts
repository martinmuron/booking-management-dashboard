import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';

// POST /api/cron/nuki-precheck - Pre-generate Nuki keys 2 days before arrival
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'development-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 2);
    windowEnd.setHours(23, 59, 59, 999);

    const candidateBookings = await prisma.booking.findMany({
      where: {
        checkInDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        id: true,
        hostAwayId: true,
        propertyName: true,
        checkInDate: true,
        status: true,
        universalKeypadCode: true,
        virtualKeys: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    let processed = 0;
    let created = 0;
    let already = 0;
    let skipped = 0;
    let failed = 0;

    const results: Array<{ bookingId: string; status: string; reason?: string; error?: string }> = [];

    for (const booking of candidateBookings) {
      processed += 1;

      try {
        const result = await ensureNukiKeysForBooking(booking.id, { force: true });

        if (result.status === 'created') {
          created += 1;
          results.push({ bookingId: booking.id, status: 'created' });
        } else if (result.status === 'already') {
          already += 1;
          results.push({ bookingId: booking.id, status: 'already' });
        } else if (result.status === 'skipped') {
          skipped += 1;
          results.push({ bookingId: booking.id, status: 'skipped', reason: result.reason });
        } else if (result.status === 'failed') {
          failed += 1;
          results.push({ bookingId: booking.id, status: 'failed', reason: result.reason, error: result.error });
        } else {
          skipped += 1;
          results.push({ bookingId: booking.id, status: result.status });
        }
      } catch (error) {
        failed += 1;
        results.push({
          bookingId: booking.id,
          status: 'failed',
          reason: 'unexpected_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      created,
      already,
      skipped,
      failed,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Nuki precheck cron failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
