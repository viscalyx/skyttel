// Throwaway D: reuse main's draft table and frame; removal and saving stay in memory.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { draftChangeCount, type MapDraft, type MapState } from '../shared/map.js';
import { ConversationDraft } from './ConversationDraft.js';

function exampleDraft(): MapDraft {
  const type = {
    id: 'prototype-vehicle',
    householdId: 'prototype',
    revision: 1,
    name: 'Fordon',
    description: '',
    fields: [
      { id: 'registration', name: 'Registreringsnummer', description: '', kind: 'text' as const },
    ],
  };
  const before = {
    id: 'car',
    householdId: 'prototype',
    revision: 1,
    typeId: type.id,
    name: 'Familjens bil',
    description: 'Elbil',
    customValues: { registration: 'ABC123' },
  };
  const relationshipType = {
    id: 'prototype-uses',
    householdId: 'prototype',
    revision: 1,
    name: 'Använder',
    description: '',
    forwardLabel: 'använder',
  };
  return {
    version: 1,
    changes: [
      {
        id: 'car',
        before,
        after: { ...before, name: 'Blå bilen', customValues: { registration: 'DEF456' } },
        type,
      },
      {
        id: 'bicycle',
        before: null,
        after: { typeId: type.id, name: 'Alex cykel', description: 'Blå cykel' },
        type,
      },
      {
        id: 'old-car',
        before: { ...before, id: 'old-car', name: 'Gamla bilen' },
        after: null,
        type,
      },
    ],
    relationships: [
      {
        id: 'uses-car',
        before: null,
        after: {
          typeId: relationshipType.id,
          sourceId: 'alex',
          targetId: 'car',
          knowledge: 'known',
        },
        type: relationshipType,
        objectNames: { alex: 'Alex', car: 'Blå bilen' },
      },
    ],
    objectTypes: [{ id: type.id, before: type, after: { ...type, name: 'Fordon i hushållet' } }],
    relationshipTypes: [{ id: relationshipType.id, before: null, after: relationshipType }],
  };
}

export function DraftMainPrototype({
  source,
  host,
  onCountChange,
}: {
  source: MapState;
  host: HTMLElement | null;
  onCountChange: (count: number) => void;
}) {
  const [draft, setDraft] = useState<MapDraft>(() => structuredClone(source.draft));
  const [example, setExample] = useState('environment');
  const [notice, setNotice] = useState('');
  const count = draftChangeCount(draft);
  useEffect(() => onCountChange(count), [count, onCountChange]);

  function remove(key: string) {
    setDraft((current) => ({
      ...current,
      changes: current.changes.filter((change) => `object-${change.id}` !== key),
      relationships: current.relationships?.filter((change) => `relationship-${change.id}` !== key),
      objectTypes: current.objectTypes?.filter((change) => `Objekttyp-${change.id}` !== key),
      relationshipTypes: current.relationshipTypes?.filter(
        (change) => `Sambandstyp-${change.id}` !== key,
      ),
    }));
    setNotice('Förslaget har tagits bort ur ditt utkast.');
  }

  function scenario(value: string) {
    setExample(value);
    setNotice('');
    if (value === 'environment') setDraft(structuredClone(source.draft));
    else if (value === 'empty') setDraft({ version: 1, changes: [] });
    else {
      const sample = exampleDraft();
      if (value === 'many' && sample.changes[1].after) {
        const added = sample.changes[1];
        const after = sample.changes[1].after;
        sample.changes.push(
          ...Array.from({ length: 36 }, (_, index) => ({
            ...added,
            id: `bicycle-${index}`,
            after: { ...after, name: `Cykel ${index + 1}` },
          })),
        );
      }
      setDraft(sample);
    }
  }

  return (
    <>
      {host &&
        createPortal(
          <div className="dr-main">
            <ConversationDraft draft={draft} onRemove={remove} />
            {count > 0 && (
              <div className="dr-main-actions">
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ version: draft.version + 1, changes: [] });
                    setNotice(`${count} förslag sparade i prototypen.`);
                  }}
                >
                  Spara hela utkastet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ version: draft.version + 1, changes: [] });
                    setNotice('Hela ditt utkast har tagits bort.');
                  }}
                >
                  Kasta hela utkastet
                </button>
              </div>
            )}
            {notice && <p role="status">{notice}</p>}
          </div>,
          host,
        )}
      <div className="dr-root dr-controller dr-variant-D">
        <details className="dr-lab">
          <summary>Prototypkontroller</summary>
          <strong>Kastbar prototyp · inga riktiga sparanden</strong>
          <label>
            Exempel
            <select value={example} onChange={(event) => scenario(event.target.value)}>
              <option value="environment">Miljöns utkast · simulerad arbetskopia</option>
              <option value="sample">Objekt, samband, typer och borttagningar</option>
              <option value="many">Många · 42 förslag</option>
              <option value="empty">Tomt utkast</option>
            </select>
          </label>
          <details>
            <summary>Visa prototypens tillstånd</summary>
            <pre>{JSON.stringify({ variant: 'D', utkast: draft, antal: count }, null, 2)}</pre>
          </details>
        </details>
      </div>
    </>
  );
}
