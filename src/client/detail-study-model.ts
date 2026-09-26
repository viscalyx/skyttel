// Kastbart detaljunderlag. Allt finns i minnet och sparas via talprototypens kvitto.
import { useState } from 'react';
import { type FinancialField, financialFields } from '../shared/financial-facts.js';
import type { StudyObject } from './map-study-types.js';

export type DetailFact = {
  knowledge: 'unset' | 'known' | 'uncertain' | 'unknown' | 'none';
  value: string;
  reportedOn: string;
};

export type DetailRecord = {
  name: string;
  description: string;
  facts: Record<FinancialField, DetailFact>;
};

const knowledgeLabels = {
  unset: 'Ej uppgivet',
  known: 'Känt',
  uncertain: 'Osäkert uppgivet',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
} as const;

export function factText(fact: DetailFact): string {
  const hasValue = fact.knowledge === 'known' || fact.knowledge === 'uncertain';
  const value = hasValue
    ? `${fact.value || 'Värde saknas'}${fact.knowledge === 'uncertain' ? ' (Osäkert uppgivet)' : ''}`
    : knowledgeLabels[fact.knowledge];
  return fact.knowledge !== 'unset' && fact.reportedOn
    ? `${value} · datum för uppgiften: ${fact.reportedOn}`
    : value;
}

function validDate(value: string) {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function recordErrors(record: DetailRecord): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!record.name.trim()) errors.name = 'Ange ett namn för objektet.';
  for (const field of financialFields) {
    const fact = record.facts[field.key];
    const hasValue = fact.knowledge === 'known' || fact.knowledge === 'uncertain';
    if (hasValue && !fact.value.trim()) {
      errors[field.key] =
        `Ange ${field.label.toLocaleLowerCase('sv')} eller ändra uppgiftens säkerhet.`;
    } else if (hasValue && field.input === 'date' && !validDate(fact.value)) {
      errors[field.key] = 'Ange ett giltigt kalenderdatum.';
    }
    if (field.dated && fact.knowledge !== 'unset' && fact.reportedOn && !validDate(fact.reportedOn))
      errors[`${field.key}-reportedOn`] = 'Ange ett giltigt datum för uppgiften.';
  }
  return errors;
}

function defaultRecord(id: string, objects: StudyObject[]): DetailRecord {
  const object = objects.find((item) => item.id === id);
  const facts = Object.fromEntries(
    financialFields.map(({ key }) => [key, { knowledge: 'unset', value: '', reportedOn: '' }]),
  ) as DetailRecord['facts'];
  if (id === 'subscription') {
    for (const [key, value] of [
      ['price', '189'],
      ['currency', 'SEK'],
      ['paymentInterval', 'Varje månad'],
      ['startDate', '2024-04-01'],
      ['terms', 'Tre månaders uppsägningstid'],
    ] as const) {
      facts[key] = { knowledge: 'known', value, reportedOn: '' };
    }
    facts.endDate = { knowledge: 'unknown', value: '', reportedOn: '' };
  }
  return {
    name: object?.name ?? (id === 'subscription' ? 'Familjeabonnemang' : id),
    description:
      id === 'subscription'
        ? 'Musik för hushållet.'
        : id === 'film'
          ? 'Hushållets påhittade filmtjänst.'
          : (object?.description ?? ''),
    facts,
  };
}

function normalized(record: DetailRecord): DetailRecord {
  return {
    ...record,
    name: record.name.trim(),
    facts: Object.fromEntries(
      financialFields.map(({ key, dated }) => {
        const fact = record.facts[key];
        return [
          key,
          {
            knowledge: fact.knowledge,
            value: ['known', 'uncertain'].includes(fact.knowledge) ? fact.value : '',
            reportedOn: dated && fact.knowledge !== 'unset' ? fact.reportedOn : '',
          },
        ];
      }),
    ) as DetailRecord['facts'],
  };
}

function sameFact(left: DetailFact, right: DetailFact) {
  return (
    left.knowledge === right.knowledge &&
    left.value === right.value &&
    left.reportedOn === right.reportedOn
  );
}

function sameRecord(left: DetailRecord, right: DetailRecord) {
  const a = normalized(left);
  const b = normalized(right);
  return (
    a.name === b.name &&
    a.description === b.description &&
    financialFields.every(({ key }) => sameFact(a.facts[key], b.facts[key]))
  );
}

function voicePrice(record: DetailRecord): DetailRecord {
  return {
    ...record,
    facts: { ...record.facts, price: { knowledge: 'known', value: '199', reportedOn: '' } },
  };
}

