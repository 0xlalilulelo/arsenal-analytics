import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { hashPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token: string; password: string };

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { id: true, passwordResetExpiry: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }
  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    return NextResponse.json({ error: 'Reset link has expired' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });

  return NextResponse.json({ message: 'Password updated. You can now sign in.' });
}
