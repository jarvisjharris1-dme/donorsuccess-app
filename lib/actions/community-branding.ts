'use server';

import { revalidatePath } from 'next/cache';
import { put, del } from '@vercel/blob';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';
import { getCommunityBranding } from '@/lib/community-portal';

export type CommunityBrandingState = { error?: string; success?: string } | undefined;

export async function uploadCommunityLogoAction(
  _prevState: CommunityBrandingState,
  formData: FormData,
): Promise<CommunityBrandingState> {
  const session = await auth();
  if (!session) return { error: 'Please sign in again.' };
  if (!permissions.canManageOrgSettings(session.user.role as Role) && !session.user.isPlatformAdmin) {
    return { error: 'You do not have permission to update Community Portal branding.' };
  }

  const file = formData.get('logo');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a logo file to upload.' };
  if (!file.type.startsWith('image/')) return { error: 'Logo must be an image file.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Logo must be 5 MB or smaller.' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: 'File storage is not configured for this environment.' };

  const orgId = session.user.organizationId;
  const previous = await getCommunityBranding(orgId);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const blob = await put(`community-logos/${orgId}/${Date.now()}-${safeName}`, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  await prisma.$executeRawUnsafe(
    `UPDATE "organizations"
     SET "communityLogoUrl" = $2, "communityLogoPathname" = $3, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1`,
    orgId,
    blob.url,
    blob.pathname,
  );

  if (previous?.logoPathname && previous.logoPathname !== blob.pathname) {
    try { await del(previous.logoPathname); } catch (error) {
      console.warn('[Community Portal] Previous logo cleanup failed', error);
    }
  }

  revalidatePath('/settings/community-portal');
  revalidatePath('/funding-rounds');
  return { success: 'Community Portal logo updated.' };
}

export async function removeCommunityLogoAction(): Promise<void> {
  const session = await auth();
  if (!session) return;
  if (!permissions.canManageOrgSettings(session.user.role as Role) && !session.user.isPlatformAdmin) return;

  const orgId = session.user.organizationId;
  const previous = await getCommunityBranding(orgId);
  await prisma.$executeRawUnsafe(
    `UPDATE "organizations"
     SET "communityLogoUrl" = NULL, "communityLogoPathname" = NULL, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $1`,
    orgId,
  );
  if (previous?.logoPathname) {
    try { await del(previous.logoPathname); } catch (error) {
      console.warn('[Community Portal] Logo cleanup failed', error);
    }
  }
  revalidatePath('/settings/community-portal');
}