export function useDetailStudy(objects: StudyObject[], initialVoiceProposal: boolean) {
  const [saved, setSaved] = useState<Record<string, DetailRecord>>(() =>
    Object.fromEntries(objects.map((object) => [object.id, defaultRecord(object.id, objects)])),
  );
  const [staged, setStaged] = useState<Record<string, DetailRecord>>(
    (): Record<string, DetailRecord> =>
      initialVoiceProposal
        ? { subscription: voicePrice(saved.subscription ?? defaultRecord('subscription', objects)) }
        : {},
  );
  const [buffers, setBuffers] = useState<
    Record<string, { base: DetailRecord; value: DetailRecord }>
  >({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  function savedRecord(id: string) {
    return saved[id] ?? defaultRecord(id, objects);
  }
  function current(id: string) {
    return staged[id] ?? savedRecord(id);
  }
  function buffer(id: string): DetailRecord {
    const entry = buffers[id];
    const latest = current(id);
    if (!entry) return latest;
    // Talets nya förslag följer med i orörda fält; egen oskickad text består.
    return {
      name: entry.value.name === entry.base.name ? latest.name : entry.value.name,
      description:
        entry.value.description === entry.base.description
          ? latest.description
          : entry.value.description,
      facts: Object.fromEntries(
        financialFields.map(({ key }) => [
          key,
          sameFact(entry.value.facts[key], entry.base.facts[key])
            ? latest.facts[key]
            : entry.value.facts[key],
        ]),
      ) as DetailRecord['facts'],
    };
  }
  function edit(id: string, next: DetailRecord) {
    setBuffers((previous) => ({ ...previous, [id]: { base: current(id), value: next } }));
    if (errors[id]) setErrors((previous) => ({ ...previous, [id]: recordErrors(next) }));
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
  function stage(id: string) {
    const value = buffer(id);
    const problems = recordErrors(value);
    if (Object.keys(problems).length) {
      setErrors((previous) => ({ ...previous, [id]: problems }));
      return false;
    }
    setStaged((previous) => {
      const next = { ...previous };
      if (sameRecord(value, savedRecord(id))) delete next[id];
      else next[id] = normalized(value);
      return next;
    });
    resetBuffer(id);
    return true;
  }
  function commit() {
    setSaved((previous) => ({ ...previous, ...staged }));
    setStaged({});
  }
  function proposeVoicePrice() {
    setStaged((previous) => {
      const next = { ...previous };
      const proposal = voicePrice(previous.subscription ?? savedRecord('subscription'));
      if (sameRecord(proposal, savedRecord('subscription'))) delete next.subscription;
      else next.subscription = proposal;
      return next;
    });
  }
  function receiptLines() {
    return Object.entries(staged).flatMap(([id, after]) => {
      const before = savedRecord(id);
      const lines: string[] = [];
      if (before.name !== after.name)
        lines.push(`${before.name}: namn ${before.name} → ${after.name}.`);
      if (before.description !== after.description)
        lines.push(
          `${after.name}: beskrivning ${before.description || 'Ingen'} → ${after.description || 'Ingen'}.`,
        );
      for (const { key, label } of financialFields) {
        if (!sameFact(before.facts[key], after.facts[key]))
          lines.push(
            `${after.name}: ${label} ${factText(before.facts[key])} → ${factText(after.facts[key])}.`,
          );
      }
      return lines;
    });
  }
  function reset() {
    setBuffers({});
    setStaged({});
    setErrors({});
  }
  const ids = [
    ...new Set([
      ...objects.map((object) => object.id),
      ...Object.keys(saved),
      ...Object.keys(staged),
    ]),
  ];
  const unsentIds = Object.keys(buffers).filter((id) => !sameRecord(buffer(id), current(id)));
  return {
    current,
    buffer,
    edit,
    stage,
    resetBuffer,
    staged,
    saved,
    unsentIds,
    unsentCount: unsentIds.length,
    draftCount: Object.keys(staged).length,
    errors,
    commit,
    proposeVoicePrice,
    receiptLines,
    reset,
    names: {
      saved: Object.fromEntries(ids.map((id) => [id, savedRecord(id).name])),
      staged: Object.fromEntries(Object.entries(staged).map(([id, record]) => [id, record.name])),
    },
    descriptions: Object.fromEntries(
      ids.map((id) => {
        const record = current(id);
        return [
          id,
          [
            record.description,
            record.facts.price.knowledge !== 'unset'
              ? `Pris: ${factText(record.facts.price)}.`
              : '',
          ]
            .filter(Boolean)
            .join(' '),
        ];
      }),
    ),
  };
}

export type DetailStudyModel = ReturnType<typeof useDetailStudy>;
