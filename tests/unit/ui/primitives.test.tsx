import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Button, Chip, ConfirmDialog, Sheet, Stepper, TabBar } from '../../../src/components/ui';

describe('Stepper', () => {
  function Harness({ min = 0 }: { min?: number }) {
    const [v, setV] = useState(100);
    return <Stepper label="Weight" value={v} step={2.5} min={min} unit="lb" onChange={setV} />;
  }

  it('increments and decrements by the step', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Increase Weight' }));
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('102.5');
    await user.click(screen.getByRole('button', { name: 'Decrease Weight' }));
    await user.click(screen.getByRole('button', { name: 'Decrease Weight' }));
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('97.5');
  });

  it('uses a decimal numeric keypad and commits typed values on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Weight' });
    expect(input).toHaveAttribute('inputmode', 'decimal');
    await user.clear(input);
    await user.type(input, '137.5');
    await user.tab();
    expect(input).toHaveValue('137.5');
  });

  it('does not go below min', async () => {
    const user = userEvent.setup();
    render(<Harness min={100} />);
    expect(screen.getByRole('button', { name: 'Decrease Weight' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Increase Weight' }));
    expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('102.5');
  });
});

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
