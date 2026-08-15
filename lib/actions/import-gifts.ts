'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GiftType, PaymentMethod, Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import type { ImportResult } from '@/lib/import/shared';

export type { ImportResult } from '@/lib/import/shared';

const MAX_ROWS = 5000;
// Concurrent donor cached-total updates. One query per *affected donor*,
// not per gift row — a 5,000-row file against 200 donors is ~200
// updates, batched in groups of 10, not 5,000 sequential writes.
const UPDATE_BATCH_SIZE = 10;

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
 * One row = one gift transaction, matched to an EXISTING donor by
 * email — this does not create donors. A row whose email doesn't match
 * any donor in the org is skipped with that reason; run donor import
 * first if the donor isn't in the system yet.
 *
 * No duplicate-gift detection: unlike donor import (deduped by email),
 * there's no reliable natural key for "is this the same gift" — two
 * legitimate $100 gifts on the same day from the same donor are
 * indistinguishable from an accidental double-import at the data level.
 * Re-running the same file will double-count. The wizard's review step
 * warns about this explicitly.
 */
export async function importGiftsAction(
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

  const emailsInFile = Array.from(
    new Set(rows.map((r) => get(r, 'donorEmail')?.toLowerCase()).filter(Boolean) as string[]),
  );

  if (emailsInFile.length === 0) {
    return { error: 'No donor email column mapped, or no valid emails found in the file.' };
  }

  // One query to resolve every donor this file could possibly reference.
  type DonorRow = {
    id: string;
    email: string | null;
    lifetimeGiving: unknown; // Prisma Decimal
    giftCount: number;
    firstGiftDate: Date | null;
    lastGiftDate: Date | null;
    largestGift: unknown; // Prisma Decimal | null
  };

  const donors: DonorRow[] = await db.donor.findMany({
    where: { email: { in: emailsInFile } },
    select: {
      id: true,
      email: true,
      lifetimeGiving: true,
      giftCount: true,
      firstGiftDate: true,
      lastGiftDate: true,
      largestGift: true,
    },
  });

  // Built with an explicit loop rather than `new Map(donors.map(d =>
  // [key, d]))` — that pattern is a known TypeScript inference trap:
  // `.map()` returning `[a, b]` infers as a plain array type, not a
  // tuple, which can make the Map constructor's generics resolve to
  // `{}` for the value type instead of the real donor shape.
  const donorByEmail = new Map<string, DonorRow>();
  for (const d of donors) {
    if (d.email) donorByEmail.set(d.email.toLowerCase(), d);
  }

  const skipped: { row: number; reason: string }[] = [];
  const toCreate: Prisma.GiftCreateManyInput[] = [];

  // Per-donor aggregate deltas — accumulated in memory while walking the
  // rows, then applied as one update per donor after the loop.
  const deltas = new Map<
    string,
    { sum: number; count: number; minDate: Date; maxDate: Date; maxAmount: number }
  >();

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    const emailRaw = get(row, 'donorEmail');
    const email = emailRaw?.toLowerCase();
    const amount = parseAmount(get(row, 'amount'));
    const date = parseDate(get(row, 'date'));

    const missing: string[] = [];
    if (!email) missing.push('Donor email');
    if (amount === null || amount <= 0) missing.push('Gift amount');
    if (!date) missing.push('Gift date');

    if (missing.length > 0) {
      skipped.push({ row: rowNumber, reason: `Missing/invalid: ${missing.join(', ')}` });
      return;
    }

    const donor = donorByEmail.get(email as string);
    if (!donor) {
      skipped.push({ row: rowNumber, reason: `No donor found with email ${email}` });
      return;
    }

    const giftTypeRaw = get(row, 'giftType')?.toUpperCase().replace(/[\s-]+/g, '_');
    const giftType: GiftType =
      giftTypeRaw && giftTypeRaw in GiftType ? (giftTypeRaw as GiftType) : GiftType.ONE_TIME;

    const paymentMethodRaw = get(row, 'paymentMethod')?.toUpperCase().replace(/[\s-]+/g, '_');
    const paymentMethod: PaymentMethod =
      paymentMethodRaw && paymentMethodRaw in PaymentMethod
        ? (paymentMethodRaw as PaymentMethod)
        : PaymentMethod.OTHER;

    toCreate.push({
      organizationId: session.user.organizationId,
      donorId: donor.id,
      amount: amount as number,
      date: date as Date,
      giftType,
      paymentMethod,
      fund: get(row, 'fund'),
      notes: get(row, 'notes'),
    });

    const existing = deltas.get(donor.id);
    const amt = amount as number;
    const d = date as Date;
    if (existing) {
      existing.sum += amt;
      existing.count += 1;
      if (d < existing.minDate) existing.minDate = d;
      if (d > existing.maxDate) existing.maxDate = d;
      if (amt > existing.maxAmount) existing.maxAmount = amt;
    } else {
      deltas.set(donor.id, { sum: amt, count: 1, minDate: d, maxDate: d, maxAmount: amt });
    }
  });

  if (toCreate.length > 0) {
    await db.gift.createMany({ data: toCreate });
  }

  const affectedDonorIds = Array.from(deltas.keys());
  for (let i = 0; i < affectedDonorIds.length; i += UPDATE_BATCH_SIZE) {
    const batch = affectedDonorIds.slice(i, i + UPDATE_BATCH_SIZE);
    await Promise.all(
      batch.map((donorId) => {
        const delta = deltas.get(donorId) as {
          sum: number;
          count: number;
          minDate: Date;
          maxDate: Date;
          maxAmount: number;
        };
        const donor = donors.find((d) => d.id === donorId);

        const update: Record<string, unknown> = {
          lifetimeGiving: { increment: delta.sum },
          giftCount: { increment: delta.count },
        };
        if (!donor?.firstGiftDate || delta.minDate < donor.firstGiftDate) {
          update.firstGiftDate = delta.minDate;
        }
        if (!donor?.lastGiftDate || delta.maxDate > donor.lastGiftDate) {
          update.lastGiftDate = delta.maxDate;
        }
        if (!donor?.largestGift || delta.maxAmount > Number(donor.largestGift)) {
          update.largestGift = delta.maxAmount;
        }

        return db.donor.update({ where: { id: donorId }, data: update });
      }),
    );
  }

  revalidatePath('/donors');
  revalidatePath('/dashboard');

  return { created: toCreate.length, skipped };
}
