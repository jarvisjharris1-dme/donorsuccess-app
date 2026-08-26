import { prisma } from '@/lib/db';

export type OrderStatus =
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'PROVISIONING'
  | 'READY_FOR_KICKOFF'
  | 'IMPLEMENTATION'
  | 'FULFILLED'
  | 'VOIDED'
  | 'FAILED';

export type OrderSource = 'TURBODOCX' | 'STRIPE' | 'MANUAL';

export type InternalOrder = {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  organizationName: string;
  ownerName: string | null;
  ownerEmail: string;
  subscriptionTier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  billingPeriod: string | null;
  arrCents: number | null;
  oneTimeCents: number | null;
  quoteId: string | null;
  turboSignDocumentId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeSubscriptionId: string | null;
  organizationId: string | null;
  productsJson: string | null;
  notes: string | null;
  signedAt: Date | null;
  provisionedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateOrderInput = {
  source: OrderSource;
  organizationName: string;
  ownerName?: string | null;
  ownerEmail: string;
  subscriptionTier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  billingPeriod?: string | null;
  arrCents?: number | null;
  oneTimeCents?: number | null;
  quoteId?: string | null;
  turboSignDocumentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripeSubscriptionId?: string | null;
  products?: string[];
  notes?: string | null;
  status?: OrderStatus;
};

let initialized = false;

export async function ensureOrdersTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS internal_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      owner_name TEXT,
      owner_email TEXT NOT NULL,
      subscription_tier TEXT NOT NULL,
      billing_period TEXT,
      arr_cents INTEGER,
      one_time_cents INTEGER,
      quote_id TEXT,
      turbosign_document_id TEXT UNIQUE,
      stripe_checkout_session_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      organization_id TEXT,
      products_json TEXT,
      notes TEXT,
      signed_at TIMESTAMPTZ,
      provisioned_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_orders_status_idx ON internal_orders(status)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_orders_created_at_idx ON internal_orders(created_at DESC)`);
  initialized = true;
}

function mapRow(row: Record<string, unknown>): InternalOrder {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    source: String(row.source) as OrderSource,
    status: String(row.status) as OrderStatus,
    organizationName: String(row.organization_name),
    ownerName: row.owner_name ? String(row.owner_name) : null,
    ownerEmail: String(row.owner_email),
    subscriptionTier: String(row.subscription_tier) as InternalOrder['subscriptionTier'],
    billingPeriod: row.billing_period ? String(row.billing_period) : null,
    arrCents: row.arr_cents == null ? null : Number(row.arr_cents),
    oneTimeCents: row.one_time_cents == null ? null : Number(row.one_time_cents),
    quoteId: row.quote_id ? String(row.quote_id) : null,
    turboSignDocumentId: row.turbosign_document_id ? String(row.turbosign_document_id) : null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    productsJson: row.products_json ? String(row.products_json) : null,
    notes: row.notes ? String(row.notes) : null,
    signedAt: row.signed_at ? new Date(String(row.signed_at)) : null,
    provisionedAt: row.provisioned_at ? new Date(String(row.provisioned_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function newId() {
  return `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
    `SELECT COUNT(*)::bigint AS count FROM internal_orders WHERE created_at >= $1 AND created_at < $2`,
    new Date(`${year}-01-01T00:00:00.000Z`),
    new Date(`${year + 1}-01-01T00:00:00.000Z`),
  );
  const next = Number(rows[0]?.count ?? 0) + 1;
  return `ORD-${year}-${String(next).padStart(5, '0')}`;
}

export async function createOrder(input: CreateOrderInput): Promise<InternalOrder> {
  await ensureOrdersTable();
  const id = newId();
  const orderNumber = await nextOrderNumber();
  const productsJson = input.products?.length ? JSON.stringify(input.products) : null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `INSERT INTO internal_orders (
      id, order_number, source, status, organization_name, owner_name, owner_email,
      subscription_tier, billing_period, arr_cents, one_time_cents, quote_id,
      turbosign_document_id, stripe_checkout_session_id, stripe_subscription_id,
      products_json, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    id,
    orderNumber,
    input.source,
    input.status ?? (input.source === 'TURBODOCX' ? 'PENDING_SIGNATURE' : 'SIGNED'),
    input.organizationName,
    input.ownerName ?? null,
    input.ownerEmail.toLowerCase(),
    input.subscriptionTier,
    input.billingPeriod ?? null,
    input.arrCents ?? null,
    input.oneTimeCents ?? null,
    input.quoteId ?? null,
    input.turboSignDocumentId ?? null,
    input.stripeCheckoutSessionId ?? null,
    input.stripeSubscriptionId ?? null,
    productsJson,
    input.notes ?? null,
  );
  return mapRow(rows[0]);
}

export async function listOrders(): Promise<InternalOrder[]> {
  await ensureOrdersTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM internal_orders ORDER BY created_at DESC LIMIT 250`,
  );
  return rows.map(mapRow);
}

export async function getOrder(id: string): Promise<InternalOrder | null> {
  await ensureOrdersTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM internal_orders WHERE id = $1 LIMIT 1`,
    id,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getOrderByTurboSignDocumentId(documentId: string): Promise<InternalOrder | null> {
  await ensureOrdersTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM internal_orders WHERE turbosign_document_id = $1 LIMIT 1`,
    documentId,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function findPendingTurboDocxOrderByDocumentTitle(title: string): Promise<InternalOrder | null> {
  await ensureOrdersTable();
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM internal_orders
     WHERE source = 'TURBODOCX'
       AND status = 'PENDING_SIGNATURE'
       AND turbosign_document_id IS NULL
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  const candidates = rows.map(mapRow).filter((order) => {
    const org = order.organizationName.trim().toLowerCase();
    const quote = order.quoteId?.trim().toLowerCase();
    return (org.length >= 2 && normalizedTitle.includes(org)) || (!!quote && normalizedTitle.includes(quote));
  });
  return candidates.length === 1 ? candidates[0] : null;
}

export async function getOrderByStripeSessionId(sessionId: string): Promise<InternalOrder | null> {
  await ensureOrdersTable();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM internal_orders WHERE stripe_checkout_session_id = $1 LIMIT 1`,
    sessionId,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function updateOrder(
  id: string,
  changes: Partial<Pick<InternalOrder, 'status' | 'organizationId' | 'signedAt' | 'provisionedAt' | 'notes' | 'stripeSubscriptionId' | 'turboSignDocumentId'>>,
) {
  await ensureOrdersTable();
  const current = await getOrder(id);
  if (!current) return null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `UPDATE internal_orders SET
      status = $2,
      organization_id = $3,
      signed_at = $4,
      provisioned_at = $5,
      notes = $6,
      stripe_subscription_id = $7,
      turbosign_document_id = $8,
      updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    id,
    changes.status ?? current.status,
    changes.organizationId ?? current.organizationId,
    changes.signedAt ?? current.signedAt,
    changes.provisionedAt ?? current.provisionedAt,
    changes.notes ?? current.notes,
    changes.stripeSubscriptionId ?? current.stripeSubscriptionId,
    changes.turboSignDocumentId ?? current.turboSignDocumentId,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}
