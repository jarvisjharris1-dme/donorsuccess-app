import { GrantStage, OpportunityStage } from '@prisma/client';

export const GRANT_STAGES: GrantStage[] = [
  GrantStage.RESEARCHING,
  GrantStage.LOI_SUBMITTED,
  GrantStage.PROPOSAL_SUBMITTED,
  GrantStage.AWARDED,
  GrantStage.DECLINED,
];

export const GRANT_STAGE_LABELS: Record<GrantStage, string> = {
  RESEARCHING: 'Researching',
  LOI_SUBMITTED: 'LOI submitted',
  PROPOSAL_SUBMITTED: 'Proposal submitted',
  AWARDED: 'Awarded',
  DECLINED: 'Declined',
};

export const GRANT_STAGE_STYLES: Record<GrantStage, string> = {
  RESEARCHING: 'bg-gray-100 text-gray-600',
  LOI_SUBMITTED: 'bg-sky/10 text-sky',
  PROPOSAL_SUBMITTED: 'bg-warning/10 text-warning',
  AWARDED: 'bg-success/10 text-success',
  DECLINED: 'bg-error/10 text-error',
};

/** Stages still in play — used to compute "active" counts and totals. */
export const OPEN_GRANT_STAGES: GrantStage[] = [
  GrantStage.RESEARCHING,
  GrantStage.LOI_SUBMITTED,
  GrantStage.PROPOSAL_SUBMITTED,
];

/**
 * Best-effort default mapping shown to the user as a pre-filled,
 * editable stage when converting a regular Opportunity into a grant —
 * not applied silently. There's no clean 1:1 correspondence between
 * the two stage sets (the same "best-effort keyword guess" reasoning
 * already used for Salesforce's own StageName mapping), so the person
 * converting gets a reasonable starting point they can correct rather
 * than a guess they're stuck with.
 */
export function defaultGrantStage(oppStage: OpportunityStage): GrantStage {
  switch (oppStage) {
    case OpportunityStage.IDENTIFICATION:
    case OpportunityStage.CULTIVATION:
      return GrantStage.RESEARCHING;
    case OpportunityStage.SOLICITATION:
      return GrantStage.PROPOSAL_SUBMITTED;
    case OpportunityStage.STEWARDSHIP:
    case OpportunityStage.CLOSED_WON:
      return GrantStage.AWARDED;
    case OpportunityStage.CLOSED_LOST:
      return GrantStage.DECLINED;
    default:
      return GrantStage.RESEARCHING;
  }
}
