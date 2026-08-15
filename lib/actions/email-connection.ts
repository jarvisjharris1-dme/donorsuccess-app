'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export type ActionState = { error?: string; success?: string } | undefined;

export async function disconnectEmailAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');

  // Raw `prisma` client — EmailConnection is keyed by userId, not
  // organizationId, so forOrg() doesn't apply.
  await prisma.emailConnection.deleteMany({ where: { userId: session.user.id } });

  revalidatePath('/settings');
  return { success: 'Disconnected.' };
}
