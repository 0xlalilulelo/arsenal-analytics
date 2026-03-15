import { prisma } from '@mro/db';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

/**
 * Sends an Expo push notification to all push tokens belonging to
 * the given user IDs (or all active technicians in the org if userIds
 * is omitted).
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage,
): Promise<void> {
  if (!userIds.length) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  if (!tokens.length) return;

  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: message.sound ?? 'default',
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    badge: message.badge,
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[PUSH] Failed to send notifications:', err);
  }
}

/**
 * Sends an AOG alert to all active technicians in the given org.
 */
export async function sendAogAlert(
  orgId: string,
  payload: { workOrderId: string; nNumber: string; woNumber: string },
): Promise<void> {
  const techs = await prisma.technician.findMany({
    where: { orgId, active: true, userId: { not: null } },
    select: { userId: true },
  });

  const userIds = techs.map(t => t.userId!);
  if (!userIds.length) return;

  await sendPushToUsers(userIds, {
    title: '⚡ AOG Alert',
    body: `${payload.nNumber} is Aircraft on Ground — WO ${payload.woNumber}`,
    data: { type: 'AOG', workOrderId: payload.workOrderId },
    sound: 'default',
  });
}
