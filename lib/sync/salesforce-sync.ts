import { OpportunityStage, DonorType, CrmProvider } from '@prisma/client';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { querySalesforce } from '@/lib/integrations/salesforce-api';

type SfContact = {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Phone: string | null;
  MailingStreet: string | null;
  MailingCity: string | null;
  MailingState: string | null;
  MailingPostalCode: string | null;
  MailingCountry: string | null;
};

type SfAccount = {
  Id: string;
  Name: string;
  Phone: string | null;
  BillingStreet: string | null;
  BillingCity: string | null;
  BillingState: string | null;
  BillingPostalCode: string | null;
  BillingCountry: string | null;
  RecordType: { Name: string } | null;
};

type SfOpportunity = {
  Id: string;
  Name: string;
  AccountId: string | null;
  Amount: number | null;
  StageName: string;
  IsClosed: boolean;
  IsWon: boolean;
  CloseDate: string | null;
  Probability: number | null;
  OpportunityContactRoles: { records: { ContactId: string }[] } | null;
};

export type SyncResult = {
  donorsCreated: number;
  donorsUpdated: number;
  opportunitiesCreated: number;
  opportunitiesUpdated: number;
  giftsCreated: number;
  skipped: { record: string; reason: string }[];
};

/**
 * Salesforce customizes StageName heavily per org, so there's no fixed
 * set of values to map from — IsClosed/IsWon are the only stage-related
 * fields guaranteed standard across every org, so those decide
 * Closed Won/Lost definitively. For anything still open, this is a
 * best-effort keyword guess at which of our 4 open stages it maps to;
 * it will misfire on unusual custom stage names. A real per-customer
 * stage-mapping config would be the correct fix, and is a reasonable
 * fast-follow rather than something to guess at now.
 */
function mapStage(stageName: string, isClosed: boolean, isWon: boolean): OpportunityStage {
  if (isClosed) return isWon ? OpportunityStage.CLOSED_WON : OpportunityStage.CLOSED_LOST;
  const s = stageName.toLowerCase();
  if (s.includes('proposal') || s.includes('negotiation') || s.includes('quote')) {
    return OpportunityStage.SOLICITATION;
  }
  if (s.includes('value') || s.includes('needs') || s.includes('decision')) {
    return OpportunityStage.CULTIVATION;
  }
  if (s.includes('steward') || s.includes('review')) {
    return OpportunityStage.STEWARDSHIP;
  }
  return OpportunityStage.IDENTIFICATION;
}

