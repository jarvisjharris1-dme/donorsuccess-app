'use server';

import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assertRole } from '@/lib/permissions';
import { getStripeClient } from '@/lib/stripe';

export type ActionState = { error?: string } | undefined;

/**
 * Enterprise organizations have no stripeCustomerId at all (they're
 * provisioned manually, never through Stripe) — this action simply
 * isn't reachable for them since Settings only shows the Manage
 * Billing button when a stripeCustomerId exists.
 */
export async function createBillingPortalSessionAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { stripeCustomerId: true },
  });
  if (!organization?.stripeCustomerId) {
    return { error: 'This organization isn\u2019t on a self-serve plan — contact support to change billing.' };
  }

  let portalUrl: string;
  try {
    const stripe = getStripeClient();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });
    portalUrl = portalSession.url;
  } catch (err) {
    console.error('Stripe billing portal session error:', err);
    return { error: 'Could not open billing management — try again.' };
  }

  redirect(portalUrl);
}
