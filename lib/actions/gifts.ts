'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/auth';
import { forOrg } from '@/lib/tenant-db';
import { assertRole } from '@/lib/permissions';
import { giftSchema } from '@/lib/validation';
import { recalculateDonorHealthScore } from '@/lib/scoring/recalculate';

export type ActionState = { error?: string } | undefined;

/**
 * Gifts are logged, then the donor's cached lifetimeGiving / giftCount /
 * firstGiftDate / lastGiftDate / largestGift — and, if the gift is tied
 * to a campaign, that campaign's cached raisedAmount — are updated in
 * the same transaction. These fields exist so the rest of the app (donor
 * list, campaign list, dashboards) can read a summary without
 * aggregating every gift on every page load — but that means they must
 * never drift from the underlying Gift rows, hence the transaction.
 */
export async function createGiftAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session) redirect('/login');
  assertRole(session.user.role as Role, Role.FUNDRAISER);

  const donorId = formData.get('donorId');
  if (typeof donorId !== 'string' || !donorId) {
    return { error: 'Missing donor.' };
  }

  const parsed = giftSchema.safeParse({
    amount: formData.get('amount'),
    date: formData.get('date'),
    giftType: formData.get('giftType'),
    paymentMethod: formData.get('paymentMethod'),
    fund: formData.get('fund'),
    notes: formData.get('notes'),
    campaignId: formData.get('campaignId'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the gift details.' };
  }

  const db = forOrg(session.user.organizationId);
  const giftDate = new Date(parsed.data.date);

  await db.$transaction(async (tx) => {
    // organizationId required by create's generated type; forOrg()
    // injects the real value at runtime regardless — see the comment in
    // lib/actions/campaigns.ts.
    await tx.gift.create({
      data: {
        donorId,
        amount: parsed.data.amount,
        date: giftDate,
        giftType: parsed.data.giftType,
        paymentMethod: parsed.data.paymentMethod,
        fund: parsed.data.fund,
        notes: parsed.data.notes,
        campaignId: parsed.data.campaignId,
        organizationId: session.user.organizationId,
      },
    });

    const donor = await tx.donor.findUniqueOrThrow({ where: { id: donorId } });

    const update: Record<string, unknown> = {
      lifetimeGiving: { increment: parsed.data.amount },
      giftCount: { increment: 1 },
    };

    if (!donor.firstGiftDate || giftDate < donor.firstGiftDate) {
      update.firstGiftDate = giftDate;
    }
    if (!donor.lastGiftDate || giftDate > donor.lastGiftDate) {
      update.lastGiftDate = giftDate;
    }
    if (!donor.largestGift || parsed.data.amount > Number(donor.largestGift)) {
      update.largestGift = parsed.data.amount;
    }

    await tx.donor.update({ where: { id: donorId }, data: update });

    // Same reasoning as the donor's cached giving fields above:
    // Campaign.raisedAmount exists so the campaign list/detail pages can
    // show progress without summing every gift on every render, so it
    // has to be updated in lockstep with the gift that funds it.
    if (parsed.data.campaignId) {
      await tx.campaign.update({
        where: { id: parsed.data.campaignId },
        data: { raisedAmount: { increment: parsed.data.amount } },
      });
    }

    // A new gift changes recency, frequency, and monetary factors, so
    // the health score is stale the instant this transaction commits —
    // recompute it here, atomically with everything else, rather than
    // leaving badges showing an outdated score until someone notices.
    await recalculateDonorHealthScore(tx, donorId);
  });

  revalidatePath(`/donors/${donorId}`);
  revalidatePath('/donors');
  if (parsed.data.campaignId) {
    revalidatePath(`/campaigns/${parsed.data.campaignId}`);
    revalidatePath('/campaigns');
  }
}
