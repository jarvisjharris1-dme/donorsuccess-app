import { prisma } from '@/lib/db';
import { decryptToken } from '@/lib/crypto';

export type WealthScreeningInput = {
  firstName: string | null;
  lastName: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type WealthScreeningResult = {
  estimatedNetWorth: number | null;
  estimatedIncome: number | null;
  realEstateValue: number | null;
  givingCapacity: number | null;
  p2gScore: number | null;
  raw: unknown;
};

/**
 * Field-name mapping here is based on WealthEngine's published API
 * documentation (name/address/email/phone lookup, Basic vs. Full
 * Profile responses containing net worth, income, real estate,
 * giving capacity, and a "Propensity to Give" score) — NOT verified
 * against a real account's actual response, since that requires a
 * paid WealthEngine account this build doesn't have access to.
 * Treat the exact field paths below (profile.wealth.*, etc.) as a
 * best-effort starting point to adjust once you can see a real
 * response — see the README for how to check and correct this.
 */
function parseProfileResponse(json: any): WealthScreeningResult {
  const wealth = json?.profile?.wealth ?? json?.wealth ?? {};
  const giving = json?.profile?.giving ?? json?.giving ?? {};
  const scores = json?.profile?.scores ?? json?.scores ?? {};

  const num = (v: unknown): number | null => {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && !Number.isNaN(n) ? n : null;
  };

  return {
    estimatedNetWorth: num(wealth.netWorth ?? wealth.total_net_worth),
    estimatedIncome: num(wealth.income ?? wealth.estimated_income),
    realEstateValue: num(wealth.realEstate ?? wealth.real_estate_value),
    givingCapacity: num(giving.capacity ?? giving.giving_capacity),
    p2gScore: num(scores.p2g ?? scores.propensity_to_give),
    raw: json,
  };
}

async function getApiKey(organizationId: string): Promise<{ apiKey: string; baseUrl: string }> {
  const connection = await prisma.wealthEngineConnection.findUnique({ where: { organizationId } });
  if (!connection) {
    throw new Error('WealthEngine is not connected for this organization.');
  }
  return { apiKey: decryptToken(connection.apiKeyEncrypted), baseUrl: connection.baseUrl };
}

/**
 * Screens a single donor against WealthEngine's basic profile lookup.
 * WealthEngine requires name plus at least one of: full address,
 * email, or phone — throws early with a clear message if none of
 * those are on file, rather than sending a request guaranteed to fail
 * match requirements.
 */
export async function screenDonorWealth(
  organizationId: string,
  donor: WealthScreeningInput,
): Promise<WealthScreeningResult> {
  const hasAddress = !!(donor.addressLine1 && donor.city && donor.state);
  if (!donor.firstName && !donor.lastName) {
    throw new Error('This donor has no name on file — WealthEngine requires a name to screen.');
  }
  if (!hasAddress && !donor.email && !donor.phone) {
    throw new Error(
      'WealthEngine needs a name plus an address, email, or phone number to screen a donor — add one of those to this donor first.',
    );
  }

  const { apiKey, baseUrl } = await getApiKey(organizationId);

  const body: Record<string, unknown> = {
    firstName: donor.firstName,
    lastName: donor.lastName,
  };
  if (hasAddress) {
    body.address = {
      street_line_1: donor.addressLine1,
      city: donor.city,
      state: donor.state,
      zip: donor.postalCode,
    };
  }
  if (donor.email) body.email = donor.email;
  if (donor.phone) body.phone = donor.phone;

  const res = await fetch(`${baseUrl}/v1/profiles/find_by_name_address`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`WealthEngine lookup failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  return parseProfileResponse(json);
}

/** A lightweight call just to confirm an API key is valid, used when first connecting. */
export async function verifyApiKey(apiKey: string, baseUrl: string): Promise<void> {
  const res = await fetch(`${baseUrl}/v1/profiles/find_by_name_address`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    // A deliberately-nonsense lookup — the point is only to confirm the
    // key itself is accepted (any response other than an auth failure
    // means the key works), not to actually find anyone.
    body: JSON.stringify({ firstName: 'Test', lastName: 'Verification', email: 'verify@example.com' }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('That API key was rejected by WealthEngine — double-check it and try again.');
  }
}
