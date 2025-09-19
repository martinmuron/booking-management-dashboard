import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Stripe 18.x ships with a narrowed API version union; use the latest supported version.
  apiVersion: '2025-06-30.basil'
});
