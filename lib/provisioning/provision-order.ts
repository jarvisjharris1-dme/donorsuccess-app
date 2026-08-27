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
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
    case 'STARTER': return SubscriptionTier.STARTER;
    case 'GROWTH': return SubscriptionTier.GROWTH;
    default: return SubscriptionTier.ENTERPRISE;
  }
}

export async function sendOrderOwnerInvitation(order: InternalOrder) {
  if (!order.organizationId) throw new Error('Organization must exist before sending the owner invitation.');

  const organization = await prisma.organization.findUnique({ where: { id: order.organizationId } });
  if (!organization) throw new Error('Provisioned organization could not be found.');

  const existingUser = await prisma.user.findUnique({ where: { email: order.ownerEmail.toLowerCase() } });
  if (existingUser) {
    const sentAt = order.invitationSentAt ?? new Date();
    await updateOrder(order.id, { invitationSentAt: sentAt });
    return { alreadyActive: true, sentAt };
  }

  const platformAdmin = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
  if (!platformAdmin) throw new Error('No platform admin exists to attribute the invitation to.');

  const email = order.ownerEmail.toLowerCase();
  let invitation = await prisma.invitation.findUnique({
    where: { organizationId_email: { organizationId: organization.id, email } },
  });

  if (invitation?.acceptedAt) {
    const sentAt = order.invitationSentAt ?? invitation.createdAt;
    await updateOrder(order.id, { invitationSentAt: sentAt });
    return { alreadyAccepted: true, sentAt };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  if (invitation) {
    invitation = await prisma.invitation.update({
      where: { id: invitation.id },
      data: { token, expiresAt, role: Role.OWNER, invitedById: platformAdmin.id },
    });
  } else {
    invitation = await prisma.invitation.create({
      data: {
        organizationId: organization.id,
        email,
        role: Role.OWNER,
        token,
        expiresAt,
        invitedById: platformAdmin.id,
      },
    });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const { subject, html, text } = invitationEmail({
    acceptUrl: `${baseUrl}/accept-invite/${invitation.token}`,
    organizationName: organization.name,
    inviterName: 'Donor Success',
    recipientName: order.ownerName ?? undefined,
  });

  try {
    await sendEmail({ to: order.ownerEmail, subject, html, text });
    const sentAt = new Date();
    await updateOrder(order.id, { invitationSentAt: sentAt });
    return { sentAt };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown email delivery error';
    await updateOrder(order.id, {
      notes: `${order.notes ? `${order.notes}\n\n` : ''}Owner invitation email failed: ${reason}`,
    });
    throw err;
  }
}

export async function provisionOrder(order: InternalOrder) {
  if (order.organizationId) {
    if (!order.invitationSentAt) {
      await sendOrderOwnerInvitation(order);
      const refreshed = await prisma.organization.findUnique({ where: { id: order.organizationId } });
      await updateOrder(order.id, { status: 'READY_FOR_KICKOFF', provisionedAt: order.provisionedAt ?? new Date() });
      return refreshed;
    }
    return prisma.organization.findUnique({ where: { id: order.organizationId } });
  }

  await updateOrder(order.id, { status: 'PROVISIONING' });

  const existingUser = await prisma.user.findUnique({ where: { email: order.ownerEmail.toLowerCase() } });
  if (existingUser) {
    await updateOrder(order.id, { status: 'FAILED', notes: `Provisioning blocked: ${order.ownerEmail} already belongs to an existing Donor Success account.` });
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

  await updateOrder(order.id, {
    organizationId: organization.id,
    entitlementsProvisionedAt: new Date(),
  });

  const refreshed = { ...order, organizationId: organization.id } as InternalOrder;
  try {
    await sendOrderOwnerInvitation(refreshed);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown email delivery error';
    console.error('Order provisioning invitation email failed:', err);
    await updateOrder(order.id, {
      status: 'FAILED',
      organizationId: organization.id,
      notes: `${order.notes ? `${order.notes}\n\n` : ''}Provisioning paused: owner invitation could not be sent. ${reason}`,
    });
    throw err;
  }

  await updateOrder(order.id, {
    status: 'READY_FOR_KICKOFF',
    organizationId: organization.id,
    provisionedAt: new Date(),
  });

  return organization;
}