/** SOQL datetime literals don't take milliseconds. Only use this for actual DateTime fields (e.g. LastModifiedDate) — plain Date fields (e.g. CloseDate) reject a time component entirely. */
function soqlDateLiteral(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Plain Date fields in Salesforce (CloseDate, etc.) require an unquoted YYYY-MM-DD literal — a full datetime literal is rejected outright, which is exactly what broke here. */
function soqlDateOnlyLiteral(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds the "has this Contact/Account actually given recently" clause
 * as a SOQL semi-join — done in Salesforce's own query rather than
 * pulled down and filtered here, so records that don't qualify are
 * never even transferred, not merely hidden after the fact. Returns
 * an empty string (no filter at all) when minGivingHistoryYears isn't
 * set, which is the same as every existing connection's current
 * behavior today.
 */
function givingHistoryFilter(minGivingHistoryYears: number | null, kind: 'contact' | 'account'): string {
  if (minGivingHistoryYears === null) return '';
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - minGivingHistoryYears);
  const cutoffLiteral = soqlDateOnlyLiteral(cutoff);
  if (kind === 'contact') {
    return ` AND Id IN (SELECT ContactId FROM OpportunityContactRole WHERE Opportunity.IsWon = true AND Opportunity.CloseDate > ${cutoffLiteral})`;
  }
  return ` AND Id IN (SELECT AccountId FROM Opportunity WHERE IsWon = true AND CloseDate > ${cutoffLiteral})`;
}

/**
 * Pulls Contacts, Accounts, and Opportunities modified since the last
 * sync into Donors, Opportunities, and (for newly Closed Won deals)
 * Gifts. Pull-only — nothing here writes back to Salesforce. This is
 * Phase 2 of the phased plan discussed for this feature; push-sync and
 * true bidirectional conflict resolution are still ahead of this.
 */
export async function syncSalesforceForOrg(organizationId: string): Promise<SyncResult> {
  const connection = await prisma.crmConnection.findUnique({
    where: { organizationId_provider: { organizationId, provider: CrmProvider.SALESFORCE } },
  });
  if (!connection) {
    throw new Error('Salesforce is not connected for this organization.');
  }

  const db = forOrg(organizationId);
  const result: SyncResult = {
    donorsCreated: 0,
    donorsUpdated: 0,
    opportunitiesCreated: 0,
    opportunitiesUpdated: 0,
    giftsCreated: 0,
    skipped: [],
  };

  // Incremental sync — only pull records touched since last time. A
  // 5-minute overlap guards against clock skew between our timestamp
  // and Salesforce's, rather than trusting an exact boundary.
  const since = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt.getTime() - 5 * 60 * 1000)
    : new Date(0);
  const sinceLiteral = soqlDateLiteral(since);

  // ── Contacts → Donors (individuals) ─────────────────────────────────
  const contacts = await querySalesforce<SfContact>(
    organizationId,
    `SELECT Id, FirstName, LastName, Email, Phone, MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry
     FROM Contact
     WHERE LastModifiedDate > ${sinceLiteral}${givingHistoryFilter(connection.minGivingHistoryYears, 'contact')}`,
  );

  const contactIdToDonorId = new Map<string, string>();

  for (const c of contacts) {
    if (!c.FirstName && !c.LastName) {
      result.skipped.push({ record: `Contact ${c.Id}`, reason: 'No name' });
      continue;
    }

    const existing = await db.donor.findFirst({ where: { salesforceContactId: c.Id } });
    const data = {
      firstName: c.FirstName,
      lastName: c.LastName,
      email: c.Email,
      phone: c.Phone,
      addressLine1: c.MailingStreet,
      city: c.MailingCity,
      state: c.MailingState,
      postalCode: c.MailingPostalCode,
      country: c.MailingCountry ?? 'US',
      salesforceContactId: c.Id,
    };

    if (existing) {
      await db.donor.update({ where: { id: existing.id }, data });
      contactIdToDonorId.set(c.Id, existing.id);
      result.donorsUpdated += 1;
    } else {
      const created = await db.donor.create({ data: { ...data, organizationId } });
      contactIdToDonorId.set(c.Id, created.id);
      result.donorsCreated += 1;
    }
  }

  // ── Accounts → Donors (organizations) ───────────────────────────────
  // RecordType.Name is a standard Salesforce relationship field (safe
  // to query whether or not NPSP is installed) — used here purely to
  // filter out NPSP's auto-generated "Household Account" behind every
  // Contact. Without this filter, every individual donor would also
  // show up a second time as a spurious "organization" donor. Anything
  // else (a real company, foundation, or an org with no NPSP at all)
  // comes through as an ORGANIZATION-type donor.
  //
  // Uses its own since-value, not the shared incremental one: Account
  // syncing is new, so a connection that was already running
  // incrementally needs one full historical pull the first time,
  // rather than only picking up Accounts modified since its last
  // (Contact/Opportunity-only) sync.
  const accountsSince = connection.accountBackfillCompletedAt
    ? since
    : new Date(0);
  const accountsSinceLiteral = soqlDateLiteral(accountsSince);

  const accounts = await querySalesforce<SfAccount>(
    organizationId,
    `SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry, RecordType.Name
     FROM Account
     WHERE LastModifiedDate > ${accountsSinceLiteral}${givingHistoryFilter(connection.minGivingHistoryYears, 'account')}`,
  );

  const accountIdToDonorId = new Map<string, string>();

  for (const a of accounts) {
    if (a.RecordType?.Name === 'Household Account') {
      continue; // not skipped/logged — this is expected and extremely common under NPSP, not an error
    }
    if (!a.Name) {
      result.skipped.push({ record: `Account ${a.Id}`, reason: 'No name' });
      continue;
    }

    const existing = await db.donor.findFirst({ where: { salesforceAccountId: a.Id } });
    const data = {
      organizationName: a.Name,
      donorType: DonorType.ORGANIZATION,
      phone: a.Phone,
      addressLine1: a.BillingStreet,
      city: a.BillingCity,
      state: a.BillingState,
      postalCode: a.BillingPostalCode,
      country: a.BillingCountry ?? 'US',
      salesforceAccountId: a.Id,
    };

    if (existing) {
      await db.donor.update({ where: { id: existing.id }, data });
      accountIdToDonorId.set(a.Id, existing.id);
      result.donorsUpdated += 1;
    } else {
      const created = await db.donor.create({ data: { ...data, organizationId } });
      accountIdToDonorId.set(a.Id, created.id);
      result.donorsCreated += 1;
    }
  }

  // ── Opportunities → Opportunities + Gifts (newly Closed Won only) ──
  const opportunities = await querySalesforce<SfOpportunity>(
    organizationId,
    `SELECT Id, Name, AccountId, Amount, StageName, IsClosed, IsWon, CloseDate, Probability,
       (SELECT ContactId FROM OpportunityContactRoles WHERE IsPrimary = true LIMIT 1)
     FROM Opportunity
     WHERE LastModifiedDate > ${sinceLiteral}`,
  );

  for (const o of opportunities) {
    // Attribution preference: an individual's primary Contact Role
    // first (a specific person is usually the more precise donor to
    // credit), falling back to the Opportunity's Account — Salesforce's
    // standard field, always present, requiring no special setup —
    // when there's no contact role at all. This recovers giving history
    // for organization/corporate gifts that were never going to have a
    // primary contact role to begin with.
    const primaryContactId = o.OpportunityContactRoles?.records?.[0]?.ContactId;

    let donorId: string | undefined;

    if (primaryContactId) {
      donorId = contactIdToDonorId.get(primaryContactId);
      if (!donorId) {
        const donor = await db.donor.findFirst({ where: { salesforceContactId: primaryContactId } });
        donorId = donor?.id;
      }
    }

    if (!donorId && o.AccountId) {
      donorId = accountIdToDonorId.get(o.AccountId);
      if (!donorId) {
        const donor = await db.donor.findFirst({ where: { salesforceAccountId: o.AccountId } });
        donorId = donor?.id;
      }
    }

    if (!donorId) {
      result.skipped.push({
        record: `Opportunity ${o.Id} (${o.Name})`,
        reason: primaryContactId
          ? 'Primary contact not found in this app yet — will resolve once that Contact syncs'
          : o.AccountId
            ? 'Account not found in this app yet — will resolve once that Account syncs (or it may be a Household Account, which is not synced)'
            : 'No primary contact role and no Account set in Salesforce',
      });
      continue;
    }

    const stage = mapStage(o.StageName, o.IsClosed, o.IsWon);
    const existing = await db.opportunity.findFirst({ where: { salesforceId: o.Id } });

    const oppData = {
      donorId,
      name: o.Name,
      stage,
      askAmount: o.Amount,
      expectedAmount: o.Amount,
      probability: o.Probability,
      expectedCloseDate: o.CloseDate ? new Date(o.CloseDate) : null,
      closedAt: o.IsClosed && o.CloseDate ? new Date(o.CloseDate) : null,
      salesforceId: o.Id,
    };

    if (existing) {
      await db.opportunity.update({ where: { id: existing.id }, data: oppData });
      result.opportunitiesUpdated += 1;
    } else {
      await db.opportunity.create({
        data: { ...oppData, organizationId, ownerId: connection.connectedById },
      });
      result.opportunitiesCreated += 1;
    }

    if (stage === OpportunityStage.CLOSED_WON && o.Amount) {
      const existingGift = await db.gift.findFirst({ where: { salesforceOpportunityId: o.Id } });
      if (!existingGift) {
        await db.gift.create({
          data: {
            organizationId,
            donorId,
            amount: o.Amount,
            date: o.CloseDate ? new Date(o.CloseDate) : new Date(),
            salesforceOpportunityId: o.Id,
          },
        });
        result.giftsCreated += 1;
      }
    }
  }

  await prisma.crmConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncedAt: new Date(),
      accountBackfillCompletedAt: connection.accountBackfillCompletedAt ?? new Date(),
    },
  });

  return result;
}
