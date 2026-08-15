/**
 * Independent Sector's published national estimate of the value of
 * one volunteer hour. Updated annually (usually around National
 * Volunteer Week in April) — https://independentsector.org/value-of-volunteer-time/
 *
 * Current as of this rate's last verified update: $36.14/hour,
 * published April 21, 2026 (based on 2025 BLS wage data).
 *
 * Deliberately a hardcoded constant, not fetched live from anywhere —
 * Independent Sector doesn't publish a public API for this figure, and
 * more importantly, every VolunteerHours entry stores its own
 * hourlyRateApplied at the time it was logged. This constant is only
 * ever read at the moment a NEW entry is created (or when displaying
 * the current default in Settings); it never retroactively changes
 * the value of past entries. Update this each year when Independent
 * Sector republishes, the same way any other yearly-updated constant
 * would be maintained.
 */
export const INDEPENDENT_SECTOR_NATIONAL_RATE = 36.14;

/**
 * Resolves the rate to actually use for a new VolunteerHours entry —
 * the organization's own override if they've set one, otherwise the
 * current Independent Sector national default.
 */
export function resolveVolunteerHourlyRate(orgOverrideRate: number | string | null | undefined): number {
  if (orgOverrideRate === null || orgOverrideRate === undefined) {
    return INDEPENDENT_SECTOR_NATIONAL_RATE;
  }
  const parsed = typeof orgOverrideRate === 'string' ? Number(orgOverrideRate) : orgOverrideRate;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : INDEPENDENT_SECTOR_NATIONAL_RATE;
}
