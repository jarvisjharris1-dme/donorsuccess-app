'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { allocationSchema } from '@/lib/validation';

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Finds what this grantee was allocated for the same category in their
 * most recent prior round, if any — this is what backs the "Prior"
 * column on the allocation dashboard, computed live instead of copied
 * by hand into a new spreadsheet each cycle the way the EFSP Allocations
 * Sheet is.
 */
async function findPreviousAllocatedAmount(
  db: ReturnType<typeof forOrg>,
  granteeId: string,
  category: string,
  currentRoundId: string,
): Promise<number> {
  const priorRequest = await db.applicationCategoryRequest.findFirst({
    where: {
      category,
      fundingRoundId: { not: currentRoundId },
      application: { granteeId },
    },
    orderBy: { createdAt: 'desc' },
    include: { allocation: true },
  });

  return priorRequest?.allocation ? Number(priorRequest.allocation.allocatedAmount) : 0;
}

export async function decideAllocationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FUNDING_ROUNDS');

  const parsed = allocationSchema.safeParse({
    categoryRequestId: formData.get('categoryRequestId'),
    allocatedAmount: formData.get('allocatedAmount'),
    awardAmount: formData.get('awardAmount'),
    adjustedAmount: formData.get('adjustedAmount'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const categoryRequest = await db.applicationCategoryRequest.findUnique({
    where: { id: parsed.data.categoryRequestId },
    include: { application: true },
  });
  if (!categoryRequest) return { error: 'Category request not found.' };

  const previousAllocated = await findPreviousAllocatedAmount(
    db,
    categoryRequest.application.granteeId,
    categoryRequest.category,
    categoryRequest.fundingRoundId,
  );

  await db.allocation.upsert({
    where: { categoryRequestId: parsed.data.categoryRequestId },
    create: {
      organizationId: session.user.organizationId,
      categoryRequestId: parsed.data.categoryRequestId,
      previousAllocated,
      allocatedAmount: parsed.data.allocatedAmount,
      awardAmount: parsed.data.awardAmount,
      adjustedAmount: parsed.data.adjustedAmount,
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
    update: {
      allocatedAmount: parsed.data.allocatedAmount,
      awardAmount: parsed.data.awardAmount,
      adjustedAmount: parsed.data.adjustedAmount,
      decidedById: session.user.id,
      decidedAt: new Date(),
    },
  });

  revalidatePath(`/funding-rounds/${categoryRequest.fundingRoundId}`);
  return { success: 'Allocation saved.' };
}
