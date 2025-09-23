import type Stripe from 'stripe';

import { stripe } from '@/lib/stripe-server';
import { prisma } from '@/lib/database';
import { addWebhookLog } from '@/lib/webhook-logs';

type PayloadStyle = 'snapshot' | 'thin';

type HandlerResult = {
  handled: boolean;
  message: string;
};

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
    },
    create: {
      bookingId,
      amount: amountMajor,
      currency,
      status,
      stripePaymentIntentId: paymentIntent.id,
      paidAt,
    },
  });

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
