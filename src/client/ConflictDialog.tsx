import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  type ConflictChoices,
  type ConflictProperty,
  type ConflictSide,
  combineConflictProperties,
  conflictBasis,
  conflictChange,
  conflictCombinationError,
  conflictProperties,
  conflictPropertyValue,
  conflictValueText,
  sameConflictValue,
} from '../shared/conflict-properties.js';
import { specialConflict } from '../shared/conflict-special.js';
import { type DraftConflict, draftConflicts } from '../shared/draft-conflicts.js';
import type { MapState } from '../shared/map.js';
import {
  type AppliedConflictResolution,
  type ConflictResolution,
  useConflictResolution,
} from './use-conflict-resolution.js';

export type { ConflictResolution } from './use-conflict-resolution.js';

import { trapDialogTab } from './modal-focus.js';
import { relationshipLabel } from './RelationshipEditor.js';
import { SpecialConflictDetails } from './SpecialConflictDetails.js';
import './conflict-dialog.css';

const sideNames = { saved: 'Sparat i kartan nu', proposed: 'Ditt förslag' };
const kindNames = {
  object: 'Objekt',
  relationship: 'Samband',
  objectType: 'Objekttyp',
  relationshipType: 'Sambandstyp',
};
const keyFor = (conflict: DraftConflict) => `${conflict.kind}:${conflict.id}`;
export function ConflictDialog({
  state,
  open,
  initialKey,
  disabled,
  onClose,
  onResolve,
  onRefresh,
  onStatus,
  onUnknownChange,
}: {
  state: MapState;
  open: boolean;
  initialKey?: string;
  disabled: boolean;
  onClose: () => void;
  onResolve: (resolution: ConflictResolution) => Promise<void>;
  onRefresh: () => Promise<MapState>;
  onStatus?: (message: string) => void;
  onUnknownChange?: (unknown: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const caseHeading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const prefix = useId();
  const live = draftConflicts(state);
  const [entries, setEntries] = useState(live.map((conflict) => ({ conflict, state })));
  const [selectedKey, setSelectedKey] = useState(initialKey ?? '');
  const [choices, setChoices] = useState<Record<string, ConflictChoices>>({});
  const [resolved, setResolved] = useState<Record<string, AppliedConflictResolution>>({});
  const [comparisonPending, setComparisonPending] = useState(false);
  const [staleKeys, setStaleKeys] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState('');
  const report = useCallback(
    (message: string) => {
      setStatus(message);
      onStatus?.(message);
    },
    [onStatus],
  );
  const resolution = useConflictResolution({
    onResolve,
    onRefresh,
    onStatus: report,
    onApplied: (result) => setResolved((previous) => ({ ...previous, [result.key]: result })),
    onStale: (key) => setStaleKeys((previous) => new Set([...previous, key])),
  });
  const { unknown } = resolution;
  useEffect(() => onUnknownChange?.(unknown), [unknown, onUnknownChange]);
  const pending = resolution.pending || comparisonPending;
  useEffect(() => {
    const next = [...entries];
    let changed = false;
    for (const conflict of draftConflicts(state)) {
      const index = next.findIndex((entry) => keyFor(entry.conflict) === keyFor(conflict));
      if (index < 0) {
        next.push({ conflict, state });
        changed = true;
      } else if (
        !sameConflictValue(
          conflictBasis(next[index].state, next[index].conflict),
          conflictBasis(state, conflict),
        )
      ) {
        // Keep the reviewed basis until the user explicitly asks for a current comparison.
        const entryKey = keyFor(conflict);
        if (!staleKeys.has(entryKey)) {
          setStaleKeys((previous) => new Set([...previous, entryKey]));
          setResolved((previous) =>
            Object.fromEntries(Object.entries(previous).filter(([key]) => key !== entryKey)),
          );
          report(
            'Underlaget har ändrats. Visa aktuell jämförelse innan du bekräftar. Opåverkade val finns kvar.',
          );
        }
      } else if (next[index].state !== state) {
        next[index] = { conflict, state };
        changed = true;
      }
    }
    if (changed) setEntries(next);
  }, [state, entries, staleKeys, report]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Read current data once per explicit opening; background renders must not start another opening request.
  useEffect(() => {
    if (!open) return;
    let current = true;
    setComparisonPending(true);
    void onRefresh()
      .catch(() => {
        if (current) {
          setStaleKeys(new Set(entries.map((entry) => keyFor(entry.conflict))));
          report(
            'Aktuellt underlag kunde inte hämtas. Kontrollera jämförelsen innan du bekräftar.',
          );
        }
      })
      .finally(() => {
        if (current) setComparisonPending(false);
      });
    return () => {
      current = false;
    };
  }, [open]);
  useLayoutEffect(() => {
    const modal = dialog.current;
    if (open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      modal?.showModal();
      heading.current?.focus({ preventScroll: true });
      if (initialKey) setSelectedKey(initialKey);
    } else if (modal?.open) {
      modal.close();
      const target =
        opener.current?.isConnected && !opener.current.closest('[hidden], [inert]')
          ? opener.current
          : document.querySelector<HTMLElement>('.workspace-tools button');
      target?.focus({ preventScroll: true });
    }
  }, [open, initialKey]);
  useLayoutEffect(() => {
    const modal = dialog.current;
    return () => modal?.close();
  }, []);
  const entry = entries.find((entry) => keyFor(entry.conflict) === selectedKey) ?? entries[0];
  const noLongerConflicted = Boolean(
    entry && !live.some((conflict) => keyFor(conflict) === keyFor(entry.conflict)),
  );
  useEffect(() => {
    if (
      open &&
      entry &&
      noLongerConflicted &&
      !pending &&
      !unknown &&
      !resolved[keyFor(entry.conflict)]
    )
      report('Konflikten finns inte längre i aktuellt underlag. Granska ditt aktuella utkast.');
  }, [open, entry, noLongerConflicted, pending, unknown, resolved, report]);
  if (!entry) return null;
  const { conflict, state: comparison } = entry;
  const key = keyFor(conflict);
  const stale = staleKeys.has(key);
  const comparisonNoLongerNeeded = noLongerConflicted && !pending && !unknown && !resolved[key];
  const change = conflictChange(comparison, conflict);
  const special = specialConflict(comparison, conflict);
  const fields = conflictProperties(comparison, conflict);
  const selected = choices[key] ?? {};
  const remaining = fields.filter(
    (field) => !sameConflictValue(field.saved, field.proposed) && !selected[field.key],
  ).length;
  const value = combineConflictProperties(fields, selected);
  const invalid = conflictCombinationError(comparison, conflict, value);
  const blocked =
    !fields.length ||
    Boolean(
      conflict.duplicates ||
        conflict.missingEndpoints ||
        conflict.type === null ||
        conflict.connections,
    );
  const actor = comparison.conflictActors?.[key];
  const proposedAt = change && 'proposedAt' in change ? change.proposedAt : undefined;
  const savedAfterProposal = (savedAt: string) =>
    Boolean(proposedAt && Date.parse(savedAt) > Date.parse(proposedAt));
  const person = actor?.name ?? 'En annan användare';
  const name = (c: DraftConflict, source: MapState) => {
    const proposal = conflictChange(source, c);
    if (c.kind === 'relationship') {
      const objects = new Map(source.objects.map((object) => [object.id, object]));
      const edge = proposal?.after ?? proposal?.before;
      return edge && 'sourceId' in edge ? relationshipLabel(edge, source, objects) : c.id;
    }
    const item = proposal?.after ?? proposal?.before ?? c.current;
    return item && 'name' in item ? item.name : c.id;
  };
  function choose(field: string, side: ConflictSide) {
    setChoices((previous) => ({ ...previous, [key]: { ...previous[key], [field]: side } }));
  }
  function propertyValue(field: ConflictProperty, value: unknown) {
    const text = conflictValueText(comparison, field, value);
    return (
      <>
        {text}
        {field.key === 'profileImageId' && typeof value === 'string' && conflict.current && (
          <img
            className="cp-profile-image"
            width="96"
            height="96"
            src={`/api/households/${encodeURIComponent(conflict.current.householdId)}/profile-images/${encodeURIComponent(value)}`}
            alt={text}
          />
        )}
      </>
    );
  }
  function apply() {
    if (
      pending ||
      noLongerConflicted ||
      !value ||
      remaining ||
      invalid ||
      blocked ||
      stale ||
      unknown ||
      disabled
    )
      return;
    caseHeading.current?.focus({ preventScroll: true });
    void resolution.apply({
      key,
      resolution: { conflict, choices: selected, basis: conflictBasis(comparison, conflict) },
      value,
      comparison,
      discard: fields.every(
        (field) =>
          sameConflictValue(field.saved, field.proposed) || selected[field.key] === 'saved',
      ),
    });
  }
  async function refreshComparison() {
    if (pending || unknown) return;
    caseHeading.current?.focus({ preventScroll: true });
    setComparisonPending(true);
    try {
      const latest = await onRefresh();
      const latestConflicts = draftConflicts(latest);
      setChoices((previous) =>
        Object.fromEntries(
          entries.map((entry) => {
            const entryKey = keyFor(entry.conflict);
            const current = latestConflicts.find((conflict) => keyFor(conflict) === entryKey);
            if (!current) return [entryKey, previous[entryKey] ?? {}];
            const reviewed = conflictProperties(entry.state, entry.conflict);
            const fresh = conflictProperties(latest, current);
            const retained = Object.entries(previous[entryKey] ?? {}).filter(([key]) => {
              const before = reviewed.find((field) => field.key === key);
              const after = fresh.find((field) => field.key === key);
              return (
                before &&
                after &&
                sameConflictValue(before.saved, after.saved) &&
                sameConflictValue(before.proposed, after.proposed)
              );
            });
            return [entryKey, Object.fromEntries(retained)];
          }),
        ),
      );
      setEntries((previous) =>
        previous.map((entry) => {
          const current = latestConflicts.find(
            (conflict) => keyFor(conflict) === keyFor(entry.conflict),
          );
          return current ? { state: latest, conflict: current } : entry;
        }),
      );
      setStaleKeys(new Set());
      report('Aktuell jämförelse visas. Opåverkade val finns kvar.');
    } catch {
      report('Aktuellt underlag kunde inte hämtas. Dina val finns kvar. Försök igen.');
    } finally {
      setComparisonPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="cp-dialog cp-product"
      aria-labelledby={`${prefix}-title`}
      aria-describedby={`${prefix}-subtitle`}
      onKeyDown={trapDialogTab}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <header className="cp-top">
        <div>
          <small>Ditt utkast · {live.length} olösta</small>
          <div className="cp-title-line">
            <h1 id={`${prefix}-title`} ref={heading} tabIndex={-1}>
              Granska konflikter
            </h1>
            <p id={`${prefix}-subtitle`}>Valen ändrar ditt utkast. Kartan sparas separat.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          aria-label="Stäng konfliktdialogen"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="cp-body">
        <nav className="cp-case-list" aria-label="Alla konflikter">
          {entries.map((entry) => (
            <button
              key={keyFor(entry.conflict)}
              type="button"
              disabled={pending || unknown}
              aria-current={keyFor(entry.conflict) === key ? 'true' : undefined}
              onClick={() => {
                setSelectedKey(keyFor(entry.conflict));
                setStatus('');
                requestAnimationFrame(() => caseHeading.current?.focus());
              }}
            >
              <span className="cp-case-text">
                <small>{kindNames[entry.conflict.kind]}</small>
                <span>{name(entry.conflict, entry.state)}</span>
              </span>
              {resolved[keyFor(entry.conflict)] && (
                <>
                  <span className="cp-resolved-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span className="cp-visually-hidden">Vald lösning</span>
                </>
              )}
            </button>
          ))}
        </nav>
        <article className="cp-detail">
          <small>
            {kindNames[conflict.kind]} · {entries.indexOf(entry) + 1} av {entries.length}
          </small>
          <h2 ref={caseHeading} tabIndex={-1}>
            {name(conflict, comparison)}
          </h2>
          {!comparisonNoLongerNeeded && special ? (
            <p>{special.reason}</p>
          ) : (
            !comparisonNoLongerNeeded && (
              <p>
                Ditt förslag skiljer sig från det som är sparat i kartan nu.{' '}
                {actor && savedAfterProposal(actor.savedAt)
                  ? `${person} sparade ändringar efter att du gjorde ditt förslag, men innan du hann spara det.`
                  : actor
                    ? `${person} sparade det aktuella underlaget.`
                    : 'Det sparade underlaget skiljer sig från ditt förslag.'}
              </p>
            )
          )}
          {resolved[key] ? (
            <section className="cp-preview">
              <h3>
                {resolved[key].removed && special?.kind === 'removed'
                  ? '✓ Ditt ändringsförslag har kastats'
                  : resolved[key].removed
                    ? '✓ Förslaget har tagits bort ur ditt utkast'
                    : '✓ Valen finns i ditt utkast'}
              </h3>
              {resolved[key].removed && special?.kind === 'removed' && (
                <p>
                  {conflict.kind === 'object' ? 'Objektet' : 'Sambandet'} förblir borttaget. Övriga
                  förslag i utkastet finns kvar.
                </p>
              )}
              <dl className="cp-fields">
                {fields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>
                      {propertyValue(field, conflictPropertyValue(resolved[key].value, field.key))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : comparisonNoLongerNeeded ? (
            <section className="cp-preview">
              <h3>Aktuellt underlag</h3>
              <p>
                Granska ditt aktuella utkast innan du sparar. Den tidigare jämförelsen behöver inte
                bekräftas igen.
              </p>
            </section>
          ) : special ? (
            <SpecialConflictDetails
              state={comparison}
              conflict={conflict}
              special={special}
              disabled={pending || stale || unknown || disabled}
              onApply={() => {
                caseHeading.current?.focus({ preventScroll: true });
                void resolution.apply({
                  key,
                  comparison,
                  value: {},
                  discard: true,
                  resolution: {
                    conflict,
                    command: 'discard-proposal',
                    basis: conflictBasis(comparison, conflict),
                  },
                });
              }}
            />
          ) : (
            <>
              {blocked ? (
                <div className="cp-warning">
                  <p>
                    Den här konflikten behöver rättas innan egenskapsval kan läggas i utkastet. Ditt
                    förslag ligger kvar.
                  </p>
                  <button type="button" disabled={pending} onClick={onClose}>
                    Stäng konfliktfönstret
                  </button>
                </div>
              ) : (
                <p>
                  Klicka på det värde du vill använda för varje egenskap. Du kan blanda vänster och
                  höger sida.
                </p>
              )}
              <div className="cp-comparison">
                {(['saved', 'proposed'] as const).map((side) => (
                  <section key={side} aria-label={sideNames[side]}>
                    <h3>{sideNames[side]}</h3>
                    <div className="cp-pick-fields">
                      {fields.map((field) => {
                        const same = sameConflictValue(field.saved, field.proposed);
                        const overlap =
                          !sameConflictValue(field.saved, field.before) &&
                          !sameConflictValue(field.proposed, field.before) &&
                          !same;
                        const picked = selected[field.key] === side;
                        const propertyActor = comparison.conflictPropertyActors?.[key]?.[field.key];
                        return (
                          <button
                            key={field.key}
                            className={`cp-field-choice${overlap ? ' cp-overlap' : !sameConflictValue(field[side], field.before) ? ' cp-change' : ''}`}
                            type="button"
                            aria-label={`${field.label}: ${sideNames[side]} – ${conflictValueText(comparison, field, field[side])}`}
                            aria-pressed={same ? undefined : picked}
                            disabled={same || blocked || pending || stale || unknown || disabled}
                            onClick={() => choose(field.key, side)}
                          >
                            <span className="cp-field-name">
                              {field.label}
                              {picked && <span className="cp-picked">✓ Vald</span>}
                            </span>
                            {side === 'saved' &&
                              !sameConflictValue(field.saved, field.before) &&
                              propertyActor && (
                                <span className="cp-tag">
                                  {propertyActor.name} sparade ett nytt värde
                                  {overlap && savedAfterProposal(propertyActor.savedAt)
                                    ? ' efter att du började ändra den här uppgiften.'
                                    : '.'}
                                </span>
                              )}
                            {side === 'proposed' &&
                              !sameConflictValue(field.proposed, field.before) && (
                                <span className="cp-tag">Ditt föreslagna värde</span>
                              )}
                            <span className="cp-field-value">
                              {propertyValue(field, field[side])}
                            </span>
                            {same && <span className="cp-tag">Samma värde</span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              {!blocked && (
                <>
                  <p>
                    {remaining
                      ? `${remaining} egenskaper återstår att välja.`
                      : 'Alla egenskaper har ett valt värde.'}
                  </p>
                  {invalid && (
                    <div className="cp-warning" role="alert">
                      <strong>Valen fungerar inte tillsammans</strong>
                      <p>{invalid}</p>
                    </div>
                  )}
                  <section className="cp-preview" aria-label="Resultat av valen">
                    <h3>Efter dina val</h3>
                    <dl className="cp-fields">
                      {fields.map((field) => (
                        <div key={field.key}>
                          <dt>{field.label}</dt>
                          <dd>
                            {sameConflictValue(field.saved, field.proposed)
                              ? propertyValue(field, field.saved)
                              : selected[field.key]
                                ? propertyValue(field, field[selected[field.key]])
                                : 'Välj ett värde ovan'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p>Övriga förslag i utkastet finns kvar.</p>
                  </section>
                  <footer className="cp-actions">
                    <button
                      className="cp-primary"
                      type="button"
                      disabled={Boolean(
                        remaining || invalid || pending || stale || unknown || disabled,
                      )}
                      onClick={() => void apply()}
                    >
                      Lägg valen i utkastet
                    </button>
                  </footer>
                </>
              )}
            </>
          )}
          {stale && !noLongerConflicted && !resolved[key] && (
            <div className="cp-warning">
              <strong>Underlaget har ändrats.</strong>
              <button
                type="button"
                disabled={pending || unknown}
                onClick={() => void refreshComparison()}
              >
                Visa aktuell jämförelse
              </button>
            </div>
          )}
          {unknown && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                caseHeading.current?.focus();
                void resolution.check();
              }}
            >
              Kontrollera om valet lades i utkastet
            </button>
          )}
          <p className="cp-status" role="status" aria-live={open ? 'polite' : 'off'}>
            {comparisonPending ? 'Kontrollerar aktuellt underlag…' : status}
          </p>
        </article>
      </div>
    </dialog>
  );
}
