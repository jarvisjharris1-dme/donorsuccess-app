import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { Role, SubscriptionTier } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { createStarterContent } from '@/lib/provisioning/starter-content';
import { getStripeClient } from '@/lib/stripe';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';
import { subscriptionIssueEmail } from '@/lib/email/templates/subscription-issue';

export const runtime = 'nodejs';
const INVITE_EXPIRY_DAYS = 7;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'organization';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata?.organizationName || !metadata.ownerEmail || !metadata.plan) {
    console.error('Stripe checkout.session.completed missing expected metadata:', metadata);
    return;
  }

  // Idempotency — Stripe can and does redeliver webhook events. If an
  // organization already exists for this subscription, this is a
  // redelivery, not a new signup.
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (subscriptionId) {
    const existing = await prisma.organization.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
    if (existing) return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: metadata.ownerEmail } });
  if (existingUser) {
    console.error(`Stripe checkout completed for an email that already has an account: ${metadata.ownerEmail}`);
    return;
  }

  const tier = metadata.plan === 'growth' ? SubscriptionTier.GROWTH : SubscriptionTier.STARTER;
  const slug = await uniqueSlug(slugify(metadata.organizationName));
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  const organization = await prisma.organization.create({
    data: {
      name: metadata.organizationName,
      slug,
      subscriptionTier: tier,
      stripeCustomerId: customerId ?? null,
      stripeSubscriptionId: subscriptionId ?? null,
      subscriptionStatus: 'active',
      subscriptionStatusChangedAt: new Date(),
      billingPeriod: metadata.period ?? null,
    },
  });

  // Best-effort — a failure here shouldn't block provisioning; starter
  // content can always be loaded later from Settings if this hiccups.
  try {
    await createStarterContent(forOrg(organization.id), organization.id);
  } catch (err) {
    console.error('Starter content creation failed during self-serve signup:', err);
  }

  // Invitation.invitedById is required — there's no logged-in session
  // in a webhook to attribute this to, same reasoning as
  // scripts/grant-platform-admin.ts. Attributed to an existing platform
  // admin, since they're ultimately responsible for the platform
  // granting this access.
  const platformAdmin = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
  if (!platformAdmin) {
    console.error(
      'No platform admin exists to attribute this self-serve invitation to — run the seed script or scripts/grant-platform-admin.ts first.',
    );
    return;
  }

  const token = generateToken();
  await prisma.invitation.create({
    data: {
      organizationId: organization.id,
      email: metadata.ownerEmail,
      role: Role.OWNER,
      token,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      invitedById: platformAdmin.id,
    },
  });

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const { subject, html, text } = invitationEmail({
      acceptUrl: `${baseUrl}/accept-invite/${token}`,
      organizationName: organization.name,
      inviterName: 'Donor Success',
      recipientName: metadata.ownerName,
    });
    await sendEmail({ to: metadata.ownerEmail, subject, html, text });
  } catch (err) {
    console.error('Self-serve signup invitation email failed to send:', err);
  }
}

const HEALTHY_STATUSES = new Set(['active', 'trialing']);
const AT_RISK_STATUSES = new Set(['past_due', 'canceled', 'unpaid', 'incomplete_expired']);

/**
 * Shared by both subscription.updated and subscription.deleted — the
 * only real difference between them is which status string Stripe
 * hands us, so the actual "did this change, and does it need a
 * warning email" logic lives in one place.
 */
async function updateSubscriptionStatus(stripeSubscriptionId: string, newStatus: string) {
  const organization = await prisma.organization.findUnique({ where: { stripeSubscriptionId } });
  if (!organization) return; // not a self-serve org, or genuinely not found — nothing to do

  const previousStatus = organization.subscriptionStatus;
  if (previousStatus === newStatus) return; // redelivery of an event we've already processed

  await prisma.organization.update({
    where: { id: organization.id },
    data: { subscriptionStatus: newStatus, subscriptionStatusChangedAt: new Date() },
  });

  // Only warn on the *transition into* trouble, not every redelivery or
  // every subsequent at-risk webhook for the same ongoing issue.
  const enteringTrouble =
    AT_RISK_STATUSES.has(newStatus) && (!previousStatus || HEALTHY_STATUSES.has(previousStatus));
  if (!enteringTrouble) return;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const { subject, html, text } = subscriptionIssueEmail({
      organizationName: organization.name,
      manageBillingUrl: `${baseUrl}/settings`,
      reason: newStatus as 'past_due' | 'canceled' | 'unpaid' | 'incomplete_expired',
    });
    // Sent to every Owner/Admin on the org, not just whoever originally
    // signed up — billing trouble should reach everyone who can act on it.
    const recipients = await prisma.user.findMany({
      where: { organizationId: organization.id, role: { in: [Role.OWNER, Role.ADMIN] }, isActive: true },
      select: { email: true },
    });
    await Promise.all(
      recipients.map((r) =>
        sendEmail({ to: r.email, subject, html, text }).catch((err) =>
          console.error(`Subscription issue email failed to send to ${r.email}:`, err),
        ),
      ),
    );
  } catch (err) {
    console.error('Subscription issue email error:', err);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await updateSubscriptionStatus(subscription.id, subscription.status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await updateSubscriptionStatus(subscription.id, 'canceled');
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break; // other event types are intentionally ignored
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    // Still 200 — a 4xx/5xx here makes Stripe retry indefinitely, and a
    // bug in our handling shouldn't hold Stripe's delivery queue hostage.
    // The error is logged either way for investigation.
  }

  return NextResponse.json({ received: true });
}
