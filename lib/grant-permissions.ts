import { Role, GrantRole } from '@prisma/client';

export type GrantCapability =
  | 'MANAGE_OPPORTUNITIES'
  | 'MANAGE_COMPLIANCE'
  | 'MANAGE_FINANCIALS'
  | 'MANAGE_DOCUMENTS'
  | 'COMMENT'
  | 'DELETE_GRANTS';

const GRANT_ROLE_CAPABILITIES: Record<GrantRole, GrantCapability[]> = {
  GRANT_ADMINISTRATOR: [
    'MANAGE_OPPORTUNITIES',
    'MANAGE_COMPLIANCE',
    'MANAGE_FINANCIALS',
    'MANAGE_DOCUMENTS',
    'COMMENT',
    'DELETE_GRANTS',
  ],
  GRANT_FINANCE_MANAGER: ['MANAGE_FINANCIALS', 'MANAGE_DOCUMENTS', 'COMMENT'],
  GRANT_WRITER: ['MANAGE_OPPORTUNITIES', 'MANAGE_COMPLIANCE', 'MANAGE_DOCUMENTS', 'COMMENT'],
  GRANT_REVIEWER: ['COMMENT'],
};

/**
 * True if either the base Role already grants full access (Owner/Admin
 * can always do anything, matching how the rest of the app works), or
 * the person's grants-specific role covers this particular capability.
 * Deliberately allows a base FUNDRAISER or even VIEWER to get elevated
 * grants access this way — the whole point of these roles is letting a
 * dedicated grants person have full grants control without needing
 * broader access to donors, campaigns, etc.
 */
export function hasGrantCapability(
  role: Role,
  grantRole: GrantRole | null,
  capability: GrantCapability,
): boolean {
  if (role === Role.OWNER || role === Role.ADMIN) return true;
  // Preserves exactly what a Fundraiser could already do in Grants
  // Management before these roles existed — full access except
  // deleting a grant entirely, which was already Admin+ only. This is
  // the critical backward-compatibility piece: these new roles are
  // additive, not a replacement people have to be assigned just to
  // keep the access they already have. Without this line, every
  // existing Fundraiser on every existing customer's account would
  // lose grants access the moment this shipped, unless someone
  // separately assigned them a grant role.
  if (role === Role.FUNDRAISER && capability !== 'DELETE_GRANTS') return true;
  // A dedicated grant role grants the same capabilities regardless of
  // base role — this is what lets a Viewer (who has no mutate access
  // anywhere else in the app) get real, scoped access to grants
  // specifically, which is the actual point of adding these roles.
  if (!grantRole) return false;
  return GRANT_ROLE_CAPABILITIES[grantRole].includes(capability);
}

/** Throws if neither the base role nor a grant role covers this capability — mirrors assertRole's throw-based pattern so call sites don't need their own if/throw. */
export function assertGrantCapability(
  role: Role,
  grantRole: GrantRole | null,
  capability: GrantCapability,
): void {
  if (!hasGrantCapability(role, grantRole, capability)) {
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
  GRANT_ADMINISTRATOR: 'Full control across the whole grants module, including deleting grants.',
  GRANT_FINANCE_MANAGER: 'Manages budget, expenses, and disbursements. Read-only elsewhere.',
  GRANT_WRITER: 'Manages applications, requirements, compliance, and documents.',
  GRANT_REVIEWER: 'Read-only access, plus the ability to leave notes.',
};
