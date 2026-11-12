import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLOUD_ENABLED, CLOUD_URL, resolveCloudUrl, UNSYNCED_TABLES } from '../../../src/lib/cloud';
import { db, TrakrDB } from '../../../src/db/schema';
import { deriveSyncDisplay, signIn, signOut } from '../../../src/lib/cloudSync';
import { ensureSingleActiveProgram } from '../../../src/db/seed';
import { DEFAULT_PROGRAM } from '../../../src/db/bundled';
import type { StoredProgram } from '../../../src/domain/types';

describe('cloud config gating', () => {
  it('is off when VITE_DEXIE_CLOUD_URL is unset or blank', () => {
    expect(resolveCloudUrl(undefined)).toBeNull();
    expect(resolveCloudUrl('')).toBeNull();
    expect(resolveCloudUrl('   ')).toBeNull();
    expect(resolveCloudUrl('not a url')).toBeNull();
  });

  it('accepts an https URL and trims whitespace and trailing slashes', () => {
    expect(resolveCloudUrl(' https://abc123.dexie.cloud/ ')).toBe('https://abc123.dexie.cloud');
  });

  it('is disabled in the test environment and the app db has no cloud addon', () => {
    expect(CLOUD_URL).toBeNull();
    expect(CLOUD_ENABLED).toBe(false);
    expect((db as unknown as { cloud?: unknown }).cloud).toBeUndefined();
  });

  it('keeps settings local-only', () => {
    expect(UNSYNCED_TABLES).toContain('settings');
  });

  it('sign in/out are inert without a configured database', async () => {
    await expect(signIn()).resolves.toBeUndefined();
    await expect(signOut()).resolves.toBe(true);
  });
});

describe('deriveSyncDisplay', () => {
  it('maps addon phases to the four UI states', () => {
    expect(deriveSyncDisplay({ phase: 'in-sync' }, true)).toBe('synced');
    expect(deriveSyncDisplay({ phase: 'pushing' }, true)).toBe('syncing');
    expect(deriveSyncDisplay({ phase: 'pulling' }, true)).toBe('syncing');
    expect(deriveSyncDisplay({ phase: 'initial' }, true)).toBe('syncing');
    expect(deriveSyncDisplay({ phase: 'offline' }, true)).toBe('offline');
    expect(deriveSyncDisplay({ phase: 'in-sync' }, false)).toBe('offline');
    expect(deriveSyncDisplay({ phase: 'error' }, true)).toBe('error');
    expect(deriveSyncDisplay({ phase: 'in-sync', status: 'error' }, true)).toBe('error');
  });
});

describe('cloud-enabled database keeps pre-existing local data', () => {
  let cloudDb: TrakrDB | undefined;
  afterEach(async () => {
    vi.unstubAllGlobals();
    cloudDb?.close();
    await Dexie.delete('trakr-legacy');
  });

  it('opens an existing v1 database under the same name with its rows intact', async () => {
    const plain = new TrakrDB('trakr-legacy', null);
    await plain.sessions.put({
      id: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
      startedAt: '2026-01-01T10:00:00.000Z',
      status: 'finished',
    } as never);
    await plain.settings.put({ key: 'app', unit: 'kg' });
    plain.close();

    // The addon syncs eagerly once configured; make sure that can never reach a real network.
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network disabled in tests')));
    cloudDb = new TrakrDB('trakr-legacy', 'https://example.invalid');
    // nameSuffix is off, so the database keeps its plain name (not 'trakr-legacy-<id>').
    expect(cloudDb.name).toBe('trakr-legacy');
    await cloudDb.open();
    expect(await cloudDb.sessions.count()).toBe(1);
    expect((await cloudDb.settings.get('app'))?.unit).toBe('kg');
    expect(cloudDb.cloud.currentUserId).toBeTruthy();
  });
});

describe('ensureSingleActiveProgram', () => {
  const program = (id: string, isActive: 0 | 1): StoredProgram =>
    ({ ...DEFAULT_PROGRAM, id, isActive, importedAt: '2026-01-01T00:00:00.000Z' }) as StoredProgram;

  afterEach(async () => {
    await db.programs.clear();
  });

  it('leaves a single active program alone', async () => {
    await db.programs.bulkPut([program(DEFAULT_PROGRAM.id, 1), program('other', 0)]);
    await ensureSingleActiveProgram();
    expect((await db.programs.get(DEFAULT_PROGRAM.id))?.isActive).toBe(1);
  });

  it('prefers a user-chosen program over the bundled default when two are active', async () => {
    await db.programs.bulkPut([program(DEFAULT_PROGRAM.id, 1), program('custom', 1)]);
    await ensureSingleActiveProgram();
    expect((await db.programs.get('custom'))?.isActive).toBe(1);
    expect((await db.programs.get(DEFAULT_PROGRAM.id))?.isActive).toBe(0);
  });
});
