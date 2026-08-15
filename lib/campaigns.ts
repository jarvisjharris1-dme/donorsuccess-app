import { CampaignStatus, CampaignChannel } from '@prisma/client';

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  CampaignStatus.PLANNING,
  CampaignStatus.ACTIVE,
  CampaignStatus.COMPLETED,
  CampaignStatus.ARCHIVED,
];

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const STATUS_STYLES: Record<CampaignStatus, string> = {
  PLANNING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-success/10 text-success',
  COMPLETED: 'bg-sky/10 text-sky',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  EMAIL: 'Email',
  DIRECT_MAIL: 'Direct Mail',
  EVENT: 'Event',
  DIGITAL: 'Digital',
  PHONE: 'Phone',
  SOCIAL: 'Social',
  OTHER: 'Other',
};
