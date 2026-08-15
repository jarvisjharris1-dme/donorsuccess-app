'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const budgetLineSchema = z.object({
  name: z.string().trim().min(1, 'Give this budget line a name'),
  budgetedAmount: z.coerce.number().positive('Enter a budgeted amount'),
});

export async function addGrantBudgetLineAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const grantId = formData.get('grantId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof grantId !== 'string' || !grantId) return { error: 'Missing grant.' };

  const parsed = budgetLineSchema.safeParse({
    name: formData.get('name'),
    budgetedAmount: formData.get('budgetedAmount'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const count = await db.grantBudgetLine.count({ where: { grantId } });

  await db.grantBudgetLine.create({
    data: {
      organizationId: session.user.organizationId,
      grantId,
      name: parsed.data.name,
      budgetedAmount: parsed.data.budgetedAmount,
      sortOrder: count,
    },
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Budget line added.' };
}

export async function updateGrantBudgetLineAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing budget line.' };

  const parsed = budgetLineSchema.safeParse({
    name: formData.get('name'),
    budgetedAmount: formData.get('budgetedAmount'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.grantBudgetLine.update({
    where: { id },
    data: { name: parsed.data.name, budgetedAmount: parsed.data.budgetedAmount },
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Budget line updated.' };
}

export async function deleteGrantBudgetLineAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing budget line.' };

  const db = forOrg(session.user.organizationId);

  // Deleting a budget line takes any logged expenses against it with
  // it (Cascade in the schema) — worth a confirmation in the UI, this
  // action doesn't second-guess it since that's already handled there.
  const expenseCount = await db.grantExpense.count({ where: { budgetLineId: id } });
  await db.grantBudgetLine.delete({ where: { id } });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return {
    success: expenseCount > 0 ? `Budget line and ${expenseCount} logged expense(s) removed.` : 'Budget line removed.',
  };
}

const expenseSchema = z.object({
  amount: z.coerce.number().positive('Enter an expense amount'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().trim().optional().nullable().transform((v) => (v ? v : undefined)),
  documentId: z.string().optional().nullable().transform((v) => (v ? v : undefined)),
});

export async function logGrantExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const budgetLineId = formData.get('budgetLineId');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof budgetLineId !== 'string' || !budgetLineId) return { error: 'Missing budget line.' };

  const parsed = expenseSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    description: formData.get('description'),
    documentId: formData.get('documentId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  const budgetLine = await db.grantBudgetLine.findUnique({ where: { id: budgetLineId } });
  if (!budgetLine) return { error: 'Budget line not found.' };

  await db.grantExpense.create({
    data: {
      organizationId: session.user.organizationId,
      budgetLineId,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description,
      documentId: parsed.data.documentId,
      loggedById: session.user.id,
    },
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Expense logged.' };
}

export async function updateGrantExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing expense.' };

  const parsed = expenseSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    description: formData.get('description'),
    documentId: formData.get('documentId'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);
  await db.grantExpense.update({
    where: { id },
    data: {
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description,
      documentId: parsed.data.documentId,
    },
  });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Expense updated.' };
}

export async function deleteGrantExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FINANCIALS');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing expense.' };

  const db = forOrg(session.user.organizationId);
  await db.grantExpense.delete({ where: { id } });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Expense removed.' };
}
