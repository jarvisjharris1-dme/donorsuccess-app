import { DonorType } from '@prisma/client';

export const DONOR_TYPE_LABELS: Record<DonorType, string> = {
  INDIVIDUAL: 'Individual',
  HOUSEHOLD: 'Household',
  ORGANIZATION: 'Organization',
  FOUNDATION: 'Foundation',
  CORPORATION: 'Corporation',
};

/** Entity-type donors — as opposed to a person. Used to decide whether to show the org-only Contacts section, and elsewhere donor forms branch on individual vs. entity. */
export const ORG_TYPES = new Set<DonorType>([
  DonorType.ORGANIZATION,
  DonorType.FOUNDATION,
  DonorType.CORPORATION,
]);

export function isOrgType(donorType: DonorType): boolean {
  return ORG_TYPES.has(donorType);
}
