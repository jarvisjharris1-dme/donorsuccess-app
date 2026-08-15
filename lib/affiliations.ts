import { AffiliationType } from '@prisma/client';

export const AFFILIATION_TYPES: AffiliationType[] = [
  AffiliationType.EMPLOYER,
  AffiliationType.BOARD_MEMBER,
  AffiliationType.FAMILY_FOUNDATION,
  AffiliationType.SUBSIDIARY,
  AffiliationType.PARENT_COMPANY,
  AffiliationType.OTHER,
];

export const AFFILIATION_TYPE_LABELS: Record<AffiliationType, string> = {
  EMPLOYER: 'Employer',
  BOARD_MEMBER: 'Board Member',
  FAMILY_FOUNDATION: 'Family Foundation',
  SUBSIDIARY: 'Subsidiary',
  PARENT_COMPANY: 'Parent Company',
  OTHER: 'Other',
};
