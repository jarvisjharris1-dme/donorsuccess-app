'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole, GrantStage, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { isOrgType } from '@/lib/donor-types';
import type { ImportResult } from '@/lib/import/shared';

export type { ImportResult } from '@/lib/import/shared';

const MAX_ROWS = 2000;

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

/**
 * One row = one grant opportunity, matched to an EXISTING funder donor
 * by organization name — this does not create donors. A row whose
 * funder doesn't match an existing Organization/Foundation/Corporation
 * donor in the org is skipped, same reasoning as gift import matching
 * by donor email: there's no reliable way to auto-create the right
 * kind of donor record from a name string alone (individual vs.
 * organization, correct segment, etc.), so this asks the customer to
 * add the funder as a donor first rather than guessing.
 *
 * Grant writer is matched by email if provided; a row with no match
 * (missing email, or an email that isn't a real user in the org)
 * defaults to whoever is running the import — a reasonable starting
 * assignment for a bulk migration, easy to bulk-reassign afterward,
 * rather than skipping otherwise-good rows over just this one field.
 *
 * This only imports pre-award opportunities — Awarded/Declined rows
 * still come in as GrantOpportunity records (so historical pipeline
 * data isn't lost), but converting an "Awarded" row into a tracked
 * Grant with a compliance plan is a deliberate, separate step already
 * built (see convertGrantToAwardAction) — not something this import
 * does automatically, since award amount, grant period, and a
 * compliance owner are real decisions this file's columns don't
 * necessarily map cleanly to.
 */
export async function importGrantsAction(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
): Promise<ImportResult> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_OPPORTUNITIES');

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

  const funderNamesInFile = Array.from(
    new Set(rows.map((r) => get(r, 'funderName')?.toLowerCase()).filter(Boolean) as string[]),
  );
  if (funderNamesInFile.length === 0) {
    return { error: 'No funder organization column mapped, or no valid funder names found in the file.' };
  }

  const funders = await db.donor.findMany({
    where: { organizationName: { not: null }, donorType: { in: ['ORGANIZATION', 'FOUNDATION', 'CORPORATION'] } },
    select: { id: true, organizationName: true, donorType: true },
  });
  const funderByName = new Map<string, { id: string; donorType: string }>();
  for (const f of funders) {
    if (f.organizationName) funderByName.set(f.organizationName.toLowerCase(), f);
  }

  const writerEmailsInFile = Array.from(
    new Set(rows.map((r) => get(r, 'grantWriterEmail')?.toLowerCase()).filter(Boolean) as string[]),
  );
  const writers = writerEmailsInFile.length
    ? await db.user.findMany({ where: { email: { in: writerEmailsInFile } }, select: { id: true, email: true } })
    : [];
  const writerByEmail = new Map(writers.map((w) => [w.email.toLowerCase(), w.id]));

  const skipped: { row: number; reason: string }[] = [];
  const toCreate: Prisma.GrantOpportunityCreateManyInput[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    const funderNameRaw = get(row, 'funderName');
    const funderKey = funderNameRaw?.toLowerCase();
    const name = get(row, 'name');
    const askAmount = parseAmount(get(row, 'askAmount'));

    const missing: string[] = [];
    if (!funderKey) missing.push('Funder organization name');
    if (!name) missing.push('Grant name');
    if (askAmount === null || askAmount <= 0) missing.push('Ask amount');

    if (missing.length > 0) {
      skipped.push({ row: rowNumber, reason: `Missing/invalid: ${missing.join(', ')}` });
      return;
    }

    const funder = funderByName.get(funderKey as string);
    if (!funder) {
      skipped.push({
        row: rowNumber,
        reason: `No Organization/Foundation/Corporation donor found named "${funderNameRaw}"`,
      });
      return;
    }
    if (!isOrgType(funder.donorType as Parameters<typeof isOrgType>[0])) {
      skipped.push({ row: rowNumber, reason: `"${funderNameRaw}" is not an Organization/Foundation/Corporation donor` });
      return;
    }

    const stageRaw = get(row, 'stage')?.toUpperCase().replace(/[\s-]+/g, '_');
    const stage: GrantStage = stageRaw && stageRaw in GrantStage ? (stageRaw as GrantStage) : GrantStage.RESEARCHING;

    const writerEmailRaw = get(row, 'grantWriterEmail')?.toLowerCase();
    const grantWriterId = (writerEmailRaw && writerByEmail.get(writerEmailRaw)) || session.user.id;

    toCreate.push({
      organizationId: session.user.organizationId,
      donorId: funder.id,
      name: name as string,
      programName: get(row, 'programName'),
      askAmount: askAmount as number,
      stage,
      applicationDeadline: parseDate(get(row, 'applicationDeadline')),
      decisionExpectedDate: parseDate(get(row, 'decisionExpectedDate')),
      grantWriterId,
      notes: get(row, 'notes'),
    });
  });

  if (toCreate.length > 0) {
    await db.grantOpportunity.createMany({ data: toCreate });
  }

  revalidatePath('/grants');
  revalidatePath('/dashboard');

  return { created: toCreate.length, skipped };
}
