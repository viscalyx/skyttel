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
}: DetailStudyPanelProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const validationRequested = useRef(false);
  const [tab, setTab] = useState<Section>('basic');
  const current = model.current(object.id);
  const buffer = model.buffer(object.id);
  const record = editing ? buffer : current;
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
    return field === 'name' || field === 'description'
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

  function basic() {
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
      </div>
    ) : (
      <dl className="ds-fact-list ds-basic-read">
        <div>
          <dt>Namn</dt>
          <dd>{record.name}</dd>
        </div>
        <div>
          <dt>Beskrivning</dt>
          <dd>{record.description || 'Ej uppgivet'}</dd>
        </div>
      </dl>
    );
  }

  function factField(key: FinancialField) {
    const field = financialFields.find((item) => item.key === key);
    if (!field) return null;
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
      <div className="ds-financial-fields">{keys.map(factField)}</div>
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

  return (
    <div className={`ds-panel ds-variant-${variant}`} ref={panelRef}>
      <div className="ds-context-actions">
        <button type="button" onClick={onList}>
          Tillbaka till listan
        </button>
        <button type="button" onClick={onMap}>
          Visa i kartan
        </button>
      </div>
      <div className="ds-state" aria-live="polite">
        <span className="ds-type">{object.type}</span>
        {object.ended && <span>◷ Upphört</span>}
        {model.staged[object.id] && <span>✎ Privat förslag i ditt utkast</span>}
        {unsent && <span>✎ Oskickad redigering</span>}
        {blocked && <span>Redigering är tillfälligt blockerad</span>}
      </div>

      <div className="ds-edit-actions">
        {editing ? (
          <>
            <button type="button" className="ds-primary" onClick={stage} disabled={blocked}>
              Lägg i utkast
            </button>
            <button type="button" onClick={onRead}>
              Tillbaka till uppgifter
            </button>
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
          Belopp, villkor och datum är valfria. Lägg ändringarna i ditt privata utkast när de är
          redo.
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

      {variant === 'A' && (
        <div className="ds-document">
          {(['basic', 'money', 'time'] as const).map((section) => (
            <section key={section} aria-label={sectionNames[section]}>
              <h3>{sectionNames[section]}</h3>
              {contents(section)}
            </section>
          ))}
        </div>
      )}
      {variant === 'B' && (
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
      {variant === 'C' && (
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
      <details className="ds-relationships">
        <summary>Samband ({connected.length})</summary>
        {connected.length ? (
          <ul>
            {connected.map((edge) => {
              const other = objectById.get(edge.from === object.id ? edge.to : edge.from);
              const otherName = other ? model.current(other.id).name : 'Okänt objekt';
              return (
                <li key={edge.id}>
                  <span>
                    {edge.from === object.id ? current.name : otherName} <b>{edge.label}</b>{' '}
                    {edge.to === object.id ? current.name : otherName}
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
    </div>
  );
}
