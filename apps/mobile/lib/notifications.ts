import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// Show alerts in the foreground (instead of silently dropping them)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Physical device required for real push tokens
  if (!Device.isDevice) {
    console.log('[PUSH] Skipping — not a physical device');
    return null;
  }

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Arsenal MRO',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4C90F0',
    });
    await Notifications.setNotificationChannelAsync('aog', {
      name: 'AOG Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#E76A6E',
      sound: 'default',
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[PUSH] Permission not granted');
    return null;
  }

  // Get the Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  let expoPushToken: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    expoPushToken = result.data;
  } catch (err) {
    console.error('[PUSH] Failed to get push token:', err);
    return null;
  }

  // Register with our backend
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    await api.pushTokens.register(expoPushToken, platform);
  } catch (err) {
    console.error('[PUSH] Failed to register token with server:', err);
  }

  return expoPushToken;
}

export type NotificationHandler = (notification: Notifications.Notification) => void;
export type ResponseHandler = (response: Notifications.NotificationResponse) => void;

export function addNotificationListeners(
  onNotification: NotificationHandler,
  onResponse: ResponseHandler,
) {
  const n = Notifications.addNotificationReceivedListener(onNotification);
  const r = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => {
    n.remove();
    r.remove();
  };
}
