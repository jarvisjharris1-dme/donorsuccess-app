import { computeHealthScore, type ScoreResult } from './health-score';

// Deliberately loose/minimal typing rather than importing Prisma's full
// extended-client type: this needs to work with both the top-level
// forOrg() client (manual "Recalculate" button) and a `tx` client inside
// an interactive transaction (called from createGiftAction), and those
// have slightly different generic shapes. Prisma's real generated method
// signatures use generic overloads and utility types (`Exact<...>`,
// unions like `number | {}` on `count()`, etc.) that don't line up with
// any reasonably-simple hand-written interface in both the argument and
// return-type direction at once — so everything here is typed `any` and
// the narrowing happens explicitly in the function body below instead,
// where the actual shapes are known.
type ScoringClient = {
  donor: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  interaction: {
    count: (args: any) => Promise<any>;
  };
  volunteerHours: {
    aggregate: (args: any) => Promise<any>;
  };
  healthScoreSnapshot: {
    create: (args: any) => Promise<any>;
  };
  gift: {
    findMany: (args: any) => Promise<any>;
  };
};

type DonorScoringFields = {
  lastGiftDate: Date | null;
  giftCount: number;
  lifetimeGiving: unknown; // Prisma Decimal — converted via Number()
};

/**
 * Recomputes a donor's health score from their current giving/engagement
 * data, writes it onto the Donor row (the cached fields the rest of the
 * app reads), and appends an immutable HealthScoreSnapshot so the score
 * history can be charted later.
 *
 * Called from two places: the manual "Recalculate" button
 * (lib/actions/scoring.ts, against the top-level forOrg() client) and
 * automatically after logging a gift (lib/actions/gifts.ts, against the
 * transaction's `tx` client, so the score update is atomic with the
 * gift that triggered it).
 */
export async function recalculateDonorHealthScore(
  db: ScoringClient,
  donorId: string,
): Promise<ScoreResult> {
  const donor = (await db.donor.findUniqueOrThrow({
    where: { id: donorId },
  })) as DonorScoringFields;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const interactionsLast12Months = Number(
    await db.interaction.count({
      where: { donorId, occurredAt: { gte: twelveMonthsAgo } },
    }),
  );

  const volunteerHoursAgg = await db.volunteerHours.aggregate({
    where: { donorId, date: { gte: twelveMonthsAgo } },
    _sum: { hours: true },
  });
  const volunteerHoursLast12Months = Number(volunteerHoursAgg._sum.hours ?? 0);

  const result = computeHealthScore({
    lastGiftDate: donor.lastGiftDate,
    giftCount: donor.giftCount,
    lifetimeGiving: Number(donor.lifetimeGiving),
    interactionsLast12Months,
    volunteerHoursLast12Months,
  });

  await db.donor.update({
    where: { id: donorId },
    data: { healthScore: result.score, retentionRisk: result.retentionRisk },
  });

  // organizationId isn't listed here — forOrg()'s extension injects it
  // automatically at runtime (this function is only ever called with a
  // scoped client). See the comment in lib/actions/campaigns.ts for why
  // other create() calls in this codebase pass it explicitly: those go
  // through Prisma's real generated types, which require it at the type
  // level; this file's loosely-typed ScoringClient interface doesn't.
  await db.healthScoreSnapshot.create({
    data: {
      donorId,
      score: result.score,
      retentionRisk: result.retentionRisk,
      factors: result.factors,
    },
  });

  return result;
}

/**
 * Recomputes lifetimeGiving, giftCount, firstGiftDate, lastGiftDate, and
 * largestGift on a Donor from scratch, by re-querying every one of their
 * remaining Gift records — rather than trying to incrementally adjust
 * those cached fields.
 *
 * This matters specifically because deleting or editing a gift can't be
 * handled by simple subtraction for every field: lifetimeGiving is safe
 * to decrement, but if the gift being removed was the donor's largest,
 * or their first, or their most recent, finding the correct new value
 * requires looking at what's left anyway. Recomputing everything from
 * the full remaining set is the only version of this that's correct in
 * every case, not just the common one.
 *
 * No gift edit or delete action existed anywhere in the app before this
 * was written for grant disbursement editing — this is intentionally a
 * general-purpose helper, not grants-specific, so any future gift
 * mutation (a regular gift edit/delete, a bulk import correction) can
 * reuse it instead of re-deriving this logic.
 */
export async function recalculateDonorGivingFields(client: ScoringClient, donorId: string): Promise<void> {
  const gifts: { amount: unknown; date: Date }[] = await client.gift.findMany({
    where: { donorId },
    select: { amount: true, date: true },
  });

  if (gifts.length === 0) {
    await client.donor.update({
      where: { id: donorId },
      data: {
        lifetimeGiving: 0,
        giftCount: 0,
        firstGiftDate: null,
        lastGiftDate: null,
        largestGift: null,
      },
    });
    return;
  }

  const amounts = gifts.map((g) => Number(g.amount));
  const dates = gifts.map((g) => g.date.getTime());

  await client.donor.update({
    where: { id: donorId },
    data: {
      lifetimeGiving: amounts.reduce((sum, a) => sum + a, 0),
      giftCount: gifts.length,
      firstGiftDate: new Date(Math.min(...dates)),
      lastGiftDate: new Date(Math.max(...dates)),
      largestGift: Math.max(...amounts),
    },
  });
}
