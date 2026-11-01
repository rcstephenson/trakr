import 'fake-indexeddb/auto';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import * as settings from '../../../src/db/repositories/settings';
import { useSettings } from '../../../src/hooks/useSettings';
import { formatWeight } from '../../../src/domain/units';

function Weight() {
  const s = useSettings();
  if (!s) return null;
  return <span data-testid="w">{formatWeight(100, 'lb', s.unit)}</span>;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('unit setting', () => {
  it('converts displayed weights after settings.update({ unit: "kg" })', async () => {
    render(<Weight />);
    await waitFor(() => expect(screen.getByTestId('w')).toHaveTextContent('100 lb'));
    await act(async () => {
      await settings.update({ unit: 'kg' });
    });
    await waitFor(() => expect(screen.getByTestId('w')).toHaveTextContent('45.5 kg'));
  });
});
