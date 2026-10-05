import { useId, useLayoutEffect, useRef, useState } from 'react';
import { hasEnded } from '../shared/lifecycle.js';
import type { MapRelationship, MapState, RelationshipType } from '../shared/map.js';
import type { HouseholdTableRow } from './HouseholdTable.js';
import { trapDialogTab } from './modal-focus.js';
import { ObjectReadDetails } from './ObjectReadDetails.js';
import { knowledgeLabels, relationshipLabel } from './RelationshipEditor.js';
import { RelationshipReadDetails } from './RelationshipReadDetails.js';
import './household-read-dialog.css';

export type HouseholdReadEntry = {
  kind: 'object' | 'relationships';
  id: string;
  restoreFocus?: () => void;
};

/** Keep proposed deletions readable until the entire draft is saved. */
export function householdReadRelationships(state: MapState, types: RelationshipType[]) {
  const rows = new Map(
    state.relationships.map((value) => [
      value.id,
      {
        value,
        type: types.find((type) => type.id === value.typeId),
        before: null as MapRelationship | null,
        beforeType: undefined as RelationshipType | undefined,
        proposal: undefined as 'Nytt' | 'Ändrat' | 'Föreslagen borttagning' | undefined,
      },
    ]),
  );
  for (const change of state.draft.relationships ?? []) {
    const value = change.after ?? change.before;
    if (!value) continue;
    rows.set(change.id, {
      value: {
        ...value,
        id: change.id,
        householdId: change.type.householdId,
        revision: change.before?.revision ?? 0,
      },
      type: change.type,
      before: change.before,
      beforeType: change.beforeType ?? change.type,
      proposal: !change.after ? 'Föreslagen borttagning' : change.before ? 'Ändrat' : 'Nytt',
    });
  }
  return [...rows.values()];
}

function usable(element: HTMLElement | null): element is HTMLElement {
  return Boolean(
    element?.isConnected &&
      element.getClientRects().length &&
      !element.closest('[hidden], [inert]') &&
      !element.matches(':disabled'),
  );
}

/** Restore non-table openers, falling back to an available workspace control. */
function returnFocus() {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return () => {
    const target = usable(opener)
      ? opener
      : document.querySelector<HTMLElement>('.workspace-tools button');
    if (usable(target ?? null)) target?.focus({ preventScroll: true });
  };
}

export function HouseholdReadDialog({
  entry,
  rows,
  state,
  relationshipTypes,
  onClose,
}: {
  entry: HouseholdReadEntry;
  rows: HouseholdTableRow[];
  state: MapState;
  relationshipTypes: RelationshipType[];
  onClose: () => void;
}) {
  const [chain, setChain] = useState([entry]);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<(() => void) | null>(null);
  const prefix = useId();
  const current = chain[chain.length - 1] ?? entry;
  const row = rows.find((row) => row.object.id === current.id);
  const objects = new Map(rows.map((row) => [row.object.id, row.object]));
  const relationships = householdReadRelationships(state, relationshipTypes).filter(
    ({ value }) => value.sourceId === current.id || value.targetId === current.id,
  );
  const title = row
    ? current.kind === 'relationships'
      ? `Samband för ${row.object.name}`
      : `Uppgifter för ${row.object.name}`
    : 'Objektet finns inte längre';
  useLayoutEffect(() => {
    const modal = dialog.current;
    restoreFocus.current = entry.restoreFocus ?? returnFocus();
    modal?.showModal();
    return () => {
      modal?.close();
      restoreFocus.current?.();
    };
  }, [entry.restoreFocus]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each navigation step starts at its own heading.
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (body.current) body.current.scrollTop = 0;
  }, [current]);
  function visit(next: HouseholdReadEntry) {
    setChain((old) => [...old, next]);
  }
  return (
    <dialog
      ref={dialog}
      className="household-read-dialog"
      aria-labelledby={`${prefix}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={trapDialogTab}
    >
      <header>
        <div>
          <h2 ref={heading} id={`${prefix}-title`} tabIndex={-1}>
            {title}
          </h2>
          <p>Sparade uppgifter och ditt utkast</p>
        </div>
        <button type="button" aria-label="Stäng dialogen" onClick={onClose}>
          ×
        </button>
      </header>
      <div ref={body} className="household-read-body">
        {!row ? (
          <p>Objektet är inte längre tillgängligt. Du kan gå tillbaka eller stänga dialogen.</p>
        ) : current.kind === 'object' ? (
          <>
            <p>
              {row.removed ? 'Borttaget' : hasEnded(row.object) ? 'Upphört' : 'Aktuellt'}
              {row.proposal && ` · ◇ ${row.proposal}`}
            </p>
            <ObjectReadDetails row={row} full />
            <button
              type="button"
              aria-label={`Samband för ${row.object.name}`}
              aria-describedby={`${prefix}-count`}
              onClick={() => visit({ kind: 'relationships', id: current.id })}
            >
              <span aria-hidden="true">↔</span> Samband ·{' '}
              <span id={`${prefix}-count`}>{relationships.length} samband</span>
            </button>
          </>
        ) : (
          <section aria-label="Befintliga samband">
            <h3>Befintliga samband · {relationships.length}</h3>
            {!relationships.length && <p>Inga samband finns för objektet.</p>}
            <ul className="household-read-relationships">
              {relationships.map(({ value, type, before, beforeType, proposal }) => {
                const otherId = value.sourceId === current.id ? value.targetId : value.sourceId;
                const other = otherId ? rows.find((row) => row.object.id === otherId) : undefined;
                return (
                  <li key={value.id}>
                    <h4>
                      {relationshipLabel(
                        value,
                        { relationshipTypes: type ? [type] : [] },
                        objects,
                        current.id,
                      )}
                    </h4>
                    <p>
                      {hasEnded(value) ? 'Upphört' : 'Aktuellt'}
                      {proposal && ` · ◇ ${proposal}`}
                    </p>
                    {other ? (
                      <button
                        type="button"
                        className="household-read-link"
                        onClick={() => visit({ kind: 'object', id: other.object.id })}
                      >
                        {other.object.name}
                      </button>
                    ) : (
                      <p>
                        {otherId ? 'Objektet finns inte längre' : knowledgeLabels[value.knowledge]}
                      </p>
                    )}
                    <RelationshipReadDetails
                      value={value}
                      type={type}
                      before={before}
                      beforeType={beforeType}
                      objects={objects}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      {chain.length > 1 && (
        <footer>
          <button type="button" onClick={() => setChain((old) => old.slice(0, -1))}>
            Tillbaka
          </button>
        </footer>
      )}
    </dialog>
  );
}
