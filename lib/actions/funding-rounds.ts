'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, GrantRole, FundingRoundStatus } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';
import { fundingRoundSchema } from '@/lib/validation';

export type ActionState = { error?: string; success?: string } | undefined;

export async function saveFundingRoundAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FUNDING_ROUNDS');

  const parsed = fundingRoundSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    totalPool: formData.get('totalPool'),
    opensAt: formData.get('opensAt'),
    closesAt: formData.get('closesAt'),
    categories: formData.get('categories') ?? '',
    rubricCriteria: formData.get('rubricCriteria') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };
  }

  const db = forOrg(session.user.organizationId);

  const { opensAt, closesAt, ...rest } = parsed.data;
  const data = {
    ...rest,
    opensAt: opensAt ? new Date(opensAt) : null,
    closesAt: closesAt ? new Date(closesAt) : null,
  };

  const id = formData.get('id');
  const isUpdate = typeof id === 'string' && id.length > 0;

  const round = isUpdate
    ? await db.fundingRound.update({ where: { id }, data })
    : await db.fundingRound.create({
        data: { ...data, organizationId: session.user.organizationId },
      });

  revalidatePath('/funding-rounds');
  revalidatePath(`/funding-rounds/${round.id}`);
  redirect(`/funding-rounds/${round.id}`);
}

export async function updateFundingRoundStatusAction(
  roundId: string,
  status: FundingRoundStatus,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_FUNDING_ROUNDS');

  const db = forOrg(session.user.organizationId);

  const round = await db.fundingRound.findUnique({ where: { id: roundId } });
  if (!round) return { error: 'Funding round not found.' };

  await db.fundingRound.update({ where: { id: roundId }, data: { status } });

  revalidatePath('/funding-rounds');
  revalidatePath(`/funding-rounds/${roundId}`);
  return { success: 'Status updated.' };
}
