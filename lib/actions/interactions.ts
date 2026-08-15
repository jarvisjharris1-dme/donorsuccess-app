'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { interactionSchema } from '@/lib/validation';
import { recalculateDonorHealthScore } from '@/lib/scoring/recalculate';

export type ActionState = { error?: string } | undefined;

export async function createInteractionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const donorId = formData.get('donorId');
  if (typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing donor.' };
  }

  const parsed = interactionSchema.safeParse({
    type: formData.get('type'),
    subject: formData.get('subject'),
    notes: formData.get('notes'),
    occurredAt: formData.get('occurredAt'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the interaction details.' };
  }

  const db = forOrg(session.user.organizationId);

  await db.$transaction(async (tx) => {
    // organizationId required by create's generated type; forOrg()
    // injects the real value at runtime regardless — see the comment in
    // lib/actions/campaigns.ts.
    await tx.interaction.create({
      data: {
        donorId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        notes: parsed.data.notes,
        occurredAt: new Date(parsed.data.occurredAt),
        loggedById: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    // Interactions feed the engagement factor — recompute in the same
    // transaction as the write that changed it.
    await recalculateDonorHealthScore(tx, donorId);
  });

  revalidatePath(`/donors/${donorId}`);
  revalidatePath('/donors');
}
