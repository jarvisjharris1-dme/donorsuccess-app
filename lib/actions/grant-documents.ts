'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { put, del } from '@vercel/blob';
import { Role, GrantRole } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertGrantCapability } from '@/lib/grant-permissions';

export type ActionState = { error?: string; success?: string } | undefined;

// Vercel's serverless function body limit is 4.5MB — server-side
// uploads (what this uses) can't exceed that. Compliance documents
// (reports, correspondence) are almost always well under this in
// practice; larger files would need the separate client-upload
// token-handshake flow, a reasonable fast-follow if that ever comes up
// rather than something to build now on spec.
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function uploadGrantDocumentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_DOCUMENTS');

  const grantOpportunityId = formData.get('grantOpportunityId');
  const requirementId = formData.get('requirementId');
  const milestoneId = formData.get('milestoneId');
  const file = formData.get('file');

  if (typeof grantOpportunityId !== 'string' || !grantOpportunityId) {
    return { error: 'Missing grant.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to upload.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File is too large — the limit is 4MB per file.' };
  }

  const db = forOrg(session.user.organizationId);
  const opportunity = await db.grantOpportunity.findUnique({ where: { id: grantOpportunityId } });
  if (!opportunity) return { error: 'Grant not found.' };

  let blobUrl: string;
  let blobPathname: string;
  try {
    // Real private storage — requires authentication for every read
    // and write, not just an unguessable URL. Requires the connected
    // Blob store itself to have been created with private access
    // (chosen at store-creation time and can't be changed afterward —
    // see .env.example for the setup note on this).
    const blob = await put(`grants/${grantOpportunityId}/${file.name}`, file, {
      access: 'private',
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    console.error('Grant document upload error:', err);
    return { error: 'Could not upload that file — try again.' };
  }

  await db.grantDocument.create({
    data: {
      organizationId: session.user.organizationId,
      grantOpportunityId,
      requirementId: typeof requirementId === 'string' && requirementId ? requirementId : null,
      milestoneId: typeof milestoneId === 'string' && milestoneId ? milestoneId : null,
      fileName: file.name,
      fileUrl: blobUrl,
      pathname: blobPathname,
      fileSize: file.size,
      mimeType: file.type || null,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'File uploaded.' };
}

export async function deleteGrantDocumentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertGrantCapability(session.user.role as Role, session.user.grantRole as GrantRole | null, 'MANAGE_DOCUMENTS');

  const id = formData.get('id');
  const grantOpportunityId = formData.get('grantOpportunityId');
  if (typeof id !== 'string' || !id) return { error: 'Missing document.' };

  const db = forOrg(session.user.organizationId);
  const document = await db.grantDocument.findUnique({ where: { id } });
  if (!document) return { error: 'Document not found.' };

  try {
    await del(document.fileUrl);
  } catch (err) {
    // An already-gone blob (or a transient error) shouldn't block
    // removing the database record — an orphaned blob is a smaller
    // problem than a document the UI can no longer remove.
    console.error('Grant document blob deletion error:', err);
  }

  await db.grantDocument.delete({ where: { id } });

  if (typeof grantOpportunityId === 'string') revalidatePath(`/grants/${grantOpportunityId}`);
  return { success: 'Document removed.' };
}
