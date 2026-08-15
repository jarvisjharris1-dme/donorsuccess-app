/**
 * Lists every user account in the database — email, name,
 * organization, role, active status, and whether they're a platform
 * admin. Meant for exactly one kind of situation: "which email is
 * actually in the system" when a login/reset isn't working and it's
 * faster to just look than to keep guessing from screenshots.
 *
 * Usage:
 *   npx tsx scripts/list-users.ts
 *
 * Optionally filter by a search string (matches email or name, case-insensitive):
 *   npx tsx scripts/list-users.ts jarvis
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const search = process.argv[2];

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      email: true,
      name: true,
      role: true,
      isActive: true,
      isPlatformAdmin: true,
      organization: { select: { name: true, slug: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log(search ? `No users matching "${search}".` : 'No users found at all.');
    return;
  }

  console.log(`${users.length} user(s)${search ? ` matching "${search}"` : ''}:\n`);
  for (const u of users) {
    console.log(`  ${u.email}`);
    console.log(`    Name: ${u.name ?? '(none)'}`);
    console.log(`    Organization: ${u.organization.name} (${u.organization.slug})`);
    console.log(`    Role: ${u.role}${u.isPlatformAdmin ? ' · PLATFORM ADMIN' : ''}`);
    console.log(`    Active: ${u.isActive}`);
    console.log(`    Created: ${u.createdAt.toISOString().slice(0, 10)}`);
    console.log('');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
