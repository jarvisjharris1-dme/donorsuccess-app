'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { del, put } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { getCommunityApplicantSession } from '@/lib/community-portal';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export async function uploadCommunityApplicationDocumentAction(applicationId: string, formData: FormData) {
  const session = await getCommunityApplicantSession();
  if (!session) return;

  const application = await prisma.granteeApplication.findFirst({
    where: {
      id: applicationId,
      organizationId: session.organizationId,
      granteeId: session.granteeId,
    },
    select: { id: true, status: true },
  });
  if (!application) return;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type)) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Applicant file storage is not configured.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const blob = await put(
    `community-applications/${session.organizationId}/${applicationId}/${Date.now()}-${safeName}`,
    file,
    { access: 'private', addRandomSuffix: false },
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "community_application_documents"
      ("id", "organizationId", "applicationId", "applicantId", "fileName", "fileUrl", "pathname", "fileSize", "mimeType")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    randomUUID(),
    session.organizationId,
    applicationId,
    session.applicantId,
    file.name,
    blob.url,
    blob.pathname,
    file.size,
    file.type || null,
  );

  revalidatePath(`/community/portal/applications/${applicationId}`);
}

export async function removeCommunityApplicationDocumentAction(applicationId: string, documentId: string) {
  const session = await getCommunityApplicantSession();
  if (!session) return;

  type Row = { id: string; pathname: string | null };
  const rows = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT d."id", d."pathname"
     FROM "community_application_documents" d
     JOIN "grantee_applications" a ON a."id" = d."applicationId"
     WHERE d."id" = $1
       AND d."applicationId" = $2
       AND d."organizationId" = $3
       AND a."granteeId" = $4
     LIMIT 1`,
    documentId,
    applicationId,
    session.organizationId,
    session.granteeId,
  );
  const document = rows[0];
  if (!document) return;

  await prisma.$executeRawUnsafe(`DELETE FROM "community_application_documents" WHERE "id" = $1`, documentId);
  if (document.pathname) {
    try { await del(document.pathname); } catch (error) {
      console.warn('[Community Portal] Applicant document blob cleanup failed', error);
    }
  }
  revalidatePath(`/community/portal/applications/${applicationId}`);
}
