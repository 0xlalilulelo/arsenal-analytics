import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@mro/db';

// Demo credentials mode — in production replace with hashed password check
async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { org: true },
  });
  // Demo: any password accepted for seeded users
  if (!user) return null;
  if (process.env.NODE_ENV !== 'development' && password !== process.env.DEMO_PASSWORD) return null;
  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );
      },
    }),
  ],
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { orgId?: string; role?: string }).orgId = token.orgId as string;
        (session.user as { orgId?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
