-- Donor Success: additive Grants & Allocations schema deployment
-- PURPOSE: create only the Phase 3C sub-granting objects required by the
-- application. This script intentionally DOES NOT synchronize or drop any
-- existing production objects, including internal_orders and
-- internal_customer_lifecycle.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FundingRoundStatus') THEN
    CREATE TYPE "FundingRoundStatus" AS ENUM ('DRAFT', 'OPEN', 'REVIEWING', 'DECIDED', 'CLOSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
    CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DECIDED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "funding_rounds" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "FundingRoundStatus" NOT NULL DEFAULT 'DRAFT',
  "totalPool" DECIMAL(12,2) NOT NULL,
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "rubricCriteria" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "funding_rounds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "funding_rounds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "funding_rounds_organizationId_idx" ON "funding_rounds"("organizationId");
CREATE INDEX IF NOT EXISTS "funding_rounds_organizationId_status_idx" ON "funding_rounds"("organizationId", "status");

CREATE TABLE IF NOT EXISTS "grantees" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "ein" TEXT,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT DEFAULT 'US',
  "missionSummary" TEXT,
  "lifetimeAwarded" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grantees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grantees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "grantees_organizationId_idx" ON "grantees"("organizationId");

CREATE TABLE IF NOT EXISTS "grantee_applications" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fundingRoundId" TEXT NOT NULL,
  "granteeId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "notOnWatchList" BOOLEAN NOT NULL DEFAULT false,
  "patriotActCompliant" BOOLEAN NOT NULL DEFAULT false,
  "notDebarred" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grantee_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grantee_applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "grantee_applications_fundingRoundId_fkey" FOREIGN KEY ("fundingRoundId") REFERENCES "funding_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "grantee_applications_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "grantees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "grantee_applications_fundingRoundId_granteeId_key" ON "grantee_applications"("fundingRoundId", "granteeId");
CREATE INDEX IF NOT EXISTS "grantee_applications_organizationId_idx" ON "grantee_applications"("organizationId");
CREATE INDEX IF NOT EXISTS "grantee_applications_fundingRoundId_idx" ON "grantee_applications"("fundingRoundId");
CREATE INDEX IF NOT EXISTS "grantee_applications_granteeId_idx" ON "grantee_applications"("granteeId");

CREATE TABLE IF NOT EXISTS "application_category_requests" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fundingRoundId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "requestedAmount" DECIMAL(12,2) NOT NULL,
  "targetPopulation" TEXT,
  "intakeProcess" TEXT,
  "deliveryMethod" TEXT,
  "county" TEXT,
  "serviceLocation" TEXT,
  "unitsProjected" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_category_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "application_category_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "application_category_requests_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "grantee_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "application_category_requests_fundingRoundId_fkey" FOREIGN KEY ("fundingRoundId") REFERENCES "funding_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "application_category_requests_organizationId_idx" ON "application_category_requests"("organizationId");
CREATE INDEX IF NOT EXISTS "application_category_requests_applicationId_idx" ON "application_category_requests"("applicationId");
CREATE INDEX IF NOT EXISTS "application_category_requests_fundingRoundId_idx" ON "application_category_requests"("fundingRoundId");

CREATE TABLE IF NOT EXISTS "evaluations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "scores" JSONB NOT NULL,
  "comment" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "evaluations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "evaluations_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "grantee_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "evaluations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "evaluations_applicationId_reviewerId_key" ON "evaluations"("applicationId", "reviewerId");
CREATE INDEX IF NOT EXISTS "evaluations_organizationId_idx" ON "evaluations"("organizationId");
CREATE INDEX IF NOT EXISTS "evaluations_applicationId_idx" ON "evaluations"("applicationId");

CREATE TABLE IF NOT EXISTS "allocations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "categoryRequestId" TEXT NOT NULL,
  "previousAllocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "allocatedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "awardAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "adjustedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "allocations_categoryRequestId_fkey" FOREIGN KEY ("categoryRequestId") REFERENCES "application_category_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "allocations_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "allocations_categoryRequestId_key" ON "allocations"("categoryRequestId");
CREATE INDEX IF NOT EXISTS "allocations_organizationId_idx" ON "allocations"("organizationId");

COMMIT;
