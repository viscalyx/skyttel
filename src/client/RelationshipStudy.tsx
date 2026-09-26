// Kastbart samband med fria typer och B:s avsnitt. Sparandet ägs av prototypens värd.
import { useEffect, useId, useRef, useState } from 'react';
import type { StudyObject, StudyRelationship } from './map-study-types.js';
import type { TypeStudyDefinition, TypeStudyModel } from './type-study-model.js';
import './relationship-study.css';

export type RelationshipStudyRecord = {
  id: string;
  typeId: string;
  from: string;
  to: string;
  knowledge: 'known' | 'uncertain';
  values: Record<string, string>;
};

function same(left: RelationshipStudyRecord, right: RelationshipStudyRecord) {
  return (
    left.typeId === right.typeId &&
    left.from === right.from &&
    left.to === right.to &&
    left.knowledge === right.knowledge &&
    [...new Set([...Object.keys(left.values), ...Object.keys(right.values)])].every(
      (id) => (left.values[id] ?? '') === (right.values[id] ?? ''),
    )
  );
}

function merged(
  base: RelationshipStudyRecord,
  own: RelationshipStudyRecord,
  latest: RelationshipStudyRecord,
): RelationshipStudyRecord {
  return {
    id: own.id,
    typeId: own.typeId === base.typeId ? latest.typeId : own.typeId,
    from: own.from === base.from ? latest.from : own.from,
    to: own.to === base.to ? latest.to : own.to,
    knowledge: own.knowledge === base.knowledge ? latest.knowledge : own.knowledge,
    values: Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(base.values),
          ...Object.keys(own.values),
          ...Object.keys(latest.values),
        ]),
      ].map((id) => [
        id,
        (own.values[id] ?? '') === (base.values[id] ?? '')
          ? (latest.values[id] ?? '')
          : (own.values[id] ?? ''),
      ]),
    ),
  };
}

