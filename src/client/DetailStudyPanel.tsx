// Kastbara detaljvyer i samma fria panel: sammanhängande uppgifter, avsnitt och flikar.
import { type ChangeEvent, type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { type FinancialField, financialFields } from '../shared/financial-facts.js';
import {
  type DetailFact,
  type DetailRecord,
  type DetailStudyModel,
  factText,
} from './detail-study-model.js';
import type { StudyObject, StudyRelationship } from './map-study-types.js';
import type { TypeStudyDefinition, TypeStudyField, TypeStudyModel } from './type-study-model.js';
import './detail-study-panel.css';

export type DetailStudyVariant = 'A' | 'B' | 'C';
type DetailStudyPanelProps = {
  variant: DetailStudyVariant;
  object: StudyObject;
  model: DetailStudyModel;
  editing: boolean;
  blocked: boolean;
  onEdit: () => void;
  onRead: () => void;
  onStage: () => void;
  onList: () => void;
  onMap: () => void;
  onRelated: (id: string) => void;
  relationships: StudyRelationship[];
  objects: StudyObject[];
  definition?: TypeStudyDefinition;
  onTypes?: () => void;
  onRelationship?: (id?: string) => void;
  reverseLabels?: Record<string, string>;
  creation?: boolean;
  types?: TypeStudyModel;
};

type Section = 'basic' | 'money' | 'time';
const sectionNames: Record<Section, string> = {
  basic: 'Grunduppgifter',
  money: 'Belopp och villkor',
  time: 'Tidsuppgifter',
};
const paymentKeys: FinancialField[] = ['price', 'currency', 'paymentInterval', 'terms'];
const creditKeys: FinancialField[] = ['debt', 'creditLimit', 'usedCredit'];
const dateKeys: FinancialField[] = ['startDate', 'endDate'];
const knowledgeLabels: Record<DetailFact['knowledge'], string> = {
  unset: 'Ej uppgivet',
  known: 'Känt',
  uncertain: 'Osäkert uppgivet',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
};

export function DetailStudyPanel({
  variant,
  object,
  model,
  editing,
  blocked,
  onEdit,
  onRead,
  onStage,
  onList,
  onMap,
  onRelated,
  relationships,
  objects,
  definition: configuredDefinition,
  onTypes,
  onRelationship,
  reverseLabels,
  creation = false,
  types,
}: DetailStudyPanelProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const validationRequested = useRef(false);
  const [tab, setTab] = useState<Section>('basic');
  const current = model.current(object.id);
  const buffer = model.buffer(object.id);
  const record = editing ? buffer : current;
  const definition = types ? model.typeDefinition(object.id, editing) : configuredDefinition;
  const typeChanged = !creation && editing && buffer.typeId !== current.typeId;
  const displacedFields = editing ? (buffer.displacedFields ?? []) : [];
  const visibleBuiltins = new Set(
    definition?.fields
      .filter((field) => definition.sections.some((section) => section.id === field.sectionId))
      .map((field) => field.builtin),
  );
  const retainedFacts = financialFields
    .filter(({ key }) => !visibleBuiltins.has(key) && record.facts[key].knowledge !== 'unset')
    .map(({ key }) => key);
  const retainedDescription = Boolean(
    record.description.trim() && !visibleBuiltins.has('description'),
  );
  const unsent = model.unsentIds.includes(object.id);
  const errors = model.errors[object.id] ?? {};
  const errorEntries = Object.entries(errors);
  const hasCredit = creditKeys.some((key) => record.facts[key].knowledge !== 'unset');
  const connected = relationships.filter(
    (edge) => edge.from === object.id || edge.to === object.id,
  );
  const objectById = new Map(objects.map((item) => [item.id, item]));

  useLayoutEffect(() => {
    if (validationRequested.current && errorEntries.length && editing) {
      errorsRef.current?.focus();
      validationRequested.current = false;
    }
    if (!editing) validationRequested.current = false;
  }, [editing, errorEntries.length]);

  function change(next: Partial<DetailRecord>) {
    model.edit(object.id, { ...buffer, ...next });
  }

  function changeFact(key: FinancialField, next: Partial<DetailFact>) {
    change({ facts: { ...buffer.facts, [key]: { ...buffer.facts[key], ...next } } });
  }

  function sectionFor(field: string): Section {
    return ['name', 'description', 'typeId', 'identity', 'fieldsHandled'].includes(field)
      ? 'basic'
      : dateKeys.some((key) => field.startsWith(key))
        ? 'time'
        : 'money';
  }

  function focusField(field: string) {
    setTab(sectionFor(field));
    requestAnimationFrame(() => {
      const target = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('[data-detail-field]') ?? [],
      ).find((item) => item.dataset.detailField === field);
      let parent = target?.parentElement;
      while (parent && parent !== panelRef.current) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'center' });
    });
  }

  function beginEdit(section: Section = 'basic') {
    onEdit();
    focusField(
      section === 'basic'
        ? 'name'
        : section === 'money'
          ? 'price-knowledge'
          : 'startDate-knowledge',
    );
  }

  function stage() {
    validationRequested.current = true;
    onStage();
    requestAnimationFrame(() => {
      if (errorsRef.current) {
        errorsRef.current.focus();
        validationRequested.current = false;
      }
    });
  }

  function error(field: string) {
    return errors[field] ? (
      <p className="ds-field-error" id={`${id}-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;
  }

  function basic(includeDescription = true) {
    return editing ? (
      <div className="ds-basic-fields">
        <label htmlFor={`${id}-name`}>
          Namn
          <input
            id={`${id}-name`}
            data-detail-field="name"
            value={record.name}
            onChange={(event) => change({ name: event.target.value })}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            disabled={blocked}
          />
        </label>
        {error('name')}
        {types && (
          <>
            <label htmlFor={`${id}-typeId`}>
              {creation ? 'Objekttyp' : 'Byt typ'}
              <select
                id={`${id}-typeId`}
                data-detail-field="typeId"
                value={record.typeId ?? ''}
                onChange={(event) => model.changeType(object.id, event.target.value)}
                aria-invalid={Boolean(errors.typeId)}
                aria-describedby={errors.typeId ? `${id}-typeId-error` : `${id}-typeId-hint`}
                disabled={blocked}
              >
                <option value="">Välj objekttyp</option>
                {types.definitions
                  .filter((type) => type.kind === 'object')
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
            </label>
            {error('typeId')}
            <p className="ds-type-hint" id={`${id}-typeId-hint`}>
              {creation
                ? 'Typen bestämmer vilka egenskaper och avsnitt som visas. Uppgifterna är valfria.'
                : 'Du kan byta till vilken objekttyp som helst. Objektet och dess samband finns kvar.'}
            </p>
            <label htmlFor={`${id}-identity`}>
              Identitet
              <select
                id={`${id}-identity`}
                data-detail-field="identity"
                value={record.identity ?? 'identified'}
                onChange={(event) =>
                  change({ identity: event.target.value as DetailRecord['identity'] })
                }
                aria-describedby={`${id}-identity-hint`}
                disabled={blocked}
              >
                <option value="identified">Identifierat objekt</option>
                <option value="unspecified">Ospecificerat objekt</option>
                <option value="unanswered">Obesvarad identitetsfråga</option>
              </select>
            </label>
            <p className="ds-type-hint" id={`${id}-identity-hint`}>
              {record.identity === 'unanswered'
                ? 'Du kan lägga objektet i utkastet nu. Välj identifierat eller ospecificerat innan du sparar hushållets karta.'
                : record.identity === 'unspecified'
                  ? 'Objektet är omnämnt men ännu inte närmare identifierat, till exempel bankkontot som betalar hyran.'
                  : 'Du vet vilket objekt uppgifterna gäller.'}
            </p>
          </>
        )}
        {includeDescription && (
          <label htmlFor={`${id}-description`}>
            Beskrivning
            <textarea
              id={`${id}-description`}
              data-detail-field="description"
              value={record.description}
              rows={3}
              onChange={(event) => change({ description: event.target.value })}
              disabled={blocked}
            />
          </label>
        )}
      </div>
    ) : (
      <dl className="ds-fact-list ds-basic-read">
        <div>
          <dt>Namn</dt>
          <dd>{record.name}</dd>
        </div>
        {types && (
          <div>
            <dt>Identitet</dt>
            <dd>
              {record.identity === 'unanswered'
                ? 'Obesvarad identitetsfråga'
                : record.identity === 'unspecified'
                  ? 'Ospecificerat objekt'
                  : 'Identifierat objekt'}
            </dd>
          </div>
        )}
        {includeDescription && (
          <div>
            <dt>Beskrivning</dt>
            <dd>{record.description || 'Ej uppgivet'}</dd>
          </div>
        )}
      </dl>
    );
  }

  function factField(key: FinancialField, label?: string) {
    const meta = financialFields.find((item) => item.key === key);
    if (!meta) return null;
    const field = { ...meta, label: label ?? meta.label };
    const fact = record.facts[key];
    const hasValue = fact.knowledge === 'known' || fact.knowledge === 'uncertain';
    const valueProps = {
      id: `${id}-${key}`,
      'data-detail-field': key,
      value: fact.value,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        changeFact(key, { value: event.target.value }),
      'aria-invalid': Boolean(errors[key]),
      'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
      disabled: blocked,
    };
    return (
      <fieldset className="ds-financial-field" key={key} disabled={blocked}>
        <legend>{field.label}</legend>
        <div className="ds-fact-inputs" data-long-value={field.input === 'textarea'}>
          <label className="ds-knowledge-label" htmlFor={`${id}-${key}-knowledge`}>
            <span className="ds-sr-only">Kunskap om {field.label.toLocaleLowerCase('sv')}</span>
            <select
              id={`${id}-${key}-knowledge`}
              data-detail-field={`${key}-knowledge`}
              value={fact.knowledge}
              onChange={(event) =>
                changeFact(key, { knowledge: event.target.value as DetailFact['knowledge'] })
              }
            >
              {Object.entries(knowledgeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {hasValue && (
            <label className="ds-value-label" htmlFor={`${id}-${key}`}>
              <span className="ds-sr-only">{field.label}, värde</span>
              {field.input === 'textarea' ? (
                <textarea {...valueProps} rows={3} />
              ) : (
                <input {...valueProps} type={field.input} />
              )}
            </label>
          )}
        </div>
        {error(key)}
        {field.dated && fact.knowledge !== 'unset' && (
          <label className="ds-reported-date" htmlFor={`${id}-${key}-reportedOn`}>
            <span>
              Uppgivet datum <span className="ds-muted">(valfritt)</span>
            </span>
            <input
              id={`${id}-${key}-reportedOn`}
              data-detail-field={`${key}-reportedOn`}
              type="date"
              value={fact.reportedOn}
              onChange={(event) => changeFact(key, { reportedOn: event.target.value })}
              aria-invalid={Boolean(errors[`${key}-reportedOn`])}
              aria-describedby={
                errors[`${key}-reportedOn`] ? `${id}-${key}-reportedOn-error` : undefined
              }
            />
          </label>
        )}
        {error(`${key}-reportedOn`)}
      </fieldset>
    );
  }

  function facts(keys: FinancialField[]) {
    return editing ? (
      <div className="ds-financial-fields">{keys.map((key) => factField(key))}</div>
    ) : (
      <dl className="ds-fact-list">
        {keys.map((key) => (
          <div key={key} data-unspecified={record.facts[key].knowledge === 'unset'}>
            <dt>{financialFields.find((field) => field.key === key)?.label}</dt>
            <dd>{factText(record.facts[key])}</dd>
          </div>
        ))}
      </dl>
    );
  }

  function credit() {
    return (
      <details className="ds-credit" open={hasCredit}>
        <summary>
          Skuld och kredit
          <span>
            {creditKeys.filter((key) => record.facts[key].knowledge !== 'unset').length} av 3
            uppgivna
          </span>
        </summary>
        {facts(creditKeys)}
      </details>
    );
  }

  function contents(section: Section): ReactNode {
    if (section === 'basic') return basic();
    if (section === 'time') return facts(dateKeys);
    return (
      <>
        {facts(paymentKeys)}
        {credit()}
      </>
    );
  }

  function summary(section: Section) {
    if (section === 'basic') return record.name || 'Namn saknas';
    const keys = section === 'money' ? (['price', 'paymentInterval'] as const) : dateKeys;
    const specified = keys.filter((key) => record.facts[key].knowledge !== 'unset');
    return specified.length
      ? specified
          .map(
            (key) =>
              `${financialFields.find((field) => field.key === key)?.label}: ${factText(record.facts[key])}`,
          )
          .join(' · ')
      : section === 'money'
        ? 'Inget pris eller intervall uppgivet'
        : 'Inga datum uppgivna';
  }

  function configuredField(field: TypeStudyField) {
    if (field.builtin && field.builtin !== 'description' && editing)
      return factField(field.builtin, field.name);
    const value =
      field.builtin === 'description' ? record.description : (record.customValues[field.id] ?? '');
    if (!editing)
      return (
        <dl key={field.id} className="ds-fact-list">
          <div>
            <dt>{field.name}</dt>
            <dd>
              {field.builtin && field.builtin !== 'description'
                ? factText(record.facts[field.builtin])
                : value
                  ? field.kind === 'boolean'
                    ? value === 'true'
                      ? 'Ja'
                      : 'Nej'
                    : value
                  : 'Ej uppgivet'}
            </dd>
          </div>
        </dl>
      );
    const fieldKey = field.builtin === 'description' ? 'description' : field.id;
    const props = {
      id: `${id}-${fieldKey}`,
      'data-detail-field': fieldKey,
      value,
      disabled: blocked,
      'aria-invalid': Boolean(errors[fieldKey]),
      'aria-describedby': errors[fieldKey] ? `${id}-${fieldKey}-error` : undefined,
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        field.builtin === 'description'
          ? change({ description: event.target.value })
          : change({ customValues: { ...buffer.customValues, [field.id]: event.target.value } }),
    };
    return (
      <div key={field.id} className="ds-basic-fields">
        <label htmlFor={props.id}>
          {field.name}
          {field.builtin === 'description' ? (
            <textarea {...props} rows={3} />
          ) : field.kind === 'boolean' ? (
            <select {...props}>
              <option value="">Ej uppgivet</option>
              <option value="true">Ja</option>
              <option value="false">Nej</option>
            </select>
          ) : (
            <input
              {...props}
              type={field.kind === 'date' ? 'date' : 'text'}
              inputMode={field.kind === 'number' ? 'decimal' : undefined}
            />
          )}
        </label>
        {error(fieldKey)}
      </div>
    );
  }

  function typeChangeSummary() {
    if (!types || (!typeChanged && !displacedFields.length)) return null;
    return (
      <section className="ds-type-change" aria-label="Vad typbytet innebär">
        <h3>{creation ? 'Du har bytt objekttyp' : 'Vad typbytet innebär'}</h3>
        {typeChanged && (
          <p>
            {model.typeDefinition(object.id)?.name ?? object.type} →{' '}
            {definition?.name ?? 'Välj en objekttyp'}
          </p>
        )}
        <p>
          Namn, beskrivning, ekonomiska uppgifter och samband behålls. Den nya typens egna fält
          börjar utan svar.
        </p>
        {displacedFields.length > 0 && (
          <>
            <h4>Tidigare fältvärden</h4>
            <p>
              De här värdena följer inte med till den nya typen, även om ett fält har samma namn.
              Fyll i de nya fälten med det du vill behålla innan du fortsätter.
            </p>
            {displacedFields.map((batch) => (
              <div className="ds-displaced-fields" key={batch.id}>
                <strong>Från {batch.typeName}</strong>
                <dl className="ds-fact-list">
                  {batch.fields.map((field) => (
                    <div key={field.id}>
                      <dt>{field.name}</dt>
                      <dd>
                        {field.kind === 'boolean'
                          ? field.value === 'true'
                            ? 'Ja'
                            : 'Nej'
                          : field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <label className="ds-fields-handled" htmlFor={`${id}-fieldsHandled`}>
              <input
                id={`${id}-fieldsHandled`}
                data-detail-field="fieldsHandled"
                type="checkbox"
                checked={buffer.fieldsHandled ?? false}
                onChange={(event) => change({ fieldsHandled: event.target.checked })}
                aria-invalid={Boolean(errors.fieldsHandled)}
                aria-describedby={errors.fieldsHandled ? `${id}-fieldsHandled-error` : undefined}
                disabled={blocked}
              />
              <span>Jag har hanterat tidigare fältvärden för typbytet</span>
            </label>
            {error('fieldsHandled')}
          </>
        )}
      </section>
    );
  }

  return (
    <div className={`ds-panel ds-variant-${variant}`} ref={panelRef}>
      <div className="ds-context-actions">
        <button type="button" onClick={onList}>
          Tillbaka till listan
        </button>
        <button type="button" onClick={onMap}>
          {creation ? 'Till kartan' : 'Visa i kartan'}
        </button>
      </div>
      <div className="ds-state" aria-live="polite">
        <span className="ds-type">
          {definition?.name ?? (creation ? 'Nytt objekt' : object.type)}
        </span>
        {object.ended && <span>◷ Upphört</span>}
        {model.staged[object.id] && <span>✎ Privat förslag i ditt utkast</span>}
        {unsent && <span>✎ Oskickad redigering</span>}
        {blocked && <span>Redigering är tillfälligt blockerad</span>}
      </div>

      <div className="ds-edit-actions">
        {editing ? (
          <>
            <button type="button" className="ds-primary" onClick={stage} disabled={blocked}>
              {creation ? 'Lägg till i utkastet' : 'Lägg i utkast'}
            </button>
            {!creation && (
              <button type="button" onClick={onRead}>
                Tillbaka till uppgifter
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="ds-primary"
            onClick={() => beginEdit()}
            disabled={blocked}
          >
            Redigera uppgifter
          </button>
        )}
      </div>
      {editing && (
        <p className="ds-edit-hint">
          {creation
            ? 'Ange namn och välj en typ. Objektet visas i kartan och listan när du lägger till det i ditt privata utkast.'
            : 'Belopp, villkor och datum är valfria. Lägg ändringarna i ditt privata utkast när de är redo.'}
        </p>
      )}
      {editing && errorEntries.length > 0 && (
        <div className="ds-errors" role="alert" tabIndex={-1} ref={errorsRef}>
          <strong>
            Rätta {errorEntries.length === 1 ? 'uppgiften' : 'uppgifterna'} innan du lägger
            ändringarna i utkastet.
          </strong>
          <ul>
            {errorEntries.map(([field, message]) => (
              <li key={field}>
                <button type="button" onClick={() => focusField(field)}>
                  {message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(definition || types) && (
        <>
          {basic(false)}
          {typeChangeSummary()}
          {onTypes && (
            <button type="button" onClick={onTypes} disabled={blocked}>
              {definition ? 'Anpassa typen i Inställningar' : 'Hantera typer i Inställningar'}
            </button>
          )}
          {!definition && (
            <p className="ds-type-hint">
              Välj en objekttyp för att visa dess egenskaper och avsnitt.
            </p>
          )}
          <div className="ds-accordions">
            {definition?.sections.map((section) => (
              <details key={section.id} className="ds-section" open>
                <summary>
                  <strong>{section.name}</strong>
                  <span>
                    {definition.fields.filter((field) => field.sectionId === section.id).length}{' '}
                    egenskaper
                  </span>
                </summary>
                <div className="ds-section-content">
                  {definition.fields
                    .filter((field) => field.sectionId === section.id)
                    .map(configuredField)}
                  {!definition.fields.some((field) => field.sectionId === section.id) && (
                    <p>Avsnittet har ännu inga egenskaper.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
          {types && (retainedDescription || retainedFacts.length > 0) && (
            <details className="ds-section ds-retained-fields">
              <summary>
                <strong>Uppgifter utanför typens avsnitt</strong>
                <span>
                  {retainedFacts.length + Number(retainedDescription)} uppgifter finns kvar
                </span>
              </summary>
              <div className="ds-section-content">
                <p className="ds-type-hint">
                  De här uppgifterna hör till objektet och behålls vid typbyte. Du kan placera
                  egenskaperna i typens avsnitt från Inställningar.
                </p>
                {retainedDescription &&
                  configuredField({
                    id: 'builtin-description',
                    name: 'Beskrivning',
                    kind: 'text',
                    sectionId: '',
                    builtin: 'description',
                  })}
                {facts(retainedFacts)}
              </div>
            </details>
          )}
        </>
      )}
      {!definition && !types && variant === 'A' && (
        <div className="ds-document">
          {(['basic', 'money', 'time'] as const).map((section) => (
            <section key={section} aria-label={sectionNames[section]}>
              <h3>{sectionNames[section]}</h3>
              {contents(section)}
            </section>
          ))}
        </div>
      )}
      {!definition && !types && variant === 'B' && (
        <div className="ds-accordions">
          {(['basic', 'money', 'time'] as const).map((section) => (
            <details key={section} className="ds-section" open={section !== 'time'}>
              <summary>
                <strong>{sectionNames[section]}</strong>
                <span>{summary(section)}</span>
              </summary>
              <div className="ds-section-content">
                {contents(section)}
                {!editing && (
                  <button
                    className="ds-section-edit"
                    type="button"
                    onClick={() => beginEdit(section)}
                    disabled={blocked}
                  >
                    Ändra {sectionNames[section].toLocaleLowerCase('sv')}
                  </button>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
      {!definition && !types && variant === 'C' && (
        <div className="ds-tabbed">
          <nav className="ds-tab-buttons" aria-label="Avsnitt i objektets uppgifter">
            {(['basic', 'money', 'time'] as const).map((section) => (
              <button
                type="button"
                key={section}
                aria-pressed={tab === section}
                aria-controls={`${id}-tab-content`}
                onClick={() => setTab(section)}
              >
                {section === 'basic' ? 'Uppgifter' : section === 'money' ? 'Ekonomi' : 'Tid'}
                {editing && errorEntries.some(([field]) => sectionFor(field) === section) && (
                  <span> · fel</span>
                )}
              </button>
            ))}
          </nav>
          <section
            id={`${id}-tab-content`}
            className="ds-tab-content"
            aria-label={sectionNames[tab]}
          >
            <h3>{sectionNames[tab]}</h3>
            {contents(tab)}
          </section>
        </div>
      )}

      {unsent && (
        <details className="ds-buffer-actions">
          <summary>Oskickad redigering</summary>
          <p>Redigeringen finns kvar när du byter vy eller stänger fönstret.</p>
          <button type="button" onClick={() => model.resetBuffer(object.id)} disabled={blocked}>
            Kasta oskickad redigering för det här objektet
          </button>
        </details>
      )}
      {!creation && (
        <details className="ds-relationships">
          <summary>Samband ({connected.length})</summary>
          {onRelationship && (
            <button type="button" onClick={() => onRelationship()}>
              Nytt samband
            </button>
          )}
          {connected.length ? (
            <ul>
              {connected.map((edge) => {
                const other = objectById.get(edge.from === object.id ? edge.to : edge.from);
                const otherName = other ? model.current(other.id).name : 'Okänt objekt';
                return (
                  <li key={edge.id}>
                    {onRelationship && (
                      <button type="button" onClick={() => onRelationship(edge.id)}>
                        Redigera sambandet
                      </button>
                    )}
                    <span>
                      {edge.to === object.id && reverseLabels?.[edge.id] ? (
                        <>
                          {current.name} <b>{reverseLabels[edge.id]}</b> {otherName}
                        </>
                      ) : (
                        <>
                          {edge.from === object.id ? current.name : otherName} <b>{edge.label}</b>{' '}
                          {edge.to === object.id ? current.name : otherName}
                        </>
                      )}
                    </span>
                    {edge.change && (
                      <span className="ds-muted">
                        {edge.change === 'removed'
                          ? '− Föreslaget borttaget'
                          : edge.change === 'added'
                            ? '＋ Föreslaget nytt'
                            : '✎ Ändringsförslag'}
                      </span>
                    )}
                    {other && (
                      <button type="button" onClick={() => onRelated(other.id)}>
                        Öppna {otherName}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Inga samband i provunderlaget.</p>
          )}
        </details>
      )}
      {creation && (
        <p className="ds-type-hint">Du kan lägga till samband när objektet finns i utkastet.</p>
      )}
    </div>
  );
}
