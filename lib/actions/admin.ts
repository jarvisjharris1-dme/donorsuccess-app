'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, CrmProvider } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { generateToken } from '@/lib/tokens';
import { createStarterContent } from '@/lib/provisioning/starter-content';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';
import { resetCrmSyncBookmark, purgeCrmData, disconnectCrm, type CrmResetResult } from '@/lib/sync/crm-reset';
import { z } from 'zod';

export type ActionState = { error?: string; success?: string } | undefined;
export type CreateOrgState = { error?: string; inviteToken?: string; organizationId?: string } | undefined;
export type AdminPurgeState = { error?: string; result?: CrmResetResult } | undefined;

const INVITE_EXPIRY_DAYS = 7;

/**
 * The one gate every function in this file passes through first. This
 * is the only place in the codebase where operations cross into an
 * organization other than the acting user's own — every function here
 * takes an explicit target organizationId rather than inferring it from
 * the session, which is exactly the shape of access that must be
 * restricted to platform admins only.
 */
async function requirePlatformAdmin() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!session.user.isPlatformAdmin) redirect('/dashboard');
  return session;
}

const createOrgSchema = z.object({
  organizationName: z.string().trim().min(2, 'Organization name is required'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  timezone: z.string().trim().min(1),
  subscriptionTier: z.enum(['TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE']),
  ownerName: z.string().trim().min(1, "Owner's name is required"),
  ownerEmail: z.string().trim().toLowerCase().email(),
});

/**
 * Creates a new customer organization, then generates an invitation
 * (role OWNER) for that customer's first user — reusing the existing
 * invite/accept-invite flow rather than generating a temporary password.
 * Letting the customer set their own password through infrastructure
 * that already exists and is already tested is simply better security
 * practice than us minting and displaying a password ourselves.
 */
export async function createOrganizationAction(
  _prevState: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const session = await requirePlatformAdmin();

  const parsed = createOrgSchema.safeParse({
    organizationName: formData.get('organizationName'),
    slug: formData.get('slug'),
    timezone: formData.get('timezone'),
    subscriptionTier: formData.get('subscriptionTier'),
    ownerName: formData.get('ownerName'),
    ownerEmail: formData.get('ownerEmail'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const existingSlug = await prisma.organization.findUnique({ where: { slug: parsed.data.slug } });
  if (existingSlug) {
    return { error: 'That slug is already taken — try another.' };
  }
  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.ownerEmail } });
  if (existingUser) {
    return { error: 'Someone with that email already has an account.' };
  }

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.organizationName,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone,
      subscriptionTier: parsed.data.subscriptionTier,
    },
  });

  // Best-effort — a failure here shouldn't block the org itself from
  // being created; starter content can always be loaded later from
  // Settings if this hiccups.
  try {
    await createStarterContent(forOrg(organization.id), organization.id);
  } catch (err) {
    console.error('Starter content creation failed during org provisioning:', err);
  }

  const token = generateToken();
  await prisma.invitation.create({
    data: {
      organizationId: organization.id,
      email: parsed.data.ownerEmail,
      role: Role.OWNER,
      token,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      // invitedById is required (not nullable) — there's no member of
      // the brand-new org yet to attribute this to, so it's attributed
      // to the platform admin who's actually creating it. This is
      // arguably more accurate than null would have been anyway: a real
      // person did trigger this invitation, just not a member of the
      // org it's for.
      invitedById: session.user.id,
    },
  });

  // Enterprise customers are provisioned through this exact path, so
  // this needs the same automatic email the self-serve Stripe signup
  // already sends — not just a link for the platform admin to
  // manually forward. Best-effort: a send failure here shouldn't block
  // the organization from being created, since the invite link is
  // still returned below and can be copied/sent manually as a fallback.
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const { subject, html, text } = invitationEmail({
      acceptUrl: `${baseUrl}/accept-invite/${token}`,
      organizationName: organization.name,
      inviterName: 'Donor Success',
      recipientName: parsed.data.ownerName,
    });
    await sendEmail({ to: parsed.data.ownerEmail, subject, html, text });
  } catch (err) {
    console.error('Master Admin Console invitation email failed to send:', err);
  }

  revalidatePath('/admin');
  return { inviteToken: token, organizationId: organization.id };
}

/** Invites an additional team member into an existing organization, at any role. */
export async function inviteMemberToOrgAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const email = formData.get('email');
  const role = formData.get('role');
  if (typeof organizationId !== 'string' || !organizationId) {
    return { error: 'Missing organization.' };
  }
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(), role: z.nativeEnum(Role) })
    .safeParse({ email, role });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the invite details.' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: 'Someone with that email already has an account.' };
  }

  const db = forOrg(organizationId);
  const existingInvite = await db.invitation.findFirst({
    where: { email: parsed.data.email, acceptedAt: null },
  });
  if (existingInvite) {
    return { error: 'There is already a pending invitation for that email.' };
  }

  const token = generateToken();
  await db.invitation.create({
    data: {
      // organizationId required by create's generated type; forOrg()
      // injects the real value at runtime regardless — same pattern as
      // lib/actions/settings.ts and every other create() call through a
      // forOrg() client in this codebase.
      organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      // Required field — same reasoning as createOrganizationAction:
      // attributed to the platform admin actually creating this invite,
      // since they're not a member of the target org either.
      invitedById: session.user.id,
    },
  });

  // Same reasoning as createOrganizationAction — best-effort, never
  // blocks the invitation itself from being created.
  try {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const { subject, html, text } = invitationEmail({
      acceptUrl: `${baseUrl}/accept-invite/${token}`,
      organizationName: organization.name,
      inviterName: 'Donor Success',
    });
    await sendEmail({ to: parsed.data.email, subject, html, text });
  } catch (err) {
    console.error('Master Admin Console team invitation email failed to send:', err);
  }

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: token };
}

