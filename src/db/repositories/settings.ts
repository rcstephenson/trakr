import { DEFAULT_SETTINGS, type Settings } from '../../domain/types';
import { db } from '../schema';

export type SettingsPatch = Partial<Settings>;

/** Stored settings merged over DEFAULT_SETTINGS; keys from older versions are dropped. */
function merge(stored: Partial<Settings> | undefined): Settings {
  const next: Settings = { ...DEFAULT_SETTINGS };
  if (stored?.unit) next.unit = stored.unit;
  if (stored?.theme) next.theme = stored.theme;
  if (stored?.rotationPointer !== undefined) next.rotationPointer = stored.rotationPointer;
  return next;
}

export async function get(): Promise<Settings> {
  const row = await db.settings.get('app');
  return merge(row);
}

/** Merges the patch into the stored settings. */
export async function update(patch: SettingsPatch): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const current = await get();
    const next = merge({ ...current, ...patch });
    await db.settings.put({ key: 'app', ...next });
    return next;
  });
}
