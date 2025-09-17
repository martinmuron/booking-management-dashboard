import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// POST /api/virtual-keys/sync - Sync existing NUKI key to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, nukiKeyId, keyType, isActive } = body;

    if (!bookingId || !nukiKeyId || !keyType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bookingId, nukiKeyId, keyType' },
        { status: 400 }
      );
    }

    // Check if this virtual key already exists
    const existingKey = await prisma.virtualKey.findFirst({
      where: {
        bookingId,
        nukiKeyId,
      },
    });

    if (existingKey) {
      return NextResponse.json({
        success: true,
        data: existingKey,
        message: 'Virtual key already exists in database'
      });
    }

    // Create new virtual key record
    const virtualKey = await prisma.virtualKey.create({
      data: {
        bookingId,
        nukiKeyId,
        keyType,
        isActive: isActive ?? true,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: virtualKey,
      message: 'Virtual key synced successfully'
    });

  } catch (error) {
    console.error('Error syncing virtual key:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to sync virtual key' },
      { status: 500 }
    );
  }
}