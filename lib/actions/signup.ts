'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getStripeClient, getPriceId, type BillingPeriod } from '@/lib/stripe';

export type ActionState = { error?: string } | undefined;

const signupSchema = z.object({
  organizationName: z.string().trim().min(2, 'Organization name is required'),
  ownerName: z.string().trim().min(1, "Your name is required"),
  ownerEmail: z.string().trim().toLowerCase().email(),
  plan: z.literal('starter'),
  period: z.enum(['monthly', 'annual']),
});

/**
 * Public self-service is intentionally Starter-only. Growth and Enterprise
 * now use the sales-assisted TurboQuote/TurboSign → Order → Fulfillment path.
 */
export async function createCheckoutSessionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    organizationName: formData.get('organizationName'),
    ownerName: formData.get('ownerName'),
    ownerEmail: formData.get('ownerEmail'),
    plan: formData.get('plan'),
    period: formData.get('period'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.ownerEmail } });
  if (existingUser) {
    return { error: 'Someone with that email already has an account. Log in instead, or use a different email.' };
  }

  const period = parsed.data.period as BillingPeriod;

  let checkoutUrl: string;
  try {
    const stripe = getStripeClient();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getPriceId('starter', period), quantity: 1 }],
      customer_email: parsed.data.ownerEmail,
      success_url: `${baseUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/signup?period=${period}`,
      metadata: {
        organizationName: parsed.data.organizationName,
        ownerName: parsed.data.ownerName,
        ownerEmail: parsed.data.ownerEmail,
        plan: 'starter',
        period,
      },
    });

    if (!session.url) {
      return { error: 'Could not start checkout — try again.' };
    }
    checkoutUrl = session.url;
  } catch (err) {
    console.error('Stripe checkout session creation error:', err);
    return { error: err instanceof Error ? err.message : 'Could not start checkout — try again.' };
  }

  redirect(checkoutUrl);
}
