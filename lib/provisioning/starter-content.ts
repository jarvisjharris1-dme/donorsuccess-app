import { RetentionRisk, PlanType, MilestoneCategory, TaskPriority } from '@prisma/client';
import type { ScopedPrisma } from '@/lib/tenant-db';

type StarterEmailTemplate = {
  key: string; // internal reference so sequences below can point at the right template
  name: string;
  subject: string;
  body: string;
  suggestedForRisk?: RetentionRisk;
};

export const STARTER_EMAIL_TEMPLATES: StarterEmailTemplate[] = [
  {
    key: 'thank-you',
    name: 'Thank You for Your Gift',
    subject: 'Thank you for your generosity, {{firstName}}',
    body: `Dear {{firstName}},

Thank you so much for your recent gift to {{organizationName}}. Support like yours makes our work possible, and we're deeply grateful you've chosen to stand with us.

Your generosity doesn't just fund a program — it changes lives. We'll keep you updated on the impact your gift is making.

With gratitude,
{{fundraiserName}}`,
  },
  {
    key: 'impact-update',
    name: 'Annual Impact Update',
    subject: 'See the impact you made possible this year',
    body: `Dear {{firstName}},

As the year comes to a close, we wanted to share what your support helped make possible at {{organizationName}}.

Because of donors like you, we've been able to expand our reach and deepen our impact in the community this year. None of it would be possible without your continued generosity.

Thank you for being part of this work.

Warmly,
{{fundraiserName}}`,
  },
  {
    key: 'weve-missed-you',
    name: "We've Missed You",
    subject: 'We\u2019d love to reconnect, {{firstName}}',
    body: `Dear {{firstName}},

It's been a while since we've been in touch, and we wanted to reach out personally. Your past support meant a great deal to {{organizationName}}, and we've missed staying connected with you.

We'd love to share what's new and hear how you're doing. Is there a good time for a quick call, or would you prefer we just send over an update?

Looking forward to reconnecting,
{{fundraiserName}}`,
    suggestedForRisk: RetentionRisk.HIGH,
  },
  {
    key: 'welcome-major-donor',
    name: 'Welcome & Thank You',
    subject: 'Welcome to the {{organizationName}} family',
    body: `Dear {{firstName}},

On behalf of everyone at {{organizationName}}, thank you for your generous gift. Gifts like yours are the foundation of everything we're able to accomplish.

I wanted to personally reach out and welcome you. Over the coming weeks, I'll share more about the impact you're making and how you can stay connected with our work.

Thank you again for your trust and generosity.

Warmly,
{{fundraiserName}}`,
  },
  {
    key: 'follow-up-checkin',
    name: 'Just Checking In',
    subject: 'Checking in, {{firstName}}',
    body: `Dear {{firstName}},

I wanted to follow up and see how you're doing. Your support of {{organizationName}} means so much, and I'd love to hear from you — whether it's a question, some feedback, or just a chance to catch up.

Please don't hesitate to reach out anytime.

Best,
{{fundraiserName}}`,
  },
];

export const STARTER_SEQUENCES: {
  name: string;
  description: string;
  suggestedForRisk?: RetentionRisk;
  steps: { templateKey: string; dayOffset: number }[];
}[] = [
  {
    name: 'New Major Donor Welcome',
    description: 'A 3-touch welcome journey for new or first-time major donors.',
    steps: [
      { templateKey: 'welcome-major-donor', dayOffset: 0 },
      { templateKey: 'impact-update', dayOffset: 14 },
      { templateKey: 'follow-up-checkin', dayOffset: 45 },
    ],
  },
  {
    name: 'At-Risk Donor Recovery',
    description: 'A gentle 2-touch re-engagement sequence for donors showing signs of lapsing.',
    suggestedForRisk: RetentionRisk.HIGH,
    steps: [
      { templateKey: 'weve-missed-you', dayOffset: 0 },
      { templateKey: 'follow-up-checkin', dayOffset: 14 },
    ],
  },
];

