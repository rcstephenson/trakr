/**
 * Optional Dexie Cloud sync. Cloud is OFF unless `VITE_DEXIE_CLOUD_URL` is set at build time
 * (see .env.example). When off, the addon is never loaded into the database, so there is no
 * network access and no login UI: the app is exactly the local-only app.
 */

/** Normalises the configured URL; returns null when unset, blank or not an http(s) URL. */
export function resolveCloudUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/\/+$/, '');
  return /^https?:\/\/\S+$/.test(value) ? value : null;
}

export const CLOUD_URL: string | null = resolveCloudUrl(import.meta.env.VITE_DEXIE_CLOUD_URL);

export const CLOUD_ENABLED: boolean = CLOUD_URL !== null;

/**
 * Tables that never leave this device. Settings (units, theme, rotation pointer) are per-device
 * preferences; keeping them local also means two devices never race to create the `app` row.
 */
export const UNSYNCED_TABLES = ['settings'];
