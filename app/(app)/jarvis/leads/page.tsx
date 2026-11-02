import { redirect } from 'next/navigation';
import { Role, DonorType } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { permissions } from '@/lib/permissions';
import { resolveScope } from '@/lib/scope';
import { LEAD_PREFIX, readLead } from '@/lib/jarvis-leads';
import { defaultDiscoveryProfile, discoveryProfileSchema } from '@/lib/jarvis-discovery';
import LeadWorkspace from '@/components/jarvis/LeadWorkspace';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;
export default async function LeadsPage({ searchParams }: { searchParams: { scope?: string; q?: string; page?: string; category?: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!permissions.canEditDonors(session.user.role as Role)) redirect('/dashboard');
  const user = session.user, db = forOrg(user.organizationId);
  const scope = resolveScope(user.role as Role, searchParams.scope);
  const q = (searchParams.q || '').trim().slice(0,160);
  const requestedPage = Math.min(100000, Math.max(1, Math.floor(Number(searchParams.page) || 1)));
  const category = searchParams.category === 'Corporate' || searchParams.category === 'Individual' ? searchParams.category : 'All';
  const corporateTypes = [DonorType.ORGANIZATION, DonorType.CORPORATION, DonorType.FOUNDATION];
  const categoryWhere = category === 'All' ? {} : { OR: [
    { description: { contains: `"category":"${category}"` } },
    { AND: [ { NOT: { description: { contains: '"category":' } } },
      category === 'Corporate' ? { donor: { donorType: { in: corporateTypes } } }
      : { OR: [{ donorId: null }, { donor: { donorType: { notIn: corporateTypes } } }] },
    ] },
  ] };
  const where = { ...categoryWhere, description: { startsWith: LEAD_PREFIX }, ...(scope === 'mine' ? { assignedToId: user.id } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}) };
  const [org, total, lastSearch] = await Promise.all([
    db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } }),
    db.task.count({ where }),
    db.auditLog.findFirst({ where: { userId: user.id, action: { startsWith: 'jarvis.discovery.start.' } }, orderBy: { createdAt: 'desc' }, select: { metadata: true } }),
  ]);
  const pages = Math.max(1,Math.ceil(total/PAGE_SIZE)), page = Math.min(pages,requestedPage);
  const tasks = await db.task.findMany({ where, take: PAGE_SIZE, skip: (page-1)*PAGE_SIZE, orderBy: { updatedAt: 'desc' },
    select: { id: true, description: true, updatedAt: true, assignedToId: true, donor: { select: { donorType: true } }, assignedTo: { select: { name: true, email: true } } } });
  const savedProfile = discoveryProfileSchema.safeParse(
    lastSearch?.metadata && typeof lastSearch.metadata === 'object' && !Array.isArray(lastSearch.metadata) ? lastSearch.metadata.profile : null);
  return <LeadWorkspace category={category} discoveryProfile={savedProfile.success ? savedProfile.data : defaultDiscoveryProfile(org?.name || '')} discoveryConfigured={!!process.env.ANTHROPIC_API_KEY} organizationName={org?.name || 'Your organization'} scope={scope} q={q} page={page} pages={pages} total={total}
    leads={tasks.flatMap(t => { const lead = readLead(t.description); return lead ? [{ ...lead,
      category: !t.description?.includes('"category":') && t.donor ? corporateTypes.includes(t.donor.donorType as typeof corporateTypes[number]) ? 'Corporate' as const : 'Individual' as const : lead.category,
      id: t.id, updatedAt: t.updatedAt.toISOString(),
      owner: t.assignedTo.name || t.assignedTo.email, canEdit: t.assignedToId === user.id || permissions.canManageUsers(user.role as Role) }] : []; })} />;
}
