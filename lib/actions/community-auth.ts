'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { clearCommunitySessionCookie, issueCommunityMagicLink } from '@/lib/community-portal';

function normalizedEmail(formData: FormData) {
  const value = formData.get('email');
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function requestCommunityAccessAction(formData: FormData) {
  const email = normalizedEmail(formData);
  if (!email || !email.includes('@')) redirect('/community?sent=1');

  type Row = { id: string; email: string; organizationName: string };
  const applicants = await prisma.$queryRawUnsafe<Row[]>(
    `SELECT a."id", a."email", o."name" AS "organizationName"
     FROM "community_applicants" a
     JOIN "organizations" o ON o."id" = a."organizationId"
     WHERE lower(a."email") = lower($1)
     ORDER BY a."updatedAt" DESC
     LIMIT 5`,
    email,
  );

  // Always return the same screen whether a record exists or not so the public login cannot enumerate applicants.
  for (const applicant of applicants) {
    await issueCommunityMagicLink({
      applicantId: applicant.id,
      email: applicant.email,
      organizationName: applicant.organizationName,
    });
  }

  redirect('/community?sent=1');
}

export async function communityLogoutAction() {
  clearCommunitySessionCookie();
  redirect('/community');
}
