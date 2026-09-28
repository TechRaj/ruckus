/**
 * Exports `api`, the backend adapter the screens call. The real adapter needs
 * EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY and
 * EXPO_PUBLIC_PROXY_URL in apps/mobile/.env. With no Supabase URL the mock is used.
 */
import { Api } from './types';
import { mockApi } from './mock';

export const USE_MOCKS = !process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Required lazily so the mock path never loads supabase-js or AsyncStorage. */
export const api: Api = USE_MOCKS ? mockApi : (require('./ruckus') as { ruckusApi: Api }).ruckusApi;
