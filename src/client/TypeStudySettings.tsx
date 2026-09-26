// Kastbara typinställningar: samma privata utkast som objekt, samband och samtal.
import { useId, useRef, useState } from 'react';
import {
  builtinTypeFields,
  type TypeStudyDefinition,
  type TypeStudyField,
  type TypeStudyModel,
} from './type-study-model.js';
import './type-study-settings.css';

type TypeStudySettingsProps = {
  model: TypeStudyModel;
  initialTypeId?: string;
  blocked: boolean;
  onStage: () => void;
  onOpenObject: () => void;
};

const kindNames: Record<TypeStudyField['kind'], string> = {
  text: 'Text',
  number: 'Tal',
  date: 'Datum',
  boolean: 'Ja eller nej',
};

function moved<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function TypeStudySettings({
  model,
  initialTypeId,
  blocked,
  onStage,
  onOpenObject,
}: TypeStudySettingsProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const initialType = initialTypeId ? model.buffer(initialTypeId) : undefined;
  const [category, setCategory] = useState<TypeStudyDefinition['kind']>(
    initialType?.kind ?? 'object',
  );
  const [selectedIds, setSelectedIds] = useState<
    Partial<Record<TypeStudyDefinition['kind'], string>>
  >(initialType ? { [initialType.kind]: initialType.id } : {});
  const [newFieldId, setNewFieldId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const available = model.allIds
    .map((typeId) => model.buffer(typeId))
    .filter((item): item is TypeStudyDefinition => item?.kind === category);
  const selectedId = available.some((item) => item.id === selectedIds[category])
    ? selectedIds[category]
    : available[0]?.id;
  const definition = selectedId ? model.buffer(selectedId) : undefined;
  const baseline = selectedId ? model.get(selectedId) : undefined;
  const errors = selectedId ? (model.errors[selectedId] ?? {}) : {};
  const errorEntries = Object.entries(errors);
  const unsent = selectedId ? model.unsentIds.includes(selectedId) : false;
  const staged = selectedId ? Boolean(model.staged[selectedId]) : false;

  function choose(value: string) {
    setSelectedIds((previous) => ({ ...previous, [category]: value }));
    setNotice('');
    setNewFieldId(null);
  }

  function change(next: Partial<TypeStudyDefinition>) {
    if (!definition || blocked) return;
    model.edit(definition.id, { ...definition, ...next });
    setNotice('');
  }

  function focusField(key: string) {
    requestAnimationFrame(() => {
      const target = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>('[data-type-field]') ?? [],
      ).find((element) => element.dataset.typeField === key);
      let parent = target?.parentElement;
      while (parent && parent !== rootRef.current) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      target?.focus();
      target?.scrollIntoView({ block: 'nearest' });
    });
  }

  function addType() {
    if (blocked) return;
    const next = model.newType(category);
    choose(next);
    focusField('name');
  }

  function addSection() {
    if (!definition) return;
    const section = { id: `section-${crypto.randomUUID()}`, name: 'Nytt avsnitt' };
    change({ sections: [...definition.sections, section] });
    focusField(`section:${section.id}`);
  }

  function addField(template?: TypeStudyField) {
    if (!definition) return;
    const field: TypeStudyField = {
      ...(template ?? {
        id: `field-${crypto.randomUUID()}`,
        name: 'Ny egenskap',
        kind: 'text',
      }),
      sectionId: definition.sections[0]?.id ?? '',
    };
    change({ fields: [...definition.fields, field] });
    setNewFieldId(field.id);
    focusField(`field:${field.id}`);
  }

  function changeField(fieldId: string, next: Partial<TypeStudyField>) {
    if (!definition) return;
    change({
      fields: definition.fields.map((field) =>
        field.id === fieldId ? { ...field, ...next } : field,
      ),
    });
  }

  function moveField(field: TypeStudyField, direction: -1 | 1) {
    if (!definition) return;
    const siblings = definition.fields.filter((item) => item.sectionId === field.sectionId);
    const target = siblings[siblings.findIndex((item) => item.id === field.id) + direction];
    if (!target) return;
    const next = [...definition.fields];
    const from = next.findIndex((item) => item.id === field.id);
    const to = next.findIndex((item) => item.id === target.id);
    [next[from], next[to]] = [next[to], next[from]];
    change({ fields: next });
  }

  function fieldError(key: string) {
    return errors[key] ? (
      <p className="ts-error" id={`${id}-${key}-error`}>
        {errors[key]}
      </p>
    ) : null;
  }

  function errorProps(key: string) {
    return {
      'data-type-field': key,
      'aria-invalid': Boolean(errors[key]),
      'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
    };
  }

  function stage() {
    if (!selectedId || blocked) return;
    if (model.stage(selectedId)) {
      onStage();
      setNotice('Typändringen ligger i ditt utkast. Spara hela utkastet när du är klar.');
    } else {
      setNotice('');
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <div className="ts-settings" ref={rootRef}>
      <header>
        <h3>Typer och avsnitt</h3>
        <p>
          Ändra hushållets typer, även de förifyllda. Välj vilka uppgifter som ska visas och hur de
          grupperas. Alla egenskaper är valfria att fylla i.
        </p>
      </header>
      <fieldset className="ts-categories" aria-label="Vilka typer vill du ändra?">
        <button
          type="button"
          aria-pressed={category === 'object'}
          onClick={() => {
            setCategory('object');
            setNotice('');
          }}
        >
          Objekttyper
        </button>
        <button
          type="button"
          aria-pressed={category === 'relationship'}
          onClick={() => {
            setCategory('relationship');
            setNotice('');
          }}
        >
          Sambandstyper
        </button>
      </fieldset>
      <div className="ts-type-picker">
        <label htmlFor={`${id}-selected`}>
          {category === 'object' ? 'Objekttyp' : 'Sambandstyp'}
          <select
            id={`${id}-selected`}
            value={selectedId ?? ''}
            onChange={(event) => choose(event.target.value)}
          >
            {!available.length && <option value="">Inga typer ännu</option>}
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || 'Namnlös typ'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={addType} disabled={blocked}>
          {category === 'object' ? 'Ny objekttyp' : 'Ny sambandstyp'}
        </button>
      </div>
      {definition && (
        <form
          key={definition.id}
          className="ts-form"
          onSubmit={(event) => {
            event.preventDefault();
            stage();
          }}
        >
          <div className="ts-status">
            <strong>{definition.name || 'Namnlös typ'}</strong>
            <span>
              {unsent ? 'Oskickade ändringar' : staged ? 'Ändringar i utkast' : 'Gemensam typ'}
            </span>
          </div>
          {blocked && (
            <p className="ts-hint">Redigeringen är tillfälligt blockerad medan sparandet avgörs.</p>
          )}
          {errorEntries.length > 0 && (
            <div className="ts-errors" role="alert" tabIndex={-1} ref={errorRef}>
              <strong>Kontrollera typens uppgifter</strong>
              <ul>
                {errorEntries.map(([key, message]) => (
                  <li key={key}>
                    <button type="button" onClick={() => focusField(key)}>
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <fieldset className="ts-basic" disabled={blocked}>
            <legend>Typens betydelse</legend>
            <label htmlFor={`${id}-name`}>
              Namn
              <input
                id={`${id}-name`}
                value={definition.name}
                onChange={(event) => change({ name: event.target.value })}
                {...errorProps('name')}
              />
            </label>
            {fieldError('name')}
            <label htmlFor={`${id}-description`}>
              Beskrivning av typen
              <textarea
                id={`${id}-description`}
                rows={3}
                value={definition.description}
                onChange={(event) => change({ description: event.target.value })}
                {...errorProps('description')}
              />
            </label>
            {fieldError('description')}
            {category === 'relationship' && (
              <>
                <p className="ts-hint">Sambandstypen kan användas mellan valfria objekt.</p>
                <label htmlFor={`${id}-forwardLabel`}>
                  Benämning från första objektet
                  <input
                    id={`${id}-forwardLabel`}
                    value={definition.forwardLabel}
                    placeholder="Till exempel använder"
                    onChange={(event) => change({ forwardLabel: event.target.value })}
                    {...errorProps('forwardLabel')}
                  />
                </label>
                {fieldError('forwardLabel')}
                <label htmlFor={`${id}-reverseLabel`}>
                  Benämning från andra objektet
                  <input
                    id={`${id}-reverseLabel`}
                    value={definition.reverseLabel}
                    placeholder="Till exempel används av"
                    onChange={(event) => change({ reverseLabel: event.target.value })}
                    {...errorProps('reverseLabel')}
                  />
                </label>
                {fieldError('reverseLabel')}
              </>
            )}
          </fieldset>
          <details className="ts-section" open>
            <summary>
              Avsnitt <span>{definition.sections.length}</span>
            </summary>
            <div className="ts-section-content">
              <p className="ts-hint">
                Avsnitten visas i denna ordning när ett objekt eller samband öppnas.
              </p>
              {definition.sections.map((section, index) => {
                const count = definition.fields.filter(
                  (field) => field.sectionId === section.id,
                ).length;
                const key = `section:${section.id}`;
                return (
                  <div className="ts-section-row" key={section.id}>
                    <label htmlFor={`${id}-${key}`}>
                      Avsnitt {index + 1}
                      <input
                        id={`${id}-${key}`}
                        value={section.name}
                        onChange={(event) =>
                          change({
                            sections: definition.sections.map((item) =>
                              item.id === section.id ? { ...item, name: event.target.value } : item,
                            ),
                          })
                        }
                        disabled={blocked}
                        {...errorProps(key)}
                      />
                    </label>
                    {fieldError(key)}
                    <div className="ts-row-actions">
                      <span>{count} egenskaper</span>
                      <button
                        type="button"
                        disabled={blocked || index === 0}
                        aria-label={`Flytta avsnittet ${section.name} upp`}
                        onClick={() => change({ sections: moved(definition.sections, index, -1) })}
                      >
                        ↑ Upp
                      </button>
                      <button
                        type="button"
                        disabled={blocked || index === definition.sections.length - 1}
                        aria-label={`Flytta avsnittet ${section.name} ned`}
                        onClick={() => change({ sections: moved(definition.sections, index, 1) })}
                      >
                        ↓ Ned
                      </button>
                      <button
                        type="button"
                        disabled={blocked || count > 0}
                        title={count ? 'Flytta eller dölj egenskaperna först' : undefined}
                        aria-label={`Ta bort det tomma avsnittet ${section.name}`}
                        onClick={() =>
                          change({
                            sections: definition.sections.filter((item) => item.id !== section.id),
                          })
                        }
                      >
                        Ta bort
                      </button>
                    </div>
                    {count > 0 && (
                      <p className="ts-hint">
                        Flytta eller dölj egenskaperna för att ta bort avsnittet.
                      </p>
                    )}
                  </div>
                );
              })}
              {!definition.sections.length && (
                <p>Inga avsnitt ännu. Lägg till ett avsnitt för att visa egenskaper.</p>
              )}
              {fieldError('sections')}
              <button
                type="button"
                data-type-field="sections"
                onClick={addSection}
                disabled={blocked}
              >
                Lägg till avsnitt
              </button>
            </div>
          </details>
          <details className="ts-section" open>
            <summary>
              Egenskaper <span>{definition.fields.length}</span>
            </summary>
            <div className="ts-section-content">
              <p className="ts-hint">
                Ordningen gäller inom varje avsnitt. Dolda egenskaper behåller sina värden och kan
                visas igen.
              </p>
              {definition.fields.map((field) => {
                const key = `field:${field.id}`;
                const siblings = definition.fields.filter(
                  (item) => item.sectionId === field.sectionId,
                );
                const position = siblings.findIndex((item) => item.id === field.id);
                const fixedKind = Boolean(
                  field.builtin || baseline?.fields.some((item) => item.id === field.id),
                );
                return (
                  <details
                    className="ts-field"
                    key={field.id}
                    open={newFieldId === field.id ? true : undefined}
                  >
                    <summary>
                      {field.name || 'Namnlös egenskap'}
                      <span>
                        {kindNames[field.kind]} ·{' '}
                        {definition.sections.find((section) => section.id === field.sectionId)
                          ?.name ?? 'Dold'}
                      </span>
                    </summary>
                    <div className="ts-field-content">
                      <label htmlFor={`${id}-${key}`}>
                        Egenskapens namn
                        <input
                          id={`${id}-${key}`}
                          value={field.name}
                          disabled={blocked}
                          onChange={(event) => changeField(field.id, { name: event.target.value })}
                          {...errorProps(key)}
                        />
                      </label>
                      {fieldError(key)}
                      <label htmlFor={`${id}-${key}-kind`}>
                        Värdeslag
                        <select
                          id={`${id}-${key}-kind`}
                          value={field.kind}
                          disabled={blocked || fixedKind}
                          onChange={(event) =>
                            changeField(field.id, {
                              kind: event.target.value as TypeStudyField['kind'],
                            })
                          }
                        >
                          {Object.entries(kindNames).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {fixedKind && (
                        <p className="ts-hint">
                          Värdeslaget är fast för att bevara befintliga uppgifter. Lägg till en ny
                          egenskap om du behöver ett annat värdeslag.
                        </p>
                      )}
                      {field.builtin && (
                        <p className="ts-hint">
                          Gemensam egenskap:{' '}
                          {builtinTypeFields.find((item) => item.builtin === field.builtin)?.name}.
                          Befintliga värden följer med.
                        </p>
                      )}
                      <label htmlFor={`${id}-${key}-section`}>
                        Visa i avsnitt
                        <select
                          id={`${id}-${key}-section`}
                          value={field.sectionId}
                          disabled={blocked}
                          onChange={(event) =>
                            changeField(field.id, { sectionId: event.target.value })
                          }
                        >
                          <option value="">Dold, behåll värden</option>
                          {definition.sections.map((section) => (
                            <option value={section.id} key={section.id}>
                              {section.name || 'Namnlöst avsnitt'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="ts-row-actions">
                        <button
                          type="button"
                          disabled={blocked || position === 0}
                          aria-label={`Flytta egenskapen ${field.name} upp`}
                          onClick={() => moveField(field, -1)}
                        >
                          ↑ Upp
                        </button>
                        <button
                          type="button"
                          disabled={blocked || position === siblings.length - 1}
                          aria-label={`Flytta egenskapen ${field.name} ned`}
                          onClick={() => moveField(field, 1)}
                        >
                          ↓ Ned
                        </button>
                        <button
                          type="button"
                          disabled={blocked || !field.sectionId}
                          aria-label={`Dölj ${field.name}, behåll värden`}
                          onClick={() => changeField(field.id, { sectionId: '' })}
                        >
                          Dölj
                        </button>
                      </div>
                    </div>
                  </details>
                );
              })}
              {!definition.fields.length && <p>Inga egenskaper ännu.</p>}
              {fieldError('fields')}
              <button
                type="button"
                data-type-field="fields"
                onClick={() => addField()}
                disabled={blocked}
              >
                Lägg till egen egenskap
              </button>
              {category === 'object' && (
                <label htmlFor={`${id}-builtin`}>
                  Lägg till gemensam egenskap
                  <select
                    id={`${id}-builtin`}
                    value=""
                    disabled={
                      blocked ||
                      builtinTypeFields.every((item) =>
                        definition.fields.some((field) => field.builtin === item.builtin),
                      )
                    }
                    onChange={(event) => {
                      const template = builtinTypeFields.find(
                        (item) => item.id === event.target.value,
                      );
                      if (template) addField(template);
                    }}
                  >
                    <option value="">Välj egenskap att lägga till</option>
                    {builtinTypeFields
                      .filter(
                        (item) =>
                          !definition.fields.some((field) => field.builtin === item.builtin),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          </details>
          <div className="ts-save-actions">
            <button type="submit" className="ts-primary" disabled={blocked || !unsent}>
              Lägg typändringen i utkast
            </button>
            <button
              type="button"
              disabled={blocked || !unsent}
              onClick={() => {
                model.resetBuffer(definition.id);
                setNotice('Oskickade ändringar av typen har återställts.');
                setNewFieldId(null);
              }}
            >
              Återställ oskickade ändringar
            </button>
          </div>
          <p className="ts-hint">Typändringar delas med hushållet när hela utkastet sparas.</p>
        </form>
      )}
      <p className="ts-notice" role="status">
        {notice}
      </p>
      <button type="button" onClick={onOpenObject}>
        Öppna Familjeabonnemanget
      </button>
    </div>
  );
}
