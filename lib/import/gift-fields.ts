import { type ImportField, suggestMapping as genericSuggestMapping } from './shared';

export type { ImportField, ImportFieldType } from './shared';

// One row = one gift transaction, matched to an EXISTING donor by email
// (see lib/actions/import-gifts.ts) — this does not create donors.
// Donor email is therefore required here for a different reason than
// the donor import's identity fields: it's not describing *this* row's
// identity, it's the lookup key for whose gift this is.
export const GIFT_IMPORT_FIELDS: ImportField[] = [
  { key: 'donorEmail', label: 'Donor email', type: 'string', required: true, aliases: ['donor email', 'email', 'email address', 'e-mail', 'constituent email'] },
  { key: 'amount', label: 'Gift amount', type: 'number', required: true, aliases: ['gift amount', 'amount', 'donation amount', 'gift total'] },
  { key: 'date', label: 'Gift date', type: 'date', required: true, aliases: ['gift date', 'donation date', 'date', 'transaction date'] },
  { key: 'giftType', label: 'Gift type', type: 'giftType', aliases: ['gift type', 'type', 'transaction type'] },
  { key: 'paymentMethod', label: 'Payment method', type: 'paymentMethod', aliases: ['payment method', 'payment type', 'method'] },
  { key: 'fund', label: 'Fund', type: 'string', aliases: ['fund', 'fund name', 'designation'] },
  { key: 'notes', label: 'Notes', type: 'string', aliases: ['notes', 'note', 'comments', 'memo'] },
];

export const REQUIRED_GIFT_IMPORT_FIELDS = GIFT_IMPORT_FIELDS.filter((f) => f.required);

export function suggestGiftMapping(headers: string[]): Record<string, string | null> {
  return genericSuggestMapping(headers, GIFT_IMPORT_FIELDS);
}
