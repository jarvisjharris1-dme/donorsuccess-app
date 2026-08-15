import {
  PrismaClient,
  Role,
  DonorType,
  DonorSegment,
  GiftType,
  PaymentMethod,
  FrameworkStage,
  PlanStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computeHealthScore } from '../lib/scoring/health-score';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  // Internal org for platform-admin access to /admin — deliberately
  // separate from the Harborlight demo data below, which exists purely
  // to exercise the product's own features. This account exists to test
  // the master admin console itself.
  const internalOrg = await prisma.organization.upsert({
    where: { slug: 'donor-success-internal' },
    update: {},
    create: {
      name: 'Donor Success (Internal)',
      slug: 'donor-success-internal',
      subscriptionTier: 'ENTERPRISE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@donorsuccess.example' },
    update: {},
    create: {
      organizationId: internalOrg.id,
      name: 'Platform Admin',
      email: 'admin@donorsuccess.example',
      passwordHash,
      role: Role.OWNER,
      isPlatformAdmin: true,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'harborlight-foundation' },
    update: {},
    create: {
      name: 'Harborlight Foundation',
      slug: 'harborlight-foundation',
      subscriptionTier: 'GROWTH',
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@harborlight.example' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Jordan Blake',
      email: 'owner@harborlight.example',
      passwordHash,
      role: Role.OWNER,
    },
  });

  const fundraiser = await prisma.user.upsert({
    where: { email: 'fundraiser@harborlight.example' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Sam Rivera',
      email: 'fundraiser@harborlight.example',
      passwordHash,
      role: Role.FUNDRAISER,
    },
  });

  // Relative to "now" rather than hardcoded dates, so retention rate
  // (which compares 12–24 months ago against the last 12 months) always
  // has meaningful demo data, regardless of when this script runs.
  const now = new Date();
  const monthsAgo = (n: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d;
  };

  const donorSeeds = [
    {
      firstName: 'Alice',
      lastName: 'Nguyen',
      email: 'alice.nguyen@example.com',
      segment: DonorSegment.INDIVIDUAL,
      priorGift: 5000, // gave 18 months ago...
      recentGift: 12500, // ...and again 3 months ago — retained
    },
    {
      firstName: 'Marcus',
      lastName: 'Bell',
      email: 'marcus.bell@example.com',
      segment: DonorSegment.INDIVIDUAL,
      priorGift: 480, // gave 18 months ago...
      recentGift: null, // ...but nothing since — lapsed, not retained
    },
    {
      firstName: 'Priya',
      lastName: 'Kapoor',
      email: 'priya.kapoor@example.com',
      segment: DonorSegment.PHILANTHROPIC,
      priorGift: 80000,
      recentGift: 96000, // retained, and increased her gift
      executiveSummary:
        "Longtime major donor with deep ties to our education programs — her foundation has funded the after-school tutoring initiative for three years running. Warm, direct communicator; prefers a phone call over email. Currently being cultivated for a five-year planned gift (see Success Plan). Her assistant, not Priya herself, handles scheduling.",
    },
  ];

  for (const seed of donorSeeds) {
    let donor = await prisma.donor.findFirst({
      where: { organizationId: org.id, email: seed.email },
    });

    if (!donor) {
      const gifts = [
        { amount: seed.priorGift, date: monthsAgo(18) },
        ...(seed.recentGift ? [{ amount: seed.recentGift, date: monthsAgo(3) }] : []),
      ];
      const lifetimeGiving = gifts.reduce((sum, g) => sum + g.amount, 0);
      const dates = gifts.map((g) => g.date.getTime());

      donor = await prisma.donor.create({
        data: {
          organizationId: org.id,
          donorType: DonorType.INDIVIDUAL,
          firstName: seed.firstName,
          lastName: seed.lastName,
          email: seed.email,
          segment: seed.segment,
          executiveSummary: seed.executiveSummary,
          assignedToId: fundraiser.id,
          lifetimeGiving,
          giftCount: gifts.length,
          firstGiftDate: new Date(Math.min(...dates)),
          lastGiftDate: new Date(Math.max(...dates)),
        },
      });

      for (const g of gifts) {
        await prisma.gift.create({
          data: {
            organizationId: org.id,
            donorId: donor.id,
            amount: g.amount,
            giftType: GiftType.ONE_TIME,
            paymentMethod: PaymentMethod.CREDIT_CARD,
            date: g.date,
          },
        });
      }

      const { score, retentionRisk, factors } = computeHealthScore({
        lastGiftDate: donor.lastGiftDate,
        giftCount: donor.giftCount,
        lifetimeGiving,
        interactionsLast12Months: 0,
        volunteerHoursLast12Months: 0,
      });

      await prisma.donor.update({
        where: { id: donor.id },
        data: { healthScore: score, retentionRisk },
      });

      await prisma.healthScoreSnapshot.create({
        data: { organizationId: org.id, donorId: donor.id, score, retentionRisk, factors },
      });
    }
  }

  // Demo Success Plan on the top donor, so the feature is visible
  // immediately after seeding rather than starting from empty.
  const topDonor = await prisma.donor.findFirst({
    where: { organizationId: org.id, email: 'priya.kapoor@example.com' },
  });

  if (topDonor) {
    const existingPlan = await prisma.donorSuccessPlan.findFirst({
      where: { organizationId: org.id, donorId: topDonor.id },
    });

    if (!existingPlan) {
      const plan = await prisma.donorSuccessPlan.create({
        data: {
          organizationId: org.id,
          donorId: topDonor.id,
          title: 'FY26 Major Gift Cultivation Plan',
          stage: FrameworkStage.CULTIVATE,
          status: PlanStatus.ACTIVE,
          objective: 'Secure a five-year planned gift commitment by fiscal year end.',
          strategyNotes:
            'Quarterly touchpoints with the ED. Invite to the spring gala as a VIP guest. Loop in board chair for the ask.',
          targetAskAmount: 150000,
          targetGiftDate: new Date('2026-06-30'),
          reviewCadence: 'Quarterly',
          ownerId: fundraiser.id,
          createdById: fundraiser.id,
        },
      });

      await prisma.planMilestone.createMany({
        data: [
          {
            organizationId: org.id,
            planId: plan.id,
            title: 'Schedule site visit',
            dueDate: new Date('2026-01-31'),
            sortOrder: 0,
          },
          {
            organizationId: org.id,
            planId: plan.id,
            title: 'Introduce to board chair',
            dueDate: new Date('2026-03-15'),
            sortOrder: 1,
          },
          {
            organizationId: org.id,
            planId: plan.id,
            title: 'Present formal proposal',
            dueDate: new Date('2026-05-01'),
            sortOrder: 2,
          },
        ],
      });
    }
  }

  console.log('Seed complete.');
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log('  Owner login:      owner@harborlight.example / Password123');
  console.log('  Fundraiser login: fundraiser@harborlight.example / Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
