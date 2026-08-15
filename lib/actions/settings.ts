'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole, hasRole } from '@/lib/permissions';
import { updateOrgSchema, inviteSchema, changePasswordSchema, updateProfileSchema } from '@/lib/validation';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';

export type ActionState = { error?: string; success?: string } | undefined;
export type ResetLinkState = { error?: string; token?: string } | undefined;

const INVITE_EXPIRY_DAYS = 7;

export async function updateOrganizationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = updateOrgSchema.safeParse({
    name: formData.get('name'),
    timezone: formData.get('timezone'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the organization details.' };
  }

  // Organization itself isn't in the tenant-scoped model set (there's
  // nothing to scope it *to* — it IS the tenant), so this goes through
  // the unscoped client, filtered explicitly by id instead.
  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: parsed.data,
  });

  revalidatePath('/settings');
  return { success: 'Organization updated.' };
}

export async function inviteUserAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the invite details.' };
  }

  const db = forOrg(session.user.organizationId);

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: 'Someone with that email already has an account.' };
  }

  const existingInvite = await db.invitation.findFirst({
    where: { email: parsed.data.email, acceptedAt: null },
  });
  if (existingInvite) {
    return { error: 'There is already a pending invitation for that email.' };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // organizationId required by create's generated type; forOrg() injects
  // the real value at runtime regardless — see the comment in
  // lib/actions/campaigns.ts.
  await db.invitation.create({
    data: {
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invitedById: session.user.id,
      expiresAt,
      organizationId: session.user.organizationId,
    },
  });

  // Same non-blocking pattern as password reset emails — a send
  // failure shouldn't change what the admin sees or block the invite
  // from existing. The copyable link already shown in the UI (see
  // InviteForm.tsx) is the fallback either way.
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true },
    });
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/accept-invite/${token}`;
    const { subject, html, text } = invitationEmail({
      acceptUrl,
      organizationName: organization?.name ?? 'your organization',
      inviterName: session.user.name ?? session.user.email ?? 'A teammate',
    });
    await sendEmail({ to: parsed.data.email, subject, html, text });
  } catch (err) {
    console.error('Invitation email failed to send:', err);
  }

  revalidatePath('/settings');
  return { success: `Invitation sent to ${parsed.data.email}.` };
}

export async function revokeInvitationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const invitationId = formData.get('id');
  if (typeof invitationId !== 'string' || !invitationId) {
    return { error: 'Missing invitation id.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.invitation.delete({ where: { id: invitationId } });

  revalidatePath('/settings');
}

export async function updateUserRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const userId = formData.get('userId');
  const role = formData.get('role');
  if (typeof userId !== 'string' || !userId) {
    return { error: 'Missing user.' };
  }
  if (typeof role !== 'string' || !(role in Role)) {
    return { error: 'Invalid role.' };
  }

  // Only an Owner can grant or revoke the Owner role — an Admin
  // shouldn't be able to promote themselves (or anyone) to Owner, and
  // an Owner shouldn't be demotable by a non-Owner.
  const targetRole = role as Role;
  const db = forOrg(session.user.organizationId);
  const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if ((targetRole === Role.OWNER || targetUser.role === Role.OWNER) && session.user.role !== Role.OWNER) {
    return { error: 'Only an Owner can change Owner-level access.' };
  }

  // Guard against orphaning the org with zero Owners.
  if (targetUser.role === Role.OWNER && targetRole !== Role.OWNER) {
    const ownerCount = await db.user.count({ where: { role: Role.OWNER, isActive: true } });
    if (ownerCount <= 1) {
      return { error: 'An organization must have at least one Owner.' };
    }
  }

  await db.user.update({ where: { id: userId }, data: { role: targetRole } });

  revalidatePath('/settings');
}

/**
 * Sets or clears someone's grants-specific role — additive to their
 * base Role, not a replacement for it. Gated at Admin+, same as
 * changing anyone's base role, since this is real elevated access
 * (e.g. it can let a Viewer mutate grants data they otherwise
 * couldn't touch anywhere else in the app).
 */
export async function updateUserGrantRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const userId = formData.get('userId');
  const grantRole = formData.get('grantRole');
  if (typeof userId !== 'string' || !userId) {
    return { error: 'Missing user.' };
  }
  // Empty string from the "None" option clears the grant role entirely.
  if (typeof grantRole !== 'string' || (grantRole !== '' && !(grantRole in GrantRole))) {
    return { error: 'Invalid grant role.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.user.update({
    where: { id: userId },
    data: { grantRole: grantRole === '' ? null : (grantRole as GrantRole) },
  });

  revalidatePath('/settings');
}

export async function toggleUserActiveAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const userId = formData.get('userId');
  const nextActive = formData.get('active') === 'true';
  if (typeof userId !== 'string' || !userId) {
    return { error: 'Missing user.' };
  }
  if (userId === session.user.id) {
    return { error: "You can't deactivate your own account." };
  }

  const db = forOrg(session.user.organizationId);
  const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (targetUser.role === Role.OWNER && !hasRole(session.user.role as Role, Role.OWNER)) {
    return { error: 'Only an Owner can deactivate another Owner.' };
  }
  if (targetUser.role === Role.OWNER && !nextActive) {
    const activeOwnerCount = await db.user.count({ where: { role: Role.OWNER, isActive: true } });
    if (activeOwnerCount <= 1) {
      return { error: 'An organization must have at least one active Owner.' };
    }
  }

  await db.user.update({ where: { id: userId }, data: { isActive: nextActive } });

  revalidatePath('/settings');
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Admin-initiated password reset: generates a one-time link the Admin
 * copies and sends to the person directly (Slack, text, whatever) —
 * same "copyable link, no email needed" pattern as invitations. Returns
 * the token so the UI can build the link immediately; nothing about the
 * token itself is sensitive to show to the Admin who just generated it.
 */
export async function adminResetPasswordAction(
  _prevState: ResetLinkState,
  formData: FormData,
): Promise<ResetLinkState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || !userId) {
    return { error: 'Missing user.' };
  }
  if (userId === session.user.id) {
    return { error: 'Use "Change your password" below to update your own password.' };
  }

  const db = forOrg(session.user.organizationId);
  const targetUser = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (targetUser.role === Role.OWNER && !hasRole(session.user.role as Role, Role.OWNER)) {
    return { error: 'Only an Owner can reset another Owner\u2019s password.' };
  }

  const token = generateToken();
  await prisma.verificationToken.deleteMany({ where: { identifier: targetUser.email } });
  await prisma.verificationToken.create({
    data: {
      identifier: targetUser.email,
      token,
      expires: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  revalidatePath('/settings');
  return { token };
}

/** Clears a pending self-service reset request without generating a link. */
export async function dismissPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const token = formData.get('token');
  if (typeof token !== 'string' || !token) {
    return { error: 'Missing token.' };
  }

  await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
  revalidatePath('/settings');
}

/**
 * Self-service password change for a logged-in user — no email needed,
 * since proving the *current* password is itself the identity check.
 * Distinct from the forgot-password flow, which is for someone locked
 * out entirely.
 */
export async function updateOwnProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  // The JWT session carries a copy of the name from sign-in time (see
  // auth.config.ts), so it won't reflect this change until next login.
  // Same tradeoff as the organization name in app/(app)/layout.tsx —
  // pages that show the display name re-fetch it live from the DB
  // rather than trusting the token, so this takes effect immediately
  // without needing a session refresh.
  revalidatePath('/settings');
  revalidatePath('/dashboard');

  return { success: 'Profile updated.' };
}

export async function changeOwnPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.passwordHash) {
    return { error: 'This account has no password set.' };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) {
    return { error: 'Current password is incorrect.' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: 'Password updated.' };
}
