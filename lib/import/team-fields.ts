import { type ImportField, suggestMapping as genericSuggestMapping } from './shared';

export type { ImportField, ImportFieldType } from './shared';

// Name isn't stored on the Invitation itself (the invited person sets
// their own name when they accept) — it's only used here to
// personalize the invitation email greeting, so it's optional rather
// than required.
export const TEAM_IMPORT_FIELDS: ImportField[] = [
  { key: 'name', label: 'Name', type: 'string', aliases: ['name', 'full name', 'teammate name'] },
  {
    key: 'email',
    label: 'Email',
    type: 'string',
    required: true,
    aliases: ['email', 'email address', 'e-mail', 'work email'],
  },
  {
    key: 'role',
    label: 'Role',
    type: 'string',
    aliases: ['role', 'permission', 'access level', 'user role'],
  },
];

export const REQUIRED_TEAM_IMPORT_FIELDS = TEAM_IMPORT_FIELDS.filter((f) => f.required);

export function suggestTeamMapping(headers: string[]): Record<string, string | null> {
  return genericSuggestMapping(headers, TEAM_IMPORT_FIELDS);
}
