import { CrmProvider } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';

export type CrmResetResult = {
  donorsDeleted: number;
  opportunitiesDeleted: number;
  giftsDeleted: number;
};

/**
 * "Safe refresh" — resets the connection's sync bookmarks so the next
 * sync treats every record as new again and re-pulls current data from
 * the CRM into whatever's already here, matched by Salesforce ID.
 * Nothing is deleted. This does not remove anything added locally
 * since the original sync (tasks, notes, Success Plans, Grants) the
 * way a purge would.
 */
export async function resetCrmSyncBookmark(organizationId: string, provider: CrmProvider): Promise<void> {
  await prisma.crmConnection.update({
    where: { organizationId_provider: { organizationId, provider } },
    data: { lastSyncedAt: null, accountBackfillCompletedAt: null, lastError: null },
  });
}

/**
 * "Purge & Rebuild" — actually deletes every donor, opportunity, and
 * gift this CRM connection ever created, then resets the sync
 * bookmark so the next sync rebuilds everything from scratch.
 *
 * This is genuinely destructive in a way the safe refresh isn't:
 * deleting a CRM-sourced donor cascades to delete everything attached
 * to them in Donor Success — tasks, Success Plans, Grants, notes —
 * not just the parts that came from the CRM originally. Callers MUST
 * get explicit, unambiguous confirmation before calling this — this
 * function itself has no confirmation step of its own by design, that
 * responsibility belongs at the point where the person is actually
 * asked, not buried in a shared helper two calls removed from them.
 */
export async function purgeCrmData(organizationId: string, provider: CrmProvider): Promise<CrmResetResult> {
  const db = forOrg(organizationId);

  const giftsDeleted = await db.gift.deleteMany({
    where: provider === CrmProvider.SALESFORCE ? { salesforceOpportunityId: { not: null } } : {},
  });

  const opportunitiesDeleted = await db.opportunity.deleteMany({
    where: provider === CrmProvider.SALESFORCE ? { salesforceId: { not: null } } : {},
  });

  const donorsDeleted = await db.donor.deleteMany({
    where:
      provider === CrmProvider.SALESFORCE
        ? { OR: [{ salesforceContactId: { not: null } }, { salesforceAccountId: { not: null } }] }
        : {},
  });

  await resetCrmSyncBookmark(organizationId, provider);

  return {
    donorsDeleted: donorsDeleted.count,
    opportunitiesDeleted: opportunitiesDeleted.count,
    giftsDeleted: giftsDeleted.count,
  };
}

/** Disconnects a CRM entirely — the connection record itself, not just its synced data. Synced donors/opportunities/gifts are left in place; only the ability to sync again is removed. */
export async function disconnectCrm(organizationId: string, provider: CrmProvider): Promise<void> {
  await prisma.crmConnection.deleteMany({ where: { organizationId, provider } });
}
