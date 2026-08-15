'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, PlanType, MilestoneCategory, TaskPriority } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const milestoneTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Every milestone needs a title'),
  category: z.nativeEnum(MilestoneCategory).default(MilestoneCategory.OTHER),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  notes: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  dayOffset: z.coerce.number().int().min(0, 'Day offset can\u2019t be negative'),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Give this template a name'),
  description: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  planType: z
    .union([z.nativeEnum(PlanType), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined)),
  milestones: z.array(milestoneTemplateSchema).min(1, 'Add at least one milestone'),
});

export async function savePlanTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const milestonesRaw = formData.get('milestonesJson');
  let milestonesParsed: unknown;
  try {
    milestonesParsed = JSON.parse(typeof milestonesRaw === 'string' ? milestonesRaw : '[]');
  } catch {
    return { error: 'Could not read the milestone list — try again.' };
  }

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    planType: formData.get('planType'),
    milestones: milestonesParsed,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  const { milestones, ...templateData } = parsed.data;

  const template = isUpdate
    ? await db.planTemplate.update({ where: { id }, data: templateData })
    : await db.planTemplate.create({
        data: { ...templateData, organizationId: session.user.organizationId },
      });

  if (isUpdate) {
    await db.planTemplateMilestone.deleteMany({ where: { planTemplateId: template.id } });
  }
  await db.planTemplateMilestone.createMany({
    data: milestones.map((m, index) => ({
      organizationId: session.user.organizationId,
      planTemplateId: template.id,
      title: m.title,
      category: m.category,
      priority: m.priority,
      notes: m.notes,
      dayOffset: m.dayOffset,
      sortOrder: index,
    })),
  });

  revalidatePath('/settings/plan-templates');
  redirect('/settings/plan-templates');
}

export async function deletePlanTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing template.' };

  const db = forOrg(session.user.organizationId);

  await db.planTemplateMilestone.deleteMany({ where: { planTemplateId: id } });
  await db.planTemplate.delete({ where: { id } });

  revalidatePath('/settings/plan-templates');
  return { success: 'Template deleted.' };
}

/**
 * Applies a template's milestones to a real, already-existing plan —
 * each becomes an independent PlanMilestone row (dueDate computed from
 * the plan's own startDate + the template milestone's dayOffset), not
 * a live link back to the template. Editing the template later never
 * retroactively changes milestones already applied from it.
 */
export async function applyPlanTemplateAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const planId = formData.get('planId');
  const donorId = formData.get('donorId');
  const templateId = formData.get('templateId');
  if (typeof planId !== 'string' || !planId) return { error: 'Missing plan.' };
  if (typeof templateId !== 'string' || !templateId) return { error: 'Choose a template.' };

  const db = forOrg(session.user.organizationId);

  const plan = await db.donorSuccessPlan.findUnique({ where: { id: planId }, select: { startDate: true } });
  if (!plan) return { error: 'Plan not found.' };

  const template = await db.planTemplate.findUnique({
    where: { id: templateId },
    include: { milestoneTemplates: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!template) return { error: 'Template not found.' };

  const existingCount = await db.planMilestone.count({ where: { planId } });

  await db.planMilestone.createMany({
    data: template.milestoneTemplates.map((mt, index) => {
      const dueDate = new Date(plan.startDate);
      dueDate.setDate(dueDate.getDate() + mt.dayOffset);
      return {
        organizationId: session.user.organizationId,
        planId,
        title: mt.title,
        category: mt.category,
        priority: mt.priority,
        notes: mt.notes,
        dueDate,
        sortOrder: existingCount + index,
      };
    }),
  });

  if (typeof donorId === 'string') revalidatePath(`/donors/${donorId}/plan/${planId}`);
  return { success: `Added ${template.milestoneTemplates.length} milestone(s) from "${template.name}".` };
}
