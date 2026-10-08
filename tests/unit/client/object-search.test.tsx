import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import {
  initialObjectSearch,
  ObjectSearch,
  type ObjectSearchState,
} from '../../../src/client/ObjectSearch.js';

afterEach(cleanup);

function Search({
  active = true,
  entryRequestId = 0,
}: {
  active?: boolean;
  entryRequestId?: number;
}) {
  const [search, setSearch] = useState<ObjectSearchState>(initialObjectSearch);
  return (
    <>
      <button type="button">Outside</button>
      <ObjectSearch
        active={active}
        entryRequestId={entryRequestId}
        search={search}
        onChange={setSearch}
        onReturnToMap={() => screen.getByRole('button', { name: 'Outside' }).focus()}
        types={[
          { id: 'person', householdId: 'home', revision: 1, name: 'Person', description: '' },
        ]}
        selectedIds={['selected']}
        hasProposals
      />
    </>
  );
}

test('search text and filter resets remain independent while closing the dialog preserves immediate choices', async () => {
  render(<Search />);
  const input = screen.getByRole('searchbox', { name: 'Sök objekt i kartan' });
  expect(document.activeElement).not.toBe(input);
  await userEvent.type(input, 'Alex');
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Kartans filter' }));
  expect(document.activeElement).toBe(dialog.getByRole('heading'));
  await userEvent.click(dialog.getByLabelText('Person'));
  await userEvent.click(dialog.getByLabelText('Bara markerade (1)'));
  await userEvent.click(dialog.getByLabelText('Nytt'));
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Filter · aktiva' }));
  expect(input).toHaveProperty('value', 'Alex');
  await userEvent.click(screen.getByRole('button', { name: 'Rensa sökning' }));
  expect(input).toHaveProperty('value', '');
  expect(document.activeElement).toBe(input);
  await userEvent.type(input, 'Lo');
  await userEvent.click(screen.getByRole('button', { name: 'Filter · aktiva' }));
  expect(dialog.getByLabelText('Person')).toHaveProperty('checked', true);
  expect(dialog.getByLabelText('Nytt')).toHaveProperty('checked', true);
  await userEvent.click(dialog.getByRole('button', { name: 'Återställ filter' }));
  expect(input).toHaveProperty('value', 'Lo');
  expect(dialog.getAllByRole('checkbox').every((item) => !(item as HTMLInputElement).checked)).toBe(
    true,
  );
  await userEvent.click(dialog.getByRole('button', { name: 'Stäng filter' }));
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  // Toggling the trigger closes the dialog without opening it again on pointerdown.
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  await userEvent.click(screen.getByRole('button', { name: 'Outside' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(input).toHaveProperty('value', 'Lo');
  await userEvent.click(input);
  fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
  expect(document.activeElement).toBe(input);
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Outside' }));
  expect(input).toHaveProperty('value', 'Lo');
});

test('a requested search focuses the input and leaving the map closes its filter dialog', async () => {
  const view = render(<Search />);
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  view.rerender(<Search entryRequestId={1} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('searchbox'));
  await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
  view.rerender(<Search active={false} entryRequestId={1} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  // The inactive view must not steal focus when another entry is requested.
  const outside = screen.getByRole('button', { name: 'Outside' });
  outside.focus();
  view.rerender(<Search active={false} entryRequestId={2} />);
  expect(document.activeElement).toBe(outside);
});
