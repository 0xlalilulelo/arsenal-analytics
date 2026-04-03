import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { randomUUID } from 'crypto';
import { APP_URL } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

// Send a password reset email (always returns 200 to prevent email enumeration)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`forgot-password:${ip}`, 5, 900); // 5 per 15 min
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const { email } = await req.json() as { email: string };

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  if (user) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiresAt },
    });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    // Send email (import inline to avoid circular deps)
    const { sendPasswordResetEmail } = await import('@/lib/email');
    await sendPasswordResetEmail({ to: user.email, name: user.name ?? user.email, resetUrl });
  }

  // Always 200 — prevents email enumeration
  return NextResponse.json({ message: 'If that email exists, a reset link has been sent.' });
}
