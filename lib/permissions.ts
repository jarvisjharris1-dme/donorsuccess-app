import { Role } from '@prisma/client';

// Higher number = more privilege. OWNER > ADMIN > FUNDRAISER > VIEWER > BOARD_MEMBER.
const ROLE_RANK: Record<Role, number> = {
  BOARD_MEMBER: -1, // future portal role — restricted to its own board data only, never general donor access the way VIEWER has
  VIEWER: 0,
  FUNDRAISER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** True if `role` meets or exceeds `minimum` in privilege. */
export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const permissions = {
  canViewDonors: (role: Role) => hasRole(role, Role.VIEWER),
  canEditDonors: (role: Role) => hasRole(role, Role.FUNDRAISER),
  canDeleteRecords: (role: Role) => hasRole(role, Role.ADMIN),
  canManageUsers: (role: Role) => hasRole(role, Role.ADMIN),
  canManageBilling: (role: Role) => role === Role.OWNER,
  canManageOrgSettings: (role: Role) => hasRole(role, Role.ADMIN),
};

/**
 * Throws if `role` doesn't meet `minimum`. Use in server actions / route
 * handlers to fail closed rather than trusting the caller checked first.
 */
export function assertRole(role: Role, minimum: Role) {
  if (!hasRole(role, minimum)) {
    throw new Error(`Forbidden: requires ${minimum} role or higher`);
  }
}
