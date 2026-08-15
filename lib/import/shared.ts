export type ImportFieldType = 'string' | 'number' | 'date' | 'donorType' | 'segment' | 'giftType' | 'paymentMethod' | 'grantStage';

export type ImportField = {
  key: string;
  label: string;
  type: ImportFieldType;
  required?: boolean; // unconditionally required on every row
  aliases: string[]; // lowercase, used to auto-suggest a column match
};

export type ImportResult = {
  error?: string;
  created?: number;
  skipped?: { row: number; reason: string }[];
};

/** Best-guess header → field mapping, based on normalized alias matching. */
export function suggestMapping(
  headers: string[],
  fields: ImportField[],
): Record<string, string | null> {
  const normalized = headers.map((h) => ({ raw: h, norm: h.trim().toLowerCase() }));
  const mapping: Record<string, string | null> = {};

  for (const field of fields) {
    const match = normalized.find((h) => field.aliases.includes(h.norm));
    mapping[field.key] = match?.raw ?? null;
  }

  return mapping;
}
