import { FrameworkStage, PlanStatus, PlanType, MilestoneStatus, MilestoneCategory } from '@prisma/client';

export const FRAMEWORK_STAGES: FrameworkStage[] = [
  FrameworkStage.ATTRACT,
  FrameworkStage.ENGAGE,
  FrameworkStage.CULTIVATE,
  FrameworkStage.GROW,
  FrameworkStage.RETAIN,
  FrameworkStage.ADVOCATE,
  FrameworkStage.LEGACY,
];

export const STAGE_LABELS: Record<FrameworkStage, string> = {
  ATTRACT: 'Attract',
  ENGAGE: 'Engage',
  CULTIVATE: 'Cultivate',
  GROW: 'Grow',
  RETAIN: 'Retain',
  ADVOCATE: 'Advocate',
  LEGACY: 'Legacy',
};

export const STAGE_STYLES: Record<FrameworkStage, string> = {
  ATTRACT: 'bg-gray-100 text-gray-600',
  ENGAGE: 'bg-sky/10 text-sky',
  CULTIVATE: 'bg-teal/10 text-evergreen',
  GROW: 'bg-success/10 text-success',
  RETAIN: 'bg-warning/10 text-warning',
  ADVOCATE: 'bg-evergreen/10 text-evergreen',
  LEGACY: 'bg-gray-900/10 text-gray-900',
};

export const PLAN_STATUSES: PlanStatus[] = [
  PlanStatus.DRAFT,
  PlanStatus.ACTIVE,
  PlanStatus.COMPLETED,
  PlanStatus.ARCHIVED,
];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const PLAN_STATUS_STYLES: Record<PlanStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-success/10 text-success',
  COMPLETED: 'bg-sky/10 text-sky',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  MilestoneStatus.OPEN,
  MilestoneStatus.IN_PROGRESS,
  MilestoneStatus.DONE,
  MilestoneStatus.BLOCKED,
];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

export const MILESTONE_STATUS_STYLES: Record<MilestoneStatus, string> = {
  OPEN: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-sky/10 text-sky',
  DONE: 'bg-success/10 text-success',
  BLOCKED: 'bg-error/10 text-error',
};

export const MILESTONE_CATEGORIES: MilestoneCategory[] = [
  MilestoneCategory.CULTIVATION_CALL,
  MilestoneCategory.STEWARDSHIP_TOUCH,
  MilestoneCategory.ASK_CONVERSATION,
  MilestoneCategory.THANK_YOU,
  MilestoneCategory.EVENT_INVITATION,
  MilestoneCategory.FOLLOW_UP,
  MilestoneCategory.OTHER,
];

export const MILESTONE_CATEGORY_LABELS: Record<MilestoneCategory, string> = {
  CULTIVATION_CALL: 'Cultivation Call',
  STEWARDSHIP_TOUCH: 'Stewardship Touch',
  ASK_CONVERSATION: 'Ask Conversation',
  THANK_YOU: 'Thank You',
  EVENT_INVITATION: 'Event Invitation',
  FOLLOW_UP: 'Follow-up',
  OTHER: 'Other',
};

export const PLAN_TYPES: PlanType[] = [
  PlanType.MAJOR_GIFT_CULTIVATION,
  PlanType.LAPSED_DONOR_RECOVERY,
  PlanType.PLANNED_GIVING,
  PlanType.STEWARDSHIP,
  PlanType.ONBOARDING,
  PlanType.GENERAL,
];

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  MAJOR_GIFT_CULTIVATION: 'Major Gift Cultivation',
  LAPSED_DONOR_RECOVERY: 'Lapsed Donor Recovery',
  PLANNED_GIVING: 'Planned Giving',
  STEWARDSHIP: 'Stewardship',
  ONBOARDING: 'Onboarding',
  GENERAL: 'General',
};

export const PLAN_TYPE_STYLES: Record<PlanType, string> = {
  MAJOR_GIFT_CULTIVATION: 'bg-evergreen/10 text-evergreen',
  LAPSED_DONOR_RECOVERY: 'bg-error/10 text-error',
  PLANNED_GIVING: 'bg-gray-900/10 text-gray-900',
  STEWARDSHIP: 'bg-teal/10 text-evergreen',
  ONBOARDING: 'bg-sky/10 text-sky',
  GENERAL: 'bg-gray-100 text-gray-600',
};
