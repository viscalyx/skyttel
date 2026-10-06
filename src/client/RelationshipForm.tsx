import { useId, useLayoutEffect, useRef, useState } from 'react';
import { sameConflictValue } from '../shared/conflict-properties.js';
import type { MapObject, MapState, RelationshipValue } from '../shared/map.js';
import { proposedRelationships } from '../shared/map.js';
import type { RelationshipFormResult } from '../shared/relationship-form.js';
import { useFormLeave } from './FormLeave.js';
import { FormLossGuard } from './FormLossGuard.js';
import { validateFormControls } from './form-validation.js';
import { LifecycleEditor, RelationshipEndDate } from './Lifecycle.js';
import { MapRequestError } from './map-request.js';
import { ObjectTypeLossDialog } from './ObjectDialog.js';
import { CustomFieldsEditor } from './ObjectTypes.js';
import { knowledgeLabels } from './RelationshipEditor.js';

export type RelationshipFormValue = {
  id: string;
  version: number;
  contentVersion: number;
  baseRevision: number | null;
  value: RelationshipValue;
};
export type RelationshipStageResult = RelationshipFormResult;
export type RelationshipFormSubmission = Omit<RelationshipFormValue, 'value'> & {
  value: RelationshipValue | null;
  typeRevision?: number;
};

