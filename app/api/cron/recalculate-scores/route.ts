import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recalculateOrgDonorScores } from '@/lib/scoring/bulk';
import { withDbConnectionRetry } from '@/lib/db-retry';

// This route is invoked by Vercel Cron (see vercel.json) on a schedule,
// not by any user. It has to run in the Node runtime (Prisma isn't
// edge-compatible) and shouldn't be statically cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Recalculating every donor across every org can take a while once
// there's real data — 60s is the max duration available without
// upgrading past the Hobby plan. If this ever needs more, the fix is
// sharding the work (e.g. one cron invocation per organization) rather
// than raising this further.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cross-org by design — this is the one place in the codebase that
  // legitimately needs to operate over every tenant at once, so it uses
  // the raw `prisma` client to list organizations, then scopes each
  // recalculation pass through forOrg() same as everywhere else.
  const organizations = await withDbConnectionRetry(() =>
    prisma.organization.findMany({ select: { id: true, name: true } }),
  );

  const results: { organization: string; donorsRecalculated: number }[] = [];

  for (const org of organizations) {
    const count = await recalculateOrgDonorScores(org.id);
    results.push({ organization: org.name, donorsRecalculated: count });
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    organizations: results.length,
    results,
  });
}
