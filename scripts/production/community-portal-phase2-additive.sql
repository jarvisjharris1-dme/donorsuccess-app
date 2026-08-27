BEGIN;

-- Community Portal branding lives on the funding organization itself.
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "communityLogoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "communityLogoPathname" TEXT;

-- External applicant identities are intentionally separate from Donor Success staff users.
CREATE TABLE IF NOT EXISTS "community_applicants" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "granteeId" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_applicants_organizationId_email_key"
  ON "community_applicants" ("organizationId", "email");
CREATE INDEX IF NOT EXISTS "community_applicants_organizationId_idx"
  ON "community_applicants" ("organizationId");
CREATE INDEX IF NOT EXISTS "community_applicants_granteeId_idx"
  ON "community_applicants" ("granteeId");

DO $$ BEGIN
  ALTER TABLE "community_applicants"
    ADD CONSTRAINT "community_applicants_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_applicants"
    ADD CONSTRAINT "community_applicants_granteeId_fkey"
    FOREIGN KEY ("granteeId") REFERENCES "grantees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One-time links are exchanged for a longer-lived applicant session cookie.
CREATE TABLE IF NOT EXISTS "community_magic_links" (
  "id" TEXT PRIMARY KEY,
  "applicantId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "community_magic_links_applicantId_idx"
  ON "community_magic_links" ("applicantId");

DO $$ BEGIN
  ALTER TABLE "community_magic_links"
    ADD CONSTRAINT "community_magic_links_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "community_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "community_sessions" (
  "id" TEXT PRIMARY KEY,
  "applicantId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "community_sessions_applicantId_idx"
  ON "community_sessions" ("applicantId");
CREATE INDEX IF NOT EXISTS "community_sessions_expiresAt_idx"
  ON "community_sessions" ("expiresAt");

DO $$ BEGIN
  ALTER TABLE "community_sessions"
    ADD CONSTRAINT "community_sessions_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "community_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Applicant-uploaded support documents use the same Vercel Blob store as other private files.
CREATE TABLE IF NOT EXISTS "community_application_documents" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "pathname" TEXT,
  "fileSize" INTEGER NOT NULL,
  "mimeType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "community_application_documents_organizationId_idx"
  ON "community_application_documents" ("organizationId");
CREATE INDEX IF NOT EXISTS "community_application_documents_applicationId_idx"
  ON "community_application_documents" ("applicationId");
CREATE INDEX IF NOT EXISTS "community_application_documents_applicantId_idx"
  ON "community_application_documents" ("applicantId");

DO $$ BEGIN
  ALTER TABLE "community_application_documents"
    ADD CONSTRAINT "community_application_documents_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_application_documents"
    ADD CONSTRAINT "community_application_documents_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "grantee_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "community_application_documents"
    ADD CONSTRAINT "community_application_documents_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "community_applicants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
