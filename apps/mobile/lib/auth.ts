import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mro_auth_token';
const USER_KEY = 'mro_auth_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  orgId: string;
}

export async function storeSession(token: string, user: StoredUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as StoredUser;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
