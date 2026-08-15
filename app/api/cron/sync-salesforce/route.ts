import { NextRequest, NextResponse } from 'next/server';
import { CrmProvider, CrmConnectionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { syncSalesforceForOrg } from '@/lib/sync/salesforce-sync';
import { withDbConnectionRetry } from '@/lib/db-retry';

// Same reasoning as the health-score cron: legitimately cross-org, so
// it uses the raw `prisma` client to list connections, then scopes each
// sync through the same org-scoped path a manual "Sync Now" click uses.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await withDbConnectionRetry(() =>
    prisma.crmConnection.findMany({
      where: { provider: CrmProvider.SALESFORCE, status: CrmConnectionStatus.CONNECTED },
      select: { organizationId: true },
    }),
  );

  const results: { organizationId: string; ok: boolean; summary?: string; error?: string }[] = [];

  for (const conn of connections) {
    try {
      const result = await syncSalesforceForOrg(conn.organizationId);
      results.push({
        organizationId: conn.organizationId,
        ok: true,
        summary: `${result.donorsCreated + result.donorsUpdated} donors, ${result.opportunitiesCreated + result.opportunitiesUpdated} opportunities, ${result.giftsCreated} gifts`,
      });
    } catch (err) {
      console.error(`Scheduled Salesforce sync failed for org ${conn.organizationId}:`, err);
      results.push({
        organizationId: conn.organizationId,
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      // One org's failure (expired connection, Salesforce outage, etc.)
      // shouldn't block every other org's scheduled sync from running.
      await prisma.crmConnection
        .updateMany({
          where: { organizationId: conn.organizationId, provider: CrmProvider.SALESFORCE },
          data: {
            status: CrmConnectionStatus.ERROR,
            lastError: err instanceof Error ? err.message : 'Unknown error',
          },
        })
        .catch(() => undefined);
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), organizations: results.length, results });
}
