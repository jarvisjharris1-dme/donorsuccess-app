import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEnforcementState } from '@/lib/billing-policy';
import { withDbConnectionRetry } from '@/lib/db-retry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Same statuses lib/billing-policy.ts treats as "at risk" — an org that
// reactivated in the meantime (status back to active/trialing) is
// never a candidate here, regardless of how long ago it was canceled.
const AT_RISK_STATUSES = ['past_due', 'canceled', 'unpaid', 'incomplete_expired'];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only self-serve organizations ever have a subscriptionStatus at
  // all — Enterprise orgs are always null here and never considered.
  const candidates = await withDbConnectionRetry(() =>
    prisma.organization.findMany({
      where: { subscriptionStatus: { in: AT_RISK_STATUSES } },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionStatus: true,
        subscriptionStatusChangedAt: true,
        _count: { select: { donors: true, users: true } },
      },
    }),
  );

  const results: { organizationId: string; name: string; deleted: boolean; error?: string }[] = [];

  for (const org of candidates) {
    const enforcement = getEnforcementState(org.subscriptionStatus, org.subscriptionStatusChangedAt);
    if (!enforcement.isPastDeletionDeadline) continue;

    // Logged individually, before the delete call, specifically so
    // there's a record of exactly what was removed and why even if
    // something downstream (log aggregation, etc.) only captures part
    // of this — deletion itself is irreversible, this log is not.
    console.log(
      `[delete-canceled-organizations] Deleting organization ${org.id} (${org.name}, slug: ${org.slug}) — ` +
        `status "${org.subscriptionStatus}" since ${org.subscriptionStatusChangedAt?.toISOString()}, ` +
        `${org._count.donors} donors, ${org._count.users} users.`,
    );

    try {
      await prisma.organization.delete({ where: { id: org.id } });
      results.push({ organizationId: org.id, name: org.name, deleted: true });
    } catch (err) {
      console.error(`[delete-canceled-organizations] Failed to delete organization ${org.id}:`, err);
      results.push({
        organizationId: org.id,
        name: org.name,
        deleted: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    candidatesChecked: candidates.length,
    deleted: results.filter((r) => r.deleted).length,
    results,
  });
}
