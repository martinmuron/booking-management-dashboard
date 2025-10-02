import { NextRequest, NextResponse } from 'next/server';
import { BookingStatus, Prisma } from '@prisma/client';

import { prisma } from '@/lib/database';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';

const METHOD_LABELS = ['Cash', 'Stripe', 'Channel'] as const;
type ManualPaymentMethod = (typeof METHOD_LABELS)[number];
const methodSet = new Set<ManualPaymentMethod>(METHOD_LABELS);

const statusPriority: Record<BookingStatus, number> = {
  CANCELLED: -1,
  PENDING: 0,
  CONFIRMED: 1,
  PAYMENT_PENDING: 2,
  CHECKED_IN: 3,
  PAYMENT_COMPLETED: 4,
  KEYS_DISTRIBUTED: 5,
  COMPLETED: 6,
};

function pickHigherStatus(current: BookingStatus, proposed: BookingStatus): BookingStatus {
  return statusPriority[proposed] > statusPriority[current] ? proposed : current;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Booking ID is required' }, { status: 400 });
    }

    const { amount, method } = await request.json();

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (typeof method !== 'string' || !methodSet.has(method as ManualPaymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
    }

    const paymentMethod = method as ManualPaymentMethod;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        checkInDate: true,
        universalKeypadCode: true,
      }
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const paidAt = new Date();

    const existingManualPayment = await prisma.payment.findFirst({
      where: {
        bookingId,
        method: { not: null }
      }
    });

    const paymentData = {
      amount: Math.round(amount),
      currency: 'CZK',
      status: 'paid',
      paidAt,
      method: paymentMethod,
    };

    const payment = existingManualPayment
      ? await prisma.payment.update({
          where: { id: existingManualPayment.id },
          data: paymentData,
        })
      : await prisma.payment.create({
          data: {
            bookingId,
            ...paymentData,
          },
        });

    let keyResult: Awaited<ReturnType<typeof ensureNukiKeysForBooking>> | null = null;
    try {
      keyResult = await ensureNukiKeysForBooking(bookingId, { force: true });
    } catch (keyError) {
      console.error('Failed to ensure NUKI keys after manual payment:', keyError);
    }

    const proposedStatus: BookingStatus = keyResult && (keyResult.status === 'created' || keyResult.status === 'already')
      ? 'KEYS_DISTRIBUTED'
      : 'PAYMENT_COMPLETED';

    const updateData: Prisma.BookingUpdateInput = {};
    const finalStatus = pickHigherStatus(booking.status, proposedStatus);

    if (finalStatus !== booking.status) {
      updateData.status = finalStatus;
    }

    if (keyResult && 'universalKeypadCode' in keyResult) {
      const code = keyResult.universalKeypadCode;
      if (code && code !== booking.universalKeypadCode) {
        updateData.universalKeypadCode = code;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        payment,
        status: finalStatus,
      }
    });
  } catch (error) {
    console.error('Failed to record manual payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to record manual payment' }, { status: 500 });
  }
}
