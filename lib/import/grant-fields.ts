import { type ImportField, suggestMapping as genericSuggestMapping } from './shared';

export type { ImportField, ImportFieldType } from './shared';

// One row = one grant opportunity. The funder is matched to an EXISTING
// donor by organization name (see lib/actions/import-grants.ts) — this
// does not create donors, and a row whose funder doesn't match an
// existing Organization/Foundation/Corporation donor is skipped. Add
// the funder as a donor first if it isn't in the system yet.
export const GRANT_IMPORT_FIELDS: ImportField[] = [
  { key: 'funderName', label: 'Funder organization name', type: 'string', required: true, aliases: ['funder', 'funder name', 'organization', 'organization name', 'foundation', 'foundation name'] },
  { key: 'name', label: 'Grant name', type: 'string', required: true, aliases: ['grant name', 'name', 'title', 'grant title', 'opportunity name'] },
  { key: 'programName', label: 'Program name', type: 'string', aliases: ['program', 'program name', 'funder program'] },
  { key: 'askAmount', label: 'Ask amount', type: 'number', required: true, aliases: ['ask amount', 'amount requested', 'requested amount', 'amount', 'ask'] },
  { key: 'stage', label: 'Stage', type: 'grantStage', aliases: ['stage', 'status', 'grant stage'] },
  { key: 'applicationDeadline', label: 'Application deadline', type: 'date', aliases: ['application deadline', 'deadline', 'due date'] },
  { key: 'decisionExpectedDate', label: 'Decision expected', type: 'date', aliases: ['decision expected', 'decision date', 'response expected', 'response expected by'] },
  { key: 'grantWriterEmail', label: 'Grant writer email', type: 'string', aliases: ['grant writer', 'grant writer email', 'owner', 'owner email', 'assigned to'] },
  { key: 'notes', label: 'Notes', type: 'string', aliases: ['notes', 'note', 'comments', 'memo'] },
];

export const REQUIRED_GRANT_IMPORT_FIELDS = GRANT_IMPORT_FIELDS.filter((f) => f.required);

export function suggestGrantMapping(headers: string[]): Record<string, string | null> {
  return genericSuggestMapping(headers, GRANT_IMPORT_FIELDS);
}