export const STARTER_PLAN_TEMPLATES: {
  name: string;
  description: string;
  planType: PlanType;
  milestones: { title: string; category: MilestoneCategory; priority: TaskPriority; dayOffset: number }[];
}[] = [
  {
    name: 'Major Gift Cultivation',
    description: 'A structured path from initial cultivation to the ask, for a promising major donor prospect.',
    planType: PlanType.MAJOR_GIFT_CULTIVATION,
    milestones: [
      { title: 'Initial cultivation call', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.HIGH, dayOffset: 0 },
      { title: 'Send a personalized impact update', category: MilestoneCategory.STEWARDSHIP_TOUCH, priority: TaskPriority.MEDIUM, dayOffset: 14 },
      { title: 'Schedule an in-person visit', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.HIGH, dayOffset: 30 },
      { title: 'Have the ask conversation', category: MilestoneCategory.ASK_CONVERSATION, priority: TaskPriority.HIGH, dayOffset: 60 },
      { title: 'Send a thank-you regardless of outcome', category: MilestoneCategory.THANK_YOU, priority: TaskPriority.MEDIUM, dayOffset: 67 },
    ],
  },
  {
    name: 'Lapsed Donor Recovery',
    description: 'A light-touch plan for personally reconnecting with a donor who has gone quiet.',
    planType: PlanType.LAPSED_DONOR_RECOVERY,
    milestones: [
      { title: 'Personal outreach call', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.HIGH, dayOffset: 0 },
      { title: 'Send a follow-up note', category: MilestoneCategory.FOLLOW_UP, priority: TaskPriority.MEDIUM, dayOffset: 7 },
      { title: 'Invite to an upcoming event', category: MilestoneCategory.EVENT_INVITATION, priority: TaskPriority.MEDIUM, dayOffset: 21 },
    ],
  },
  {
    name: 'Planned Giving Conversation',
    description: 'A slower, trust-focused path for introducing legacy and estate giving options.',
    planType: PlanType.PLANNED_GIVING,
    milestones: [
      { title: 'Introduce planned giving options', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.MEDIUM, dayOffset: 0 },
      { title: 'Send planned giving information packet', category: MilestoneCategory.STEWARDSHIP_TOUCH, priority: TaskPriority.MEDIUM, dayOffset: 7 },
      { title: 'Follow-up conversation about legacy intentions', category: MilestoneCategory.ASK_CONVERSATION, priority: TaskPriority.HIGH, dayOffset: 30 },
      { title: 'Connect with their estate or legal advisor, if needed', category: MilestoneCategory.FOLLOW_UP, priority: TaskPriority.MEDIUM, dayOffset: 45 },
      { title: 'Thank them and confirm any documentation', category: MilestoneCategory.THANK_YOU, priority: TaskPriority.MEDIUM, dayOffset: 60 },
    ],
  },
  {
    name: 'Ongoing Stewardship',
    description: 'A no-ask relationship-maintenance rhythm for a donor who\u2019s already engaged and giving well.',
    planType: PlanType.STEWARDSHIP,
    milestones: [
      { title: 'Send a personalized thank-you for recent support', category: MilestoneCategory.THANK_YOU, priority: TaskPriority.HIGH, dayOffset: 0 },
      { title: 'Share an impact story relevant to their interests', category: MilestoneCategory.STEWARDSHIP_TOUCH, priority: TaskPriority.MEDIUM, dayOffset: 30 },
      { title: 'Invite to a stewardship event or site visit', category: MilestoneCategory.EVENT_INVITATION, priority: TaskPriority.MEDIUM, dayOffset: 60 },
      { title: 'No-ask check-in call', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.LOW, dayOffset: 90 },
    ],
  },
  {
    name: 'New Donor Onboarding',
    description: 'A first-90-days welcome path for a donor who just made their first gift.',
    planType: PlanType.ONBOARDING,
    milestones: [
      { title: 'Send a welcome and thank-you for their first gift', category: MilestoneCategory.THANK_YOU, priority: TaskPriority.HIGH, dayOffset: 0 },
      { title: 'Personal welcome call or note', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.MEDIUM, dayOffset: 7 },
      { title: 'Share more about the organization\u2019s mission and programs', category: MilestoneCategory.STEWARDSHIP_TOUCH, priority: TaskPriority.LOW, dayOffset: 21 },
      { title: 'Follow-up check-in', category: MilestoneCategory.FOLLOW_UP, priority: TaskPriority.MEDIUM, dayOffset: 45 },
    ],
  },
  {
    name: 'General Donor Engagement',
    description: 'A simple, all-purpose starting point for a plan that doesn\u2019t fit a more specific type yet.',
    planType: PlanType.GENERAL,
    milestones: [
      { title: 'Initial outreach', category: MilestoneCategory.CULTIVATION_CALL, priority: TaskPriority.MEDIUM, dayOffset: 0 },
      { title: 'Follow-up touch', category: MilestoneCategory.FOLLOW_UP, priority: TaskPriority.MEDIUM, dayOffset: 30 },
      { title: 'Stewardship check-in', category: MilestoneCategory.STEWARDSHIP_TOUCH, priority: TaskPriority.LOW, dayOffset: 60 },
    ],
  },
];

