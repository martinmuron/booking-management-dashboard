import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';
import { nukiApiService } from '@/services/nuki-api.service';

const RETRY_INTERVAL_MINUTES = 15;

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
    const retries = await prisma.nukiKeyRetry.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: now }
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 25
    });

    if (retries.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        completed: 0,
        rescheduled: 0,
        failed: 0,
        timestamp: now.toISOString()
      });
    }

    let completed = 0;
    let rescheduled = 0;
    let failed = 0;

    for (const retry of retries) {
      const nextAttemptAt = new Date(Date.now() + RETRY_INTERVAL_MINUTES * 60 * 1000);

      await prisma.nukiKeyRetry.update({
        where: { id: retry.id },
        data: { status: 'PROCESSING', lastError: null }
      });

      const result = await ensureNukiKeysForBooking(retry.bookingId, {
        force: true,
        keyTypes: [retry.keyType],
        keypadCode: retry.keypadCode,
        nukiApi: nukiApiService,
      });

      if (result.status === 'created' && result.createdKeyTypes.includes(retry.keyType)) {
        await prisma.nukiKeyRetry.update({
          where: { id: retry.id },
          data: {
            status: 'COMPLETED',
            lastError: null,
            updatedAt: new Date(),
            attemptCount: retry.attemptCount + 1,
          }
        });
        completed += 1;
        continue;
      }

      const attemptCount = retry.attemptCount + 1;
      const reachedLimit = attemptCount >= retry.maxAttempts;

      if (result.status === 'queued' || (result.status === 'created' && result.queuedKeyTypes.includes(retry.keyType))) {
        if (reachedLimit) {
          await prisma.nukiKeyRetry.update({
            where: { id: retry.id },
            data: {
              status: 'FAILED',
              attemptCount,
              lastError: 'Maximum retry attempts reached',
            }
          });
          failed += 1;
        } else {
          await prisma.nukiKeyRetry.update({
            where: { id: retry.id },
            data: {
              status: 'PENDING',
              attemptCount,
              nextAttemptAt,
              lastError: 'Device not ready yet – retry scheduled',
            }
          });
          rescheduled += 1;
        }
        continue;
      }

      if (result.status === 'already' || result.status === 'skipped') {
        await prisma.nukiKeyRetry.update({
          where: { id: retry.id },
          data: {
            status: 'COMPLETED',
            attemptCount,
            lastError: result.status === 'skipped' ? `Skipped: ${result.reason}` : null,
          }
        });
        completed += 1;
        continue;
      }

      const errorMessage = result.status === 'failed'
        ? result.error ?? result.reason
        : 'Unexpected error generating key';

      await prisma.nukiKeyRetry.update({
        where: { id: retry.id },
        data: {
          status: reachedLimit ? 'FAILED' : 'PENDING',
          attemptCount,
          lastError: errorMessage,
          nextAttemptAt: reachedLimit ? retry.nextAttemptAt : nextAttemptAt,
        }
      });

      if (reachedLimit) {
        failed += 1;
      } else {
        rescheduled += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed: retries.length,
      completed,
      rescheduled,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Nuki retry cron failed', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
