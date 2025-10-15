#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

const CHECK_IN_FIELD_ID = 81717;
const CHECK_IN_BASE_URL = process.env.CHECK_IN_BASE_URL ?? 'https://www.nickandjenny.cz';
const PAGE_LIMIT = 200;
const BATCH_SIZE = 5;

type ScriptStats = {
  processed: number;
  updated: number;
  alreadyHadLink: number;
  missingBooking: number;
  updateFailures: number;
  otherSkipped: number;
  verificationFailures: number;
};

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function buildCheckInLink(token: string): string {
  return `${CHECK_IN_BASE_URL.replace(/\/$/, '')}/checkin/${token}`;
}

async function verifyReservationLink(
  hostAwayService: any,
  reservationId: number,
  expectedLink: string
): Promise<{ success: boolean; actualLink?: string; error?: string }> {
  try {
    const reservation = await hostAwayService.getReservationById(reservationId);
    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    const customFieldValues = reservation.customFieldValues ?? [];
    const checkInField = customFieldValues.find(field =>
      field.customFieldId === CHECK_IN_FIELD_ID || field.id === CHECK_IN_FIELD_ID
    );
    const actualLink = checkInField?.value?.trim() ?? '';

    // Verify exact match
    if (actualLink === expectedLink) {
      return { success: true, actualLink };
    }

    // Check for common issues
    if (!actualLink) {
      return { success: false, error: 'Link is empty', actualLink };
    }
    if (actualLink.endsWith('/')) {
      return { success: false, error: 'Link has trailing slash', actualLink };
    }
    if (actualLink.includes('?') || actualLink.includes('#')) {
      return { success: false, error: 'Link has query params or fragments', actualLink };
    }
    if (actualLink !== expectedLink) {
      return { success: false, error: 'Link does not match expected value', actualLink };
    }

    return { success: false, error: 'Unknown verification issue', actualLink };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  let disconnectDatabase: (() => Promise<void>) | null = null;

  const stats: ScriptStats = {
    processed: 0,
    updated: 0,
    alreadyHadLink: 0,
    missingBooking: 0,
    updateFailures: 0,
    otherSkipped: 0,
    verificationFailures: 0
  };

  try {
    const { prisma, disconnectDatabase: disconnectDb } = await import('@/lib/database');
    const { hostAwayService } = await import('@/services/hostaway.service');

    disconnectDatabase = disconnectDb;

    const getReservationsFromToday = async () => {
      const reservationIds: number[] = [];
      let offset = 0;
      const checkInDateFrom = getTodayDateString();

      while (true) {
        const response = await hostAwayService.getReservations({
          limit: PAGE_LIMIT,
          offset,
          checkInDateFrom
        });

        if (!response) {
          break;
        }

        const data = Array.isArray(response) ? response : response.data;
        const totalCount = Array.isArray(response) ? data.length : response.totalCount ?? 0;

        if (!data || data.length === 0) {
          break;
        }

        reservationIds.push(...data.map(reservation => reservation.id));

        offset += PAGE_LIMIT;
        if (offset >= totalCount) {
          break;
        }
      }

      return reservationIds;
    };

    console.log('🚀 Starting Hostaway check-in link population script');
    console.log('   Fetching reservations with arrival date >= today');

    const reservationIds = await getReservationsFromToday();
    console.log(`   Found ${reservationIds.length} reservations to evaluate`);

    const totalBatches = Math.ceil(reservationIds.length / BATCH_SIZE);
    console.log(`   Processing in batches of ${BATCH_SIZE} (${totalBatches} total batches)\n`);

    // Process in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, reservationIds.length);
      const batchIds = reservationIds.slice(batchStart, batchEnd);

      console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches} (Reservations ${batchStart + 1}-${batchEnd} of ${reservationIds.length})`);
      console.log('─'.repeat(60));

      // Track updates in this batch for verification
      const batchUpdates: Array<{ reservationId: number; expectedLink: string }> = [];

      // Process each reservation in the batch
      for (const reservationId of batchIds) {
        stats.processed += 1;

        const fullReservation = await hostAwayService.getReservationById(reservationId);
        if (!fullReservation) {
          stats.otherSkipped += 1;
          console.warn(`⚠️  Hostaway reservation ${reservationId} not found during refresh`);
          continue;
        }

        const customFieldValues = fullReservation.customFieldValues ?? [];
        const checkInField = customFieldValues.find(field =>
          field.customFieldId === CHECK_IN_FIELD_ID || field.id === CHECK_IN_FIELD_ID
        );
        const currentValue = checkInField?.value?.trim() ?? '';

        if (currentValue) {
          stats.alreadyHadLink += 1;
          console.log(`   ℹ️  Reservation ${reservationId} already has link`);
          continue;
        }

        const booking = await prisma.booking.findUnique({
          where: { hostAwayId: reservationId.toString() },
          select: {
            id: true,
            checkInToken: true
          }
        });

        if (!booking || !booking.checkInToken) {
          stats.missingBooking += 1;
          console.warn(
            `⚠️  No booking or check-in token found for Hostaway reservation ${reservationId}`
          );
          continue;
        }

        const expectedLink = buildCheckInLink(booking.checkInToken);

        const updateResult = await hostAwayService.updateNickJennyCheckInLink(
          reservationId,
          expectedLink
        );

        if (updateResult.success) {
          stats.updated += 1;
          console.log(`   ✅ Updated reservation ${reservationId}`);
          batchUpdates.push({ reservationId, expectedLink });
        } else {
          stats.updateFailures += 1;
          console.error(
            `   ❌ Failed to update reservation ${reservationId}: ${updateResult.error ?? 'Unknown error'}`
          );
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Verify batch updates
      if (batchUpdates.length > 0) {
        console.log(`\n🔍 Verifying ${batchUpdates.length} updates...`);

        for (const { reservationId, expectedLink } of batchUpdates) {
          const verification = await verifyReservationLink(
            hostAwayService,
            reservationId,
            expectedLink
          );

          if (verification.success) {
            console.log(`   ✅ Verified reservation ${reservationId}`);
          } else {
            stats.verificationFailures += 1;
            console.error(
              `   ❌ Verification failed for reservation ${reservationId}: ${verification.error}`
            );
            if (verification.actualLink) {
              console.error(`      Expected: ${expectedLink}`);
              console.error(`      Actual:   ${verification.actualLink}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`✅ Batch ${batchIndex + 1} complete and verified`);
      } else {
        console.log(`ℹ️  Batch ${batchIndex + 1} complete (no updates needed)`);
      }
    }

    console.log('\n📊 Final Summary');
    console.log('═'.repeat(60));
    console.log(`Total processed:        ${stats.processed}`);
    console.log(`Already had link:       ${stats.alreadyHadLink}`);
    console.log(`Updated links:          ${stats.updated}`);
    console.log(`Verified successfully:  ${stats.updated - stats.verificationFailures}`);
    console.log(`Verification failures:  ${stats.verificationFailures}`);
    console.log(`Skipped (no booking):   ${stats.missingBooking}`);
    console.log(`Update failures:        ${stats.updateFailures}`);
    console.log(`Other skipped:          ${stats.otherSkipped}`);
    console.log('═'.repeat(60));

    if (stats.verificationFailures > 0) {
      console.log('\n⚠️  WARNING: Some verifications failed. Review logs above.');
    } else if (stats.updated > 0) {
      console.log('\n✅ All updates verified successfully!');
    }
  } catch (error) {
    console.error('❌ Script failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (disconnectDatabase) {
      await disconnectDatabase();
    }
  }
}

main().catch(error => {
  console.error('Unhandled error while running script:', error);
  process.exitCode = 1;
});
