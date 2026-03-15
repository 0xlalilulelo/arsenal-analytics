import { createMroClient } from '@mro/api-client';
import { getToken } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = createMroClient(BASE_URL, getToken);
