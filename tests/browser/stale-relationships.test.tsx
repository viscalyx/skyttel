import { cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { ConflictDialog } from '../../src/client/ConflictDialog.js';
import { HouseholdReadDialog } from '../../src/client/HouseholdReadDialog.js';
import type { RelationshipFormSubmission } from '../../src/client/RelationshipForm.js';
import type { MapState } from '../../src/shared/map.js';
import '../../src/client/styles.css';
import '../../src/client/workspace.css';

const type = { id: 'thing', householdId: 'home', revision: 1, name: 'Sak', description: '' };
const edgeType = { ...type, id: 'uses', name: 'Använder' };
const object = { ...type, typeId: 'thing', id: 'lo', name: 'Lo Exempel', description: '' };
const state: MapState = {
  userId: 'alex',
  contentVersion: 1,
  types: [type],
  objects: [object],
  relationships: [],
  relationshipTypes: [edgeType],
  draft: {
    version: 1,
    changes: [],
    relationships: [
      {
        id: 'mine',
        before: null,
        type: edgeType,
        after: {
          typeId: 'uses',
          sourceId: 'gone',
          targetId: 'lo',
          knowledge: 'uncertain',
          lifecycle: 'ended',
        },
        objectNames: { gone: 'Borttagen cykel', lo: 'Lo Exempel' },
      },
    ],
  },
};

afterEach(() => cleanup());

test('ordinary relationship reader excludes endpoint-blocked proposals', {
  tags: ['technical'],
}, async () => {
  render(
    <HouseholdReadDialog
      entry={{ kind: 'relationships', id: 'lo' }}
      active
      onClose={() => {}}
      rows={[{ object, type, removed: false }]}
      state={state}
      relationshipTypes={[edgeType]}
      onEdit={() => {}}
    />,
  );
  const dialog = page.getByRole('dialog', { name: 'Samband för Lo Exempel', exact: true });
  await expect.element(dialog).toHaveTextContent(/Inga samband finns för objektet\./);
  await expect
    .element(dialog.getByText('Osäkert uppgivet', { exact: true }))
    .not.toBeInTheDocument();
});

for (const width of [1280, 320]) {
  test(`blocked proposal correction uses real controls and retains content at ${width}px`, {
    tags: ['technical'],
  }, async () => {
    await page.viewport(width, 900);
    const staged: RelationshipFormSubmission[] = [];
    function Workflow() {
      const [correcting, setCorrecting] = useState(false);
      return (
        <main className="household-map workspace-shell" data-theme="light">
          <ConflictDialog
            state={state}
            open={!correcting}
            disabled={false}
            onClose={() => {}}
            onResolve={async () => {}}
            onRefresh={async () => state}
            onCorrectRelationship={() => setCorrecting(true)}
          />
          {correcting && (
            <HouseholdReadDialog
              entry={{ kind: 'relationships', id: 'blocked-mine', retainedRelationshipId: 'mine' }}
              active
              onClose={() => setCorrecting(false)}
              rows={[{ object, type, removed: false }]}
              state={state}
              relationshipTypes={[edgeType]}
              onEdit={() => {}}
              onStageRelationship={async (editor, stagingId) => {
                staged.push(editor);
                return {
                  state,
                  outcome: {
                    stagingId,
                    relationshipId: 'mine',
                    status: 'staged',
                    draftVersion: 2,
                    value: editor.value,
                  },
                };
              }}
              onCheckRelationship={async () => ({ state, outcome: null })}
            />
          )}
        </main>
      );
    }
    render(<Workflow />);
    const conflict = page.getByRole('dialog', { name: 'Granska konflikter', exact: true });
    await expect.element(conflict).toHaveTextContent(/Hela utkastet kan sparas först/);
    const correct = conflict.getByRole('button', { name: 'Rätta ändpunkter', exact: true });
    (correct.element() as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    const editor = page.getByRole('dialog', { name: 'Rätta blockerat samband', exact: true });
    await expect
      .element(editor.getByRole('heading', { name: 'Rätta blockerat samband', exact: true }))
      .toHaveFocus();
    await expect
      .element(editor.getByLabelText('Uppgiftens säkerhet', { exact: true }))
      .toHaveValue('uncertain');
    await editor.getByLabelText('Från objekt', { exact: true }).selectOptions('lo');
    await editor.getByRole('button', { name: 'Lägg i utkastet', exact: true }).click();
    await expect
      .element(editor.getByRole('status'))
      .toHaveTextContent(/Sambandet lades i ditt utkast/);
    expect(staged).toMatchObject([
      {
        id: 'mine',
        baseRevision: null,
        value: { sourceId: 'lo', targetId: 'lo', knowledge: 'uncertain', lifecycle: 'ended' },
      },
    ]);
    const element = await editor.element();
    expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
  });
}
