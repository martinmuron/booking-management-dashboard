import { prisma } from '@/lib/database';
import { VirtualKey, VirtualKeyType } from '@/types';

export class VirtualKeyService {
  // Create virtual keys for a booking
  static async createVirtualKeys(
    bookingId: string,
    keys: Array<{
      keyType: VirtualKeyType;
      nukiKeyId: string;
    }>
  ): Promise<VirtualKey[]> {
    await prisma.virtualKey.createMany({
      data: keys.map(key => ({
        ...key,
        bookingId,
      })),
    });

    return await prisma.virtualKey.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get virtual keys for a booking
  static async getVirtualKeysByBookingId(bookingId: string): Promise<VirtualKey[]> {
    return await prisma.virtualKey.findMany({
      where: { bookingId },
      orderBy: { keyType: 'asc' },
    });
  }

  // Get active virtual keys for a booking
  static async getActiveVirtualKeys(bookingId: string): Promise<VirtualKey[]> {
    return await prisma.virtualKey.findMany({
      where: {
        bookingId,
        isActive: true,
      },
      orderBy: { keyType: 'asc' },
    });
  }

  // Deactivate virtual key
  static async deactivateVirtualKey(nukiKeyId: string): Promise<VirtualKey> {
    return await prisma.virtualKey.update({
      where: { nukiKeyId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });
  }

  // Deactivate all keys for a booking
  static async deactivateAllKeysForBooking(bookingId: string): Promise<void> {
    await prisma.virtualKey.updateMany({
      where: { bookingId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });
  }

  // Reactivate virtual key
  static async reactivateVirtualKey(nukiKeyId: string): Promise<VirtualKey> {
    return await prisma.virtualKey.update({
      where: { nukiKeyId },
      data: {
        isActive: true,
        deactivatedAt: null,
      },
    });
  }

  // Check if booking has all required keys
  static async hasAllRequiredKeys(bookingId: string): Promise<boolean> {
    const requiredKeyTypes = [
      VirtualKeyType.MAIN_ENTRANCE,
      VirtualKeyType.LUGGAGE_ROOM,
      VirtualKeyType.LAUNDRY_ROOM,
      VirtualKeyType.ROOM,
    ];

    const existingKeys = await prisma.virtualKey.findMany({
      where: {
        bookingId,
        isActive: true,
      },
      select: { keyType: true },
    });

    const existingKeyTypes = existingKeys.map(key => key.keyType);
    
    return requiredKeyTypes.every(type => existingKeyTypes.includes(type));
  }

  // Get virtual key by NUKI key ID
  static async getVirtualKeyByNukiId(nukiKeyId: string): Promise<VirtualKey | null> {
    return await prisma.virtualKey.findUnique({
      where: { nukiKeyId },
    });
  }

  // Delete virtual key
  static async deleteVirtualKey(id: string): Promise<void> {
    await prisma.virtualKey.delete({
      where: { id },
    });
  }

  // Get keys expiring soon (for cleanup)
  static async getKeysExpiringBefore(date: Date): Promise<VirtualKey[]> {
    return await prisma.virtualKey.findMany({
      where: {
        isActive: true,
        booking: {
          checkOutDate: {
            lte: date,
          },
        },
      },
      include: {
        booking: true,
      },
    });
  }

  // Get virtual key statistics
  static async getVirtualKeyStats() {
    const [totalKeys, activeKeys, keysByType] = await Promise.all([
      prisma.virtualKey.count(),
      prisma.virtualKey.count({ where: { isActive: true } }),
      prisma.virtualKey.groupBy({
        by: ['keyType'],
        _count: { keyType: true },
      }),
    ]);

    return {
      totalKeys,
      activeKeys,
      inactiveKeys: totalKeys - activeKeys,
      keysByType: keysByType.reduce((acc, item) => {
        acc[item.keyType] = item._count.keyType;
        return acc;
      }, {} as Record<VirtualKeyType, number>),
    };
  }
}