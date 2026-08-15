import type { NextAuthConfig } from 'next-auth';

/**
 * This file must stay edge-runtime-safe: no Prisma, no bcrypt, no
 * Node-only APIs. Next.js middleware runs on the edge runtime, and it
 * imports this config (via middleware.ts) to decide whether a request
 * is authorized — it never touches the database directly.
 *
 * The actual credential-checking logic (Prisma + bcrypt) lives in
 * auth.ts, which extends this config with the Credentials provider and
 * runs only in the Node.js runtime (route handlers, server actions).
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublicRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/accept-invite') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/cron') ||
        pathname.startsWith('/api/webhooks');

      if (isPublicRoute) {
        // Already-logged-in users hitting /login get bounced to the
        // dashboard instead of seeing the login form again. /signup
        // deliberately isn't included here — it's reachable even while
        // logged in, since someone might be signing up a second,
        // separate organization.
        if (isLoggedIn && pathname.startsWith('/login')) {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }

      // /admin is the cross-organization master console — gated
      // separately and more strictly than the rest of the app. Being
      // logged in isn't enough; the session has to actually carry
      // isPlatformAdmin, which almost no account has. This check exists
      // here (not just in app/admin/layout.tsx) so an unauthorized
      // request never even reaches the page component.
      if (pathname.startsWith('/admin')) {
        if (!isLoggedIn) return false;
        if (!(auth?.user as { isPlatformAdmin?: boolean } | undefined)?.isPlatformAdmin) {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }

      // Everything else requires a session. Returning false triggers a
      // redirect to `pages.signIn` above.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      // `user` is only defined right after a successful `authorize()` call
      // (i.e. at sign-in). We persist the tenant/role onto the JWT so we
      // don't have to hit the database on every request to know them.
      if (user) {
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.role = (user as { role: string }).role;
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false;
        token.grantRole = (user as { grantRole?: string | null }).grantRole ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = token.organizationId as string;
        session.user.role = token.role as string;
        session.user.isPlatformAdmin = (token.isPlatformAdmin as boolean) ?? false;
        session.user.grantRole = (token.grantRole as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts — kept empty here for edge safety
} satisfies NextAuthConfig;
