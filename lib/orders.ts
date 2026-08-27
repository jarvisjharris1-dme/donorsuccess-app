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

export type OnboardingTask = {
  id: string;
  label: string;
  description: string;
  completedAt: string | null;
};

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
  entitlementsProvisionedAt: Date | null;
  invitationSentAt: Date | null;
  activatedAt: Date | null;
  onboardingStartedAt: Date | null;
  onboardingTasksJson: string | null;
  fulfilledAt: Date | null;
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
      entitlements_provisioned_at TIMESTAMPTZ,
      invitation_sent_at TIMESTAMPTZ,
      activated_at TIMESTAMPTZ,
      onboarding_started_at TIMESTAMPTZ,
      onboarding_tasks_json TEXT,
      fulfilled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS entitlements_provisioned_at TIMESTAMPTZ`);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ`);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ`);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ`);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS onboarding_tasks_json TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE internal_orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_orders_status_idx ON internal_orders(status)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_orders_created_at_idx ON internal_orders(created_at DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS internal_orders_org_id_idx ON internal_orders(organization_id)`);
  initialized = true;
}

function mapRow(row: Record<string, unknown>): InternalOrder {
  return {
    id: String(row.id), orderNumber: String(row.order_number), source: String(row.source) as OrderSource,
    status: String(row.status) as OrderStatus, organizationName: String(row.organization_name),
    ownerName: row.owner_name ? String(row.owner_name) : null, ownerEmail: String(row.owner_email),
    subscriptionTier: String(row.subscription_tier) as InternalOrder['subscriptionTier'],
    billingPeriod: row.billing_period ? String(row.billing_period) : null,
    arrCents: row.arr_cents == null ? null : Number(row.arr_cents), oneTimeCents: row.one_time_cents == null ? null : Number(row.one_time_cents),
    quoteId: row.quote_id ? String(row.quote_id) : null, turboSignDocumentId: row.turbosign_document_id ? String(row.turbosign_document_id) : null,
    stripeCheckoutSessionId: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    organizationId: row.organization_id ? String(row.organization_id) : null,
    productsJson: row.products_json ? String(row.products_json) : null, notes: row.notes ? String(row.notes) : null,
    signedAt: row.signed_at ? new Date(String(row.signed_at)) : null,
    provisionedAt: row.provisioned_at ? new Date(String(row.provisioned_at)) : null,
    entitlementsProvisionedAt: row.entitlements_provisioned_at ? new Date(String(row.entitlements_provisioned_at)) : null,
    invitationSentAt: row.invitation_sent_at ? new Date(String(row.invitation_sent_at)) : null,
    activatedAt: row.activated_at ? new Date(String(row.activated_at)) : null,
    onboardingStartedAt: row.onboarding_started_at ? new Date(String(row.onboarding_started_at)) : null,
    onboardingTasksJson: row.onboarding_tasks_json ? String(row.onboarding_tasks_json) : null,
    fulfilledAt: row.fulfilled_at ? new Date(String(row.fulfilled_at)) : null,
    createdAt: new Date(String(row.created_at)), updatedAt: new Date(String(row.updated_at)),
  };
}

function newId() { return `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`; }
async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(`SELECT COUNT(*)::bigint AS count FROM internal_orders WHERE created_at >= $1 AND created_at < $2`, new Date(`${year}-01-01T00:00:00.000Z`), new Date(`${year + 1}-01-01T00:00:00.000Z`));
  return `ORD-${year}-${String(Number(rows[0]?.count ?? 0) + 1).padStart(5, '0')}`;
}

export async function createOrder(input: CreateOrderInput): Promise<InternalOrder> {
  await ensureOrdersTable();
  const id = newId(); const orderNumber = await nextOrderNumber(); const productsJson = input.products?.length ? JSON.stringify(input.products) : null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`INSERT INTO internal_orders (id, order_number, source, status, organization_name, owner_name, owner_email, subscription_tier, billing_period, arr_cents, one_time_cents, quote_id, turbosign_document_id, stripe_checkout_session_id, stripe_subscription_id, products_json, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`, id, orderNumber, input.source, input.status ?? (input.source === 'TURBODOCX' ? 'PENDING_SIGNATURE' : 'SIGNED'), input.organizationName, input.ownerName ?? null, input.ownerEmail.toLowerCase(), input.subscriptionTier, input.billingPeriod ?? null, input.arrCents ?? null, input.oneTimeCents ?? null, input.quoteId ?? null, input.turboSignDocumentId ?? null, input.stripeCheckoutSessionId ?? null, input.stripeSubscriptionId ?? null, productsJson, input.notes ?? null);
  return mapRow(rows[0]);
}

export async function listOrders(): Promise<InternalOrder[]> { await ensureOrdersTable(); return (await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders ORDER BY created_at DESC LIMIT 250`)).map(mapRow); }
export async function getOrder(id: string): Promise<InternalOrder | null> { await ensureOrdersTable(); const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders WHERE id = $1 LIMIT 1`, id); return rows[0] ? mapRow(rows[0]) : null; }
export async function getOrderByOrganizationId(organizationId: string): Promise<InternalOrder | null> { await ensureOrdersTable(); const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 1`, organizationId); return rows[0] ? mapRow(rows[0]) : null; }
export async function getOrderByTurboSignDocumentId(documentId: string): Promise<InternalOrder | null> { await ensureOrdersTable(); const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders WHERE turbosign_document_id = $1 LIMIT 1`, documentId); return rows[0] ? mapRow(rows[0]) : null; }
export async function getOrderByStripeSessionId(sessionId: string): Promise<InternalOrder | null> { await ensureOrdersTable(); const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders WHERE stripe_checkout_session_id = $1 LIMIT 1`, sessionId); return rows[0] ? mapRow(rows[0]) : null; }
export async function findPendingTurboDocxOrders(): Promise<InternalOrder[]> { await ensureOrdersTable(); const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM internal_orders WHERE source = 'TURBODOCX' AND status = 'PENDING_SIGNATURE' ORDER BY created_at DESC LIMIT 100`); return rows.map(mapRow); }

function normalizeMatchText(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

export async function findPendingTurboDocxOrderByDocumentTitle(title: string): Promise<InternalOrder | null> {
  const normalizedTitle = normalizeMatchText(title); if (!normalizedTitle) return null;
  const pending = await findPendingTurboDocxOrders();
  const matches = pending.filter((order) => {
    const organization = normalizeMatchText(order.organizationName);
    const quote = order.quoteId ? normalizeMatchText(order.quoteId) : '';
    return (organization.length > 1 && normalizedTitle.includes(organization)) || (quote.length > 1 && normalizedTitle.includes(quote));
  });
  return matches.length === 1 ? matches[0] : null;
}

export function defaultOnboardingTasks(activatedAt = new Date()): OnboardingTask[] {
  return [
    { id: 'account', label: 'Account activated', description: 'Owner accepted the invitation and activated the Donor Success workspace.', completedAt: activatedAt.toISOString() },
    { id: 'kickoff', label: 'Kickoff completed', description: 'Confirm goals, timeline, team roles, and launch plan.', completedAt: null },
    { id: 'data', label: 'Donor data loaded', description: 'Import or connect the initial donor file and validate records.', completedAt: null },
    { id: 'team', label: 'Team access configured', description: 'Invite the working team and confirm permissions.', completedAt: null },
    { id: 'journey', label: 'First donor journey configured', description: 'Configure the first journey, playbook, or engagement workflow.', completedAt: null },
    { id: 'launch', label: 'Launch review complete', description: 'Review readiness, reporting, and next-30-day success plan.', completedAt: null },
  ];
}

export function parseOnboardingTasks(order: InternalOrder): OnboardingTask[] {
  if (!order.onboardingTasksJson) return [];
  try { return JSON.parse(order.onboardingTasksJson) as OnboardingTask[]; } catch { return []; }
}

export async function activateOrderOnboardingByOrganizationId(organizationId: string) {
  const order = await getOrderByOrganizationId(organizationId);
  if (!order || order.status === 'VOIDED') return null;
  const now = new Date();
  const tasks = parseOnboardingTasks(order);
  const nextTasks = tasks.length ? tasks.map((t) => t.id === 'account' && !t.completedAt ? { ...t, completedAt: now.toISOString() } : t) : defaultOnboardingTasks(now);
  return updateOrder(order.id, {
    status: order.status === 'FULFILLED' ? 'FULFILLED' : 'IMPLEMENTATION',
    activatedAt: order.activatedAt ?? now,
    onboardingStartedAt: order.onboardingStartedAt ?? now,
    onboardingTasksJson: JSON.stringify(nextTasks),
  });
}

export async function updateOnboardingTask(orderId: string, taskId: string, completed: boolean) {
  const order = await getOrder(orderId); if (!order) return null;
  const tasks = parseOnboardingTasks(order); if (!tasks.length) return order;
  const now = new Date().toISOString();
  const nextTasks = tasks.map((task) => task.id === taskId ? { ...task, completedAt: completed ? (task.completedAt ?? now) : null } : task);
  const allComplete = nextTasks.every((task) => Boolean(task.completedAt));
  return updateOrder(orderId, {
    onboardingTasksJson: JSON.stringify(nextTasks),
    status: allComplete ? 'FULFILLED' : 'IMPLEMENTATION',
    fulfilledAt: allComplete ? (order.fulfilledAt ?? new Date()) : null,
  });
}

export async function updateOrder(id: string, changes: Partial<Pick<InternalOrder, 'status' | 'organizationId' | 'signedAt' | 'provisionedAt' | 'notes' | 'stripeSubscriptionId' | 'turboSignDocumentId' | 'entitlementsProvisionedAt' | 'invitationSentAt' | 'activatedAt' | 'onboardingStartedAt' | 'onboardingTasksJson' | 'fulfilledAt'>>) {
  await ensureOrdersTable(); const current = await getOrder(id); if (!current) return null;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`UPDATE internal_orders SET status=$2, organization_id=$3, signed_at=$4, provisioned_at=$5, notes=$6, stripe_subscription_id=$7, turbosign_document_id=$8, entitlements_provisioned_at=$9, invitation_sent_at=$10, activated_at=$11, onboarding_started_at=$12, onboarding_tasks_json=$13, fulfilled_at=$14, updated_at=NOW() WHERE id=$1 RETURNING *`, id, changes.status ?? current.status, changes.organizationId ?? current.organizationId, changes.signedAt ?? current.signedAt, changes.provisionedAt ?? current.provisionedAt, changes.notes ?? current.notes, changes.stripeSubscriptionId ?? current.stripeSubscriptionId, changes.turboSignDocumentId ?? current.turboSignDocumentId, changes.entitlementsProvisionedAt ?? current.entitlementsProvisionedAt, changes.invitationSentAt ?? current.invitationSentAt, changes.activatedAt ?? current.activatedAt, changes.onboardingStartedAt ?? current.onboardingStartedAt, changes.onboardingTasksJson ?? current.onboardingTasksJson, Object.prototype.hasOwnProperty.call(changes, 'fulfilledAt') ? changes.fulfilledAt : current.fulfilledAt);
  return rows[0] ? mapRow(rows[0]) : null;
}
