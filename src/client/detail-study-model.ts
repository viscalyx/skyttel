// Kastbart detaljunderlag. Allt finns i minnet och sparas via talprototypens kvitto.
import { useState } from 'react';
import { type FinancialField, financialFields } from '../shared/financial-facts.js';
import type { StudyObject } from './map-study-types.js';
import type { TypeStudyDefinition, TypeStudyModel } from './type-study-model.js';

export type DetailFact = {
  knowledge: 'unset' | 'known' | 'uncertain' | 'unknown' | 'none';
  value: string;
  reportedOn: string;
};

export type DetailRecord = {
  name: string;
  description: string;
  facts: Record<FinancialField, DetailFact>;
  customValues: Record<string, string>;
  typeId?: string;
  identity?: 'identified' | 'unspecified' | 'unanswered';
  displacedFields?: {
    id: string;
    typeName: string;
    fields: {
      id: string;
      name: string;
      kind: 'text' | 'number' | 'date' | 'boolean';
      value: string;
    }[];
  }[];
  fieldsHandled?: boolean;
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

export function recordErrors(
  record: DetailRecord,
  type?: TypeStudyDefinition,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!record.name.trim()) errors.name = 'Ange ett namn för objektet.';
  else if (record.name.length > 200) errors.name = 'Namnet får ha högst 200 tecken.';
  if (record.description.length > 2000)
    errors.description = 'Beskrivningen får ha högst 2 000 tecken.';
  if (record.typeId !== undefined && (!record.typeId || !type || type.kind !== 'object'))
    errors.typeId = 'Välj en objekttyp.';
  if (record.displacedFields?.length && !record.fieldsHandled)
    errors.fieldsHandled = 'Bekräfta att du har tagit hand om uppgifterna från tidigare typer.';
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
  for (const field of type?.fields ?? []) {
    if (field.builtin) continue;
    const value = record.customValues[field.id] ?? '';
    if (!value) continue;
    if (field.kind === 'number' && !Number.isFinite(Number(value)))
      errors[field.id] = `Ange ett tal för ${field.name}.`;
    if (field.kind === 'date' && !validDate(value))
      errors[field.id] = `Ange ett giltigt datum för ${field.name}.`;
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
    name:
      object?.name ?? (id === 'new-object' ? '' : id === 'subscription' ? 'Familjeabonnemang' : id),
    description:
      id === 'subscription'
        ? 'Musik för hushållet.'
        : id === 'film'
          ? 'Hushållets påhittade filmtjänst.'
          : (object?.description ?? ''),
    facts,
    customValues: {},
  };
}

function normalized(record: DetailRecord): DetailRecord {
  return {
    ...record,
    name: record.name.trim(),
    customValues: Object.fromEntries(
      Object.entries(record.customValues).filter(([, value]) => value !== ''),
    ),
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
    a.typeId === b.typeId &&
    a.identity === b.identity &&
    [...new Set([...Object.keys(a.customValues), ...Object.keys(b.customValues)])].every(
      (key) => a.customValues[key] === b.customValues[key],
    ) &&
    financialFields.every(({ key }) => sameFact(a.facts[key], b.facts[key]))
  );
}

function voicePrice(record: DetailRecord): DetailRecord {
  return {
    ...record,
    facts: { ...record.facts, price: { knowledge: 'known', value: '199', reportedOn: '' } },
  };
}

