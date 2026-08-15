'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, DonorType, DonorSegment, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import type { ImportResult } from '@/lib/import/shared';

export type { ImportResult } from '@/lib/import/shared';

const MAX_ROWS = 5000;

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
 * Takes parsed CSV rows (plain objects keyed by original header) plus a
 * field->header mapping from the wizard's mapping step, and bulk-creates
 * donors. Not FormData-based like the rest of this codebase's actions —
 * the data originates from client-side CSV parsing, not an HTML form, so
 * passing it as plain (JSON-serializable) arguments is the right tool
 * here rather than forcing it through a FormData shape.
 *
 * Required per row: (First name + Last name) OR Organization name —
 * evaluated per row, so one file can mix individual and organization
 * donors — plus Gift amount and Gift date, which are required
 * regardless of donor type. A row failing any of this is skipped and
 * listed on the results screen with the specific problem. The identity
 * rule lives in IDENTITY_PATHS in lib/import/donor-fields.ts if it ever
 * needs another path (e.g. a household with no individual first/last).
 *
 * Health scores for imported donors are NOT computed here — a bulk
 * import can be thousands of rows, and recalculating scores for all of
 * them inline risks the request timing out. The results screen points
 * people at the existing "Recalculate all" button on Settings instead.
 */
export async function importDonorsAction(
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

  // Existing emails in this org, for duplicate detection. Donors without
  // an email are never treated as duplicates — there's no reliable way
  // to dedupe them without one.
  const existingDonors = await db.donor.findMany({ select: { email: true } });
  const existingEmails = new Set(
    existingDonors.map((d: { email: string | null }) => d.email?.toLowerCase()).filter(Boolean) as string[],
  );

  const skipped: { row: number; reason: string }[] = [];
  const toCreate: Prisma.DonorCreateManyInput[] = [];
  const seenEmailsThisImport = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 1; // 1-indexed data row, not counting the header

    const get = (fieldKey: string): string | undefined => {
      const header = mapping[fieldKey];
      if (!header) return undefined;
      const value = row[header];
      return typeof value === 'string' ? value.trim() : undefined;
    };

    const firstName = get('firstName') || undefined;
    const lastName = get('lastName') || undefined;
    const organizationName = get('organizationName') || undefined;
    const emailRaw = get('email');
    const email = emailRaw ? emailRaw.toLowerCase() : undefined;

    const giftAmount = parseAmount(get('lifetimeGiving'));
    const giftDate = parseDate(get('lastGiftDate'));

    // Identity: this row needs EITHER (First name + Last name) OR
    // (Organization name) — evaluated per row so a single mixed file
    // (some individual donors, some organizations) works correctly,
    // rather than requiring every row to have the same shape.
    const hasPersonIdentity = !!(firstName && lastName);
    const hasOrgIdentity = !!organizationName;

    // Gift amount and Gift date are required on every row regardless of
    // donor type. Collect every problem rather than stopping at the
    // first, so a person can fix their whole file in one pass instead
    // of discovering issues one row-error at a time.
    const missing: string[] = [];
    if (!hasPersonIdentity && !hasOrgIdentity) {
      missing.push('First+Last name or Organization name');
    }
    if (giftAmount === null || giftAmount <= 0) missing.push('Gift amount');
    if (!giftDate) missing.push('Gift date');

    if (missing.length > 0) {
      skipped.push({ row: rowNumber, reason: `Missing/invalid: ${missing.join(', ')}` });
      return;
    }

    if (email) {
      if (existingEmails.has(email) || seenEmailsThisImport.has(email)) {
        skipped.push({ row: rowNumber, reason: `Duplicate email (${email})` });
        return;
      }
      seenEmailsThisImport.add(email);
    }

    const donorTypeRaw = get('donorType')?.toUpperCase().replace(/[\s-]+/g, '_');
    const donorType: DonorType =
      donorTypeRaw && donorTypeRaw in DonorType
        ? (donorTypeRaw as DonorType)
        : hasOrgIdentity
          ? DonorType.ORGANIZATION
          : DonorType.INDIVIDUAL;

    const segmentRaw = get('segment')?.toUpperCase().replace(/[\s-]+/g, '_');
    const segment: DonorSegment | undefined =
      segmentRaw && segmentRaw in DonorSegment ? (segmentRaw as DonorSegment) : undefined;

    const tagsRaw = get('tags');
    const tags = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // giftCount defaults to 1 rather than 0 — a required, validated gift
    // amount/date means we know at least one gift happened, even if the
    // file doesn't have a separate count column. Same reasoning for
    // firstGiftDate: if the file doesn't distinguish first vs. most
    // recent gift, the one gift date we do have is both.
    toCreate.push({
      organizationId: session.user.organizationId,
      donorType,
      firstName,
      lastName,
      organizationName,
      email: emailRaw?.trim() || undefined,
      phone: get('phone'),
      addressLine1: get('addressLine1'),
      addressLine2: get('addressLine2'),
      city: get('city'),
      state: get('state'),
      postalCode: get('postalCode'),
      country: get('country') || 'US',
      segment,
      tags,
      // Cast to non-null: the `missing` check above already guarantees
      // giftAmount/giftDate are valid by this point (any row that
      // failed either check returned early), but TypeScript can't trace
      // that guarantee through the `missing` array — same situation as
      // lib/actions/import-gifts.ts, same fix.
      lifetimeGiving: giftAmount as number,
      giftCount: parseAmount(get('giftCount')) ?? 1,
      firstGiftDate: parseDate(get('firstGiftDate')) ?? (giftDate as Date),
      lastGiftDate: giftDate as Date,
    });
  });

  if (toCreate.length > 0) {
    await db.donor.createMany({ data: toCreate });
  }

  revalidatePath('/donors');
  revalidatePath('/dashboard');

  return { created: toCreate.length, skipped };
}
