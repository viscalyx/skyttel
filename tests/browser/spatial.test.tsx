import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { SpatialMap } from '../../src/client/SpatialMap.js';
import '../../src/client/styles.css';
import type { MapState } from '../../src/shared/map.js';

const state: MapState = {
  userId: 'alex',
  contentVersion: 1,
  types: [
    { id: 'person', householdId: 'home', revision: 1, name: 'Person', description: '' },
    { id: 'own', householdId: 'home', revision: 1, name: 'Musiksak', description: '' },
  ],
  relationshipTypes: [
    {
      id: 'uses',
      householdId: 'home',
      revision: 1,
      name: 'Använder',
      description: '',
      forwardLabel: 'använder',
      reverseLabel: 'används av',
    },
  ],
  objects: [
    {
      id: 'lo',
      typeId: 'person',
      householdId: 'home',
      revision: 1,
      name: 'Lo Exempel',
      description: '',
    },
    {
      id: 'music',
      typeId: 'own',
      householdId: 'home',
      revision: 1,
      name: 'Musikspelaren',
      description: '',
    },
    {
      id: 'kim',
      typeId: 'person',
      householdId: 'home',
      revision: 1,
      name: 'Kim Exempel',
      description: '',
    },
  ],
  relationships: [
    {
      id: 'edge',
      householdId: 'home',
      revision: 1,
      typeId: 'uses',
      sourceId: 'lo',
      targetId: 'music',
      knowledge: 'known',
    },
    {
      id: 'unknown',
      householdId: 'home',
      revision: 1,
      typeId: 'uses',
      sourceId: 'kim',
      targetId: null,
      knowledge: 'unknown',
    },
  ],
  draft: { version: 0, changes: [] },
};

state.draft.changes = state.objects.map((object, index) => ({
  id: object.id,
  before: index === 1 ? null : object,
  after: index === 2 ? null : object,
  type: state.types[object.typeId === 'person' ? 0 : 1],
}));
state.draft.relationships = state.relationships.map((edge, index) => ({
  id: edge.id,
  before: edge,
  after: index ? null : edge,
  type: state.relationshipTypes[0],
  objectNames: {},
}));

function MapView() {
  const [selection, setSelection] = useState<{
    kind: 'object' | 'relationship';
    id: string;
  } | null>(null);
  const [objects, setObjects] = useState(
    new Map(state.objects.map((object) => [object.id, object])),
  );
  const [message, setMessage] = useState('Ingen vald');
  return (
    <>
      <p role="status">{message}</p>
      <SpatialMap
        active
        state={state}
        objects={objects}
        relationships={new Map(state.relationships.map((edge) => [edge.id, edge]))}
        selection={selection}
        disabled={false}
        onSelect={(object) => {
          setSelection({ kind: 'object', id: object.id });
          setMessage(object.name);
        }}
        onSelectRelationship={(edge) => {
          setSelection({ kind: 'relationship', id: edge.id });
          setMessage(`Samband: ${edge.knowledge}`);
        }}
        onFocus={(id) => {
          setSelection({ kind: 'object', id });
          setMessage(`Kopplingar för ${id}`);
        }}
        onClear={() => {
          setSelection(null);
          setMessage('Hela rymden');
        }}
        onReset={() => {
          setSelection(null);
          setMessage('Översikt återställd');
        }}
        onRemove={(object) => {
          setObjects((previous) => {
            const next = new Map(previous);
            next.delete(object.id);
            return next;
          });
          setMessage('Borttagning föreslagen');
        }}
      />
    </>
  );
}

afterEach(cleanup);

test('graphics navigation and label modes expose selectable objects and directed facts', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await expect.element(lo).toBeVisible();
  await lo.click({ modifiers: ['Control'] });
  await expect.element(page.getByRole('status')).toHaveTextContent('Kopplingar för lo');
  await lo.click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
  await page.getByText('Navigera rymden', { exact: true }).click();
  for (const name of [
    'Panorera höger',
    'Panorera vänster',
    'Panorera uppåt',
    'Panorera nedåt',
    'Rotera vänster',
    'Rotera höger',
    'Luta uppåt',
    'Luta nedåt',
    'Zooma in',
    'Zooma ut',
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect.element(lo).toBeInTheDocument();
  }
  await page.getByLabelText('Alla etiketter', { exact: true }).click();
  await expect
    .element(page.getByText('Närmare utsnitt. Panorera för att se fler etiketter.'))
    .toBeVisible();
  await page.getByLabelText('Alla etiketter', { exact: true }).click();
  await page.getByRole('button', { name: 'Återställ vy' }).click();
  await page
    .getByRole('button', {
      name: 'Välj samband: Lo Exempel → använder → Musikspelaren',
      exact: true,
    })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: known');
  await page
    .getByRole('button', { name: 'Välj samband: Kim Exempel → använder → Okänt', exact: true })
    .click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Samband: unknown');
  await page
    .getByRole('img', { name: 'Rymdens bakgrund. Välj innehåll med etiketterna eller listan.' })
    .click({ position: { x: 5, y: 5 } });
  await expect.element(page.getByRole('status')).toHaveTextContent('Hela rymden');
});

test('context menu edits, focuses, cancels and removes only the chosen object', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Visa kopplingar', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Kopplingar för lo');
  await lo.click({ button: 'right' });
  await userEvent.keyboard('{Escape}');
  await expect.element(lo).toHaveFocus();
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click();
  await expect.element(lo).toHaveFocus();
  await lo.click({ button: 'right' });
  await page.getByRole('button', { name: 'Ta bort objekt', exact: true }).click();
  await expect.element(lo).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Välj objekt: Kim Exempel', exact: true }))
    .toBeVisible();
});

test('a real WebGL context can recover without replacing selected household content', async () => {
  render(<MapView />);
  await page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }).click();
  const extension = document
    .querySelector('canvas')
    ?.getContext('webgl2')
    ?.getExtension('WEBGL_lose_context');
  expect(extension).toBeTruthy();
  extension?.loseContext();
  await expect
    .element(page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.'))
    .toBeVisible();
  extension?.restoreContext();
  await expect
    .element(page.getByText('Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.'))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
});

test('long press does not activate a menu action on release and movement cancels a pending menu', async () => {
  render(<MapView />);
  const lo = page.getByRole('button', { name: 'Välj objekt: Lo Exempel', exact: true });
  await expect.element(lo).toBeVisible();
  const element = lo.element();
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    clientX: 20,
    clientY: 20,
  });
  fireEvent.pointerMove(element, { pointerType: 'touch', clientX: 50, clientY: 20 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .not.toBeInTheDocument();
  fireEvent.pointerDown(element, {
    pointerType: 'touch',
    isPrimary: true,
    clientX: 20,
    clientY: 20,
  });
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .toBeVisible();
  fireEvent.pointerUp(element, { pointerType: 'touch' });
  fireEvent.click(page.getByRole('button', { name: 'Redigera objekt', exact: true }).element());
  await expect
    .element(page.getByRole('button', { name: 'Redigera objekt', exact: true }))
    .toBeVisible();
  await expect.element(page.getByRole('status')).toHaveTextContent('Ingen vald');
  await page.getByRole('button', { name: 'Redigera objekt', exact: true }).click();
  await expect.element(page.getByRole('status')).toHaveTextContent('Lo Exempel');
});
