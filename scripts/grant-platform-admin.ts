/**
 * Grants isPlatformAdmin access to an email address. There's no UI for
 * this anywhere in the app — it's the most sensitive flag in the whole
 * system (cross-organization access), so it's deliberately only
 * settable by someone with direct database access, not a click-through
 * feature.
 *
 * Usage:
 *   npx tsx scripts/grant-platform-admin.ts someone@example.com
 *
 * Safe to run more than once — if the person already has an account,
 * it just flips the flag; if they already have the flag, it's a no-op.
 */
import { PrismaClient, Role } from '@prisma/client';
import { generateToken } from '../lib/tokens';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx scripts/grant-platform-admin.ts <email>');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.isPlatformAdmin) {
      console.log(`${email} already has platform admin access — nothing to do.`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: true } });
    console.log(`Granted platform admin access to ${email}.`);
    console.log(`They'll see an "Admin Console" link in the app header next time they load a page.`);
    return;
  }

  // No existing account for this email — create one in the internal
  // platform-team organization (same one the seed script sets up) and
  // send a real invitation, the same way the Master Admin Console's
  // "New Customer" flow does, rather than minting a temporary password.
  const internalOrg = await prisma.organization.upsert({
    where: { slug: 'donor-success-internal' },
    update: {},
    create: {
      name: 'Donor Success (Internal)',
      slug: 'donor-success-internal',
      subscriptionTier: 'ENTERPRISE',
    },
  });

  const existingInvite = await prisma.invitation.findFirst({
    where: { organizationId: internalOrg.id, email, acceptedAt: null },
  });
  if (existingInvite) {
    console.log(`There's already a pending invitation for ${email} — here's the link again:`);
    console.log(`  https://app.donorsuccess.com/accept-invite/${existingInvite.token}`);
    console.log('');
    console.log('Once they accept it and log in, run this script again to grant platform admin.');
    return;
  }

  const token = generateToken();

  // Invitation.invitedById is required (not nullable) — there's no
  // logged-in session in a standalone script to attribute this to, the
  // way the Master Admin Console's web UI does. Attribute it to an
  // existing platform admin instead (the seeded one should already
  // exist), falling back to any user in the internal org.
  const attributedTo =
    (await prisma.user.findFirst({ where: { isPlatformAdmin: true } })) ??
    (await prisma.user.findFirst({ where: { organizationId: internalOrg.id } }));

  if (!attributedTo) {
    console.error(
      'Could not find any existing user to attribute this invitation to.\n' +
        'Run the seed script first so at least one platform admin exists, then try again:\n' +
        '  npx tsx prisma/seed.ts',
    );
    process.exit(1);
  }

  await prisma.invitation.create({
    data: {
      organizationId: internalOrg.id,
      email,
      role: Role.OWNER,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedById: attributedTo.id,
    },
  });

  console.log(`No existing account for ${email} — created an invitation instead.`);
  console.log('');
  console.log('Send them this link so they can set their own password and log in:');
  console.log(`  https://app.donorsuccess.com/accept-invite/${token}`);
  console.log('');
  console.log('IMPORTANT: accepting the invite only creates their account — it does NOT');
  console.log('grant platform admin access by itself. Once they\u2019ve accepted and logged in');
  console.log('at least once, run this exact script again with the same email:');
  console.log(`  npx tsx scripts/grant-platform-admin.ts ${email}`);
  console.log('That second run will find their new account and flip the flag.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