/** One complete relationship at a time; staging leaves the relationship reader open. */
export function RelationshipForm({
  initial,
  state,
  objects,
  onStage,
  onComplete,
  onCancel,
  onCheck,
  onExisting,
  onDirty,
  onBusy,
}: {
  initial: RelationshipFormValue;
  state: MapState;
  objects: Map<string, MapObject>;
  onStage: (
    editor: RelationshipFormSubmission,
    stagingId: string,
  ) => Promise<RelationshipStageResult>;
  onCheck: (stagingId: string, contentVersion: number) => Promise<RelationshipStageResult>;
  onExisting: (id: string) => void;
  onComplete: (result: RelationshipStageResult) => void;
  onCancel: () => void;
  onDirty?: (dirty: boolean) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const prefix = useId();
  const [value, setValue] = useState(initial.value);
  const [typeRevisions] = useState(
    () => new Map(state.relationshipTypes.map((type) => [type.id, type.revision])),
  );
  const [nextType, setNextType] = useState<string>();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [stale, setStale] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string>();
  const attempt = useRef<{ stagingId: string; editor: RelationshipFormSubmission } | null>(null);
  const busy = pending || unknown;
  const lock = useRef(false);
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<{ id: string; label: string; message: string }[]>([]);
  const { requestLeave } = useFormLeave();
  const dirty = !sameConflictValue(value, initial.value) || Boolean(query);
  useLayoutEffect(() => {
    onDirty?.(dirty || busy);
    return () => onDirty?.(false);
  }, [dirty, busy, onDirty]);
  useLayoutEffect(() => {
    onBusy?.(busy);
    return () => onBusy?.(false);
  }, [busy, onBusy]);
  useLayoutEffect(() => {
    if (errors.length) summary.current?.focus();
  }, [errors]);
  function validate() {
    const problems = validateFormControls(form.current);
    setErrors(problems);
    return !problems.length;
  }
  const type = state.relationshipTypes.find((type) => type.id === value.typeId);
  const historicalType = state.draft.relationships?.find(
    (change) => change.id === initial.id && change.type.id === value.typeId,
  )?.type;
  const choices = [...objects.values()].filter(
    (object) => !state.draft.changes.some((change) => change.id === object.id && !change.after),
  );
  const objectLabel = (object: MapObject) =>
    `${object.name} · ${state.types.find((type) => type.id === object.typeId)?.name ?? 'Typ saknas'} · ${object.description || 'Ingen beskrivning'}`;
  const labelCounts = new Map<string, number>();
  for (const object of choices) {
    const label = objectLabel(object);
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }
  const description = (object: MapObject) => {
    const label = objectLabel(object);
    return (labelCounts.get(label) ?? 0) > 1 ? `${label} [${object.id}]` : label;
  };
  const source = objects.get(value.sourceId)?.name ?? 'Välj frånobjekt';
  const target = value.targetId
    ? (objects.get(value.targetId)?.name ?? 'Välj tillobjekt')
    : knowledgeLabels[value.knowledge];
  const label = type?.forwardLabel || type?.name || 'välj sambandstyp';
  async function submit(remove = false) {
    if (lock.current || stale || (!remove && !validate())) return;
    lock.current = true;
    setPending(true);
    setError('');
    setDuplicateId(undefined);
    const stagingId = crypto.randomUUID();
    attempt.current = {
      stagingId,
      editor: {
        ...initial,
        value: remove ? null : value,
        typeRevision: typeRevisions.get(remove ? initial.value.typeId : value.typeId),
      },
    };
    try {
      confirm(await onStage(attempt.current.editor, stagingId));
    } catch (failure) {
      if (!(failure instanceof MapRequestError) || failure.status >= 500) {
        setUnknown(true);
        setError(
          'Det är oklart om ändringen lades i utkastet. Kontrollera utfallet innan du försöker igen. Alla uppgifter finns kvar.',
        );
      } else {
        lock.current = false;
        attempt.current = null;
        setError('Ändringen kunde inte bekräftas. Dina uppgifter finns kvar.');
      }
    } finally {
      setPending(false);
    }
  }
  function confirm(result: RelationshipFormResult) {
    const outcome = result.outcome;
    if (
      !outcome ||
      outcome.stagingId !== attempt.current?.stagingId ||
      result.state.userId !== state.userId ||
      result.state.contentVersion !== initial.contentVersion
    )
      throw new Error('invalid_form_outcome');
    lock.current = false;
    setUnknown(false);
    if (outcome.status === 'duplicate') {
      const existing = proposedRelationships(
        result.state.relationships,
        result.state.draft.relationships,
      ).get(outcome.relationshipId);
      const submitted = attempt.current?.editor.value;
      if (
        existing &&
        submitted &&
        existing.typeId === submitted.typeId &&
        existing.sourceId === submitted.sourceId &&
        existing.targetId === submitted.targetId
      ) {
        setDuplicateId(outcome.relationshipId);
        setError('Sambandet finns redan');
      } else {
        setDuplicateId(undefined);
        setError(
          'Försöket hittade ett befintligt samband, men det har ändrats eller tagits bort sedan dess. Dina uppgifter finns kvar. Granska aktuellt underlag innan du fortsätter.',
        );
      }
    } else {
      const current = result.state.draft.relationships?.find(
        (change) => change.id === outcome.relationshipId,
      );
      if (
        (current && sameConflictValue(current.after, outcome.value)) ||
        (outcome.value === null &&
          !current &&
          !result.state.relationships.some((edge) => edge.id === outcome.relationshipId))
      )
        onComplete(result);
      else
        setError(
          'Ändringen lades i utkastet, men det aktuella underlaget har ändrats sedan dess. Dina uppgifter finns kvar. Granska det aktuella sambandet innan du fortsätter.',
        );
    }
    attempt.current = null;
  }
  async function check() {
    const current = attempt.current;
    if (pending || !unknown || !current) return;
    setPending(true);
    try {
      const result = await onCheck(current.stagingId, current.editor.contentVersion);
      if (
        result.state.userId !== state.userId ||
        result.state.contentVersion !== current.editor.contentVersion
      )
        throw new Error('invalid_form_outcome');
      if (result.outcome) confirm(result);
      else if (
        result.state.draft.version === current.editor.version &&
        result.state.contentVersion === current.editor.contentVersion
      ) {
        lock.current = false;
        attempt.current = null;
        setUnknown(false);
        setError(
          'Kontrollen visar att ändringen inte lades i utkastet. Alla uppgifter finns kvar. Du kan försöka igen.',
        );
      } else if (result.state.draft.version > current.editor.version) {
        // The serialized version guard rejects any delayed original request. Keep
        // the old editing basis: a newer private edit could otherwise be overwritten.
        lock.current = false;
        attempt.current = null;
        setUnknown(false);
        setStale(true);
        setError(
          'Kontrollen saknar en bevarad bekräftelse och utkastet har ändrats. Det gamla försöket kan inte ändra det aktuella utkastet. Dina uppgifter finns kvar. Stäng formuläret och öppna det igen för att granska aktuellt underlag innan du försöker igen.',
        );
      } else
        setError(
          'Utkastet har ändrats och utfallet kan inte bekräftas. Dina uppgifter finns kvar. Kontrollera samma ändring igen innan du lämnar eller försöker igen.',
        );
    } catch {
      setError(
        'Utkastet kunde inte kontrolleras. Dina uppgifter finns kvar. Kontrollera igen innan du försöker lägga ändringen i utkastet.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label={initial.baseRevision === null ? 'Nytt samband' : 'Redigera samband'}>
      <h3>
        {state.draft.relationships?.some((change) => change.id === initial.id) ||
        initial.baseRevision !== null
          ? 'Redigera samband'
          : 'Nytt samband'}
      </h3>
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {errors.length > 0 && (
          <div ref={summary} role="alert" aria-label="Formuläret innehåller fel" tabIndex={-1}>
            <h4>Rätta uppgifterna innan du lägger dem i utkastet</h4>
            <ul>
              {errors.map((problem) => (
                <li key={problem.id}>
                  <a
                    href={`#${problem.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(problem.id)?.focus();
                    }}
                  >
                    {problem.label}: {problem.message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        {pending && <p role="status">Lägger sambandet i ditt utkast…</p>}
        {unknown && (
          <button type="button" disabled={pending} onClick={() => void check()}>
            Kontrollera om ändringen lades i utkastet
          </button>
        )}
        {duplicateId && (
          <button type="button" onClick={() => requestLeave(() => onExisting(duplicateId))}>
            Redigera befintligt samband
          </button>
        )}
        <fieldset disabled={busy} className="relationship-form-fields">
          <legend className="sr-only">Sambandets detaljer</legend>
          <div className="">
            {' '}
            <label htmlFor={`${prefix}-type`}>Sambandstyp</label>
            <select
              id={`${prefix}-type`}
              required
              value={value.typeId}
              onChange={(event) => {
                if (Object.keys(value.customValues ?? {}).length) setNextType(event.target.value);
                else setValue({ ...value, typeId: event.target.value, customValues: {} });
              }}
            >
              <option value="">Välj sambandstyp</option>
              {state.relationshipTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="">
            {' '}
            <label htmlFor={`${prefix}-knowledge`}>Uppgiftens säkerhet</label>
            <select
              id={`${prefix}-knowledge`}
              value={value.knowledge}
              onChange={(event) => {
                const knowledge = event.target.value as RelationshipValue['knowledge'];
                setValue({
                  ...value,
                  knowledge,
                  targetId: ['known', 'uncertain'].includes(knowledge)
                    ? (value.targetId ?? '')
                    : null,
                });
              }}
            >
              {Object.entries(knowledgeLabels).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="">
            {' '}
            <label htmlFor={`${prefix}-source`}>Från objekt</label>
            <select
              id={`${prefix}-source`}
              required
              value={value.sourceId}
              onChange={(event) => setValue({ ...value, sourceId: event.target.value })}
            >
              <option value="">Välj objekt</option>
              {choices.map((object) => (
                <option key={object.id} value={object.id}>
                  {description(object)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!value.targetId}
            onClick={() =>
              setValue({ ...value, sourceId: value.targetId ?? '', targetId: value.sourceId })
            }
          >
            Byt riktning
          </button>
          {['known', 'uncertain'].includes(value.knowledge) && (
            <>
              <div className="relationship-form-wide">
                {' '}
                <label htmlFor={`${prefix}-search`}>Sök det andra objektet</label>
                <input
                  id={`${prefix}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="relationship-form-wide">
                {' '}
                <label htmlFor={`${prefix}-target`}>Till objekt</label>
                <select
                  id={`${prefix}-target`}
                  required
                  value={value.targetId ?? ''}
                  onChange={(event) => setValue({ ...value, targetId: event.target.value })}
                >
                  <option value="">Välj objekt</option>
                  {choices
                    .filter(
                      (object) =>
                        object.id === value.targetId ||
                        description(object)
                          .toLocaleLowerCase('sv')
                          .includes(query.toLocaleLowerCase('sv')),
                    )
                    .map((object) => (
                      <option key={object.id} value={object.id}>
                        {description(object)}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}
          <div className="relationship-form-wide">
            {' '}
            <CustomFieldsEditor
              type={type}
              values={value.customValues}
              onChange={(customValues) => setValue({ ...value, customValues })}
            />
            <LifecycleEditor
              kind="relationship"
              value={value.lifecycle}
              onChange={(lifecycle) => setValue({ ...value, lifecycle })}
            />
            <RelationshipEndDate
              value={value.endDate}
              onChange={(endDate) => setValue({ ...value, endDate })}
            />
          </div>{' '}
          <section
            aria-label="Sambandet före inskickning"
            className="relationship-sentence relationship-form-wide"
          >
            {source} {label[0].toLocaleLowerCase('sv') + label.slice(1)} {target}
            {value.knowledge === 'uncertain' ? ' (Osäkert uppgivet)' : ''}
          </section>
          <div className="relationship-form-actions relationship-form-wide">
            <button type="submit" className="primary" disabled={stale}>
              Lägg i utkastet
            </button>
            <button type="button" onClick={() => requestLeave(onCancel)}>
              Avbryt redigeringen
            </button>{' '}
            {(initial.baseRevision !== null ||
              state.draft.relationships?.some((change) => change.id === initial.id)) && (
              <button
                type="button"
                disabled={stale}
                onClick={() => requestLeave(() => void submit(true))}
              >
                Föreslå borttagning
              </button>
            )}
          </div>
        </fieldset>
      </form>
      {nextType !== undefined && (
        <ObjectTypeLossDialog
          fields={Object.entries(value.customValues ?? {}).map(([id, answer]) => ({
            name: (type ?? historicalType)?.fields?.find((field) => field.id === id)?.name ?? id,
            value: answer,
          }))}
          onCancel={() => setNextType(undefined)}
          onConfirm={() => {
            setValue({ ...value, typeId: nextType, customValues: {} });
            setNextType(undefined);
          }}
        />
      )}
      <FormLossGuard
        dirty={dirty}
        busy={busy}
        householdId={state.types[0]?.householdId ?? ''}
        onDiscard={() => {
          setValue(initial.value);
          setQuery('');
          setError('');
          setErrors([]);
          setDuplicateId(undefined);
        }}
        onBlocked={() =>
          setError(
            unknown
              ? 'Kontrollera om ändringen lades i utkastet innan du lämnar formuläret. Alla uppgifter finns kvar.'
              : 'Vänta tills ändringen har bekräftats innan du lämnar formuläret.',
          )
        }
      />
    </section>
  );
}
