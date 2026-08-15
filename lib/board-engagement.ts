import { BoardRole, CommitmentType, CommitmentStatus, IntroductionStatus } from '@prisma/client';

export const BOARD_ROLES: BoardRole[] = [
  BoardRole.CHAIR,
  BoardRole.VICE_CHAIR,
  BoardRole.TREASURER,
  BoardRole.SECRETARY,
  BoardRole.COMMITTEE_CHAIR,
  BoardRole.MEMBER,
];

export const BOARD_ROLE_LABELS: Record<BoardRole, string> = {
  CHAIR: 'Chair',
  VICE_CHAIR: 'Vice Chair',
  TREASURER: 'Treasurer',
  SECRETARY: 'Secretary',
  COMMITTEE_CHAIR: 'Committee Chair',
  MEMBER: 'Member',
};

export const COMMITMENT_TYPES: CommitmentType[] = [
  CommitmentType.GIVE,
  CommitmentType.GET,
  CommitmentType.ATTEND,
  CommitmentType.VOLUNTEER,
  CommitmentType.INTRODUCTION,
];

export const COMMITMENT_TYPE_LABELS: Record<CommitmentType, string> = {
  GIVE: 'Give',
  GET: 'Get (fundraise/solicit)',
  ATTEND: 'Attend',
  VOLUNTEER: 'Volunteer',
  INTRODUCTION: 'Introduction',
};

export const COMMITMENT_STATUSES: CommitmentStatus[] = [
  CommitmentStatus.NOT_STARTED,
  CommitmentStatus.IN_PROGRESS,
  CommitmentStatus.FULFILLED,
  CommitmentStatus.MISSED,
];

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  FULFILLED: 'Fulfilled',
  MISSED: 'Missed',
};

export const COMMITMENT_STATUS_STYLES: Record<CommitmentStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-sky/10 text-sky',
  FULFILLED: 'bg-success/10 text-success',
  MISSED: 'bg-error/10 text-error',
};

export const INTRODUCTION_STATUSES: IntroductionStatus[] = [
  IntroductionStatus.SUGGESTED,
  IntroductionStatus.REQUESTED,
  IntroductionStatus.MADE,
  IntroductionStatus.MEETING_HELD,
  IntroductionStatus.DECLINED,
];

export const INTRODUCTION_STATUS_LABELS: Record<IntroductionStatus, string> = {
  SUGGESTED: 'Suggested',
  REQUESTED: 'Requested',
  MADE: 'Made',
  MEETING_HELD: 'Meeting Held',
  DECLINED: 'Declined',
};

export const INTRODUCTION_STATUS_STYLES: Record<IntroductionStatus, string> = {
  SUGGESTED: 'bg-gray-100 text-gray-600',
  REQUESTED: 'bg-warning/10 text-warning',
  MADE: 'bg-sky/10 text-sky',
  MEETING_HELD: 'bg-success/10 text-success',
  DECLINED: 'bg-error/10 text-error',
};

/** "2 years, 3 months" style duration between two dates, always at least "less than a month". */
function formatDuration(fromMs: number, toMs: number): string {
  const totalMonths = Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24 * 30.44)));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0 && months === 0) return 'Less than a month';
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.join(', ');
}

export type TenureInfo = {
  servedLabel: string;
  remainingLabel: string | null; // null if the term has no end date, or has already ended
  isPastEndDate: boolean;
};

export function calculateTenure(startDate: Date, endDate: Date | null): TenureInfo {
  const now = Date.now();
  const servedLabel = formatDuration(startDate.getTime(), now);

  if (!endDate) {
    return { servedLabel, remainingLabel: null, isPastEndDate: false };
  }

  const isPastEndDate = endDate.getTime() < now;
  const remainingLabel = isPastEndDate ? null : formatDuration(now, endDate.getTime());

  return { servedLabel, remainingLabel, isPastEndDate };
}
