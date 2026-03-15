import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { verifyMobileToken } from '@/lib/mobile-auth';

/**
 * POST /api/mobile/push-tokens
 * Registers or updates the Expo push token for the authenticated mobile user.
 * Body: { token: string, platform: 'ios' | 'android' }
 */
export async function POST(request: NextRequest) {
  const payload = await verifyMobileToken(request.headers.get('authorization'));
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { token, platform } = body ?? {};

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 422 });
  }
  if (!['ios', 'android'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be ios or android' }, { status: 422 });
  }

  // Upsert: one row per unique Expo push token
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, userId: payload.userId },
    update: { platform, userId: payload.userId },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/mobile/push-tokens
 * Unregisters the device token on sign-out.
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  const payload = await verifyMobileToken(request.headers.get('authorization'));
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { token } = body ?? {};
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 422 });

  await prisma.pushToken.deleteMany({
    where: { token, userId: payload.userId },
  });

  return NextResponse.json({ success: true });
}
