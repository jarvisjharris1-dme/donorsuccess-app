import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: string;
      isPlatformAdmin: boolean;
      grantRole: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    organizationId: string;
    role: string;
    isPlatformAdmin?: boolean;
    grantRole?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    organizationId: string;
    role: string;
    isPlatformAdmin: boolean;
    grantRole: string | null;
  }
}