export type StarterContentResult = {
  templatesCreated: number;
  templatesSkipped: number;
  sequencesCreated: number;
  sequencesSkipped: number;
  planTemplatesCreated: number;
  planTemplatesSkipped: number;
};

/**
 * Idempotent by name — safe to call more than once (e.g. an existing
 * org clicking "Load starter content" a second time to pick up
 * anything missing) without creating duplicates. Skips anything that
 * already exists by that exact name rather than erroring.
 */
export async function createStarterContent(
  db: ScopedPrisma,
  organizationId: string,
): Promise<StarterContentResult> {
  const result: StarterContentResult = {
    templatesCreated: 0,
    templatesSkipped: 0,
    sequencesCreated: 0,
    sequencesSkipped: 0,
    planTemplatesCreated: 0,
    planTemplatesSkipped: 0,
  };

  const templateIdByKey = new Map<string, string>();

  for (const t of STARTER_EMAIL_TEMPLATES) {
    const existing = await db.emailTemplate.findFirst({ where: { name: t.name } });
    if (existing) {
      templateIdByKey.set(t.key, existing.id);
      result.templatesSkipped += 1;
      continue;
    }
    const created = await db.emailTemplate.create({
      data: {
        organizationId,
        name: t.name,
        subject: t.subject,
        body: t.body,
        suggestedForRisk: t.suggestedForRisk,
      },
    });
    templateIdByKey.set(t.key, created.id);
    result.templatesCreated += 1;
  }

  for (const seq of STARTER_SEQUENCES) {
    const existing = await db.sequenceTemplate.findFirst({ where: { name: seq.name } });
    if (existing) {
      result.sequencesSkipped += 1;
      continue;
    }
    const createdSeq = await db.sequenceTemplate.create({
      data: {
        organizationId,
        name: seq.name,
        description: seq.description,
        suggestedForRisk: seq.suggestedForRisk,
      },
    });
    await db.sequenceTemplateStep.createMany({
      data: seq.steps.map((s, index) => {
        const emailTemplateId = templateIdByKey.get(s.templateKey);
        if (!emailTemplateId) {
          throw new Error(`Starter content misconfigured: no template found for key "${s.templateKey}"`);
        }
        return {
          organizationId,
          sequenceTemplateId: createdSeq.id,
          emailTemplateId,
          dayOffset: s.dayOffset,
          sortOrder: index,
        };
      }),
    });
    result.sequencesCreated += 1;
  }

  for (const pt of STARTER_PLAN_TEMPLATES) {
    const existing = await db.planTemplate.findFirst({ where: { name: pt.name } });
    if (existing) {
      result.planTemplatesSkipped += 1;
      continue;
    }
    const createdTemplate = await db.planTemplate.create({
      data: {
        organizationId,
        name: pt.name,
        description: pt.description,
        planType: pt.planType,
      },
    });
    await db.planTemplateMilestone.createMany({
      data: pt.milestones.map((m, index) => ({
        organizationId,
        planTemplateId: createdTemplate.id,
        title: m.title,
        category: m.category,
        priority: m.priority,
        dayOffset: m.dayOffset,
        sortOrder: index,
      })),
    });
    result.planTemplatesCreated += 1;
  }

  return result;
}
