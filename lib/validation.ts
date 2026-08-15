import { z } from 'zod';
import {
  DonorType,
  DonorSegment,
  GiftType,
  PaymentMethod,
  InteractionType,
  OpportunityStage,
  TaskPriority,
  TaskStatus,
  CampaignStatus,
  CampaignChannel,
  FrameworkStage,
  PlanStatus,
  PlanType,
  MilestoneCategory,
  Role,
} from '@prisma/client';

const optionalTrimmed = () =>
  z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined));

// Shared by every schema that accepts an email as input — normalizes to
// lowercase before it's ever used in a lookup or a create. Without
// this, "Jayharron1@gmail.com" (as originally typed at signup/invite
// time) and "jayharron1@gmail.com" (as typed on a later login or
// password reset) are two different strings as far as Postgres's
// default case-sensitive comparison is concerned — a real bug, not a
// hypothetical one, that silently breaks login/reset with no visible
// error anywhere.
const emailField = () => z.string().trim().email().transform((v) => v.toLowerCase());

export const loginSchema = z.object({
  email: emailField(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const donorSchema = z
  .object({
    donorType: z.nativeEnum(DonorType),
    firstName: optionalTrimmed(),
    lastName: optionalTrimmed(),
    organizationName: optionalTrimmed(),
    email: z
      .union([z.string().trim().email(), z.literal('')])
      .optional()
      .nullable()
      .transform((v) => (v ? v : undefined)),
    phone: optionalTrimmed(),
    addressLine1: optionalTrimmed(),
    addressLine2: optionalTrimmed(),
    city: optionalTrimmed(),
    state: optionalTrimmed(),
    postalCode: optionalTrimmed(),
    country: optionalTrimmed(),
    assignedToId: optionalTrimmed(),
    segment: z
      .union([z.nativeEnum(DonorSegment), z.literal('')])
      .optional()
      .nullable()
      .transform((v) => (v ? v : undefined)),
    tags: z.array(z.string()).optional().default([]),
  })
  .refine(
    (data) => {
      const isOrgType =
        data.donorType === DonorType.ORGANIZATION ||
        data.donorType === DonorType.FOUNDATION ||
        data.donorType === DonorType.CORPORATION;
      return isOrgType ? !!data.organizationName : !!(data.firstName || data.lastName);
    },
    {
      message: 'Enter a name — or an organization name for organization-type donors.',
      path: ['firstName'],
    },
  );

export type DonorInput = z.infer<typeof donorSchema>;

export const giftSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  giftType: z.nativeEnum(GiftType),
  paymentMethod: z.nativeEnum(PaymentMethod),
  fund: optionalTrimmed(),
  notes: optionalTrimmed(),
  campaignId: optionalTrimmed(),
});

export type GiftInput = z.infer<typeof giftSchema>;

export const interactionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  subject: optionalTrimmed(),
  notes: optionalTrimmed(),
  occurredAt: z.string().min(1, 'Date is required'),
});

export type InteractionInput = z.infer<typeof interactionSchema>;

// FormData gives us "" for empty numeric inputs, and Number("") is 0
// (not NaN), so we can't rely on z.coerce.number() alone — this treats
// blank/unparseable input as genuinely absent instead of zero.
const optionalNumber = () =>
  z.preprocess((val) => {
    if (typeof val !== 'string' || val.trim() === '') return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  }, z.number().optional());

export const opportunitySchema = z.object({
  donorId: z.string().min(1, 'Select a donor'),
  name: z.string().trim().min(1, 'Give this opportunity a name'),
  stage: z.nativeEnum(OpportunityStage),
  askAmount: optionalNumber(),
  expectedAmount: optionalNumber(),
  probability: optionalNumber().refine(
    (v) => v === undefined || (v >= 0 && v <= 100),
    'Probability must be between 0 and 100',
  ),
  expectedCloseDate: optionalTrimmed(),
  ownerId: z.string().min(1, 'Select an owner'),
  notes: optionalTrimmed(),
});

export type OpportunityInput = z.infer<typeof opportunitySchema>;

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Give this task a title'),
  description: optionalTrimmed(),
  dueDate: optionalTrimmed(),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  assignedToId: z.string().min(1, 'Assign this task to someone'),
  donorId: optionalTrimmed(),
  opportunityId: optionalTrimmed(),
  grantOpportunityId: optionalTrimmed(),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const campaignSchema = z.object({
  name: z.string().trim().min(1, 'Give this campaign a name'),
  description: optionalTrimmed(),
  goalAmount: optionalNumber(),
  status: z.nativeEnum(CampaignStatus),
  channel: z.nativeEnum(CampaignChannel),
  startDate: optionalTrimmed(),
  endDate: optionalTrimmed(),
  parentCampaignId: optionalTrimmed(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

export const planSchema = z.object({
  donorId: z.string().min(1, 'Missing donor'),
  title: z.string().trim().min(1, 'Give this plan a title'),
  stage: z.nativeEnum(FrameworkStage),
  planType: z.nativeEnum(PlanType).default(PlanType.GENERAL),
  status: z.nativeEnum(PlanStatus),
  objective: optionalTrimmed(),
  strategyNotes: optionalTrimmed(),
  targetAskAmount: optionalNumber(),
  targetGiftDate: optionalTrimmed(),
  reviewCadence: optionalTrimmed(),
  targetCompletionDate: optionalTrimmed(),
  ownerId: z.string().min(1, 'Select an owner'),
});

export type PlanInput = z.infer<typeof planSchema>;

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, 'Give this milestone a title'),
  dueDate: optionalTrimmed(),
  notes: optionalTrimmed(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  category: z.nativeEnum(MilestoneCategory).default(MilestoneCategory.OTHER),
  ownerId: optionalTrimmed(),
});

export type MilestoneInput = z.infer<typeof milestoneSchema>;

export const updateOrgSchema = z.object({
  name: z.string().trim().min(2, 'Organization name is required'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export const inviteSchema = z.object({
  email: emailField(),
  role: z.nativeEnum(Role),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const acceptInviteSchema = z.object({
  name: z.string().trim().min(1, 'Your name is required'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const executiveSummarySchema = z.object({
  executiveSummary: optionalTrimmed(),
});

const strongPassword = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[0-9]/, 'Include at least one number');

export const requestPasswordResetSchema = z.object({
  email: emailField(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPassword,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: strongPassword,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  });
