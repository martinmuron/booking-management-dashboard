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

      // Check if the previous error was due to invalid keypad code
      const isKeypadCodeError = retry.lastError &&
        (retry.lastError.includes('code\' is not valid') ||
         retry.lastError.includes('keypad code') ||
         retry.lastError.includes('parameter \'code\''));

      // Generate new keypad code if the previous attempt failed due to code validation
      const keypadCodeToUse = isKeypadCodeError ? undefined : retry.keypadCode;

      const result = await ensureNukiKeysForBooking(retry.bookingId, {
        force: true,
        keyTypes: [retry.keyType],
        keypadCode: keypadCodeToUse, // undefined = generate new code
        nukiApi: nukiApiService,
      });

      if (result.status === 'created' && result.createdKeyTypes.includes(retry.keyType)) {
        // Update the retry record with the new successful keypad code if it was regenerated
        const updateData: Parameters<typeof prisma.nukiKeyRetry.update>[0]['data'] = {
          status: 'COMPLETED',
          lastError: null,
          updatedAt: new Date(),
          attemptCount: retry.attemptCount + 1,
        };

        // If we generated a new keypad code and it succeeded, update the retry record
        if (isKeypadCodeError && result.universalKeypadCode) {
          updateData.keypadCode = result.universalKeypadCode;
        }

        await prisma.nukiKeyRetry.update({
          where: { id: retry.id },
          data: updateData
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

      // Check if the failure is due to duplicate keypad code (409 conflict)
      // This means the key effectively already exists and should be treated as success
      const isDuplicateCodeError = result.status === 'failed' &&
        result.error &&
        (result.error.includes('code\' exists already') ||
         result.error.includes('409') && result.error.includes('exists already'));

      if (isDuplicateCodeError) {
        await prisma.nukiKeyRetry.update({
          where: { id: retry.id },
          data: {
            status: 'COMPLETED',
            attemptCount,
            lastError: `Completed: Keypad code already exists (key effectively created)`,
          }
        });
        completed += 1;
        continue;
      }

      // Check if the failure is due to invalid keypad code format
      // Generate a new keypad code and retry immediately
      const isInvalidCodeError = result.status === 'failed' &&
        result.error &&
        (result.error.includes('is not valid') && result.error.includes('code'));

      if (isInvalidCodeError && !reachedLimit) {
        console.log(`[NUKI-RETRY] Invalid keypad code detected for ${retry.bookingId}:${retry.keyType}, generating new code`);

        // Generate new keypad code (6-digit format)
        const generateKeypadCode = (): string => {
          const min = 100000;
          const max = 999999;
          let code: string;
          let attempts = 0;

          do {
            code = Math.floor(min + Math.random() * (max - min + 1)).toString();
            attempts++;
            if (attempts > 100) {
              code = '685247'; // fallback
              break;
            }
          } while (!/^\d{6}$/.test(code) || new Set(code.split('')).size === 1);

          return code;
        };

        const newKeypadCode = generateKeypadCode();

        await prisma.nukiKeyRetry.update({
          where: { id: retry.id },
          data: {
            status: 'PENDING',
            attemptCount,
            keypadCode: newKeypadCode,
            lastError: `Generated new keypad code ${newKeypadCode} (previous code invalid)`,
            nextAttemptAt: new Date(Date.now() + 30 * 1000), // retry in 30 seconds
          }
        });
        rescheduled += 1;
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
