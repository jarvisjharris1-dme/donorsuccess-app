export type RetentionRateResult = {
  rate: number | null; // null when there's not enough giving history yet
  priorPeriodDonors: number;
  retainedDonors: number;
};

export type RetentionDetailRow = {
  id: string;
  name: string;
  email: string | null;
  lastGiftDate: Date | null;
};

export type RetentionDetailResult = RetentionRateResult & {
  retained: RetentionDetailRow[];
  lapsed: RetentionDetailRow[];
};

// Minimal shape this needs from a tenant-scoped Prisma client — kept
// loose rather than importing Prisma's full extended-client type, same
// reasoning as lib/scoring/recalculate.ts.
type MetricsClient = {
  gift: {
    findMany: (args: any) => Promise<any>;
  };
  donor: {
    findMany: (args: any) => Promise<any>;
  };
};

/**
 * Standard nonprofit donor retention rate: of the donors who gave in
 * the prior 12-month period, what percentage gave again in the most
 * recent 12-month period? Rolling windows (not calendar/fiscal year)
 * so it's meaningful regardless of when it's computed.
 *
 * Sector benchmark context (not enforced, just for the UI's color
 * coding): average nonprofit donor retention hovers around 40–45%.
 */
export async function calculateDonorRetentionRate(
  db: MetricsClient,
  assignedToId?: string,
): Promise<RetentionRateResult> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const donorFilter = assignedToId ? { donor: { assignedToId } } : {};

  const priorPeriodGifts: { donorId: string }[] = await db.gift.findMany({
    where: { date: { gte: twoYearsAgo, lt: oneYearAgo }, ...donorFilter },
    select: { donorId: true },
    distinct: ['donorId'],
  });

  if (priorPeriodGifts.length === 0) {
    return { rate: null, priorPeriodDonors: 0, retainedDonors: 0 };
  }

  const priorDonorIds = priorPeriodGifts.map((g) => g.donorId);

  const retainedGifts: { donorId: string }[] = await db.gift.findMany({
    where: { date: { gte: oneYearAgo }, donorId: { in: priorDonorIds }, ...donorFilter },
    select: { donorId: true },
    distinct: ['donorId'],
  });

  return {
    rate: Math.round((retainedGifts.length / priorDonorIds.length) * 100),
    priorPeriodDonors: priorDonorIds.length,
    retainedDonors: retainedGifts.length,
  };
}

/** Same calculation as calculateDonorRetentionRate, but returns the actual retained/lapsed donor lists for the Retention report page, not just counts. */
export async function getRetentionDetail(db: MetricsClient): Promise<RetentionDetailResult> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const priorPeriodGifts: { donorId: string }[] = await db.gift.findMany({
    where: { date: { gte: twoYearsAgo, lt: oneYearAgo } },
    select: { donorId: true },
    distinct: ['donorId'],
  });

  if (priorPeriodGifts.length === 0) {
    return { rate: null, priorPeriodDonors: 0, retainedDonors: 0, retained: [], lapsed: [] };
  }

  const priorDonorIds = priorPeriodGifts.map((g) => g.donorId);

  const retainedGifts: { donorId: string }[] = await db.gift.findMany({
    where: { date: { gte: oneYearAgo }, donorId: { in: priorDonorIds } },
    select: { donorId: true },
    distinct: ['donorId'],
  });
  const retainedIds = new Set(retainedGifts.map((g) => g.donorId));
  const lapsedIds = priorDonorIds.filter((id) => !retainedIds.has(id));

  const donors: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    organizationName: string | null;
    email: string | null;
    lastGiftDate: Date | null;
  }[] = await db.donor.findMany({
    where: { id: { in: priorDonorIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      organizationName: true,
      email: true,
      lastGiftDate: true,
    },
  });

  const toRow = (d: (typeof donors)[number]): RetentionDetailRow => ({
    id: d.id,
    name: d.organizationName || [d.firstName, d.lastName].filter(Boolean).join(' ') || 'Unnamed donor',
    email: d.email,
    lastGiftDate: d.lastGiftDate,
  });

  return {
    rate: Math.round((retainedGifts.length / priorDonorIds.length) * 100),
    priorPeriodDonors: priorDonorIds.length,
    retainedDonors: retainedGifts.length,
    retained: donors.filter((d) => retainedIds.has(d.id)).map(toRow),
    lapsed: donors.filter((d) => lapsedIds.includes(d.id)).map(toRow),
  };
}
