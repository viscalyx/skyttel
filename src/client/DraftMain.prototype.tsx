// Throwaway D: reuse main's draft table and frame; removal and saving stay in memory.
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { draftChangeCount, type MapDraft, type MapState } from '../shared/map.js';
import { ConversationDraft } from './ConversationDraft.js';
import { DraftReadDetails, draftReadProposals } from './DraftDetails.prototype.js';
import { WorkspaceIcon } from './WorkspaceTools.js';

function exampleDraft(): MapDraft {
  const type = {
    id: 'prototype-vehicle',
    householdId: 'prototype',
    revision: 1,
    name: 'Fordon',
    description: 'Fordon som hushållet använder.',
    fields: [
      { id: 'registration', name: 'Registreringsnummer', description: '', kind: 'text' as const },
      {
        id: 'serial',
        name: 'Ramnummer',
        description: 'Numret på cykelns ram.',
        kind: 'text' as const,
        sectionId: '',
      },
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
        after: {
          typeId: type.id,
          name: 'Alex cykel',
          description: 'Blå cykel',
          customValues: { serial: 'CYKEL-2026-17' },
        },
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
        id: 'uses-bicycle',
        before: null,
        after: {
          typeId: relationshipType.id,
          sourceId: 'alex',
          targetId: 'bicycle',
          knowledge: 'known',
        },
        type: relationshipType,
        objectNames: { alex: 'Alex', bicycle: 'Alex cykel' },
      },
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

function DraftModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('[data-default]')?.focus();
    return () => {
      dialog?.close();
      if (opener?.isConnected && !opener.matches(':disabled')) opener.focus();
      else {
        const heading = document.querySelector<HTMLElement>('.dr-main-heading h3');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus();
        }
      }
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dr-modal dr-main-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Stäng dialogen" onClick={onClose}>
          <WorkspaceIcon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

/** Match proposal removal in the real backend, including generated relationship deletions. */
function withoutProposal(current: MapDraft, key: string): MapDraft {
  const draft = structuredClone(current);
  const object = draft.changes.find((change) => `object-${change.id}` === key);
  if (object) {
    if (!object.before)
      draft.relationships = draft.relationships?.filter(
        (change) => change.after?.sourceId !== object.id && change.after?.targetId !== object.id,
      );
    draft.changes = draft.changes.filter((change) => change.id !== object.id);
    const removed = draft.changes.filter((change) => !change.after).map((change) => change.id);
    draft.relationships = draft.relationships?.filter((change) => {
      if (!change.removedWithObjects) return true;
      change.removedWithObjects = removed.filter(
        (id) =>
          change.removedWithObjects?.includes(id) ||
          change.before?.sourceId === id ||
          change.before?.targetId === id,
      );
      return change.removedWithObjects.length > 0;
    });
  } else {
    draft.relationships = draft.relationships?.filter(
      (change) => `relationship-${change.id}` !== key,
    );
    draft.objectTypes = draft.objectTypes?.filter((change) => `Objekttyp-${change.id}` !== key);
    draft.relationshipTypes = draft.relationshipTypes?.filter(
      (change) => `Sambandstyp-${change.id}` !== key,
    );
  }
  return { ...draft, version: draft.version + 1 };
}

type SaveStatus = 'idle' | 'pending' | 'unknown' | 'checking' | 'rejected';
type SaveOutcome = 'success' | 'error' | 'unknown-success' | 'unknown-error' | 'unknown-pending';

export function DraftMainPrototype({
  source,
  host,
  headingHost,
  onCountChange,
}: {
  source: MapState;
  host: HTMLElement | null;
  headingHost: HTMLElement | null;
  onCountChange: (count: number) => void;
}) {
  const [draft, setDraft] = useState<MapDraft>(() => structuredClone(source.draft));
  const [example, setExample] = useState('environment');
  const [notice, setNotice] = useState('');
  const [readKey, setReadKey] = useState<string | null>(null);
  const [discardKey, setDiscardKey] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome>('success');
  const [attempt, setAttempt] = useState(0);
  const checkCount = useRef(0);
  const attemptOutcome = useRef<SaveOutcome>('success');
  const blocked = ['pending', 'unknown', 'checking'].includes(saveStatus);
  const count = draftChangeCount(draft);
  const proposals = draftReadProposals(draft);
  const read = proposals.find((proposal) => proposal.key === readKey);
  const warnings: Record<string, string> = {};
  const objectTypes = new Set(
    example === 'environment' ? source.types.map((type) => type.id) : ['prototype-vehicle'],
  );
  const relationshipTypes = new Set(
    example === 'environment' ? source.relationshipTypes.map((type) => type.id) : [],
  );
  for (const [changes, types] of [
    [draft.objectTypes, objectTypes],
    [draft.relationshipTypes, relationshipTypes],
  ] as const)
    for (const change of changes ?? []) {
      if (change.after) types.add(change.id);
      else types.delete(change.id);
    }
  for (const change of draft.changes) {
    if (change.after?.identity === 'unresolved')
      warnings[`object-${change.id}`] =
        'Identiteten är olöst. Rätta objektet i det ordinarie flödet.';
    if (change.after && !objectTypes.has(change.after.typeId))
      warnings[`object-${change.id}`] = 'Objekttypen saknas. Rätta objektet eller typen.';
  }
  for (const change of draft.relationships ?? []) {
    if (change.after?.knowledge === 'unresolved')
      warnings[`relationship-${change.id}`] =
        'Målet är oklart. Rätta sambandet i det ordinarie flödet.';
    if (change.after && !relationshipTypes.has(change.after.typeId))
      warnings[`relationship-${change.id}`] = 'Sambandstypen saknas. Rätta sambandet eller typen.';
  }
  const nextDiscard =
    discardKey === 'whole'
      ? { version: draft.version + 1, changes: [] }
      : discardKey
        ? withoutProposal(draft, discardKey)
        : null;
  const removed = proposals.filter(
    (proposal) =>
      !nextDiscard || !draftReadProposals(nextDiscard).some((next) => next.key === proposal.key),
  );
  const affectedKeys = discardKey?.startsWith('Objekttyp-')
    ? draft.changes
        .filter((change) => change.after?.typeId === discardKey.slice('Objekttyp-'.length))
        .map((change) => `object-${change.id}`)
    : discardKey?.startsWith('Sambandstyp-')
      ? (draft.relationships ?? [])
          .filter((change) => change.after?.typeId === discardKey.slice('Sambandstyp-'.length))
          .map((change) => `relationship-${change.id}`)
      : [];
  const affected = proposals.filter((proposal) => affectedKeys.includes(proposal.key));
  const hasWarnings = Object.keys(warnings).length > 0;
  useEffect(() => onCountChange(count), [count, onCountChange]);

  useEffect(() => {
    if (saveStatus !== 'pending' && saveStatus !== 'checking') return;
    const timer = window.setTimeout(() => {
      const outcome = attemptOutcome.current;
      if (saveStatus === 'pending' && outcome.startsWith('unknown')) setSaveStatus('unknown');
      else if (saveStatus === 'checking' && outcome === 'unknown-pending' && checkCount.current < 2)
        setSaveStatus('unknown');
      else if (outcome === 'error' || outcome === 'unknown-error' || hasWarnings)
        setSaveStatus('rejected');
      else {
        setDraft((current) => ({ version: current.version + 1, changes: [] }));
        setSaveOpen(false);
        setSaveStatus('idle');
      }
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [saveStatus, hasWarnings]);

  function remove(key: string) {
    if (blocked) return;
    const next = withoutProposal(draft, key);
    const affectsType = key.startsWith('Objekttyp-')
      ? draft.changes.some((change) => change.after?.typeId === key.slice('Objekttyp-'.length))
      : key.startsWith('Sambandstyp-') &&
        draft.relationships?.some(
          (change) => change.after?.typeId === key.slice('Sambandstyp-'.length),
        );
    if (draftChangeCount(draft) - draftChangeCount(next) > 1 || affectsType) {
      setDiscardKey(key);
      return;
    }
    setDraft(next);
    setSaveStatus('idle');
    setNotice('Förslaget har tagits bort ur ditt utkast.');
  }

  function startSave() {
    if (blocked) {
      setSaveOpen(true);
      return;
    }
    attemptOutcome.current = saveOutcome;
    checkCount.current = 0;
    setAttempt((current) => current + 1);
    setNotice('');
    setSaveStatus('pending');
    setSaveOpen(true);
  }

  function scenario(value: string) {
    setExample(value);
    setNotice('');
    setReadKey(null);
    setDiscardKey(null);
    setSaveOpen(false);
    setSaveStatus('idle');
    if (value === 'environment') setDraft(structuredClone(source.draft));
    else if (value === 'empty') setDraft({ version: 1, changes: [] });
    else {
      const sample = exampleDraft();
      if (value === 'problems') {
        if (sample.changes[1].after) sample.changes[1].after.identity = 'unresolved';
        if (sample.relationships?.[0].after) sample.relationships[0].after.knowledge = 'unresolved';
      }
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
      {headingHost &&
        createPortal(
          <div className="dr-main-heading-actions">
            <button
              type="button"
              className="dr-main-icon"
              aria-label="Spara hela utkastet"
              title="Spara hela utkastet"
              disabled={!count || blocked}
              onClick={startSave}
            >
              <WorkspaceIcon name="save" />
            </button>
            <button
              type="button"
              className="dr-main-icon dr-main-remove"
              aria-label="Kasta hela utkastet"
              title="Kasta hela utkastet"
              disabled={!count || blocked}
              onClick={() => setDiscardKey('whole')}
            >
              <WorkspaceIcon name="trash" />
            </button>
          </div>,
          headingHost,
        )}
      {host &&
        createPortal(
          <div className="dr-main">
            <ConversationDraft
              draft={draft}
              onRemove={remove}
              onOpen={setReadKey}
              warnings={warnings}
              blocked={blocked}
            />
            {Object.keys(warnings).length > 0 && (
              <p role="status">Rätta markerade förslag innan du sparar.</p>
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
              <option value="problems">Fel på objekt och samband</option>
              <option value="many">Många · 43 förslag</option>
              <option value="empty">Tomt utkast</option>
            </select>
          </label>
          <label>
            Sparutfall
            <select
              value={saveOutcome}
              disabled={blocked}
              onChange={(event) => setSaveOutcome(event.target.value as SaveOutcome)}
            >
              <option value="success">Lyckas</option>
              <option value="error">Sparfel · utkastet behålls</option>
              <option value="unknown-success">Oklart · kontroll visar sparat</option>
              <option value="unknown-error">Oklart · kontroll visar sparfel</option>
              <option value="unknown-pending">Oklart · behöver kontrolleras två gånger</option>
            </select>
          </label>
          <details>
            <summary>Visa prototypens tillstånd</summary>
            <pre>
              {JSON.stringify(
                {
                  variant: 'D',
                  utkast: draft,
                  antal: count,
                  varningar: warnings,
                  sparstatus: saveStatus,
                  sparförsök: attempt,
                  kontroller: checkCount.current,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </details>
      </div>
      {saveStatus !== 'idle' && !saveOpen && (
        <aside className="dr-global-status" aria-label="Aktuellt sparförsök">
          <span role="status">
            {saveStatus === 'unknown'
              ? 'Sparandet kunde inte bekräftas.'
              : saveStatus === 'rejected'
                ? 'Utkastet kunde inte sparas.'
                : 'Sparandet pågår.'}
          </span>
          <button type="button" onClick={() => setSaveOpen(true)}>
            Visa sparandet
          </button>
        </aside>
      )}
      {read && (
        <DraftModal title={read.name} onClose={() => setReadKey(null)}>
          <div className="dr-form-scroll">
            <DraftReadDetails proposal={read} />
            {warnings[read.key] && (
              <p className="dr-main-row-warning">
                <WorkspaceIcon name="warning" />
                <span>{warnings[read.key]}</span>
              </p>
            )}
          </div>
        </DraftModal>
      )}
      {discardKey && (
        <DraftModal
          title={
            discardKey === 'whole'
              ? 'Ta bort hela utkastet?'
              : 'Ta bort förslaget och dess beroenden?'
          }
          onClose={() => setDiscardKey(null)}
        >
          <div className="dr-form-scroll">
            <p>
              {discardKey === 'whole'
                ? 'Alla förslag i ditt utkast tas bort. Sparade uppgifter påverkas inte.'
                : 'Följande förslag tas bort ur ditt utkast. Sparade uppgifter påverkas inte.'}
            </p>
            <ul>
              {removed.map((proposal) => (
                <li key={proposal.key}>
                  {proposal.name} <span className="muted">· {proposal.kind}</span>
                </li>
              ))}
            </ul>
            {affected.length > 0 && (
              <>
                <h3>Förslag som blir kvar men påverkas</h3>
                <p>De här förslagen kan behöva rättas eftersom typen ändras eller saknas.</p>
                <ul>
                  {affected.map((proposal) => (
                    <li key={proposal.key}>{proposal.name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <footer>
            <button type="button" data-default onClick={() => setDiscardKey(null)}>
              Avbryt
            </button>
            <button
              type="button"
              className="dr-main-confirm-remove"
              onClick={() => {
                if (nextDiscard) setDraft(nextDiscard);
                setDiscardKey(null);
                setSaveStatus('idle');
                setNotice(
                  discardKey === 'whole'
                    ? 'Hela ditt utkast har tagits bort.'
                    : 'Förslagen har tagits bort ur ditt utkast.',
                );
              }}
            >
              Ta bort{discardKey === 'whole' ? ' hela utkastet' : ''}
            </button>
          </footer>
        </DraftModal>
      )}
      {saveOpen && (
        <DraftModal title="Spara utkastet" onClose={() => setSaveOpen(false)}>
          <div className="dr-form-scroll" aria-live="polite" aria-atomic="true">
            {saveStatus === 'pending' || saveStatus === 'checking' ? (
              <>
                <p className="dr-main-saving">
                  <WorkspaceIcon name="activity" />
                  {saveStatus === 'checking' ? 'Kontrollerar sparandet…' : 'Sparar utkastet…'}
                </p>
                <p>Utkastet ligger kvar tills sparandet är bekräftat.</p>
              </>
            ) : saveStatus === 'unknown' ? (
              <>
                <p>Sparandet kunde inte bekräftas.</p>
                <p>
                  Kontrollera samma sparförsök igen innan du försöker spara på nytt. Ditt utkast
                  ligger kvar under tiden.
                </p>
              </>
            ) : (
              <>
                <p>Utkastet kunde inte sparas.</p>
                <p>
                  {Object.keys(warnings).length
                    ? 'Rätta de markerade förslagen där du normalt ändrar objekt, samband och typer.'
                    : 'Det gick inte att spara. Ditt utkast ligger kvar. Försök igen när anslutningen fungerar.'}
                </p>
              </>
            )}
          </div>
          {saveStatus === 'unknown' && (
            <footer>
              <button
                type="button"
                data-default
                onClick={(event) => {
                  event.currentTarget
                    .closest('dialog')
                    ?.querySelector<HTMLElement>('header button')
                    ?.focus();
                  checkCount.current += 1;
                  setSaveStatus('checking');
                }}
              >
                Kontrollera sparandet igen
              </button>
            </footer>
          )}
        </DraftModal>
      )}
    </>
  );
}
