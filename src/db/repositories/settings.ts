import { DEFAULT_SETTINGS, type Settings } from '../../domain/types';
import { db, type StoredSettings } from '../schema';

export type SettingsPatch = Partial<Omit<Settings, 'increments'>> & {
  increments?: Partial<Settings['increments']>;
};

function merge(stored: SettingsPatch | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    increments: { ...DEFAULT_SETTINGS.increments, ...stored?.increments },
  };
}

/** Stored settings deep-merged over DEFAULT_SETTINGS. */
export async function get(): Promise<Settings> {
  const row = await db.settings.get('app');
  if (!row) return merge(undefined);
  const stored: Partial<StoredSettings> = { ...row };
  delete stored.key;
  return merge(stored);
}

/** Merges the patch (increments merged per equipment) into the stored settings. */
export async function update(patch: SettingsPatch): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const current = await get();
    const next = merge({
      ...current,
      ...patch,
      increments: { ...current.increments, ...patch.increments },
    });
    await db.settings.put({ key: 'app', ...next });
    return next;
  });
}
