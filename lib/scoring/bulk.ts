import { forOrg } from '@/lib/tenant-db';
import { recalculateDonorHealthScore } from './recalculate';

// How many donors to recalculate concurrently. High enough to be
// meaningfully faster than one-at-a-time, low enough not to overwhelm
// Neon's pooled connection (which has a finite number of connections
// shared across whatever else is hitting the database at the same time).
const BATCH_SIZE = 10;

/**
 * Recalculates every donor's health score within a single organization.
 * Used by:
 *  - the nightly cron job (app/api/cron/recalculate-scores/route.ts),
 *    looped across every organization in the system
 *  - the manual "Recalculate all" button on Settings (Admin+), scoped to
 *    just the acting admin's own organization
 *
 * Runs in small concurrent batches rather than one giant Promise.all —
 * an org with a few thousand donors shouldn't try to open a few thousand
 * simultaneous connections.
 */
export async function recalculateOrgDonorScores(organizationId: string): Promise<number> {
  const db = forOrg(organizationId);
  const donors = await db.donor.findMany({ select: { id: true } });

  for (let i = 0; i < donors.length; i += BATCH_SIZE) {
    const batch = donors.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((d: { id: string }) => recalculateDonorHealthScore(db, d.id)));
  }

  return donors.length;
}
