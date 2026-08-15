import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/resend';
import { grantDeadlineReminderEmail } from '@/lib/email/templates/grant-deadline-reminder';
import { donorDisplayName } from '@/lib/format';
import { withDbConnectionRetry } from '@/lib/db-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const THRESHOLDS = [14, 7, 3, 0]; // days out; 0 covers both "due today" and "overdue"
const DAY_MS = 24 * 60 * 60 * 1000;

type Candidate = {
  organizationId: string;
  grantOpportunityId: string;
  sourceType: 'REQUIREMENT' | 'MILESTONE' | 'APPLICATION_DEADLINE' | 'DECISION_EXPECTED';
  sourceId: string; // real ID for requirement/milestone; a fixed sentinel for the other two — see schema comment on GrantReminderLog
  itemLabel: string;
  dueDate: Date;
  recipientEmail: string;
  grantName: string;
  funderName: string;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const opportunities = await withDbConnectionRetry(() =>
    prisma.grantOpportunity.findMany({
      where: { stage: { in: ['RESEARCHING', 'LOI_SUBMITTED', 'PROPOSAL_SUBMITTED', 'AWARDED'] } },
      include: {
        donor: { select: { firstName: true, lastName: true, organizationName: true } },
        grantWriter: { select: { email: true, isActive: true } },
        requirements: { where: { isComplete: false } },
        grant: {
          include: {
            complianceOwner: { select: { email: true, isActive: true } },
            milestones: { where: { isComplete: false } },
          },
        },
      },
    }),
  );

  const candidates: Candidate[] = [];

  for (const o of opportunities) {
    const funderName = donorDisplayName(o.donor);

    if (o.applicationDeadline && o.grantWriter.isActive) {
      candidates.push({
        organizationId: o.organizationId,
        grantOpportunityId: o.id,
        sourceType: 'APPLICATION_DEADLINE',
        sourceId: 'application_deadline',
        itemLabel: 'Application deadline',
        dueDate: o.applicationDeadline,
        recipientEmail: o.grantWriter.email,
        grantName: o.name,
        funderName,
      });
    }
    if (o.decisionExpectedDate && o.grantWriter.isActive) {
      candidates.push({
        organizationId: o.organizationId,
        grantOpportunityId: o.id,
        sourceType: 'DECISION_EXPECTED',
        sourceId: 'decision_expected',
        itemLabel: 'Decision expected',
        dueDate: o.decisionExpectedDate,
        recipientEmail: o.grantWriter.email,
        grantName: o.name,
        funderName,
      });
    }
    for (const r of o.requirements) {
      if (!r.dueDate || !o.grantWriter.isActive) continue;
      candidates.push({
        organizationId: o.organizationId,
        grantOpportunityId: o.id,
        sourceType: 'REQUIREMENT',
        sourceId: r.id,
        itemLabel: r.name,
        dueDate: r.dueDate,
        recipientEmail: o.grantWriter.email,
        grantName: o.name,
        funderName,
      });
    }
    if (o.grant?.complianceOwner.isActive) {
      for (const m of o.grant.milestones) {
        candidates.push({
          organizationId: o.organizationId,
          grantOpportunityId: o.id,
          sourceType: 'MILESTONE',
          sourceId: m.id,
          itemLabel: m.name,
          dueDate: m.dueDate,
          recipientEmail: o.grant.complianceOwner.email,
          grantName: o.name,
          funderName,
        });
      }
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let sent = 0;
  let skipped = 0;

  for (const c of candidates) {
    const daysUntil = Math.floor((c.dueDate.getTime() - Date.now()) / DAY_MS);
    const threshold = THRESHOLDS.find((t) => (t === 0 ? daysUntil <= 0 : daysUntil === t));
    if (threshold === undefined) continue;

    // Claim the dedup slot *before* sending, not after — the unique
    // constraint on GrantReminderLog is what actually prevents a
    // duplicate send, not application logic re-checking after the
    // fact. This is the opposite ordering from sendAndLogDonorEmail's
    // "send first, log second" elsewhere in this app, and
    // deliberately so: there, a false "we contacted them" record is
    // the worse failure mode. Here, a duplicate reminder email is the
    // worse failure mode, and an occasional silently-missed reminder
    // (if the send itself fails after the slot is claimed) is the
    // more acceptable tradeoff.
    try {
      await prisma.grantReminderLog.create({
        data: {
          organizationId: c.organizationId,
          grantOpportunityId: c.grantOpportunityId,
          sourceType: c.sourceType,
          sourceId: c.sourceId,
          threshold,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        skipped += 1;
        continue; // already sent this exact reminder before
      }
      console.error('Grant reminder log error:', err);
      continue;
    }

    const { subject, html, text } = grantDeadlineReminderEmail({
      itemLabel: c.itemLabel,
      grantName: c.grantName,
      funderName: c.funderName,
      dueDateLabel: c.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOverdue: daysUntil < 0,
      daysUntil: Math.max(0, daysUntil),
      grantUrl: `${baseUrl}/grants/${c.grantOpportunityId}`,
    });

    try {
      await sendEmail({ to: c.recipientEmail, subject, html, text });
      sent += 1;
    } catch (err) {
      console.error(`Grant reminder email failed to send to ${c.recipientEmail}:`, err);
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), candidatesChecked: candidates.length, sent, skipped });
}
