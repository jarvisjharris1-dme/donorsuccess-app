'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { saveCustomerRenewal, type CustomerLifecycleRecord } from '@/lib/customer-lifecycle';

async function requirePlatformAdmin() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!session.user.isPlatformAdmin) redirect('/dashboard');
}

const allowedStatuses = new Set<CustomerLifecycleRecord['renewalStatus']>(['NOT_SET','PLANNING','IN_PROGRESS','COMMITTED','RENEWED','AT_RISK']);

export async function saveCustomerRenewalAction(formData: FormData) {
  await requirePlatformAdmin();
  const organizationId = String(formData.get('organizationId') || '');
  const renewalDate = String(formData.get('renewalDate') || '').trim() || null;
  const renewalOwner = String(formData.get('renewalOwner') || '').trim() || null;
  const renewalNotes = String(formData.get('renewalNotes') || '').trim() || null;
  const rawStatus = String(formData.get('renewalStatus') || 'PLANNING') as CustomerLifecycleRecord['renewalStatus'];
  const renewalStatus = allowedStatuses.has(rawStatus) ? rawStatus : 'PLANNING';
  if (!organizationId) redirect('/admin/customers?error=Missing+customer');
  if (renewalDate && !/^\d{4}-\d{2}-\d{2}$/.test(renewalDate)) redirect('/admin/customers?error=Invalid+renewal+date');

  await saveCustomerRenewal({ organizationId, renewalDate, renewalOwner, renewalStatus, renewalNotes });
  revalidatePath('/admin/customers');
  revalidatePath('/admin');
  redirect('/admin/customers?success=Renewal+details+saved');
}
