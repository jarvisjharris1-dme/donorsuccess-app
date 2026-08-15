import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge-runtime-only: uses the DB-free authConfig so middleware never
// tries to import Prisma/bcrypt (which would break the edge bundle).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except static assets and Next internals. The
  // authorized() callback in auth.config.ts decides what's actually
  // public (login/register/api/auth) vs. protected.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
