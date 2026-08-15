/**
 * Resets a user's password directly, bypassing the app's own reset
 * flow entirely. Meant for exactly one situation: you're locked out
 * and there's no other Admin/Owner around to send you a reset link
 * from Settings → Pending password resets.
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts someone@example.com "NewPassword123"
 *
 * Password must match the app's own rule: at least 10 characters,
 * one uppercase letter, one number — enforced here too, so a password
 * set this way isn't rejected as "invalid" the next time it's checked.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return null;
}

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <newPassword>');
    process.exit(1);
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  console.log(`Password reset for ${email}. Log in with the new password now.`);
  console.log('Consider changing it again from Settings → Change your password once logged in,');
  console.log('since it now briefly existed in your shell history and this terminal output.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
