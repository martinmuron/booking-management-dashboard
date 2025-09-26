import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { nukiApiService } from '@/services/nuki-api.service';

const BUFFER_HOURS = 4; // allow a short grace period after checkout

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
    const cutoff = new Date(now.getTime() - BUFFER_HOURS * 60 * 60 * 1000);

    const expiredKeys = await prisma.virtualKey.findMany({
      where: {
        isActive: true,
        booking: {
          checkOutDate: {
            lt: cutoff,
          }
        }
      },
      select: {
        id: true,
        nukiKeyId: true,
        bookingId: true,
      }
    });

    if (expiredKeys.length === 0) {
      return NextResponse.json({
        success: true,
        processedBookings: 0,
        revokedKeys: 0,
        timestamp: now.toISOString()
      });
    }

    const keysByBooking = expiredKeys.reduce<Map<string, string[]>>((map, key) => {
      const current = map.get(key.bookingId) ?? [];
      current.push(key.nukiKeyId);
      map.set(key.bookingId, current);
      return map;
    }, new Map());

    let revokedCount = 0;

    for (const [bookingId, keyIds] of keysByBooking.entries()) {
      try {
        await nukiApiService.revokeAllKeysForBooking(keyIds);
      } catch (revokeError) {
        console.error(`Failed to revoke expired keys for booking ${bookingId}:`, revokeError);
      }

      await prisma.virtualKey.updateMany({
        where: {
          bookingId,
          nukiKeyId: { in: keyIds }
        },
        data: {
          isActive: false,
          deactivatedAt: new Date()
        }
      });

      await prisma.nukiKeyRetry.deleteMany({
        where: {
          bookingId,
          keyType: {
            in: ['MAIN_ENTRANCE', 'ROOM', 'LUGGAGE_ROOM', 'LAUNDRY_ROOM']
          }
        }
      });

      revokedCount += keyIds.length;
    }

    return NextResponse.json({
      success: true,
      processedBookings: keysByBooking.size,
      revokedKeys: revokedCount,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Failed to clean expired Nuki keys', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
