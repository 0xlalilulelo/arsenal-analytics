import { jwtVerify } from 'jose';

if (!process.env.AUTH_SECRET) {
  console.error('[mobile-auth] AUTH_SECRET environment variable is not set');
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

export interface MobileTokenPayload {
  userId: string;
  orgId: string;
  role: string;
  email: string;
}

/**
 * Verifies a mobile Bearer JWT issued by POST /api/mobile/auth/login.
 * Returns the payload on success, null on failure.
 */
export async function verifyMobileToken(
  authHeader: string | null | undefined,
): Promise<MobileTokenPayload | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}
