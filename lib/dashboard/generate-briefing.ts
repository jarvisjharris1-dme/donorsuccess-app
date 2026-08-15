import Anthropic from '@anthropic-ai/sdk';
import { CampaignStatus, TaskStatus, RetentionRisk } from '@prisma/client';
import { forOrg } from '@/lib/tenant-db';
import { calculateDonorRetentionRate } from '@/lib/metrics/retention';
import { OPEN_STAGES } from '@/lib/pipeline';
import { donorDisplayName } from '@/lib/format';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every number gathered here is exactly what the dashboard itself
 * would show for the "Whole Organization" view — nothing computed
 * specially for the AI, and nothing the person couldn't verify
 * themselves by looking at the dashboard directly. This is what keeps
 * the narrative grounded rather than a plausible-sounding guess.
 */
async function gatherBriefingData(organizationId: string) {
  const db = forOrg(organizationId);
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
  const sameDayLastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [
    donorCount,
    givingThisYear,
    givingSameStretchLastYear,
    pipelineAgg,
    activeCampaignCount,
    riskGroups,
    retention,
    overdueTaskCount,
    atRiskWithoutPlanCount,
    grantDeadlinesSoon,
  ] = await Promise.all([
    db.donor.count(),
    db.gift.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfYear, lte: now } } }),
    db.gift.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startOfLastYear, lte: sameDayLastYear } },
    }),
    db.opportunity.aggregate({ _sum: { askAmount: true }, where: { stage: { in: OPEN_STAGES } } }),
    db.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
    db.donor.groupBy({ by: ['retentionRisk'], _count: { _all: true } }),
    calculateDonorRetentionRate(db),
    db.task.count({ where: { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] }, dueDate: { lt: now } } }),
    db.donor.count({
      where: {
        retentionRisk: { in: [RetentionRisk.HIGH, RetentionRisk.CRITICAL] },
        successPlans: { none: { status: 'ACTIVE' } },
      },
    }),
    db.grantOpportunity.findMany({
      where: { stage: { in: ['RESEARCHING', 'LOI_SUBMITTED', 'PROPOSAL_SUBMITTED'] } },
      include: {
        donor: { select: { firstName: true, lastName: true, organizationName: true } },
        requirements: { where: { isComplete: false }, orderBy: { dueDate: 'asc' }, take: 1 },
      },
    }),
  ]);

  const riskCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const g of riskGroups as { retentionRisk: string | null; _count: { _all: number } }[]) {
    if (g.retentionRisk) riskCounts[g.retentionRisk] = g._count._all;
  }

  const overdueGrantItems = grantDeadlinesSoon
    .map((g) => {
      const nextReq = g.requirements[0];
      const relevantDate = nextReq?.dueDate ?? g.applicationDeadline ?? g.decisionExpectedDate;
      if (!relevantDate) return null;
      const daysUntil = (relevantDate.getTime() - now.getTime()) / DAY_MS;
      if (daysUntil > 14) return null;
      return { name: donorDisplayName(g.donor), daysUntil: Math.round(daysUntil) };
    })
    .filter((x): x is { name: string; daysUntil: number } => x !== null);

  return {
    donorCount,
    givingThisYear: Number(givingThisYear._sum.amount ?? 0),
    givingSameStretchLastYear: Number(givingSameStretchLastYear._sum.amount ?? 0),
    openPipelineValue: Number(pipelineAgg._sum.askAmount ?? 0),
    activeCampaignCount,
    riskCounts,
    retentionRate: retention.rate,
    overdueTaskCount,
    atRiskWithoutPlanCount,
    overdueGrantItems,
  };
}

function buildPrompt(data: Awaited<ReturnType<typeof gatherBriefingData>>): string {
  const yoyChange =
    data.givingSameStretchLastYear > 0
      ? Math.round(((data.givingThisYear - data.givingSameStretchLastYear) / data.givingSameStretchLastYear) * 100)
      : null;

  return `You are writing a short executive briefing for a nonprofit's Executive Director, to appear at the top of their dashboard. Use ONLY the numbers below — never invent a specific donor name, dollar figure, or fact not given here. If a number seems unremarkable, it's fine to simply not mention it; do not pad the summary to sound more eventful than the data actually is.

Write 3-4 sentences, plain language, no bullet points, no headers. Lead with the most notable thing in the numbers — good or concerning — not necessarily the first one listed.

Data (year-to-date, whole organization):
- Total donors: ${data.donorCount}
- Giving so far this year: $${data.givingThisYear.toLocaleString()}
- Giving over the same stretch last year: $${data.givingSameStretchLastYear.toLocaleString()}${yoyChange !== null ? ` (${yoyChange >= 0 ? '+' : ''}${yoyChange}% year over year)` : ''}
- Open pipeline value: $${data.openPipelineValue.toLocaleString()}
- Active campaigns: ${data.activeCampaignCount}
- Donor retention rate: ${data.retentionRate !== null ? `${Math.round(data.retentionRate * 100)}%` : 'not enough data yet'}
- Donors by risk band: ${data.riskCounts.CRITICAL} critical, ${data.riskCounts.HIGH} high, ${data.riskCounts.MEDIUM} medium, ${data.riskCounts.LOW} low
- Overdue tasks (org-wide): ${data.overdueTaskCount}
- At-risk donors with no active Success Plan: ${data.atRiskWithoutPlanCount}
- Grant deadlines within 14 days or overdue: ${data.overdueGrantItems.length}`;
}

export async function generateBriefingForOrg(
  organizationId: string,
  anthropic: Anthropic,
  model: string,
): Promise<{ content: string; modelUsed: string }> {
  const data = await gatherBriefingData(organizationId);
  const prompt = buildPrompt(data);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 250,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const content = textBlock && textBlock.type === 'text' ? textBlock.text : 'Briefing unavailable this run.';

  return { content, modelUsed: model };
}
