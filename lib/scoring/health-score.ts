import { RetentionRisk } from '@prisma/client';

export type ScoreFactors = {
  recency: number; // 0–100, based on days since last gift
  frequency: number; // 0–100, based on total gift count
  monetary: number; // 0–100, based on lifetime giving
  engagement: number; // 0–100, based on interactions in the last 12 months
};

export type ScoreResult = {
  score: number;
  retentionRisk: RetentionRisk;
  factors: ScoreFactors;
};

// Weights sum to 1. Recency and monetary carry the most signal for
// nonprofit giving specifically: a donor who gave a lot but has gone
// quiet is a bigger retention risk than one who gives small amounts
// steadily, which is why recency is weighted highest.
const WEIGHTS = {
  recency: 0.35,
  frequency: 0.2,
  monetary: 0.25,
  engagement: 0.2,
};

function scoreRecency(lastGiftDate: Date | null): number {
  if (!lastGiftDate) return 0;
  const days = Math.floor((Date.now() - lastGiftDate.getTime()) / 86_400_000);
  if (days <= 90) return 100;
  if (days <= 180) return 75;
  if (days <= 365) return 50;
  if (days <= 730) return 25;
  return 0;
}

function scoreFrequency(giftCount: number): number {
  // 10+ lifetime gifts is treated as maximum frequency signal.
  return Math.min(100, Math.round((giftCount / 10) * 100));
}

function scoreMonetary(lifetimeGiving: number): number {
  if (lifetimeGiving >= 50_000) return 100;
  if (lifetimeGiving >= 10_000) return 85;
  if (lifetimeGiving >= 2_500) return 65;
  if (lifetimeGiving >= 500) return 40;
  if (lifetimeGiving > 0) return 20;
  return 0;
}

function scoreEngagement(interactionsLast12Months: number, volunteerHoursLast12Months: number): number {
  // 6+ logged touchpoints in a year is treated as maximum interaction signal.
  const interactionScore = Math.min(100, Math.round((interactionsLast12Months / 6) * 100));

  // Volunteering is an additive engagement signal, not a replacement for
  // it — a donor with plenty of logged interactions and zero volunteer
  // hours scores exactly as they did before this existed (interactionScore
  // alone). 20+ hours in the last 12 months adds the maximum boost, but
  // the total is capped at 100 either way, so this can only ever help,
  // never push someone above where interactions alone would cap out.
  const volunteerBoost = Math.min(40, Math.round((volunteerHoursLast12Months / 20) * 40));

  return Math.min(100, interactionScore + volunteerBoost);
}

function riskForScore(score: number): RetentionRisk {
  if (score >= 70) return RetentionRisk.LOW;
  if (score >= 45) return RetentionRisk.MEDIUM;
  if (score >= 20) return RetentionRisk.HIGH;
  return RetentionRisk.CRITICAL;
}

export function computeHealthScore(input: {
  lastGiftDate: Date | null;
  giftCount: number;
  lifetimeGiving: number;
  interactionsLast12Months: number;
  volunteerHoursLast12Months: number;
}): ScoreResult {
  const factors: ScoreFactors = {
    recency: scoreRecency(input.lastGiftDate),
    frequency: scoreFrequency(input.giftCount),
    monetary: scoreMonetary(input.lifetimeGiving),
    engagement: scoreEngagement(input.interactionsLast12Months, input.volunteerHoursLast12Months),
  };

  const score = Math.round(
    factors.recency * WEIGHTS.recency +
      factors.frequency * WEIGHTS.frequency +
      factors.monetary * WEIGHTS.monetary +
      factors.engagement * WEIGHTS.engagement,
  );

  return { score, retentionRisk: riskForScore(score), factors };
}