/** Changes a team member's role within their own organization. */
export async function updateMemberRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const userId = formData.get('userId');
  const role = formData.get('role');
  if (typeof organizationId !== 'string' || typeof userId !== 'string') {
    return { error: 'Missing organization or user.' };
  }
  if (typeof role !== 'string' || !(role in Role)) {
    return { error: 'Invalid role.' };
  }

  const db = forOrg(organizationId);
  const member = await db.user.findUnique({ where: { id: userId } });
  if (!member) {
    return { error: 'That user does not belong to this organization.' };
  }

  await db.user.update({ where: { id: userId }, data: { role: role as Role } });

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: 'Role updated.' };
}

/** Assigns (or unassigns) a donor to a fundraiser within their organization. */
export async function assignDonorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const donorId = formData.get('donorId');
  const assignedToId = formData.get('assignedToId'); // may be empty string = unassign

  if (typeof organizationId !== 'string' || typeof donorId !== 'string') {
    return { error: 'Missing organization or donor.' };
  }

  const db = forOrg(organizationId);
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor) {
    return { error: 'That donor does not belong to this organization.' };
  }

  if (typeof assignedToId === 'string' && assignedToId) {
    const member = await db.user.findUnique({ where: { id: assignedToId } });
    if (!member) {
      return { error: 'That team member does not belong to this organization.' };
    }
  }

  await db.donor.update({
    where: { id: donorId },
    data: { assignedToId: typeof assignedToId === 'string' && assignedToId ? assignedToId : null },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: 'Assignment updated.' };
}

// ── CRM management on behalf of a client ─────────────────────────────────
// Everything below lets platform admins manage a client's Salesforce (or
// future CRM) connection without the client needing to do it themselves
// — same underlying operations as the client's own Settings page,
// just gated by requirePlatformAdmin() and taking an explicit
// organizationId instead of the acting user's own.

export async function adminResyncCrmAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const provider = formData.get('provider');
  if (typeof organizationId !== 'string' || !organizationId) return { error: 'Missing organization.' };
  if (typeof provider !== 'string' || !(provider in CrmProvider)) return { error: 'Invalid provider.' };

  await resetCrmSyncBookmark(organizationId, provider as CrmProvider);

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: 'Reset. The client\u2019s next sync will pull everything fresh.' };
}

/**
 * Same destructive weight as the client-facing version — requires the
 * organization's own name typed back exactly, even though it's a
 * platform admin doing this, not the client themselves. The
 * consequences (losing Success Plans/Grants/notes attached to a
 * CRM-sourced donor) are identical either way.
 */
export async function adminPurgeAndRebuildCrmAction(
  _prevState: AdminPurgeState,
  formData: FormData,
): Promise<AdminPurgeState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const provider = formData.get('provider');
  if (typeof organizationId !== 'string' || !organizationId) return { error: 'Missing organization.' };
  if (typeof provider !== 'string' || !(provider in CrmProvider)) return { error: 'Invalid provider.' };

  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
  const confirmation = formData.get('confirmation');
  if (typeof confirmation !== 'string' || confirmation.trim() !== organization?.name) {
    return { error: 'Type the organization\u2019s name exactly to confirm.' };
  }

  try {
    const result = await purgeCrmData(organizationId, provider as CrmProvider);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { result };
  } catch (err) {
    console.error('Admin CRM purge & rebuild error:', err);
    return { error: err instanceof Error ? err.message : 'Purge failed \u2014 try again.' };
  }
}

export async function adminDisconnectCrmAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const provider = formData.get('provider');
  if (typeof organizationId !== 'string' || !organizationId) return { error: 'Missing organization.' };
  if (typeof provider !== 'string' || !(provider in CrmProvider)) return { error: 'Invalid provider.' };

  await disconnectCrm(organizationId, provider as CrmProvider);

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: 'Disconnected. The client will need to reconnect from their own Settings page to sync again.' };
}

export async function adminUpdateGivingHistoryFilterAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePlatformAdmin();

  const organizationId = formData.get('organizationId');
  const provider = formData.get('provider');
  if (typeof organizationId !== 'string' || !organizationId) return { error: 'Missing organization.' };
  if (typeof provider !== 'string' || !(provider in CrmProvider)) return { error: 'Invalid provider.' };

  const raw = formData.get('minGivingHistoryYears');
  const enabled = formData.get('enabled') === 'true';

  let years: number | null = null;
  if (enabled) {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      return { error: 'Enter a whole number of years between 1 and 50.' };
    }
    years = parsed;
  }

  await prisma.crmConnection.update({
    where: { organizationId_provider: { organizationId, provider: provider as CrmProvider } },
    data: { minGivingHistoryYears: years },
  });

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: years ? `Filter set to ${years} years.` : 'Filter removed.' };
}
