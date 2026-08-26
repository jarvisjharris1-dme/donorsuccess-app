import { Role, SubscriptionTier } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { createStarterContent } from '@/lib/provisioning/starter-content';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';
import { type InternalOrder, updateOrder } from '@/lib/orders';

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
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function tierFor(order: InternalOrder): SubscriptionTier {
  switch (order.subscriptionTier) {
    case 'STARTER':
      return SubscriptionTier.STARTER;
    case 'GROWTH':
      return SubscriptionTier.GROWTH;
    default:
      return SubscriptionTier.ENTERPRISE;
  }
}

/**
 * Common provisioning engine for signed sales-assisted orders. Stripe uses
 * the same organization/invite primitives today; Order v1 deliberately keeps
 * this service small so Stripe can be moved onto it without changing customer
 * behavior.
 */
export async function provisionOrder(order: InternalOrder) {
  if (order.organizationId) {
    return prisma.organization.findUnique({ where: { id: order.organizationId } });
  }

  await updateOrder(order.id, { status: 'PROVISIONING' });

  const existingUser = await prisma.user.findUnique({ where: { email: order.ownerEmail.toLowerCase() } });
  if (existingUser) {
    await updateOrder(order.id, {
      status: 'FAILED',
      notes: `Provisioning blocked: ${order.ownerEmail} already belongs to an existing Donor Success account.`,
    });
    throw new Error('Owner email already belongs to an existing account.');
  }

  const slug = await uniqueSlug(slugify(order.organizationName));
  const organization = await prisma.organization.create({
    data: {
      name: order.organizationName,
      slug,
      subscriptionTier: tierFor(order),
      subscriptionStatus: 'active',
      subscriptionStatusChangedAt: new Date(),
      billingPeriod: order.billingPeriod,
    },
  });

  try {
    await createStarterContent(forOrg(organization.id), organization.id);
  } catch (err) {
    console.error('Starter content creation failed during order provisioning:', err);
  }

  const platformAdmin = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
  if (!platformAdmin) {
    await updateOrder(order.id, {
      status: 'FAILED',
      organizationId: organization.id,
      notes: 'Organization created, but no platform admin exists to attribute the owner invitation to.',
    });
    throw new Error('No platform admin exists to attribute the invitation to.');
  }

  const token = generateToken();
  await prisma.invitation.create({
    data: {
      organizationId: organization.id,
      email: order.ownerEmail.toLowerCase(),
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
      recipientName: order.ownerName ?? undefined,
    });
    await sendEmail({ to: order.ownerEmail, subject, html, text });
  } catch (err) {
    console.error('Order provisioning invitation email failed:', err);
  }

  await updateOrder(order.id, {
    status: 'READY_FOR_KICKOFF',
    organizationId: organization.id,
    provisionedAt: new Date(),
  });

  return organization;
}