function validDate(value: string) {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function valueText(value: string | undefined, field?: TypeStudyDefinition['fields'][number]) {
  if (value === undefined || value === '') return 'Ej uppgivet';
  return field?.kind === 'boolean' ? (value === 'true' ? 'Ja' : 'Nej') : value;
}

export function useRelationshipStudy(incoming: StudyRelationship[], types: TypeStudyModel) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seeds, setSeeds] = useState<Record<string, RelationshipStudyRecord>>({});
  const [saved, setSaved] = useState<
    Record<string, { base: RelationshipStudyRecord | null; value: RelationshipStudyRecord }>
  >({});
  const [staged, setStaged] = useState<Record<string, RelationshipStudyRecord>>({});
  const [buffers, setBuffers] = useState<
    Record<string, { base: RelationshipStudyRecord; value: RelationshipStudyRecord }>
  >({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const incomingRecords = Object.fromEntries(
    incoming.map((edge) => [
      edge.id,
      {
        id: edge.id,
        typeId: types.relationshipTypeId(edge),
        from: edge.from,
        to: edge.to,
        knowledge: 'known' as const,
        values: {},
      },
    ]),
  );

  function baseline(id: string): RelationshipStudyRecord {
    const stored = saved[id];
    const latest = incomingRecords[id];
    if (stored)
      return stored.base && latest ? merged(stored.base, stored.value, latest) : stored.value;
    return (
      latest ?? seeds[id] ?? { id, typeId: '', from: '', to: '', knowledge: 'known', values: {} }
    );
  }
  function current(id: string) {
    return staged[id] ?? baseline(id);
  }
  function buffer(id: string) {
    const entry = buffers[id];
    return entry ? merged(entry.base, entry.value, current(id)) : current(id);
  }
  function select(id?: string) {
    if (id) {
      setSelectedId(id);
      return;
    }
    const nextId = `relationship-${crypto.randomUUID()}`;
    setSeeds((previous) => ({
      ...previous,
      [nextId]: {
        id: nextId,
        typeId: types.definitions.find((type) => type.kind === 'relationship')?.id ?? '',
        from: '',
        to: '',
        knowledge: 'known',
        values: {},
      },
    }));
    setSelectedId(nextId);
  }
  function edit(id: string, value: RelationshipStudyRecord) {
    setBuffers((previous) => ({ ...previous, [id]: { base: current(id), value } }));
    if (errors[id]) setErrors((previous) => ({ ...previous, [id]: {} }));
  }
  function resetBuffer(id: string) {
    setBuffers((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }
  const visibleIds = [
    ...new Set([
      ...incoming.map((edge) => edge.id),
      ...Object.keys(saved).filter((id) => saved[id].base === null),
      ...Object.keys(staged),
    ]),
  ];
  const relationships: StudyRelationship[] = visibleIds.map((id) => {
    const value = current(id);
    const original = incoming.find((edge) => edge.id === id);
    const definition = types.get(value.typeId);
    return {
      id,
      from: value.from,
      to: value.to,
      label: `${definition?.forwardLabel || definition?.name || original?.label || 'Samband'}${value.knowledge === 'uncertain' ? ' (osäkert)' : ''}`,
      change:
        original?.change === 'removed'
          ? 'removed'
          : staged[id]
            ? saved[id] || original
              ? 'changed'
              : 'added'
            : original?.change,
    };
  });
  function stage(id: string, objects?: StudyObject[]) {
    const value = buffer(id);
    const type = types.get(value.typeId);
    const problems: Record<string, string> = {};
    if (type?.kind !== 'relationship') problems.typeId = 'Välj en sambandstyp.';
    if (
      !value.from ||
      (objects &&
        !objects.some((object) => object.id === value.from && object.change !== 'removed'))
    )
      problems.from = 'Välj ett startobjekt som finns i kartan.';
    if (
      !value.to ||
      (objects && !objects.some((object) => object.id === value.to && object.change !== 'removed'))
    )
      problems.to = 'Välj ett målobjekt som finns i kartan.';
    if (incoming.find((edge) => edge.id === id)?.change === 'removed')
      problems.relationship = 'Sambandet är redan föreslaget som borttaget i samtalet.';
    if (
      relationships.some((edge) => {
        const other = current(edge.id);
        return (
          edge.id !== id &&
          edge.change !== 'removed' &&
          other.typeId === value.typeId &&
          other.from === value.from &&
          other.to === value.to
        );
      })
    )
      problems.relationship = 'Sambandet finns redan med samma typ, startobjekt och målobjekt.';
    for (const field of type?.fields ?? []) {
      const text = value.values[field.id] ?? '';
      if (!text) continue;
      if (field.kind === 'number' && (!text.trim() || !Number.isFinite(Number(text))))
        problems[field.id] = `Ange ett tal för ${field.name}.`;
      if (field.kind === 'date' && !validDate(text))
        problems[field.id] = `Ange ett giltigt datum för ${field.name}.`;
      if (field.kind === 'boolean' && !['true', 'false'].includes(text))
        problems[field.id] = `Välj Ja, Nej eller Ej uppgivet för ${field.name}.`;
    }
    if (Object.keys(problems).length) {
      setErrors((previous) => ({ ...previous, [id]: problems }));
      return false;
    }
    setStaged((previous) => {
      const next = { ...previous };
      if ((saved[id] || incomingRecords[id]) && same(value, baseline(id))) delete next[id];
      else next[id] = value;
      return next;
    });
    resetBuffer(id);
    return true;
  }
  function commit() {
    setSaved((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(staged).map(([id, value]) => [
          id,
          { base: incomingRecords[id] ?? null, value },
        ]),
      ),
    }));
    setStaged({});
  }
  function receiptLines(objects: StudyObject[] = []) {
    const name = (id: string) => objects.find((object) => object.id === id)?.name ?? id;
    return Object.entries(staged).flatMap(([id, after]) => {
      const before = baseline(id);
      const definition = types.get(after.typeId);
      const title = `${name(after.from)} → ${definition?.forwardLabel || definition?.name || 'Samband'} → ${name(after.to)}`;
      const added = !saved[id] && !incomingRecords[id];
      const lines = added ? [`Nytt samband: ${title}.`] : [];
      if (!added && before.typeId !== after.typeId)
        lines.push(
          `${title}: sambandstyp ${types.get(before.typeId)?.name ?? before.typeId} → ${definition?.name ?? after.typeId}.`,
        );
      if (!added && before.from !== after.from)
        lines.push(`${title}: startobjekt ${name(before.from)} → ${name(after.from)}.`);
      if (!added && before.to !== after.to)
        lines.push(`${title}: målobjekt ${name(before.to)} → ${name(after.to)}.`);
      if (
        (added && after.knowledge === 'uncertain') ||
        (!added && before.knowledge !== after.knowledge)
      )
        lines.push(
          `${title}: säkerhet ${before.knowledge === 'known' ? 'Känt' : 'Osäkert uppgivet'} → ${after.knowledge === 'known' ? 'Känt' : 'Osäkert uppgivet'}.`,
        );
      for (const field of definition?.fields ?? []) {
        if ((before.values[field.id] ?? '') === (after.values[field.id] ?? '')) continue;
        lines.push(
          `${title}: ${field.name} ${valueText(before.values[field.id], field)} → ${valueText(after.values[field.id], field)}.`,
        );
      }
      return lines;
    });
  }
  const unsentIds = Object.keys(buffers).filter((id) => !same(buffer(id), current(id)));
  return {
    selectedId,
    select,
    current,
    buffer,
    edit,
    resetBuffer,
    stage,
    relationships,
    staged,
    errors,
    draftCount: Object.keys(staged).length,
    unsentCount: unsentIds.length,
    unsentIds,
    receiptLines,
    commit,
    reset() {
      setSelectedId(null);
      setSeeds({});
      setSaved({});
      setStaged({});
      setBuffers({});
      setErrors({});
    },
  };
}

export type RelationshipStudyModel = ReturnType<typeof useRelationshipStudy>;

export function RelationshipStudyPanel({
  model,
  types,
  objects,
  blocked,
  onStage,
  onTypes,
  onOpenObject,
}: {
  model: RelationshipStudyModel;
  types: TypeStudyModel;
  objects: StudyObject[];
  blocked: boolean;
  onStage: () => void;
  onTypes: () => void;
  onOpenObject: (id: string) => void;
}) {
  const prefix = useId();
  const errorsRef = useRef<HTMLDivElement>(null);
  const id = model.selectedId;
  const value = id ? model.buffer(id) : null;
  const definition = value ? types.get(value.typeId) : undefined;
  const errors = id ? model.errors[id] : undefined;
  const hasErrors = Boolean(errors && Object.keys(errors).length);
  useEffect(() => {
    if (errors && Object.keys(errors).length) errorsRef.current?.focus();
  }, [errors]);
  function edit(changes: Partial<RelationshipStudyRecord>) {
    if (id && value) model.edit(id, { ...value, ...changes });
  }
  function fieldError(key: string) {
    return errors?.[key] ? (
      <p className="relationship-study-error" id={`${prefix}-${key}-error`}>
        {errors[key]}
      </p>
    ) : null;
  }
  function objectChoices() {
    return objects
      .filter((object) => object.change !== 'removed')
      .map((object) => (
        <option key={object.id} value={object.id}>
          {object.name} ({object.type})
        </option>
      ));
  }
  function fieldControl(field: TypeStudyDefinition['fields'][number]) {
    if (!value) return null;
    const inputId = `${prefix}-field-${field.id}`;
    const common = {
      id: inputId,
      value: value.values[field.id] ?? '',
      'aria-invalid': Boolean(errors?.[field.id]),
      'aria-describedby': errors?.[field.id] ? `${prefix}-${field.id}-error` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        edit({ values: { ...value.values, [field.id]: event.target.value } }),
    };
    return (
      <div className="relationship-study-field" key={field.id}>
        <label htmlFor={inputId}>{field.name}</label>
        {field.kind === 'boolean' ? (
          <select {...common}>
            <option value="">Ej uppgivet</option>
            <option value="true">Ja</option>
            <option value="false">Nej</option>
          </select>
        ) : (
          <input
            {...common}
            type={field.kind === 'date' ? 'date' : 'text'}
            inputMode={field.kind === 'number' ? 'decimal' : undefined}
          />
        )}
        {fieldError(field.id)}
      </div>
    );
  }
  return (
    <div className="relationship-study">
      <p>Välj vad sambandet betyder och vilka objekt det gäller.</p>
      <div className="relationship-study-actions">
        <button type="button" disabled={blocked} onClick={() => model.select()}>
          Nytt samband
        </button>
        <button type="button" onClick={onTypes}>
          Ändra sambandstyper i Inställningar
        </button>
      </div>
      <label htmlFor={`${prefix}-existing`}>Öppna ett samband</label>
      <select
        id={`${prefix}-existing`}
        value={model.relationships.some((edge) => edge.id === id) ? (id ?? '') : ''}
        onChange={(event) => {
          if (event.target.value) model.select(event.target.value);
        }}
      >
        <option value="">Välj ett samband</option>
        {model.relationships
          .filter((edge) => edge.change !== 'removed')
          .map((edge) => (
            <option key={edge.id} value={edge.id}>
              {objects.find((object) => object.id === edge.from)?.name ?? edge.from} → {edge.label}{' '}
              → {objects.find((object) => object.id === edge.to)?.name ?? edge.to}
            </option>
          ))}
      </select>
      {value && id && (
        <form
          key={id}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked && model.stage(id, objects)) onStage();
          }}
        >
          <p className="relationship-study-state">
            {model.unsentIds.includes(id)
              ? 'Oskickade ändringar i formuläret'
              : model.staged[id]
                ? 'Förslag i ditt privata utkast'
                : model.relationships.some((edge) => edge.id === id)
                  ? 'Samband i kartan'
                  : 'Nytt samband'}
          </p>
          {hasErrors && (
            <div ref={errorsRef} role="alert" tabIndex={-1} className="relationship-study-errors">
              <strong>Kontrollera uppgifterna</strong>
              <ul>
                {Object.entries(errors ?? {}).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {blocked && <p>Redigering är tillfälligt blockerad medan sparandet kontrolleras.</p>}
          <fieldset disabled={blocked}>
            <legend>Sambandets uppgifter</legend>
            <label htmlFor={`${prefix}-type`}>Sambandstyp</label>
            <select
              id={`${prefix}-type`}
              value={value.typeId}
              aria-invalid={Boolean(errors?.typeId)}
              aria-describedby={errors?.typeId ? `${prefix}-typeId-error` : undefined}
              onChange={(event) => edit({ typeId: event.target.value })}
            >
              <option value="">Välj sambandstyp</option>
              {types.definitions
                .filter((type) => type.kind === 'relationship')
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
            </select>
            {fieldError('typeId')}
            {definition?.description && <p>{definition.description}</p>}
            <label htmlFor={`${prefix}-from`}>Från objekt</label>
            <select
              id={`${prefix}-from`}
              value={value.from}
              aria-invalid={Boolean(errors?.from)}
              aria-describedby={errors?.from ? `${prefix}-from-error` : undefined}
              onChange={(event) => edit({ from: event.target.value })}
            >
              <option value="">Välj startobjekt</option>
              {objectChoices()}
            </select>
            {fieldError('from')}
            <label htmlFor={`${prefix}-to`}>Till objekt</label>
            <select
              id={`${prefix}-to`}
              value={value.to}
              aria-invalid={Boolean(errors?.to)}
              aria-describedby={errors?.to ? `${prefix}-to-error` : undefined}
              onChange={(event) => edit({ to: event.target.value })}
            >
              <option value="">Välj målobjekt</option>
              {objectChoices()}
            </select>
            {fieldError('to')}
            {value.from && value.to && (
              <p>
                {objects.find((object) => object.id === value.from)?.name} →{' '}
                {definition?.forwardLabel || definition?.name} →{' '}
                {objects.find((object) => object.id === value.to)?.name}
              </p>
            )}
            <label htmlFor={`${prefix}-knowledge`}>Uppgiftens säkerhet</label>
            <select
              id={`${prefix}-knowledge`}
              value={value.knowledge}
              onChange={(event) =>
                edit({ knowledge: event.target.value as RelationshipStudyRecord['knowledge'] })
              }
            >
              <option value="known">Känt</option>
              <option value="uncertain">Osäkert uppgivet</option>
            </select>
            {(definition?.sections ?? []).map((section) => {
              const fields =
                definition?.fields.filter((field) => field.sectionId === section.id) ?? [];
              return (
                <details className="relationship-study-section" key={section.id} open>
                  <summary>
                    {section.name}
                    <span>{fields.length} uppgifter</span>
                  </summary>
                  <div>
                    {fields.length ? (
                      fields.map(fieldControl)
                    ) : (
                      <p>Avsnittet har inga egenskaper ännu.</p>
                    )}
                  </div>
                </details>
              );
            })}
            {!definition?.sections.length && (
              <p>Den här typen har inga avsnitt ännu. Lägg till dem i Inställningar.</p>
            )}
            <button type="submit">Lägg sambandet i mitt utkast</button>
          </fieldset>
          <div className="relationship-study-actions">
            {model.unsentIds.includes(id) && (
              <button type="button" disabled={blocked} onClick={() => model.resetBuffer(id)}>
                Ångra oskickade ändringar
              </button>
            )}
            {value.from && (
              <button type="button" onClick={() => onOpenObject(value.from)}>
                Öppna startobjektet
              </button>
            )}
            {value.to && (
              <button type="button" onClick={() => onOpenObject(value.to)}>
                Öppna målobjektet
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
