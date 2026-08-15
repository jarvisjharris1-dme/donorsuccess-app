'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { campaignSchema } from '@/lib/validation';

export type ActionState = { error?: string } | undefined;

function parseCampaignForm(formData: FormData) {
  return campaignSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    goalAmount: formData.get('goalAmount'),
    status: formData.get('status'),
    channel: formData.get('channel'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    parentCampaignId: formData.get('parentCampaignId'),
  });
}

export async function saveCampaignAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const parsed = parseCampaignForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the campaign details.' };
  }

  const db = forOrg(session.user.organizationId);
  const campaignId = formData.get('id');
  const isUpdate = typeof campaignId === 'string' && campaignId.length > 0;

  // A campaign can't be its own parent, or its own sub-campaign's
  // parent (that would make a two-item cycle) — the schema doesn't
  // enforce tree structure, so this is checked here instead.
  if (parsed.data.parentCampaignId) {
    if (isUpdate && parsed.data.parentCampaignId === campaignId) {
      return { error: "A campaign can't be its own parent." };
    }
    const parent = await db.campaign.findUnique({ where: { id: parsed.data.parentCampaignId } });
    if (!parent) return { error: 'Selected parent campaign was not found.' };
    if (isUpdate && parent.parentCampaignId === campaignId) {
      return { error: "That campaign is already a sub-campaign of this one." };
    }
  }

  // Checkboxes and multi-value fields don't fit neatly into the zod
  // schema above (an unchecked checkbox is simply absent from
  // FormData, not "false") — read them directly instead, same pattern
  // as isPrimary in lib/actions/donor-contacts.ts.
  const visibleToAll = formData.get('visibleToAll') === 'on';
  const assignedFundraiserIds = formData.getAll('assignedFundraiserIds').filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );

  const { startDate, endDate, ...rest } = parsed.data;
  const baseData = {
    ...rest,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    visibleToAll,
    // Only actually needed for the create branch below — Prisma's
    // generated CreateInput type requires organizationId (or the
    // `organization` relation) even though forOrg()'s extension injects
    // it automatically at runtime. Passing it explicitly here satisfies
    // TypeScript; the extension overwrites it with the real value
    // regardless, so it's a harmless no-op on the update branch.
    organizationId: session.user.organizationId,
  };

  const campaign = isUpdate
    ? await db.campaign.update({
        where: { id: campaignId as string },
        data: {
          ...baseData,
          // set replaces the full assignment list with whatever the
          // form just submitted — this form is the single source of
          // truth for a campaign's assignments, not an incremental "add
          // these people" action. set is only valid when there's an
          // existing relation to replace, which is exactly the update
          // case.
          assignedFundraisers: { set: assignedFundraiserIds.map((id) => ({ id })) },
        },
      })
    : await db.campaign.create({
        data: {
          ...baseData,
          // A brand-new campaign has no existing relation to "replace" —
          // connect (not set) links it to already-existing User rows.
          assignedFundraisers: { connect: assignedFundraiserIds.map((id) => ({ id })) },
        },
      });

  revalidatePath('/campaigns');
  revalidatePath(`/campaigns/${campaign.id}`);
  redirect(`/campaigns/${campaign.id}`);
}

export async function deleteCampaignAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.ADMIN);

  const campaignId = formData.get('id');
  if (typeof campaignId !== 'string' || !campaignId) {
    return { error: 'Missing campaign id.' };
  }

  const db = forOrg(session.user.organizationId);

  // Gift.campaignId has no onDelete: SetNull/Cascade, so the database
  // would reject this delete with a foreign key error if gifts still
  // reference it — check first and give a clear, actionable message
  // instead of letting a raw DB error surface.
  const giftCount = await db.gift.count({ where: { campaignId } });
  if (giftCount > 0) {
    return {
      error: `This campaign has ${giftCount} gift${giftCount === 1 ? '' : 's'} recorded and can't be deleted. Set it to Archived instead.`,
    };
  }

  await db.campaign.delete({ where: { id: campaignId } });

  revalidatePath('/campaigns');
  redirect('/campaigns');
}
