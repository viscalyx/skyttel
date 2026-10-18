import { useId } from 'react';
import type { FinancialFact } from '../shared/financial-facts.js';
import { hasEnded, type Lifecycle, type LifecycleValue } from '../shared/lifecycle.js';

export function LifecycleStatus({ value }: { value: LifecycleValue }) {
  return hasEnded(value) ? <span className="ended-status">Upphört</span> : null;
}

export function LifecycleDetails({ value }: { value: LifecycleValue }) {
  return (
    <>
      <p>Status: {value.lifecycle === 'ended' ? 'Manuellt upphört' : 'Gäller fortfarande'}</p>
      {value.endDate && (
        <p>
          Slutdatum: {value.endDate.value ?? dateKnowledge[value.endDate.knowledge]}
          {value.endDate.knowledge === 'uncertain' && ' (Osäkert uppgivet)'}
        </p>
      )}
      <LifecycleStatus value={value} />
    </>
  );
}

export function LifecycleEditor({
  kind,
  value,
  onChange,
}: {
  kind: 'object' | 'relationship';
  value?: Lifecycle;
  onChange: (value: Lifecycle | undefined) => void;
}) {
  const prefix = useId();
  return (
    <>
      <label htmlFor={`${prefix}-${kind}-status`}>
        {kind === 'object' ? 'Objektets status' : 'Sambandets status'}
      </label>
      <select
        id={`${prefix}-${kind}-status`}
        value={value ?? 'active'}
        onChange={(event) => onChange(event.target.value as Lifecycle)}
      >
        <option value="ended">Upphört</option>
        <option value="active">Gäller fortfarande</option>
      </select>
      <p>Välj status uttryckligen. En egenskap med etiketten Slutdatum ändrar inte status.</p>
    </>
  );
}

const dateKnowledge = {
  known: 'Känt',
  uncertain: 'Osäkert uppgivet',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
} as const;

export function RelationshipEndDate({
  value,
  onChange,
}: {
  value?: FinancialFact;
  onChange: (value: FinancialFact | undefined) => void;
}) {
  return (
    <>
      <label htmlFor="relationship-end-date-knowledge">
        Sambandets slutdatum: uppgiftens säkerhet
      </label>
      <select
        id="relationship-end-date-knowledge"
        value={value?.knowledge ?? ''}
        onChange={(event) => {
          const knowledge = event.target.value as FinancialFact['knowledge'] | '';
          onChange(
            !knowledge
              ? undefined
              : knowledge === 'known' || knowledge === 'uncertain'
                ? { knowledge, value: value?.value ?? '' }
                : { knowledge },
          );
        }}
      >
        <option value="">Ej uppgivet</option>
        {Object.entries(dateKnowledge).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {(value?.knowledge === 'known' || value?.knowledge === 'uncertain') && (
        <>
          <label htmlFor="relationship-end-date">Sambandets slutdatum</label>
          <input
            id="relationship-end-date"
            type="date"
            required
            value={value.value}
            onChange={(event) => onChange({ ...value, value: event.target.value })}
          />
        </>
      )}
    </>
  );
}
