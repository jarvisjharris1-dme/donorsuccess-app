import type { Evaluation } from '@prisma/client';

export const FUNDING_ROUND_STATUS_LABELS = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  REVIEWING: 'Reviewing',
  DECIDED: 'Decided',
  CLOSED: 'Closed',
} as const;

export const FUNDING_ROUND_STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-emerald-100 text-emerald-700',
  REVIEWING: 'bg-amber-100 text-amber-700',
  DECIDED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-200 text-gray-600',
} as const;

export const APPLICATION_STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DECIDED: 'Decided',
} as const;

export const APPLICATION_STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  DECIDED: 'bg-emerald-100 text-emerald-700',
} as const;

/**
 * Averages every reviewer's per-criterion scores into a single 0-5
 * number for an application — the structured replacement for reading
 * through a stack of free-text comments to guess at reviewer sentiment.
 * Returns null if no reviewer has submitted yet, so callers can render
 * "—" instead of a misleading 0.
 */
export function computeAverageScore(evaluations: Pick<Evaluation, 'scores'>[]): number | null {
  const submitted = evaluations.filter((e) => Array.isArray(e.scores) && (e.scores as number[]).length > 0);
  if (submitted.length === 0) return null;

  const perEvaluationAverages = submitted.map((e) => {
    const scores = e.scores as number[];
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  });

  return perEvaluationAverages.reduce((sum, a) => sum + a, 0) / perEvaluationAverages.length;
}
