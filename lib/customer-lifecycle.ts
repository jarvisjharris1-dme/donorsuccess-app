import { prisma } from '@/lib/db';

export type CustomerLifecycleRecord = {
  organizationId: string;
  renewalDate: Date | null;
  renewalOwner: string | null;
  renewalStatus: 'NOT_SET' | 'PLANNING' | 'IN_PROGRESS' | 'COMMITTED' | 'RENEWED' | 'AT_RISK';
  renewalNotes: string | null;
  updatedAt: Date;
};

let initialized = false;

async function ensureLifecycleTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS internal_customer_lifecycle (
      organization_id TEXT PRIMARY KEY,
      renewal_date DATE,
      renewal_owner TEXT,
      renewal_status TEXT NOT NULL DEFAULT 'NOT_SET',
      renewal_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_customer_lifecycle_renewal_date_idx ON internal_customer_lifecycle(renewal_date)`);
  initialized = true;
}

function parseDbDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRow(row: Record<string, unknown>): CustomerLifecycleRecord {
  return {
    organizationId: String(row.organization_id),
    renewalDate: parseDbDate(row.renewal_date),
    renewalOwner: row.renewal_owner ? String(row.renewal_owner) : null,
    renewalStatus: (String(row.renewal_status || 'NOT_SET') as CustomerLifecycleRecord['renewalStatus']),
    renewalNotes: row.renewal_notes ? String(row.renewal_notes) : null,
    updatedAt: parseDbDate(row.updated_at) ?? new Date(),
  };
}

export async function listCustomerLifecycleRecords() {
  await ensureLifecycleTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_customer_lifecycle`);
  return rows.map(mapRow);
}

export async function getCustomerLifecycleRecord(organizationId: string) {
  await ensureLifecycleTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_customer_lifecycle WHERE organization_id = $1 LIMIT 1`, organizationId);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function saveCustomerRenewal(input: {
  organizationId: string;
  renewalDate: string | null;
  renewalOwner?: string | null;
  renewalStatus?: CustomerLifecycleRecord['renewalStatus'];
  renewalNotes?: string | null;
}) {
  await ensureLifecycleTable();
  const renewalDate = input.renewalDate?.trim() || null;
  if (renewalDate && !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate)) throw new Error('Renewal date must be a valid YYYY-MM-DD date.');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    INSERT INTO internal_customer_lifecycle (organization_id, renewal_date, renewal_owner, renewal_status, renewal_notes)
    VALUES ($1, $2::date, $3, $4, $5)
    ON CONFLICT (organization_id) DO UPDATE SET
      renewal_date = EXCLUDED.renewal_date,
      renewal_owner = EXCLUDED.renewal_owner,
      renewal_status = EXCLUDED.renewal_status,
      renewal_notes = EXCLUDED.renewal_notes,
      updated_at = NOW()
    RETURNING *
  `, input.organizationId, renewalDate, input.renewalOwner || null, input.renewalStatus || 'PLANNING', input.renewalNotes || null);
  return mapRow(rows[0]);
}

export function daysToRenewal(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const b = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.ceil((b - a) / 86400000);
}
