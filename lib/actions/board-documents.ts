'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { put, del } from '@vercel/blob';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';

export type ActionState = { error?: string; success?: string } | undefined;

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function uploadBoardMeetingDocumentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const meetingId = formData.get('meetingId');
  const file = formData.get('file');

  if (typeof meetingId !== 'string' || !meetingId) {
    return { error: 'Missing meeting.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a file to upload.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File is too large — the limit is 4MB per file.' };
  }

  const db = forOrg(session.user.organizationId);
  const meeting = await db.boardMeeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return { error: 'Meeting not found.' };

  let blobUrl: string;
  let blobPathname: string;
  try {
    const blob = await put(`board-meetings/${meetingId}/${file.name}`, file, {
      access: 'private',
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    console.error('Board meeting document upload error:', err);
    return { error: 'Could not upload that file — try again.' };
  }

  await db.boardMeetingDocument.create({
    data: {
      organizationId: session.user.organizationId,
      meetingId,
      fileName: file.name,
      fileUrl: blobUrl,
      pathname: blobPathname,
      fileSize: file.size,
      mimeType: file.type || null,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/board/meetings/${meetingId}`);
  return { success: 'File uploaded.' };
}

export async function deleteBoardMeetingDocumentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  const meetingId = formData.get('meetingId');
  if (typeof id !== 'string' || !id) return { error: 'Missing document.' };

  const db = forOrg(session.user.organizationId);
  const document = await db.boardMeetingDocument.findUnique({ where: { id } });
  if (!document) return { error: 'Document not found.' };

  try {
    await del(document.fileUrl);
  } catch (err) {
    console.error('Board meeting document blob deletion error:', err);
  }

  await db.boardMeetingDocument.delete({ where: { id } });

  if (typeof meetingId === 'string') revalidatePath(`/board/meetings/${meetingId}`);
  return { success: 'Document removed.' };
}
