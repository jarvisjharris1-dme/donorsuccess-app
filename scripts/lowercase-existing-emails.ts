/**
 * One-time backfill: lowercases every existing User.email and
 * Invitation.email in the database.
 *
 * Why this is needed: every place that accepts an email as input now
 * normalizes it to lowercase before storing or looking it up — but
 * that only prevents the bug going forward. Accounts created before
 * this fix (e.g. an email typed with capital letters at signup or
 * invite time) are still stored exactly as originally typed, and a
 * later login/password-reset attempt typed in a different case still
 * won't match them until this runs once.
 *
 * Usage:
 *   npx tsx scripts/lowercase-existing-emails.ts
 *
 * Safe to run more than once — already-lowercase emails are simply
 * left unchanged. If lowercasing two existing rows would collide
 * (e.g. "Test@x.com" and "test@x.com" already both exist as separate
 * accounts — an unlikely but real possibility since the database
 * allowed it before this fix), that row is skipped and reported
 * rather than crashing the whole run; those specific collisions need
 * a human decision about which account to keep.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  let usersFixed = 0;
  let usersSkipped: string[] = [];

  for (const u of users) {
    const lower = u.email.toLowerCase();
    if (lower === u.email) continue; // already lowercase

    const collision = await prisma.user.findUnique({ where: { email: lower } });
    if (collision) {
      usersSkipped.push(`${u.email} (would collide with existing ${lower})`);
      continue;
    }

    await prisma.user.update({ where: { id: u.id }, data: { email: lower } });
    console.log(`  User: ${u.email} → ${lower}`);
    usersFixed += 1;
  }

  const invitations = await prisma.invitation.findMany({ select: { id: true, email: true } });
  let invitesFixed = 0;

  for (const i of invitations) {
    const lower = i.email.toLowerCase();
    if (lower === i.email) continue;

    await prisma.invitation.update({ where: { id: i.id }, data: { email: lower } });
    console.log(`  Invitation: ${i.email} → ${lower}`);
    invitesFixed += 1;
  }

  console.log(`\nDone. ${usersFixed} user email(s) fixed, ${invitesFixed} invitation email(s) fixed.`);
  if (usersSkipped.length > 0) {
    console.log(`\n${usersSkipped.length} user(s) skipped due to a collision — needs a manual look:`);
    usersSkipped.forEach((s) => console.log(`  - ${s}`));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
