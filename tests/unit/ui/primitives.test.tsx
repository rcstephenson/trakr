import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Button, Chip, ConfirmDialog, Sheet, TabBar } from '../../../src/components/ui';

describe('Chip', () => {
  it('reflects selection with aria-pressed', () => {
    render(<Chip selected>All</Chip>);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Button', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Sheet', () => {
  it('renders nothing when closed and a dialog when open', () => {
    const { rerender } = render(
      <Sheet open={false} onClose={() => {}} title="T">
        <button>Inside</button>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Sheet open onClose={() => {}} title="T">
        <button>Inside</button>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'T' })).toBeInTheDocument();
  });

  it('closes on Escape and traps focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="T">
        <button>One</button>
        <button>Two</button>
      </Sheet>,
    );
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ConfirmDialog', () => {
  it('calls confirm and cancel handlers', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('TabBar', () => {
  it('renders the four tabs with the current one marked', () => {
    render(
      <MemoryRouter initialEntries={['/history']}>
        <TabBar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Today',
      'History',
      'Progress',
      'Program',
    ]);
    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page');
  });
});
