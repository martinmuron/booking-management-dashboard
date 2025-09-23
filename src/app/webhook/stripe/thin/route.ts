import type Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

import { config } from '@/lib/config';
import { stripe } from '@/lib/stripe-server';
import { addWebhookLog } from '@/lib/webhook-logs';
import { handleStripeEvent } from '@/services/stripe-webhook.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const thinSecret = config.stripe.webhookSecrets.thin;

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ success: false, error: 'Missing Stripe signature' }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, thinSecret) as Stripe.Event;
  } catch (error) {
    await addWebhookLog({
      eventType: 'stripe.webhook.signature_error',
      status: 'error',
      message: 'Stripe signature verification failed (thin payload)',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ success: false, error: 'Signature verification failed' }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event, 'thin');

    return NextResponse.json({ success: true, handled: result.handled, message: result.message });
  } catch (error) {
    await addWebhookLog({
      eventType: event.type,
      status: 'error',
      message: 'Unhandled error while processing Stripe webhook (thin)',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ success: false, error: 'Failed to process webhook' }, { status: 500 });
  }
}
