import { STORAGE_KEYS } from '../utils/constants';

export interface SessionStats {
  captured: number;
  duplicates: number;
  outliers: number;
  startedAt: string;
}

export async function saveToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.TOKEN]: token });
}

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
  return (result[STORAGE_KEYS.TOKEN] as string) ?? null;
}

export async function saveRefreshToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.REFRESH_TOKEN]: token });
}

export async function getRefreshToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.REFRESH_TOKEN);
  return (result[STORAGE_KEYS.REFRESH_TOKEN] as string) ?? null;
}

export async function saveUser(user: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.USER]: user });
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER);
  return (result[STORAGE_KEYS.USER] as Record<string, unknown>) ?? null;
}

export async function saveSessionStats(stats: SessionStats): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_STATS]: stats });
}

export async function getSessionStats(): Promise<SessionStats | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSION_STATS);
  return (result[STORAGE_KEYS.SESSION_STATS] as SessionStats) ?? null;
}

export async function getIsPaused(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.IS_PAUSED);
  return (result[STORAGE_KEYS.IS_PAUSED] as boolean) ?? false;
}

export async function setIsPaused(paused: boolean): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.IS_PAUSED]: paused });
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}
