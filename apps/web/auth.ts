import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@mro/db';
import { verifyPassword } from '@/lib/password';
import { authConfig } from '@/auth.config';

async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { org: true },
  });
  if (!user) return null;

  // Users with a hashed password (registered via signup or invite)
  if (user.passwordHash) {
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? user : null;
  }

  // Seeded demo users have no password hash — allow in development only
  if (process.env.NODE_ENV === 'development') return user;

  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          credentials.password as string,
        );
      },
    }),
  ],
});
