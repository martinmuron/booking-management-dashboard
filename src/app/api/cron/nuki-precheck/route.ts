import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';

// POST /api/cron/nuki-precheck - Pre-generate Nuki keys 3 days before arrival
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
    windowEnd.setDate(windowEnd.getDate() + 3);
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

    const results: Array<{ bookingId: string; status: string; reason?: string; error?: string; queuedKeyTypes?: string[] }> = [];

    for (const booking of candidateBookings) {
      processed += 1;

      try {
        const result = await ensureNukiKeysForBooking(booking.id, { force: true });

        if (result.status === 'created') {
          created += 1;
          console.log(`✅ [NUKI-PRECHECK] Keys created for booking ${booking.id} (${booking.propertyName})`);
          results.push({
            bookingId: booking.id,
            hostAwayId: booking.hostAwayId,
            propertyName: booking.propertyName,
            checkInDate: booking.checkInDate,
            status: 'created',
            queuedKeyTypes: result.queuedKeyTypes,
          });
        } else if (result.status === 'already') {
          already += 1;
          results.push({
            bookingId: booking.id,
            hostAwayId: booking.hostAwayId,
            propertyName: booking.propertyName,
            status: 'already'
          });
        } else if (result.status === 'queued') {
          skipped += 1;
          console.warn(`⏳ [NUKI-PRECHECK] Keys queued for retry: ${booking.id} (${booking.propertyName}) - missing: ${result.queuedKeyTypes.join(', ')}`);
          results.push({
            bookingId: booking.id,
            hostAwayId: booking.hostAwayId,
            propertyName: booking.propertyName,
            checkInDate: booking.checkInDate,
            status: 'queued',
            reason: 'retry_scheduled',
            queuedKeyTypes: result.queuedKeyTypes,
          });
        } else if (result.status === 'skipped') {
          skipped += 1;
          if (result.reason !== 'property_not_authorized') {
            console.warn(`⚠️ [NUKI-PRECHECK] Booking skipped: ${booking.id} (${booking.propertyName}) - reason: ${result.reason}`);
          }
          results.push({
            bookingId: booking.id,
            hostAwayId: booking.hostAwayId,
            propertyName: booking.propertyName,
            status: 'skipped',
            reason: result.reason
          });
        } else if (result.status === 'failed') {
          failed += 1;
          console.error(`❌ [NUKI-PRECHECK] Key generation failed for booking ${booking.id} (${booking.propertyName}) - ${result.error}`);
          results.push({
            bookingId: booking.id,
            hostAwayId: booking.hostAwayId,
            propertyName: booking.propertyName,
            checkInDate: booking.checkInDate,
            status: 'failed',
            reason: result.reason,
            error: result.error
          });
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

    // Log comprehensive summary for admin monitoring
    const totalIssues = failed + results.filter(r => r.status === 'queued').length;
    if (totalIssues > 0) {
      console.warn(`🔍 [NUKI-PRECHECK] Summary - Issues detected requiring attention:`, {
        totalProcessed: processed,
        successRate: `${Math.round(((created + already) / processed) * 100)}%`,
        issuesRequiringAttention: totalIssues,
        breakdown: {
          newKeysCreated: created,
          alreadyExisted: already,
          queuedForRetry: results.filter(r => r.status === 'queued').length,
          failed: failed,
          skippedNoAccess: results.filter(r => r.status === 'skipped' && r.reason === 'property_not_authorized').length
        },
        criticalBookings: results.filter(r => r.status === 'failed' || (r.status === 'queued' && r.queuedKeyTypes?.includes('MAIN_ENTRANCE'))),
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`✅ [NUKI-PRECHECK] All bookings processed successfully - no issues detected`);
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
