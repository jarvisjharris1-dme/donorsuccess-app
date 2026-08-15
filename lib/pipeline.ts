import { OpportunityStage } from '@prisma/client';

export const ORDERED_STAGES: OpportunityStage[] = [
  OpportunityStage.IDENTIFICATION,
  OpportunityStage.CULTIVATION,
  OpportunityStage.SOLICITATION,
  OpportunityStage.STEWARDSHIP,
  OpportunityStage.CLOSED_WON,
  OpportunityStage.CLOSED_LOST,
];

export const OPEN_STAGES: OpportunityStage[] = [
  OpportunityStage.IDENTIFICATION,
  OpportunityStage.CULTIVATION,
  OpportunityStage.SOLICITATION,
  OpportunityStage.STEWARDSHIP,
];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  IDENTIFICATION: 'Identification',
  CULTIVATION: 'Cultivation',
  SOLICITATION: 'Solicitation',
  STEWARDSHIP: 'Stewardship',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
};

export const STAGE_STYLES: Record<OpportunityStage, string> = {
  IDENTIFICATION: 'bg-gray-100 text-gray-600',
  CULTIVATION: 'bg-sky/10 text-sky',
  SOLICITATION: 'bg-warning/10 text-warning',
  STEWARDSHIP: 'bg-teal/10 text-evergreen',
  CLOSED_WON: 'bg-success/10 text-success',
  CLOSED_LOST: 'bg-error/10 text-error',
};

// Used to weight the pipeline forecast when an opportunity doesn't have
// an explicit `probability` set — a reasonable default by stage.
export const DEFAULT_STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  IDENTIFICATION: 10,
  CULTIVATION: 25,
  SOLICITATION: 50,
  STEWARDSHIP: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
};

export function effectiveProbability(
  stage: OpportunityStage,
  probability: number | null | undefined,
): number {
  return probability ?? DEFAULT_STAGE_PROBABILITY[stage];
}
