import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { WorkspaceTools } from '../../../src/client/WorkspaceTools.js';

afterEach(cleanup);
test('removing the last proposal returns a focused draft entry to the usable text-view entry', () => {
  const props = { expanded: false, onExpandedChange: vi.fn(), onOpen: vi.fn() };
  const { rerender } = render(<WorkspaceTools {...props} hasDraft />);
  const draft = screen.getByRole('button', { name: 'Utkast' });
  draft.focus();
  expect(document.activeElement).toBe(draft);
  rerender(<WorkspaceTools {...props} hasDraft={false} />);
  expect(screen.queryByRole('button', { name: 'Utkast' })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Skriv till Skyttel' }));
});
