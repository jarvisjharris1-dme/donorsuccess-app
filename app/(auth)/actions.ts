'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';
import {
  loginSchema,
  acceptInviteSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '@/lib/validation';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { passwordResetEmail } from '@/lib/email/templates/password-reset';
import { welcomeEmail } from '@/lib/email/templates/welcome';

export type ActionState = { error?: string; success?: string } | undefined;

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Enter a valid email and password.' };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin':
          return { error: 'Incorrect email or password.' };
        default:
          return { error: 'Something went wrong. Please try again.' };
      }
    }
    throw err;
  }
}

/**
 * This does NOT create a new Organization — it creates a User inside
 * the *inviting* org, with the role set on the Invitation, then marks
 * the invitation accepted. This is one of the few legitimate uses of
 * the unscoped `prisma` client outside a webhook: there's no session
 * (and therefore no organizationId) yet at the point this runs.
 */
export async function acceptInviteAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = formData.get('token');
  if (typeof token !== 'string' || !token) {
    return { error: 'Missing invitation token.' };
  }

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) {
    return { error: 'This invitation link is invalid.' };
  }
  if (invitation.acceptedAt) {
    return { error: 'This invitation has already been used.' };
  }
  if (invitation.expiresAt < new Date()) {
    return { error: 'This invitation has expired. Ask an admin to send a new one.' };
  }

  const parsed = acceptInviteSchema.safeParse({
    name: formData.get('name'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) {
    return { error: 'An account with that email already exists. Try logging in instead.' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.create({
      data: {
        organizationId: invitation.organizationId,
        name: parsed.data.name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  // Sent before signIn(), not after — a successful signIn() with
  // redirectTo throws internally to perform the redirect, so any code
  // placed after a successful call never actually runs.
  const userCount = await prisma.user.count({ where: { organizationId: invitation.organizationId } });
  if (userCount === 1) {
    try {
      const organization = await prisma.organization.findUniqueOrThrow({
        where: { id: invitation.organizationId },
        select: { name: true },
      });
      const { subject, html, text } = welcomeEmail({
        organizationName: organization.name,
        recipientName: parsed.data.name,
        appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      });
      await sendEmail({ to: invitation.email, subject, html, text });
    } catch (err) {
      // Never block account creation over a welcome email failing —
      // this is a nice-to-have, not a required step in onboarding.
      console.error('Welcome email failed to send:', err);
    }
  }

  try {
    await signIn('credentials', {
      email: invitation.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Account created, but sign-in failed. Try logging in.' };
    }
    throw err;
  }
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Always returns the same generic success message whether or not the
 * email matches an account — this is standard practice for "forgot
 * password" flows, since responding differently would let someone probe
 * which emails have accounts on the system.
 *
 * There's no email service wired up yet (see lib/actions/settings.ts),
 * so this doesn't actually send anything — it creates the reset token
 * and surfaces it to Admins as a "pending password reset" in Settings,
 * where they can grab the link and send it to the person directly. Once
 * real email exists, this is the one place that needs to change: send
 * the link here instead of just creating the token.
 */
export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get('email') });
  const genericSuccess = {
    success: "If that email has an account, we've started a password reset for it.",
  };

  if (!parsed.success) {
    return genericSuccess;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    return genericSuccess;
  }

  // Replace any existing pending token for this email rather than
  // stacking them up.
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });
  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  // A send failure here shouldn't change what the user sees (that would
  // leak whether the email had an account, and there's no action they
  // could usefully take differently) — the token still exists and is
  // still usable via Settings → Pending password resets as a fallback
  // if delivery is ever down. Log it and move on.
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${token}`;
    const { subject, html, text } = passwordResetEmail(resetUrl);
    await sendEmail({ to: user.email, subject, html, text });
  } catch (err) {
    console.error('Password reset email failed to send:', err);
  }

  return genericSuccess;
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token: parsed.data.token },
  });
  if (!verificationToken) {
    return { error: 'This reset link is invalid. Request a new one.' };
  }
  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } });
    return { error: 'This reset link has expired. Request a new one.' };
  }

  const user = await prisma.user.findUnique({ where: { email: verificationToken.identifier } });
  if (!user) {
    return { error: 'This account no longer exists.' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Single-use: delete immediately so the link can't be replayed.
    await tx.verificationToken.delete({ where: { token: parsed.data.token } });
  });

  try {
    await signIn('credentials', {
      email: user.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Password updated, but sign-in failed. Try logging in.' };
    }
    throw err;
  }
}
