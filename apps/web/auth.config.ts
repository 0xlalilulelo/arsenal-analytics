import type { NextAuthConfig } from 'next-auth';

/**
 * Lightweight auth config used in middleware (Edge Runtime).
 * Must not import Prisma, bcrypt, or any Node.js-only modules.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
    newUser: '/sign-up',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.orgId = (user as { orgId?: string }).orgId;
        token.role = (user as { role?: string }).role;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { orgId?: string; role?: string; id?: string };
        u.orgId = token.orgId as string;
        u.role = token.role as string;
        u.id = token.userId as string;
      }
      return session;
    },
  },
};
