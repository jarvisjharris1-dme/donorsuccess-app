import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { resolveScope } from '@/lib/scope';
import { LEAD_PREFIX, readLead } from '@/lib/jarvis-leads';
import LeadWorkspace from '@/components/jarvis/LeadWorkspace';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;
export default async function LeadsPage({ searchParams }: { searchParams: { scope?: string; q?: string; page?: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!permissions.canEditDonors(session.user.role as Role)) redirect('/dashboard');
  const user = session.user, db = forOrg(user.organizationId);
  const scope = resolveScope(user.role as Role, searchParams.scope);
  const q = (searchParams.q || '').trim().slice(0,160);
  const requestedPage = Math.min(100000, Math.max(1, Math.floor(Number(searchParams.page) || 1)));
  const where = { description: { startsWith: LEAD_PREFIX }, ...(scope === 'mine' ? { assignedToId: user.id } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}) };
  const [org, total] = await Promise.all([
    db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    db.task.count({ where }),
  ]);
  const pages = Math.max(1,Math.ceil(total/PAGE_SIZE)), page = Math.min(pages,requestedPage);
  const tasks = await db.task.findMany({ where, take: PAGE_SIZE, skip: (page-1)*PAGE_SIZE, orderBy: { updatedAt: 'desc' },
    select: { id: true, description: true, updatedAt: true, assignedToId: true, assignedTo: { select: { name: true, email: true } } } });
  return <LeadWorkspace organizationName={org?.name || 'Your organization'} scope={scope} q={q} page={page} pages={pages} total={total}
    leads={tasks.flatMap(t => { const lead = readLead(t.description); return lead ? [{ ...lead, id: t.id, updatedAt: t.updatedAt.toISOString(),
      owner: t.assignedTo.name || t.assignedTo.email, canEdit: t.assignedToId === user.id || permissions.canManageUsers(user.role as Role) }] : []; })} />;
}
