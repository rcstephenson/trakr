import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Button, ConfirmDialog } from '../ui';
import { useCloudAccount, type CloudAccount } from '../../hooks/useCloud';
import type { SyncDisplay } from '../../lib/cloudSync';
import { signIn, signOut } from '../../lib/cloudSync';
import { SettingsGroup, SettingsRow } from './SettingsGroup';

const SYNC_LABEL: Record<SyncDisplay, string> = {
  synced: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  error: 'Sync error',
};

const SYNC_DETAIL: Record<SyncDisplay, string> = {
  synced: 'Up to date on this device',
  syncing: 'Sending and receiving changes',
  offline: 'Changes are kept here and sync when you are back online',
  error: 'Will retry automatically',
};

interface ViewProps {
  account: CloudAccount;
  busy: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

/** Presentational part, kept separate so it can be tested without a database. */
export function AccountSectionView({ account, busy, error, onSignIn, onSignOut }: ViewProps) {
  return (
    <>
      <SettingsGroup title="Account & sync" index={4}>
        {account.signedIn ? (
          <>
            <SettingsRow label="Signed in" description={account.email ?? undefined} />
            <SettingsRow label="Sync status" description={SYNC_DETAIL[account.sync]}>
              <span
                role="status"
                data-testid="sync-status"
                data-state={account.sync}
                className={`num text-xs uppercase ${account.sync === 'error' ? 'text-danger' : 'text-muted'}`}
              >
                {SYNC_LABEL[account.sync]}
              </span>
            </SettingsRow>
            <SettingsRow label="Sign out" description="Removes the local copy from this device">
              <Button variant="secondary" disabled={busy} onClick={onSignOut}>
                <LogOut size={18} aria-hidden="true" />
                Sign out
              </Button>
            </SettingsRow>
          </>
        ) : (
          <SettingsRow
            label="Cloud sync"
            description="Optional. Back up and share your data across devices. trakr works fully offline without it."
          >
            <Button variant="secondary" disabled={busy} onClick={onSignIn}>
              <LogIn size={18} aria-hidden="true" />
              Sign in to sync
            </Button>
          </SettingsRow>
        )}
      </SettingsGroup>
      {error ? (
        <p role="alert" className="num px-gutter text-xs text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** Account & sync settings. Renders nothing when cloud sync is not configured. */
export function AccountSection() {
  const account = useCloudAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);

  if (!account.enabled) return null;

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      setError(`Sign-in failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setConfirmOut(false);
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(`Sign-out failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AccountSectionView
        account={account}
        busy={busy}
        error={error}
        onSignIn={() => void onSignIn()}
        onSignOut={() => setConfirmOut(true)}
      />
      <ConfirmDialog
        open={confirmOut}
        title="Sign out?"
        message="Your workouts stay safe in your cloud account. Signing out removes the local copy and resets settings on this device, so it starts empty until you sign in again. Anything not yet synced is lost: export a backup first if you are offline."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => void onSignOut()}
        onCancel={() => setConfirmOut(false)}
      />
    </>
  );
}
