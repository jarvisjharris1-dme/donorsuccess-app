import { Role } from '@prisma/client';

/**
 * Fundraisers default to "mine" — their own book of donors — since
 * that's the whole point of the toggle they asked for. Owner/Admin/
 * Viewer default to "all": those roles don't typically have donors
 * personally assigned to them, so defaulting them to "mine" would just
 * show an empty dashboard. An explicit ?scope= in the URL always wins
 * over this default, for any role.
 */
export function resolveScope(role: Role, scopeParam: string | undefined): 'mine' | 'all' {
  if (scopeParam === 'mine' || scopeParam === 'all') return scopeParam;
  return role === Role.FUNDRAISER ? 'mine' : 'all';
}
