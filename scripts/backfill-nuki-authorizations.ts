import { config as loadEnv } from 'dotenv';
import { PrismaClient, VirtualKeyType } from '@prisma/client';

loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.production', override: false });

const prisma = new PrismaClient();

async function main() {
  const { nukiApiService } = await import('@/services/nuki-api.service');

  const retries = await prisma.nukiKeyRetry.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      lastError: {
        contains: 'nuki_authorization_not_found',
        mode: 'insensitive',
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (retries.length === 0) {
    console.log('✅ No retries requiring reconciliation');
    return;
  }

  console.log(`🔍 Reconciling ${retries.length} Nuki retries with existing authorizations`);

  let recovered = 0;
  let skipped = 0;
  let failed = 0;

  for (const retry of retries) {
    const deviceId = Number.parseInt(retry.deviceId ?? '', 10);
    if (!Number.isFinite(deviceId)) {
      console.warn(`⚠️ Skipping retry ${retry.id}: invalid deviceId ${retry.deviceId}`);
      skipped += 1;
      continue;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: retry.bookingId },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
        universalKeypadCode: true,
        guestLeaderName: true,
      },
    });

    if (!booking) {
      console.warn(`⚠️ Skipping retry ${retry.id}: booking ${retry.bookingId} not found`);
      skipped += 1;
      continue;
    }

    const keypadCode = retry.keypadCode ?? booking.universalKeypadCode;
    if (!keypadCode) {
      console.warn(`⚠️ Skipping retry ${retry.id}: no keypad code available`);
      skipped += 1;
      continue;
    }

    const { allowedFromISO, allowedUntilISO } = nukiApiService.getAuthorizationWindowForKey(
      retry.keyType,
      booking.checkInDate,
      booking.checkOutDate,
      { deviceId }
    );

    let authorization = null;
    try {
      authorization = await nukiApiService.findAuthorizationOnDevice({
        deviceId,
        keypadCode,
        allowedFromISO,
        allowedUntilISO,
      });
    } catch (error) {
      console.error(`❌ Failed to query Nuki for retry ${retry.id}:`, error);
      failed += 1;
      continue;
    }

    if (!authorization) {
      console.warn(`⚠️ No authorization found for retry ${retry.id} (booking ${retry.bookingId})`);
      failed += 1;
      continue;
    }

    try {
      await prisma.virtualKey.upsert({
        where: { nukiKeyId: authorization.id },
        update: {
          bookingId: retry.bookingId,
          keyType: retry.keyType as VirtualKeyType,
          isActive: true,
          deactivatedAt: null,
        },
        create: {
          bookingId: retry.bookingId,
          keyType: retry.keyType as VirtualKeyType,
          nukiKeyId: authorization.id,
          isActive: true,
        },
      });

      await prisma.nukiKeyRetry.update({
        where: { id: retry.id },
        data: {
          status: 'COMPLETED',
          attemptCount: retry.attemptCount + 1,
          lastError: 'Recovered existing Nuki authorization',
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Reconciled ${retry.bookingId} / ${retry.keyType} with authorization ${authorization.id}`);
      recovered += 1;
    } catch (error) {
      console.error(`❌ Failed to persist reconciliation for retry ${retry.id}:`, error);
      failed += 1;
    }
  }

  console.log(`\nSummary: recovered=${recovered}, skipped=${skipped}, failed=${failed}`);
}

main()
  .catch((error) => {
    console.error('Unexpected error while reconciling Nuki authorizations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
