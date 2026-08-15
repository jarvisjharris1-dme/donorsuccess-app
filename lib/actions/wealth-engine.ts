'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { encryptToken } from '@/lib/crypto';
import { screenDonorWealth, verifyApiKey } from '@/lib/integrations/wealthengine';

export type ActionState = { error?: string; success?: string } | undefined;

export async function connectWealthEngineAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const apiKey = formData.get('apiKey');
  const baseUrl = formData.get('baseUrl');
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    return { error: 'API key is required.' };
  }
  const resolvedBaseUrl =
    typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim().replace(/\/$/, '') : 'https://api.wealthengine.com';

  try {
    await verifyApiKey(apiKey.trim(), resolvedBaseUrl);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not verify that API key.' };
  }

  await prisma.wealthEngineConnection.upsert({
    where: { organizationId: session.user.organizationId },
    update: { apiKeyEncrypted: encryptToken(apiKey.trim()), baseUrl: resolvedBaseUrl },
    create: {
      organizationId: session.user.organizationId,
      apiKeyEncrypted: encryptToken(apiKey.trim()),
      baseUrl: resolvedBaseUrl,
      connectedById: session.user.id,
    },
  });

  revalidatePath('/settings');
  return { success: 'Connected.' };
}

export async function disconnectWealthEngineAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  await prisma.wealthEngineConnection.deleteMany({
    where: { organizationId: session.user.organizationId },
  });

  revalidatePath('/settings');
  return { success: 'Disconnected.' };
}

/**
 * Screens one donor. Deliberately per-donor and explicitly
 * user-triggered, never automatic or bulk — each WealthEngine lookup
 * has a real per-profile cost, so nothing here should ever run without
 * a person specifically clicking a button for that one donor.
 */
export async function screenDonorWealthAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const donorId = formData.get('donorId');
  if (typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing donor.' };
  }

  const db = forOrg(session.user.organizationId);
  const donor = await db.donor.findUnique({ where: { id: donorId } });
  if (!donor) return { error: 'Donor not found.' };

  try {
    const result = await screenDonorWealth(session.user.organizationId, {
      firstName: donor.firstName,
      lastName: donor.lastName,
      addressLine1: donor.addressLine1,
      city: donor.city,
      state: donor.state,
      postalCode: donor.postalCode,
      email: donor.email,
      phone: donor.phone,
    });

    await db.donor.update({
      where: { id: donorId },
      data: {
        wealthEstimatedNetWorth: result.estimatedNetWorth,
        wealthEstimatedIncome: result.estimatedIncome,
        wealthRealEstateValue: result.realEstateValue,
        wealthGivingCapacity: result.givingCapacity,
        wealthP2gScore: result.p2gScore,
        wealthScreenedAt: new Date(),
        wealthScreeningRaw: result.raw as object,
      },
    });
  } catch (err) {
    console.error('WealthEngine screening error:', err);
    return { error: err instanceof Error ? err.message : 'Screening failed — try again.' };
  }

  revalidatePath(`/donors/${donorId}`);
  return { success: 'Screening complete.' };
}
