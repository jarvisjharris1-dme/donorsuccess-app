import { RetentionRisk } from '@prisma/client';
import { calculateDonorRetentionRate } from '@/lib/metrics/retention';
import { OPEN_STAGES, ORDERED_STAGES, STAGE_LABELS } from '@/lib/pipeline';
import { donorDisplayName } from '@/lib/format';

export type InsightsClient = {
  donor: { findMany: (args: any) => Promise<any>; count: (args: any) => Promise<any> };
  gift: { findMany: (args: any) => Promise<any>; aggregate: (args: any) => Promise<any> };
  opportunity: { aggregate: (args: any) => Promise<any> };
  volunteerHours: { findMany: (args: any) => Promise<any> };
};

/**
 * Anthropic tool schemas — every tool here is read-only by design.
 * Nothing in this file can create, update, or delete anything; the
 * chat feature has no path to mutating donor data, which is a
 * deliberate scope limit for a first version, not an oversight.
 */
export const INSIGHT_TOOLS = [
  {
    name: 'get_retention_rate',
    description:
      "Get the organization's donor retention rate: of donors who gave in the prior 12-month period, what percentage gave again in the most recent 12 months.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_giving_summary',
    description:
      'Get total giving so far this year compared to the same stretch last year, plus a month-by-month breakdown for the last 12 months.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_at_risk_donors',
    description:
      'Get the list of donors currently flagged High or Critical retention risk, sorted by most concerning first, with their lifetime giving and last gift date.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of donors to return, default 10' },
      },
    },
  },
  {
    name: 'get_pipeline_summary',
    description:
      'Get the major gifts pipeline: open value and count of opportunities by stage (Identification, Cultivation, Solicitation, Stewardship), plus total closed-won value.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_volunteer_impact',
    description:
      'Get total volunteer hours and estimated dollar value contributed in the last 12 months, plus the top volunteers by hours.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'find_donor',
    description: "Look up a specific donor by name to get their health score, lifetime giving, and last gift date.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "The donor or organization's name, or part of it" },
      },
      required: ['query'],
    },
  },
] as const;

export type ToolName = (typeof INSIGHT_TOOLS)[number]['name'];

export async function executeInsightTool(
  db: InsightsClient,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case 'get_retention_rate': {
      return calculateDonorRetentionRate(db);
    }

    case 'get_giving_summary': {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const sameDayLastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const twelveMonthsAgo = new Date(now);
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11, 1);

      const [thisYear, lastYearSameStretch, recentGifts] = await Promise.all([
        db.gift.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfYear, lte: now } } }),
        db.gift.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startOfLastYear, lte: sameDayLastYear } },
        }),
        db.gift.findMany({
          where: { date: { gte: twelveMonthsAgo } },
          select: { date: true, amount: true },
        }),
      ]);

      const byMonth = new Map<string, number>();
      for (const g of recentGifts as { date: Date; amount: unknown }[]) {
        const key = `${g.date.getFullYear()}-${String(g.date.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + Number(g.amount));
      }

      return {
        givingThisYear: Number(thisYear._sum.amount ?? 0),
        givingSameStretchLastYear: Number(lastYearSameStretch._sum.amount ?? 0),
        monthlyTotalsLast12Months: Object.fromEntries(byMonth),
      };
    }

    case 'get_at_risk_donors': {
      const limit = typeof input.limit === 'number' ? Math.min(50, Math.max(1, input.limit)) : 10;
      const donors: {
        firstName: string | null;
        lastName: string | null;
        organizationName: string | null;
        retentionRisk: RetentionRisk | null;
        lifetimeGiving: unknown;
        lastGiftDate: Date | null;
      }[] = await db.donor.findMany({
        where: { retentionRisk: { in: [RetentionRisk.HIGH, RetentionRisk.CRITICAL] } },
        orderBy: [{ retentionRisk: 'asc' }, { lastGiftDate: 'asc' }],
        take: limit,
        select: {
          firstName: true,
          lastName: true,
          organizationName: true,
          retentionRisk: true,
          lifetimeGiving: true,
          lastGiftDate: true,
        },
      });

      return donors.map((d) => ({
        name: donorDisplayName(d),
        retentionRisk: d.retentionRisk,
        lifetimeGiving: Number(d.lifetimeGiving),
        lastGiftDate: d.lastGiftDate ? d.lastGiftDate.toISOString().slice(0, 10) : null,
      }));
    }

    case 'get_pipeline_summary': {
      const stageResults = await Promise.all(
        ORDERED_STAGES.map(async (stage) => {
          const agg = await db.opportunity.aggregate({
            _sum: { askAmount: true },
            _count: { _all: true },
            where: { stage },
          });
          return {
            stage: STAGE_LABELS[stage],
            openValue: Number(agg._sum.askAmount ?? 0),
            count: agg._count._all,
          };
        }),
      );

      const openAgg = await db.opportunity.aggregate({
        _sum: { askAmount: true },
        where: { stage: { in: OPEN_STAGES } },
      });

      return {
        totalOpenPipelineValue: Number(openAgg._sum.askAmount ?? 0),
        byStage: stageResults,
      };
    }

    case 'get_volunteer_impact': {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const entries: {
        hours: unknown;
        dollarValue: unknown;
        donor: { firstName: string | null; lastName: string | null; organizationName: string | null };
      }[] = await db.volunteerHours.findMany({
        where: { date: { gte: oneYearAgo } },
        include: { donor: { select: { firstName: true, lastName: true, organizationName: true } } },
      });

      const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
      const totalValue = entries.reduce((sum, e) => sum + Number(e.dollarValue), 0);

      const byDonor = new Map<string, number>();
      for (const e of entries) {
        const name = donorDisplayName(e.donor);
        byDonor.set(name, (byDonor.get(name) ?? 0) + Number(e.hours));
      }
      const topVolunteers = Array.from(byDonor.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, hours]) => ({ name, hours }));

      return { totalHoursLast12Months: totalHours, totalValueLast12Months: totalValue, topVolunteers };
    }

    case 'find_donor': {
      const query = typeof input.query === 'string' ? input.query.trim() : '';
      if (!query) return { error: 'No search query given.' };

      const donors: {
        firstName: string | null;
        lastName: string | null;
        organizationName: string | null;
        healthScore: number | null;
        retentionRisk: RetentionRisk | null;
        lifetimeGiving: unknown;
        lastGiftDate: Date | null;
      }[] = await db.donor.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { organizationName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          firstName: true,
          lastName: true,
          organizationName: true,
          healthScore: true,
          retentionRisk: true,
          lifetimeGiving: true,
          lastGiftDate: true,
        },
      });

      if (donors.length === 0) return { result: `No donor found matching "${query}".` };

      return donors.map((d) => ({
        name: donorDisplayName(d),
        healthScore: d.healthScore,
        retentionRisk: d.retentionRisk,
        lifetimeGiving: Number(d.lifetimeGiving),
        lastGiftDate: d.lastGiftDate ? d.lastGiftDate.toISOString().slice(0, 10) : null,
      }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
