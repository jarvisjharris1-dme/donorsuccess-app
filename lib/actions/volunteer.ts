'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { resolveVolunteerHourlyRate } from '@/lib/volunteer';

export type ActionState = { error?: string; success?: string } | undefined;

const volunteerHoursSchema = z.object({
  donorId: z.string().min(1, 'Missing donor'),
  date: z.string().min(1, 'Date is required'),
  hours: z.coerce.number().positive('Hours must be greater than zero').max(500, 'That is a lot of hours for one entry, double-check this'),
  activity: z.string().trim().min(1, 'Describe what they did'),
});

export async function logVolunteerHoursAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = volunteerHoursSchema.safeParse({
    donorId: formData.get('donorId'),
    date: formData.get('date'),
    hours: formData.get('hours'),
    activity: formData.get('activity'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);

  const [donor, organization] = await Promise.all([
    db.donor.findUnique({ where: { id: parsed.data.donorId }, select: { id: true } }),
    db.organization.findUnique({ where: { id: session.user.organizationId }, select: { volunteerHourlyRate: true } }),
  ]);
  if (!donor) return { error: 'Donor not found.' };

  const rate = resolveVolunteerHourlyRate(organization?.volunteerHourlyRate?.toString());
  const dollarValue = Math.round(parsed.data.hours * rate * 100) / 100;

  await db.volunteerHours.create({
    data: {
      organizationId: session.user.organizationId,
      donorId: parsed.data.donorId,
      date: new Date(parsed.data.date),
      hours: parsed.data.hours,
      activity: parsed.data.activity,
      hourlyRateApplied: rate,
      dollarValue,
      loggedById: session.user.id,
    },
  });

  revalidatePath(`/donors/${parsed.data.donorId}`);
  revalidatePath('/reports/volunteer-impact');
  return { success: 'Volunteer hours logged.' };
}

export async function updateVolunteerHoursAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing entry.' };

  const parsed = z
    .object({
      date: z.string().min(1, 'Date is required'),
      hours: z.coerce.number().positive('Hours must be greater than zero').max(500),
      activity: z.string().trim().min(1, 'Describe what they did'),
    })
    .safeParse({
      date: formData.get('date'),
      hours: formData.get('hours'),
      activity: formData.get('activity'),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form for errors.' };

  const db = forOrg(session.user.organizationId);
  const existing = await db.volunteerHours.findUnique({ where: { id } });
  if (!existing) return { error: 'Entry not found.' };

  const dollarValue = Math.round(parsed.data.hours * Number(existing.hourlyRateApplied) * 100) / 100;

  await db.volunteerHours.update({
    where: { id },
    data: {
      date: new Date(parsed.data.date),
      hours: parsed.data.hours,
      activity: parsed.data.activity,
      dollarValue,
    },
  });

  revalidatePath(`/donors/${existing.donorId}`);
  revalidatePath('/reports/volunteer-impact');
  return { success: 'Updated.' };
}

export async function deleteVolunteerHoursAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { error: 'Missing entry.' };

  const db = forOrg(session.user.organizationId);
  const existing = await db.volunteerHours.findUnique({ where: { id } });
  if (!existing) return { error: 'Entry not found.' };

  await db.volunteerHours.delete({ where: { id } });

  revalidatePath(`/donors/${existing.donorId}`);
  revalidatePath('/reports/volunteer-impact');
  return { success: 'Removed.' };
}

export async function updateVolunteerRateAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const raw = formData.get('rate');
  let rate: number | null = null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      return { error: 'Enter a valid hourly rate, or leave blank to use the Independent Sector default.' };
    }
    rate = parsed;
  }

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { volunteerHourlyRate: rate },
  });

  revalidatePath('/settings');
  return {
    success: rate
      ? `Future entries will use $${rate.toFixed(2)}/hour.`
      : 'Reverted to the current Independent Sector national rate for future entries.',
  };
}
