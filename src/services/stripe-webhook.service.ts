import type Stripe from 'stripe';

import type { BookingStatus } from '@prisma/client';

import { stripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/database';
import { addWebhookLog } from '@/lib/webhook-logs';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';

type PayloadStyle = 'snapshot' | 'thin';

type HandlerResult = {
  handled: boolean;
  message: string;
};

const STATUS_PRIORITY: Record<BookingStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PAYMENT_PENDING: 2,
  PAYMENT_COMPLETED: 3,
  CHECKED_IN: 4,
  KEYS_DISTRIBUTED: 5,
  COMPLETED: 6,
  CANCELLED: 99,
};

function pickHigherStatus(current: BookingStatus, proposed: BookingStatus): BookingStatus {
  if (current === 'CANCELLED') {
    return current;
  }

  return (STATUS_PRIORITY[proposed] ?? -1) > (STATUS_PRIORITY[current] ?? -1)
    ? proposed
    : current;
}

export async function handleStripeEvent(
  event: Stripe.Event,
  payloadStyle: PayloadStyle
): Promise<HandlerResult> {
  const eventType = event.type;

  switch (eventType) {
    case 'payment_intent.succeeded':
      return handlePaymentIntentEvent(event, payloadStyle, 'paid');
    case 'payment_intent.payment_failed':
      return handlePaymentIntentEvent(event, payloadStyle, 'failed');
    case 'payment_intent.canceled':
      return handlePaymentIntentEvent(event, payloadStyle, 'canceled');
    default:
      await addWebhookLog({
        eventType,
        status: 'success',
        message: `No handler for event type (${payloadStyle} payload)`
      });
      return {
        handled: false,
        message: `Unhandled event type: ${eventType}`
      };
  }
}

async function handlePaymentIntentEvent(
  event: Stripe.Event,
  payloadStyle: PayloadStyle,
  status: 'paid' | 'failed' | 'canceled'
): Promise<HandlerResult> {
  const paymentIntent = await resolvePaymentIntent(event, payloadStyle);

  if (!paymentIntent) {
    await addWebhookLog({
      eventType: event.type,
      status: 'error',
      message: `Unable to resolve payment intent from ${payloadStyle} payload`,
    });

    return {
      handled: false,
      message: 'Missing payment intent data'
    };
  }

  const bookingId = await resolveBookingId(paymentIntent);

  if (!bookingId) {
    await addWebhookLog({
      eventType: event.type,
      status: 'error',
      message: 'Payment intent is missing booking metadata and no existing payment was found',
      error: `payment_intent=${paymentIntent.id}`
    });

    return {
      handled: false,
      message: 'Booking ID missing on payment intent'
    };
  }

  const amountMinor = paymentIntent.amount_received
    ?? paymentIntent.amount
    ?? 0;
  const amountMajor = Math.round(amountMinor / 100);
  const currency = paymentIntent.currency?.toUpperCase() ?? 'CZK';
  const paidAt = paymentIntent.status === 'succeeded'
    ? new Date((paymentIntent.created ?? Math.floor(Date.now() / 1000)) * 1000)
    : null;

  await prisma.payment.upsert({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
    update: {
      bookingId,
      amount: amountMajor,
      currency,
      status,
      paidAt,
      method: 'Stripe',
    },
    create: {
      bookingId,
      amount: amountMajor,
      currency,
      status,
      stripePaymentIntentId: paymentIntent.id,
      paidAt,
      method: 'Stripe',
    },
  });

  // If payment succeeded, update booking status and generate keys
  if (status === 'paid') {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        universalKeypadCode: true,
      },
    });

    if (!booking) {
      await addWebhookLog({
        eventType: event.type,
        status: 'error',
        message: 'Payment processed but booking record was not found',
        reservationId: bookingId,
      });
    } else {
      let keyResult: Awaited<ReturnType<typeof ensureNukiKeysForBooking>> | null = null;
      try {
        // Generate Nuki keys automatically (force ensures we retry even if the
        // booking status is still pending)
        keyResult = await ensureNukiKeysForBooking(bookingId, { force: true });
      } catch (keyError) {
        await addWebhookLog({
          eventType: event.type,
          status: 'error',
          message: 'Payment processed but key generation failed',
          reservationId: bookingId,
          error: keyError instanceof Error ? keyError.message : 'Unknown error',
        });
      }

      const proposedStatus: BookingStatus = keyResult && (keyResult.status === 'created' || keyResult.status === 'already')
        ? 'KEYS_DISTRIBUTED'
        : 'PAYMENT_COMPLETED';

      const finalStatus = pickHigherStatus(booking.status, proposedStatus);

      const updateData: Parameters<typeof prisma.booking.update>[0]['data'] = {};

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

      await addWebhookLog({
        eventType: event.type,
        status: 'success',
        message: `Payment completed - booking status now ${finalStatus}${keyResult ? ` (key result: ${keyResult.status})` : ''}`,
        reservationId: bookingId,
      });
    }
  }

  await addWebhookLog({
    eventType: event.type,
    status: 'success',
    message: `Payment intent ${paymentIntent.id} stored as ${status}`,
    reservationId: paymentIntent.metadata?.bookingId ?? undefined,
  });

  return {
    handled: true,
    message: `Payment intent ${paymentIntent.id} handled`,
  };
}

async function resolvePaymentIntent(
  event: Stripe.Event,
  payloadStyle: PayloadStyle
): Promise<Stripe.PaymentIntent | null> {
  const object = event.data.object as
    | Stripe.PaymentIntent
    | { id?: string; object?: string }
    | undefined;

  if (!object) {
    return null;
  }

  if ((object as Stripe.PaymentIntent).object === 'payment_intent'
    && 'amount' in object) {
    return object as Stripe.PaymentIntent;
  }

  if (payloadStyle === 'thin' && object.id) {
    try {
      return await stripe.paymentIntents.retrieve(object.id);
    } catch (error) {
      await addWebhookLog({
        eventType: event.type,
        status: 'error',
        message: 'Failed to retrieve payment intent for thin payload',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  return null;
}

async function resolveBookingId(paymentIntent: Stripe.PaymentIntent): Promise<string | null> {
  if (paymentIntent.metadata?.bookingId) {
    return paymentIntent.metadata.bookingId;
  }

  const existingPayment = await prisma.payment.findUnique({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
    select: {
      bookingId: true,
    },
  });

  return existingPayment?.bookingId ?? null;
}
