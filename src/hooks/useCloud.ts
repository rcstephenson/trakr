import { useEffect, useState } from 'react';
import { db } from '../db/schema';
import { CLOUD_ENABLED } from '../lib/cloud';
import { deriveSyncDisplay, type SyncDisplay, type SyncStateLike } from '../lib/cloudSync';

export interface CloudAccount {
  /** False when no Dexie Cloud URL was configured at build time. */
  enabled: boolean;
  signedIn: boolean;
  email: string | null;
  sync: SyncDisplay;
}

interface Subscribable<T> {
  subscribe(next: (value: T) => void): { unsubscribe(): void };
}

/** Mirrors a BehaviorSubject-like source into state. A null source yields the fallback. */
function useSubject<T>(source: Subscribable<T> | null, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    if (!source) return undefined;
    const sub = source.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [source]);
  return value;
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

const SIGNED_OUT = { isLoggedIn: false, email: undefined } as const;
const INITIAL_SYNC: SyncStateLike = { phase: 'initial' };

/** Live sign-in and sync status. Inert (enabled: false) when cloud is not configured. */
export function useCloudAccount(): CloudAccount {
  const cloud = CLOUD_ENABLED ? db.cloud : null;
  const user = useSubject<{ isLoggedIn?: boolean; email?: string }>(
    cloud?.currentUser ?? null,
    SIGNED_OUT,
  );
  const syncState = useSubject<SyncStateLike>(cloud?.syncState ?? null, INITIAL_SYNC);
  const online = useOnline();
  const signedIn = CLOUD_ENABLED && user.isLoggedIn === true;
  return {
    enabled: CLOUD_ENABLED,
    signedIn,
    email: signedIn ? (user.email ?? null) : null,
    sync: deriveSyncDisplay(syncState, online),
  };
}
