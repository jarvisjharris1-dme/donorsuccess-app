import { type ImportField, suggestMapping as genericSuggestMapping } from './shared';

export type { ImportField, ImportFieldType } from './shared';

// Order here is also the display order in the mapping step.
//
// Only Gift amount and Gift date are unconditionally `required` — every
// row needs those regardless of donor type. Name is NOT a flat
// requirement, because a donor file legitimately mixes individuals
// (need First + Last name) and organizations/foundations (need
// Organization name instead) in the same import. See IDENTITY_PATHS
// below: a row is valid if it satisfies at least one of these paths,
// evaluated per-row so a single mixed file works correctly.
export const DONOR_IMPORT_FIELDS: ImportField[] = [
  { key: 'firstName', label: 'First name', type: 'string', aliases: ['first name', 'firstname', 'fname', 'given name'] },
  { key: 'lastName', label: 'Last name', type: 'string', aliases: ['last name', 'lastname', 'lname', 'surname', 'family name'] },
  { key: 'organizationName', label: 'Organization name', type: 'string', aliases: ['organization', 'organization name', 'company', 'account name', 'org name', 'business name'] },
  { key: 'donorType', label: 'Donor type', type: 'donorType', aliases: ['donor type', 'type', 'constituent type'] },
  { key: 'email', label: 'Email', type: 'string', aliases: ['email', 'email address', 'e-mail', 'primary email'] },
  { key: 'phone', label: 'Phone', type: 'string', aliases: ['phone', 'phone number', 'telephone', 'mobile', 'primary phone'] },
  { key: 'addressLine1', label: 'Address line 1', type: 'string', aliases: ['address', 'address line 1', 'address1', 'street', 'street address', 'mailing address'] },
  { key: 'addressLine2', label: 'Address line 2', type: 'string', aliases: ['address line 2', 'address2', 'apt', 'suite', 'unit'] },
  { key: 'city', label: 'City', type: 'string', aliases: ['city', 'town'] },
  { key: 'state', label: 'State', type: 'string', aliases: ['state', 'province', 'region', 'state/province'] },
  { key: 'postalCode', label: 'Postal code', type: 'string', aliases: ['zip', 'zip code', 'postal code', 'postcode'] },
  { key: 'country', label: 'Country', type: 'string', aliases: ['country'] },
  { key: 'segment', label: 'Segment', type: 'segment', aliases: ['segment', 'donor segment'] },
  { key: 'lifetimeGiving', label: 'Gift amount', type: 'number', required: true, aliases: ['gift amount', 'amount', 'donation amount', 'lifetime giving', 'total given', 'total giving', 'lifetime amount', 'lifetime gifts', 'total gift amount'] },
  { key: 'giftCount', label: 'Gift count', type: 'number', aliases: ['gift count', 'number of gifts', '# gifts', 'total gifts', 'gifts'] },
  { key: 'firstGiftDate', label: 'First gift date', type: 'date', aliases: ['first gift date', 'first gift'] },
  { key: 'lastGiftDate', label: 'Gift date', type: 'date', required: true, aliases: ['gift date', 'donation date', 'last gift date', 'last gift', 'most recent gift', 'most recent gift date'] },
  { key: 'tags', label: 'Tags (comma separated)', type: 'string', aliases: ['tags', 'keywords'] },
];

export const REQUIRED_DONOR_IMPORT_FIELDS = DONOR_IMPORT_FIELDS.filter((f) => f.required);

/**
 * A row is valid if it satisfies at least one of these paths — i.e. has
 * a non-empty value for every field key in one of the arrays below.
 * Used both to decide when the mapping step can proceed (at least one
 * *path* must be fully mapped) and, per-row, to decide when a specific
 * row is missing identifying info (checked against that row's actual
 * values, since a mixed file has some rows using one path and some the
 * other).
 */
export const IDENTITY_PATHS: { keys: string[]; label: string }[] = [
  { keys: ['firstName', 'lastName'], label: 'First name + Last name (individuals)' },
  { keys: ['organizationName'], label: 'Organization name (companies, foundations)' },
];

export function suggestDonorMapping(headers: string[]): Record<string, string | null> {
  return genericSuggestMapping(headers, DONOR_IMPORT_FIELDS);
}
