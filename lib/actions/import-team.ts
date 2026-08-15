'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { generateToken } from '@/lib/tokens';
import { sendEmail } from '@/lib/email/resend';
import { invitationEmail } from '@/lib/email/templates/invitation';
import type { ImportResult } from '@/lib/import/shared';

export type { ImportResult } from '@/lib/import/shared';

const MAX_ROWS = 500;
const INVITE_EXPIRY_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * One row = one invitation, never a directly-created User — same
 * reasoning as every other onboarding path in this app (Master Admin
 * Console, single "Invite a teammate" form): letting each person set
 * their own password is better security practice than generating one,
 * and this reuses that exact same infrastructure rather than a
 * parallel "bulk-create accounts with passwords" path.
 *
 * A row's "Name" isn't stored anywhere — Invitation has no name field,
 * since the invited person sets their own name when they accept. It's
 * only used here to personalize the invitation email greeting.
 */
export async function importTeamAction(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
): Promise<ImportResult> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'No rows to import.' };
  }
  if (rows.length > MAX_ROWS) {
    return { error: `Import is limited to ${MAX_ROWS} rows at a time — split your file and try again.` };
  }

  const db = forOrg(session.user.organizationId);

  const get = (row: Record<string, string>, fieldKey: string): string | undefined => {
    const header = mapping[fieldKey];
    if (!header) return undefined;
    const value = row[header];
    return typeof value === 'string' ? value.trim() : undefined;
  };

  const skipped: { row: number; reason: string }[] = [];
  const seenInFile = new Set<string>();

  type PlannedInvite = { rowNumber: number; email: string; name?: string; role: Role };
  const planned: PlannedInvite[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const email = get(row, 'email')?.toLowerCase();
    const name = get(row, 'name');

    if (!email || !EMAIL_RE.test(email)) {
      skipped.push({ row: rowNumber, reason: 'Missing or invalid email' });
      return;
    }
    if (seenInFile.has(email)) {
      skipped.push({ row: rowNumber, reason: `Duplicate email within this file (${email})` });
      return;
    }
    seenInFile.add(email);

    const roleRaw = get(row, 'role')?.toUpperCase().replace(/[\s-]+/g, '_');
    const role: Role = roleRaw && roleRaw in Role ? (Role[roleRaw as keyof typeof Role]) : Role.FUNDRAISER;

    planned.push({ rowNumber, email, name, role });
  });

  if (planned.length === 0) {
    return { created: 0, skipped };
  }

  // Batch-check against existing accounts and existing pending
  // invitations, same "one query up front" pattern as gift import's
  // donor lookup — avoids one query per row.
  const emails = planned.map((p) => p.email);
  const [existingUsers, existingInvites] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    db.invitation.findMany({
      where: { email: { in: emails }, acceptedAt: null },
      select: { email: true },
    }),
  ]);
  const existingUserEmails = new Set(existingUsers.map((u) => u.email));
  const existingInviteEmails = new Set(existingInvites.map((i) => i.email));

  const toSend: { email: string; name?: string; token: string }[] = [];
  let created = 0;

  for (const p of planned) {
    if (existingUserEmails.has(p.email)) {
      skipped.push({ row: p.rowNumber, reason: 'Already has an account' });
      continue;
    }
    if (existingInviteEmails.has(p.email)) {
      skipped.push({ row: p.rowNumber, reason: 'Already has a pending invitation' });
      continue;
    }

    const token = generateToken();
    await db.invitation.create({
      data: {
        email: p.email,
        role: p.role,
        token,
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        organizationId: session.user.organizationId,
      },
    });
    created += 1;
    toSend.push({ email: p.email, name: p.name, token });
  }

  // Emails sent after all invitations are created, and failures here
  // never undo a created invitation — same non-blocking reasoning as
  // every other email send in this app. Worst case, an admin re-sends
  // that one link manually from the Team section.
  if (toSend.length > 0) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      });
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const inviterName = session.user.name ?? session.user.email ?? 'A teammate';

      await Promise.all(
        toSend.map(async (t) => {
          try {
            const { subject, html, text } = invitationEmail({
              acceptUrl: `${baseUrl}/accept-invite/${t.token}`,
              organizationName: organization?.name ?? 'your organization',
              inviterName,
              recipientName: t.name,
            });
            await sendEmail({ to: t.email, subject, html, text });
          } catch (err) {
            console.error(`Invitation email failed to send to ${t.email}:`, err);
          }
        }),
      );
    } catch (err) {
      console.error('Bulk invitation email sending error:', err);
    }
  }

  revalidatePath('/settings');
  return { created, skipped };
}