export function useDetailStudy(
  objects: StudyObject[],
  initialVoiceProposal: boolean,
  types?: TypeStudyModel,
) {
  function initialRecord(id: string): DetailRecord {
    const object = objects.find((item) => item.id === id);
    const record = defaultRecord(id, objects);
    return types
      ? { ...record, typeId: object ? types.objectTypeId(object) : '', identity: 'identified' }
      : record;
  }
  const [saved, setSaved] = useState<Record<string, DetailRecord>>(() =>
    Object.fromEntries(objects.map((object) => [object.id, initialRecord(object.id)])),
  );
  const [staged, setStaged] = useState<Record<string, DetailRecord>>(
    (): Record<string, DetailRecord> =>
      initialVoiceProposal
        ? { subscription: voicePrice(saved.subscription ?? initialRecord('subscription')) }
        : {},
  );
  const [buffers, setBuffers] = useState<
    Record<string, { base: DetailRecord; value: DetailRecord }>
  >({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});

  function savedRecord(id: string) {
    return saved[id] ?? initialRecord(id);
  }
  function current(id: string) {
    const record = staged[id] ?? savedRecord(id);
    // Kartans exempel kommer efter första renderingen; komplettera talförslaget
    // med objektets typ när underlaget anländer.
    if (types && !record.typeId) {
      const object = objects.find((item) => item.id === id);
      if (object) return { ...record, typeId: types.objectTypeId(object) };
    }
    return record;
  }
  function buffer(id: string): DetailRecord {
    const entry = buffers[id];
    const latest = current(id);
    if (!entry) return latest;
    // Talets nya förslag följer med i orörda fält; egen oskickad text består.
    return {
      typeId: entry.value.typeId === entry.base.typeId ? latest.typeId : entry.value.typeId,
      identity:
        entry.value.identity === entry.base.identity ? latest.identity : entry.value.identity,
      displacedFields: entry.value.displacedFields,
      fieldsHandled: entry.value.fieldsHandled,
      customValues: Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(entry.value.customValues),
            ...Object.keys(latest.customValues),
          ]),
        ].map((key) => [
          key,
          entry.value.customValues[key] === entry.base.customValues[key]
            ? (latest.customValues[key] ?? '')
            : (entry.value.customValues[key] ?? ''),
        ]),
      ),
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
  function typeDefinition(id: string, useBuffer = false) {
    const record = useBuffer ? buffer(id) : current(id);
    return record.typeId && types ? types.get(record.typeId) : undefined;
  }
  function edit(id: string, next: DetailRecord) {
    setBuffers((previous) => ({ ...previous, [id]: { base: current(id), value: next } }));
    if (errors[id])
      setErrors((previous) => ({
        ...previous,
        [id]: recordErrors(next, next.typeId && types ? types.get(next.typeId) : undefined),
      }));
  }
  function changeType(id: string, typeId: string) {
    const record = buffer(id);
    if (record.typeId === typeId) return;
    const before = typeDefinition(id, true);
    const displaced = Object.entries(record.customValues)
      .filter(([, value]) => value !== '')
      .map(([fieldId, value]) => {
        const field = before?.fields.find((item) => item.id === fieldId);
        return { id: fieldId, name: field?.name ?? fieldId, kind: field?.kind ?? 'text', value };
      });
    edit(id, {
      ...record,
      typeId,
      customValues: {},
      displacedFields: [
        ...(record.displacedFields ?? []),
        ...(displaced.length
          ? [
              {
                id: crypto.randomUUID(),
                typeName: before?.name ?? 'Tidigare typ',
                fields: displaced,
              },
            ]
          : []),
      ],
      fieldsHandled: displaced.length ? false : record.fieldsHandled,
    });
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
    const problems = recordErrors(value, typeDefinition(id, true));
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
  function stageCreation() {
    const value = buffer('new-object');
    const problems = recordErrors(value, typeDefinition('new-object', true));
    if (Object.keys(problems).length) {
      setErrors((previous) => ({ ...previous, 'new-object': problems }));
      return null;
    }
    const id = `created-${crypto.randomUUID()}`;
    setStaged((previous) => ({ ...previous, [id]: normalized(value) }));
    resetBuffer('new-object');
    return id;
  }
  function commit() {
    setSaved((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.keys(staged).map((id) => {
          const record = current(id);
          const {
            displacedFields: _displacedFields,
            fieldsHandled: _fieldsHandled,
            ...value
          } = record;
          return [id, value];
        }),
      ),
    }));
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
    return Object.keys(staged).flatMap((id) => {
      const after = current(id);
      const added = id.startsWith('created-') && !saved[id];
      const before = added ? initialRecord('new-object') : savedRecord(id);
      const lines: string[] = [];
      if (added)
        lines.push(`Nytt objekt: ${after.name} · ${typeDefinition(id)?.name ?? 'Objekt'}.`);
      else if (before.name !== after.name)
        lines.push(`${before.name}: namn ${before.name} → ${after.name}.`);
      if (!added && before.typeId !== after.typeId)
        lines.push(
          `${after.name}: typ ${before.typeId ? types?.get(before.typeId)?.name : 'Ingen'} → ${typeDefinition(id)?.name ?? 'Ingen'}.`,
        );
      if (before.identity !== after.identity) {
        const labels = {
          identified: 'Identifierat objekt',
          unspecified: 'Ospecificerat objekt',
          unanswered: 'Obesvarad identitetsfråga',
        };
        lines.push(
          `${after.name}: identitet ${labels[before.identity ?? 'identified']} → ${labels[after.identity ?? 'identified']}.`,
        );
      }
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
      for (const key of new Set([
        ...Object.keys(before.customValues),
        ...Object.keys(after.customValues),
      ])) {
        if (before.customValues[key] !== after.customValues[key]) {
          const field =
            typeDefinition(id)?.fields.find((item) => item.id === key) ??
            (before.typeId
              ? types?.get(before.typeId)?.fields.find((item) => item.id === key)
              : undefined);
          const text = (value: string | undefined) =>
            value
              ? field?.kind === 'boolean'
                ? value === 'true'
                  ? 'Ja'
                  : 'Nej'
                : value
              : 'Ej uppgivet';
          lines.push(
            `${after.name}: ${field?.name ?? key} ${text(before.customValues[key])} → ${text(after.customValues[key])}.`,
          );
        }
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
  const originalById = new Map(objects.map((object) => [object.id, object]));
  const createdIds = ids.filter((id) => id.startsWith('created-') && !originalById.has(id));
  const projectedObjects: StudyObject[] = ids.map((id) => {
    const original = originalById.get(id);
    const record = current(id);
    const createdIndex = createdIds.indexOf(id);
    return {
      id,
      name: record.name,
      type: typeDefinition(id)?.name ?? original?.type ?? 'Objekt',
      description: record.description,
      relation: original?.relation ?? '',
      position: original?.position ?? {
        x: 60 + (createdIndex % 4) * 150,
        y: 100 + Math.floor(createdIndex / 4) * 150,
        z: 120 + (createdIndex % 3) * 100,
      },
      ended: original?.ended,
      change: staged[id]
        ? original?.change === 'added' || (createdIndex >= 0 && !saved[id])
          ? 'added'
          : 'changed'
        : original?.change,
    };
  });
  const creationObject: StudyObject = {
    id: 'new-object',
    name: buffer('new-object').name,
    type: typeDefinition('new-object', true)?.name ?? 'Välj objekttyp',
    description: buffer('new-object').description,
    relation: '',
    position: { x: 0, y: 0, z: 0 },
  };
  return {
    creationObject,
    objects: projectedObjects,
    typeDefinition,
    changeType,
    stageCreation,
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
    unresolvedIds: ids.filter((id) => current(id).identity === 'unanswered'),
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
