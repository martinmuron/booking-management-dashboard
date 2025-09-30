import 'dotenv/config';
import { PrismaClient, BookingStatus } from '@prisma/client';
import { setTimeout as wait } from 'node:timers/promises';

import { ensureNukiKeysForBooking } from '@/services/auto-key.service';
import { nukiApiService } from '@/services/nuki-api.service';

const prisma = new PrismaClient();

const WINDOW_DAYS = 3;

async function revokeTrackedKeys(bookingId: string) {
  const keys = await prisma.virtualKey.findMany({
    where: {
      bookingId,
      isActive: true,
    },
  });

  for (const key of keys) {
    try {
      if (key.nukiKeyId) {
        await nukiApiService.revokeVirtualKey(key.nukiKeyId);
        console.log(`🔑 Revoked Nuki authorization ${key.nukiKeyId} (${key.keyType}) for booking ${bookingId}`);
        // Give Nuki a short breather to avoid hammering the API
        await wait(150);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('404')) {
        console.warn(`⚠️ Authorization ${key.nukiKeyId} already missing on Nuki (booking ${bookingId})`);
      } else {
        console.error(`❌ Failed to revoke authorization ${key.nukiKeyId} (${key.keyType}) for booking ${bookingId}:`, message);
      }
    }
  }

  await prisma.virtualKey.updateMany({
    where: { bookingId },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  });

  await prisma.virtualKey.deleteMany({ where: { bookingId } });
  await prisma.nukiKeyRetry.deleteMany({ where: { bookingId } });
}

async function regenerateKeysForWindow() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: {
        notIn: [BookingStatus.CANCELLED],
      },
      checkInDate: {
        gte: now,
        lte: windowEnd,
      },
    },
    orderBy: { checkInDate: 'asc' },
  });

  console.log(`🗓️  Found ${bookings.length} bookings within ${WINDOW_DAYS} day window`);

  for (const booking of bookings) {
    console.log(`\n=== Processing booking ${booking.id} (${booking.propertyName}) ===`);

    await revokeTrackedKeys(booking.id);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        universalKeypadCode: null,
        updatedAt: new Date(),
      },
    });

    try {
      const result = await ensureNukiKeysForBooking(booking.id, {
        force: true,
        allowEarlyGeneration: true,
      });

      console.log('✅ Key regeneration result:', {
        status: result.status,
        created: 'createdKeyTypes' in result ? result.createdKeyTypes : [],
        queued: 'queuedKeyTypes' in result ? result.queuedKeyTypes : [],
      });
    } catch (error) {
      console.error(`❌ Failed to regenerate keys for booking ${booking.id}:`, error);
    }

    await wait(300);
  }
}

(async () => {
  try {
    await regenerateKeysForWindow();
  } catch (error) {
    console.error('Unexpected failure:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
