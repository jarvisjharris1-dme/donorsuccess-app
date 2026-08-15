import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validation';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Login is inherently pre-tenant (we don't know the org until we
        // find the user), so this is one of the few places the unscoped
        // `prisma` client is the right tool — see lib/tenant-db.ts.
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
          isPlatformAdmin: user.isPlatformAdmin,
          grantRole: user.grantRole,
        };
      },
    }),
  ],
});
