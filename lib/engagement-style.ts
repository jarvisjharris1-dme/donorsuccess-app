import { EngagementStyle } from '@prisma/client';

export const ENGAGEMENT_STYLES: EngagementStyle[] = [
  EngagementStyle.DRIVER,
  EngagementStyle.DREAMER,
  EngagementStyle.DOER,
];

export const ENGAGEMENT_STYLE_LABELS: Record<EngagementStyle, string> = {
  DRIVER: 'Driver',
  DREAMER: 'Dreamer',
  DOER: 'Doer',
};

export const ENGAGEMENT_STYLE_DESCRIPTIONS: Record<EngagementStyle, string> = {
  DRIVER: 'Wants to see results and make the decision — lead with data, ROI, and a clear ask.',
  DREAMER: 'Responds to vision and the mission\u2019s big picture — lead with story and impact.',
  DOER: 'Wants to be hands-on and involved — lead with a specific way to participate, not just give.',
};

export const ENGAGEMENT_STYLE_STYLES: Record<EngagementStyle, string> = {
  DRIVER: 'bg-evergreen/10 text-evergreen',
  DREAMER: 'bg-sky/10 text-sky',
  DOER: 'bg-warning/10 text-warning',
};
