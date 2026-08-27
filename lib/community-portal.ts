import { createHash, randomBytes, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';

export const COMMUNITY_SESSION_COOKIE = 'ds-community-session';

export type CommunityBranding = {
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  logoPathname: string | null;
};

export type CommunityApplicantSession = {
  applicantId: string;
  organizationId: string;
  organizationName: string;
  granteeId: string;
  granteeName: string;
  email: string;
  name: string | null;
};

type BrandingRow = {
  id: string;
  name: string;
  communityLogoUrl: string | null;
  communityLogoPathname: string | null;
};

type ApplicantRow = {
  id: string;
  organizationId: string;
  granteeId: string;
  name: string | null;
  email: string;
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function getCommunityBranding(organizationId: string): Promise<CommunityBranding | null> {
  const rows = await prisma.$queryRawUnsafe<BrandingRow[]>(
    `SELECT "id", "name", "communityLogoUrl", "communityLogoPathname"
     FROM "organizations"
     WHERE "id" = $1
     LIMIT 1`,
    organizationId,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    organizationId: row.id,
    organizationName: row.name,
    logoUrl: row.communityLogoUrl,
    logoPathname: row.communityLogoPathname,
  };
}

export async function findOrCreateCommunityApplicant(input: {
  organizationId: string;
  granteeId: string;
  name: string;
  email: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.$queryRawUnsafe<ApplicantRow[]>(
    `SELECT "id", "organizationId", "granteeId", "name", "email"
     FROM "community_applicants"
     WHERE "organizationId" = $1 AND lower("email") = lower($2)
     LIMIT 1`,
    input.organizationId,
    email,
  );

  if (existing[0]) {
    const updated = await prisma.$queryRawUnsafe<ApplicantRow[]>(
      `UPDATE "community_applicants"
       SET "granteeId" = $2, "name" = $3, "email" = $4, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1
       RETURNING "id", "organizationId", "granteeId", "name", "email"`,
      existing[0].id,
      input.granteeId,
      input.name || null,
      email,
    );
    return updated[0];
  }

  const id = randomUUID();
  const created = await prisma.$queryRawUnsafe<ApplicantRow[]>(
    `INSERT INTO "community_applicants" ("id", "organizationId", "granteeId", "name", "email")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING "id", "organizationId", "granteeId", "name", "email"`,
    id,
    input.organizationId,
    input.granteeId,
    input.name || null,
    email,
  );
  return created[0];
}

export async function createCommunitySession(applicantId: string) {
  const sessionToken = randomBytes(32).toString('hex');
  const sessionHash = hashToken(sessionToken);
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "community_sessions" ("id", "applicantId", "tokenHash", "expiresAt")
     VALUES ($1, $2, $3, $4)`,
    sessionId,
    applicantId,
    sessionHash,
    expiresAt,
  );
  return { token: sessionToken, expiresAt };
}

export function setCommunitySessionCookie(token: string, expiresAt: Date) {
  cookies().set(COMMUNITY_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearCommunitySessionCookie() {
  cookies().set(COMMUNITY_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function issueCommunityMagicLink(input: {
  applicantId: string;
  email: string;
  organizationName: string;
}) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "community_magic_links" ("id", "applicantId", "tokenHash", "expiresAt")
     VALUES ($1, $2, $3, $4)`,
    id,
    input.applicantId,
    tokenHash,
    expiresAt,
  );

  const url = `${appBaseUrl()}/community/access/${token}`;
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Community Portal] RESEND_API_KEY missing; magic link was not emailed.', { email: input.email, url });
    return url;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Donor Success <noreply@donorsuccess.com>',
    to: input.email,
    subject: `Access your ${input.organizationName} funding application`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172321">
        <h2 style="color:#0f6f66">Your Community Portal</h2>
        <p>Use the secure button below to continue your funding application or review its status.</p>
        <p style="margin:28px 0"><a href="${url}" style="background:#0f6f66;color:white;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Open Community Portal</a></p>
        <p style="font-size:13px;color:#66736f">This link expires in 30 minutes. The portal is provided by Donor Success on behalf of ${input.organizationName}.</p>
      </div>`,
  });

  return url;
}

export async function exchangeCommunityMagicToken(token: string) {
  const tokenHash = hashToken(token);
  type MagicRow = { id: string; applicantId: string; expiresAt: Date; usedAt: Date | null };
  const rows = await prisma.$queryRawUnsafe<MagicRow[]>(
    `SELECT "id", "applicantId", "expiresAt", "usedAt"
     FROM "community_magic_links"
     WHERE "tokenHash" = $1
     LIMIT 1`,
    tokenHash,
  );
  const magic = rows[0];
  if (!magic || magic.usedAt || new Date(magic.expiresAt) <= new Date()) return null;

  await prisma.$executeRawUnsafe(
    `UPDATE "community_magic_links" SET "usedAt" = CURRENT_TIMESTAMP WHERE "id" = $1`,
    magic.id,
  );

  return createCommunitySession(magic.applicantId);
}

export async function getCommunityApplicantSession(): Promise<CommunityApplicantSession | null> {
  const token = cookies().get(COMMUNITY_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  type SessionRow = CommunityApplicantSession & { expiresAt: Date };
  const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
    `SELECT
       a."id" AS "applicantId",
       a."organizationId",
       o."name" AS "organizationName",
       a."granteeId",
       g."legalName" AS "granteeName",
       a."email",
       a."name",
       s."expiresAt"
     FROM "community_sessions" s
     JOIN "community_applicants" a ON a."id" = s."applicantId"
     JOIN "organizations" o ON o."id" = a."organizationId"
     JOIN "grantees" g ON g."id" = a."granteeId"
     WHERE s."tokenHash" = $1
     LIMIT 1`,
    tokenHash,
  );
  const session = rows[0];
  if (!session || new Date(session.expiresAt) <= new Date()) return null;
  return {
    applicantId: session.applicantId,
    organizationId: session.organizationId,
    organizationName: session.organizationName,
    granteeId: session.granteeId,
    granteeName: session.granteeName,
    email: session.email,
    name: session.name,
  };
}
