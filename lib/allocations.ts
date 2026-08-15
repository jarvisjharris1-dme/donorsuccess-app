import type { Evaluation } from '@prisma/client';

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
