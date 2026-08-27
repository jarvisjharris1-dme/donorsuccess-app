import { Role, GrantRole } from '@prisma/client';

export type GrantCapability =
  | 'MANAGE_OPPORTUNITIES'
  | 'MANAGE_COMPLIANCE'
  | 'MANAGE_FINANCIALS'
  | 'MANAGE_DOCUMENTS'
  | 'COMMENT'
  | 'DELETE_GRANTS'
  | 'MANAGE_FUNDING_ROUNDS'
  | 'MANAGE_APPLICATIONS'
  | 'SCORE_APPLICATIONS';

const GRANT_ROLE_CAPABILITIES: Record<GrantRole, GrantCapability[]> = {
  GRANT_ADMINISTRATOR: [
    'MANAGE_OPPORTUNITIES',
    'MANAGE_COMPLIANCE',
    'MANAGE_FINANCIALS',
    'MANAGE_DOCUMENTS',
    'COMMENT',
    'DELETE_GRANTS',
    'MANAGE_FUNDING_ROUNDS',
    'MANAGE_APPLICATIONS',
    'SCORE_APPLICATIONS',
  ],
  GRANT_FINANCE_MANAGER: ['MANAGE_FINANCIALS', 'MANAGE_DOCUMENTS', 'COMMENT'],
  GRANT_WRITER: ['MANAGE_OPPORTUNITIES', 'MANAGE_COMPLIANCE', 'MANAGE_DOCUMENTS', 'COMMENT', 'MANAGE_APPLICATIONS'],
  GRANT_REVIEWER: ['COMMENT', 'SCORE_APPLICATIONS'],
};

export function hasGrantCapability(
  role: Role,
  grantRole: GrantRole | null,
  capability: GrantCapability,
  isPlatformAdmin = false,
): boolean {
  if (isPlatformAdmin) return true;
  if (role === Role.OWNER || role === Role.ADMIN) return true;
  if (
    role === Role.FUNDRAISER &&
    capability !== 'DELETE_GRANTS' &&
    capability !== 'MANAGE_FUNDING_ROUNDS' &&
    capability !== 'MANAGE_APPLICATIONS' &&
    capability !== 'SCORE_APPLICATIONS'
  ) return true;
  if (!grantRole) return false;
  return GRANT_ROLE_CAPABILITIES[grantRole].includes(capability);
}

export function assertGrantCapability(
  role: Role,
  grantRole: GrantRole | null,
  capability: GrantCapability,
  isPlatformAdmin = false,
): void {
  if (!hasGrantCapability(role, grantRole, capability, isPlatformAdmin)) {
    throw new Error('You do not have permission to perform this action.');
  }
}

export const GRANT_ROLE_LABELS: Record<GrantRole, string> = {
  GRANT_ADMINISTRATOR: 'Grant Administrator',
  GRANT_FINANCE_MANAGER: 'Grant Finance Manager',
  GRANT_WRITER: 'Grant Writer',
  GRANT_REVIEWER: 'Grant Reviewer',
};

export const GRANT_ROLE_DESCRIPTIONS: Record<GrantRole, string> = {
  GRANT_ADMINISTRATOR: 'Full control across the whole grants module, including deleting grants and running funding rounds.',
  GRANT_FINANCE_MANAGER: 'Manages budget, expenses, and disbursements. Read-only elsewhere.',
  GRANT_WRITER: 'Manages applications, requirements, compliance, documents, and grantee applications.',
  GRANT_REVIEWER: 'Read-only access, plus the ability to leave notes and score grantee applications.',
};
