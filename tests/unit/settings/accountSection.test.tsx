import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AccountSection,
  AccountSectionView,
} from '../../../src/components/settings/AccountSection';
import type { CloudAccount } from '../../../src/hooks/useCloud';

const base: CloudAccount = { enabled: true, signedIn: false, email: null, sync: 'synced' };

function view(account: Partial<CloudAccount>, extra: { error?: string | null } = {}) {
  const onSignIn = vi.fn();
  const onSignOut = vi.fn();
  render(
    <AccountSectionView
      account={{ ...base, ...account }}
      busy={false}
      error={extra.error ?? null}
      onSignIn={onSignIn}
      onSignOut={onSignOut}
    />,
  );
  return { onSignIn, onSignOut };
}

describe('AccountSection', () => {
  it('renders nothing when cloud is not configured', () => {
    const { container } = render(<AccountSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('signed out: offers sign-in and notes that offline use needs no account', async () => {
    const { onSignIn } = view({});
    expect(screen.getByText(/works fully offline/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sign in to sync/i }));
    expect(onSignIn).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull();
  });

  it('signed in: shows the email, sync status and a sign-out button', async () => {
    const { onSignOut } = view({ signedIn: true, email: 'me@example.com', sync: 'syncing' });
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('sync-status')).toHaveAttribute('data-state', 'syncing');
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /sign in to sync/i })).toBeNull();
  });

  it.each([
    ['synced', 'Synced'],
    ['syncing', 'Syncing…'],
    ['offline', 'Offline'],
    ['error', 'Sync error'],
  ] as const)('shows the %s state', (sync, label) => {
    view({ signedIn: true, email: 'me@example.com', sync });
    expect(screen.getByTestId('sync-status')).toHaveTextContent(label);
  });

  it('shows an error message', () => {
    view({}, { error: 'Sign-in failed: nope' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in failed: nope');
  });
});
