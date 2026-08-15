import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error('STRIPE_SECRET_KEY is not set.');
    client = new Stripe(apiKey);
  }
  return client;
}

export type SelfServePlan = 'starter' | 'growth';
export type BillingPeriod = 'monthly' | 'annual';

/**
 * Enterprise is deliberately absent here — it's sales-led and
 * provisioned manually through the Master Admin Console, never through
 * this self-serve checkout path. Only Starter and Growth have Stripe
 * Price IDs at all.
 */
export function getPriceId(plan: SelfServePlan, period: BillingPeriod): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`${key} is not set — create this Price in Stripe and add its ID to your env vars.`);
  }
  return priceId;
}
