'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, CrmProvider } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { assertRole } from '@/lib/permissions';
import { syncSalesforceForOrg, type SyncResult } from '@/lib/sync/salesforce-sync';
import { resetCrmSyncBookmark, purgeCrmData, type CrmResetResult } from '@/lib/sync/crm-reset';

export type ActionState = { error?: string; success?: string } | undefined;
export type SyncActionState = { error?: string; result?: SyncResult } | undefined;
export type PurgeActionState = { error?: string; result?: CrmResetResult } | undefined;

export async function disconnectSalesforceAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  await prisma.crmConnection.deleteMany({
    where: { organizationId: session.user.organizationId, provider: CrmProvider.SALESFORCE },
  });

  revalidatePath('/settings');
  return { success: 'Disconnected.' };
}

/**
 * Sets or clears the minimum-giving-history filter. Only affects what
 * future syncs pull in from Salesforce going forward — turning this on
 * never retroactively removes a donor record that was already synced
 * before the filter existed.
 */
export async function updateGivingHistoryFilterAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

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
    where: {
      organizationId_provider: { organizationId: session.user.organizationId, provider: CrmProvider.SALESFORCE },
    },
    data: { minGivingHistoryYears: years },
  });

  revalidatePath('/settings');
  return {
    success: years
      ? `Future syncs will skip contacts and accounts with no won gifts in the last ${years} years.`
      : 'Filter removed — future syncs will pull in every contact and account again.',
  };
}

/**
 * Runs the sync synchronously within the request — fine for the
 * donor/opportunity volumes expected here, but this is exactly the
 * kind of operation that would eventually move to a background job if
 * organizations grow large enough to risk the request timing out (see
 * maxDuration on the Settings page and the cron route for the current
 * ceiling).
 */
export async function syncSalesforceNowAction(
  _prevState: SyncActionState,
  _formData: FormData,
): Promise<SyncActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  try {
    const result = await syncSalesforceForOrg(session.user.organizationId);
    revalidatePath('/settings');
    revalidatePath('/donors');
    revalidatePath('/pipeline');
    revalidatePath('/dashboard');
    return { result };
  } catch (err) {
    console.error('Manual Salesforce sync error:', err);
    return { error: err instanceof Error ? err.message : 'Sync failed — try again.' };
  }
}

/**
 * "Resync" (safe refresh) — resets the connection's sync bookmark so
 * the next sync re-pulls everything from Salesforce into the records
 * already here, matched by their Salesforce ID. Nothing is deleted.
 * Does not itself run a sync — the next manual or scheduled sync
 * picks up the reset bookmark and does a full pull.
 */
export async function resyncSalesforceAction(_prevState: ActionState, _formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  await resetCrmSyncBookmark(session.user.organizationId, CrmProvider.SALESFORCE);

  revalidatePath('/settings');
  return { success: 'Reset. The next sync will pull everything from Salesforce fresh.' };
}

/**
 * "Purge & Rebuild" — genuinely destructive. Requires the org's own
 * name typed back exactly, the same confirmation weight as other
 * irreversible actions in this app, since this can delete Success
 * Plans, Grants, and notes attached to a donor that originated from
 * Salesforce but has since gained data that only exists in Donor
 * Success.
 */
export async function purgeAndRebuildSalesforceAction(
  _prevState: PurgeActionState,
  formData: FormData,
): Promise<PurgeActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { name: true },
  });
  const confirmation = formData.get('confirmation');
  if (typeof confirmation !== 'string' || confirmation.trim() !== organization?.name) {
    return { error: 'Type your organization\u2019s name exactly to confirm.' };
  }

  try {
    const result = await purgeCrmData(session.user.organizationId, CrmProvider.SALESFORCE);
    revalidatePath('/settings');
    revalidatePath('/donors');
    revalidatePath('/pipeline');
    revalidatePath('/grants');
    revalidatePath('/dashboard');
    return { result };
  } catch (err) {
    console.error('Salesforce purge & rebuild error:', err);
    return { error: err instanceof Error ? err.message : 'Purge failed — try again.' };
  }
}
