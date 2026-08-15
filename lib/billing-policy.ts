export const GRACE_PERIOD_DAYS = 2;
export const DATA_DELETION_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Statuses that start the grace-period clock. "trialing" and "active"
 * are healthy and never enforced; anything else (past_due, canceled,
 * unpaid, incomplete_expired) means payment isn't currently working.
 */
const AT_RISK_STATUSES = new Set(['past_due', 'canceled', 'unpaid', 'incomplete_expired']);

export type EnforcementState = {
  /** True once the 2-day grace period has elapsed — the org should be blocked from normal use. */
  isLocked: boolean;
  /** True during the grace period itself — full access, but worth warning about. */
  inGracePeriod: boolean;
  /** True once the 45-day mark has passed — eligible for the deletion cron to remove entirely. */
  isPastDeletionDeadline: boolean;
  daysSinceStatusChange: number | null;
};

/**
 * Only ever meaningful for self-serve organizations — Enterprise orgs
 * have no subscriptionStatus at all (always null, since they're
 * provisioned manually and never touch Stripe), so this always comes
 * back fully healthy for them regardless of the status/timestamp
 * arguments, by construction of subscriptionStatus being null.
 */
export function getEnforcementState(
  subscriptionStatus: string | null,
  subscriptionStatusChangedAt: Date | null,
): EnforcementState {
  if (!subscriptionStatus || !AT_RISK_STATUSES.has(subscriptionStatus) || !subscriptionStatusChangedAt) {
    return { isLocked: false, inGracePeriod: false, isPastDeletionDeadline: false, daysSinceStatusChange: null };
  }

  const daysSince = (Date.now() - subscriptionStatusChangedAt.getTime()) / DAY_MS;

  return {
    isLocked: daysSince >= GRACE_PERIOD_DAYS,
    inGracePeriod: daysSince < GRACE_PERIOD_DAYS,
    isPastDeletionDeadline: daysSince >= DATA_DELETION_DAYS,
    daysSinceStatusChange: daysSince,
  };
}
