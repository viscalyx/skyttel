// Kastbart typunderlag. Definitioner delar prototypens utkast och sparbesked.
import { useState } from 'react';
import { type FinancialField, financialFields } from '../shared/financial-facts.js';
import { studyData } from './map-study-data.js';
import type { StudyObject, StudyRelationship } from './map-study-types.js';

export type TypeStudyKind = 'object' | 'relationship';
export type TypeStudyField = {
  id: string;
  name: string;
  kind: 'text' | 'number' | 'date' | 'boolean';
  sectionId: string;
  builtin?: 'description' | FinancialField;
};
export type TypeStudySection = { id: string; name: string };
export type TypeStudyDefinition = {
  id: string;
  kind: TypeStudyKind;
  name: string;
  description: string;
  forwardLabel: string;
  reverseLabel: string;
  sections: TypeStudySection[];
  fields: TypeStudyField[];
};

export const builtinTypeFields: TypeStudyField[] = [
  {
    id: 'builtin-description',
    name: 'Beskrivning',
    kind: 'text',
    sectionId: '',
    builtin: 'description',
  },
  ...financialFields.map(
    ({ key, label, input }): TypeStudyField => ({
      id: `builtin-${key}`,
      name: label,
      kind: input === 'date' ? 'date' : 'text',
      sectionId: '',
      builtin: key,
    }),
  ),
];

function typeId(kind: TypeStudyKind, name: string) {
  return `${kind}-${encodeURIComponent(name)}`;
}

function seedDefinition(kind: TypeStudyKind, name: string): TypeStudyDefinition {
  const subscription = kind === 'object' && name === 'Abonnemang';
  const sections = subscription
    ? [
        { id: 'general', name: 'Grunduppgifter' },
        { id: 'amounts', name: 'Belopp och villkor' },
        { id: 'dates', name: 'Tidsuppgifter' },
      ]
    : [{ id: 'general', name: kind === 'object' ? 'Grunduppgifter' : 'Uppgifter' }];
  const fields =
    kind === 'relationship'
      ? []
      : builtinTypeFields
          .filter((field) => subscription || field.builtin === 'description')
          .map((field) => ({
            ...field,
            sectionId:
              field.builtin === 'description'
                ? 'general'
                : field.builtin === 'startDate' || field.builtin === 'endDate'
                  ? 'dates'
                  : 'amounts',
          }));
  const reverseLabels: Record<string, string> = {
    'står på avtalet': 'har avtalspart',
    använder: 'används av',
    'ger tillgång till': 'ingår i',
    'betalas från': 'betalar',
    'hör till': 'har',
    'inloggningsadress för': 'har inloggningsadress',
    'kopplat till': 'har koppling från',
    'hör ihop med': 'hör ihop med',
    'betalas med': 'betalar',
  };
  return {
    id: typeId(kind, name),
    kind,
    name,
    description: '',
    forwardLabel: kind === 'relationship' ? name : '',
    reverseLabel: kind === 'relationship' ? (reverseLabels[name] ?? '') : '',
    sections,
    fields,
  };
}

function normalized(value: TypeStudyDefinition): TypeStudyDefinition {
  return {
    ...value,
    name: value.name.trim(),
    forwardLabel: value.forwardLabel.trim(),
    reverseLabel: value.reverseLabel.trim(),
    sections: value.sections.map((section) => ({ ...section, name: section.name.trim() })),
    fields: value.fields.map((field) => ({ ...field, name: field.name.trim() })),
  };
}

function sameDefinition(left: TypeStudyDefinition, right: TypeStudyDefinition) {
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

function definitionErrors(value: TypeStudyDefinition) {
  const errors: Record<string, string> = {};
  if (!value.name.trim()) errors.name = 'Ange typens namn.';
  else if (value.name.length > 200) errors.name = 'Typens namn får ha högst 200 tecken.';
  if (value.description.length > 2000)
    errors.description = 'Beskrivningen får ha högst 2 000 tecken.';
  for (const key of ['forwardLabel', 'reverseLabel'] as const) {
    if (value[key].length > 200) errors[key] = 'Benämningen får ha högst 200 tecken.';
  }
  const sectionIds = new Set<string>();
  for (const section of value.sections) {
    if (!section.id || sectionIds.has(section.id))
      errors.sections = 'Varje avsnitt behöver ett eget ID.';
    if (!section.name.trim()) errors[`section:${section.id}`] = 'Ange avsnittets namn.';
    else if (section.name.length > 200)
      errors[`section:${section.id}`] = 'Avsnittets namn får ha högst 200 tecken.';
    sectionIds.add(section.id);
  }
  const fieldIds = new Set<string>();
  const builtins = new Set<string>();
  if (value.fields.length > 100) errors.fields = 'En typ får ha högst 100 egenskaper i provet.';
  for (const field of value.fields) {
    if (!field.id || fieldIds.has(field.id)) errors.fields = 'Varje egenskap behöver ett eget ID.';
    if (!field.name.trim()) errors[`field:${field.id}`] = 'Ange egenskapens namn.';
    else if (field.name.length > 200)
      errors[`field:${field.id}`] = 'Egenskapens namn får ha högst 200 tecken.';
    if (field.sectionId && !sectionIds.has(field.sectionId))
      errors[`field:${field.id}`] = 'Välj ett avsnitt som finns eller dölj egenskapen.';
    if (!['text', 'number', 'date', 'boolean'].includes(field.kind))
      errors[`field:${field.id}`] = 'Välj text, tal, datum eller ja/nej.';
    if (field.builtin) {
      const builtin = builtinTypeFields.find((item) => item.builtin === field.builtin);
      if (value.kind !== 'object' || !builtin || builtin.kind !== field.kind)
        errors[`field:${field.id}`] = 'Den förifyllda egenskapens värdeslag kan inte ändras.';
      if (builtins.has(field.builtin))
        errors[`field:${field.id}`] = 'Egenskapen finns redan i typen.';
      builtins.add(field.builtin);
    }
    fieldIds.add(field.id);
  }
  return errors;
}

function changedLines(before: TypeStudyDefinition | undefined, after: TypeStudyDefinition) {
  const prefix = `${after.kind === 'object' ? 'Objekttyp' : 'Sambandstyp'} ${after.name}`;
  const lines: string[] = [];
  if (!before) lines.push(`${prefix}: ny typ.`);
  else {
    if (before.name !== after.name) lines.push(`${prefix}: namn ${before.name} → ${after.name}.`);
    if (before.description !== after.description)
      lines.push(
        `${prefix}: beskrivning ${before.description || 'Ingen'} → ${after.description || 'Ingen'}.`,
      );
    if (before.forwardLabel !== after.forwardLabel)
      lines.push(
        `${prefix}: benämning framåt ${before.forwardLabel || 'Ingen'} → ${after.forwardLabel || 'Ingen'}.`,
      );
    if (before.reverseLabel !== after.reverseLabel)
      lines.push(
        `${prefix}: benämning bakåt ${before.reverseLabel || 'Ingen'} → ${after.reverseLabel || 'Ingen'}.`,
      );
  }
  for (const section of after.sections) {
    const previous = before?.sections.find((item) => item.id === section.id);
    if (!previous) lines.push(`${prefix}: nytt avsnitt ${section.name}.`);
    else if (previous.name !== section.name)
      lines.push(`${prefix}: avsnitt ${previous.name} → ${section.name}.`);
  }
  for (const section of before?.sections ?? [])
    if (!after.sections.some((item) => item.id === section.id))
      lines.push(`${prefix}: avsnittet ${section.name} tas bort.`);
  function placement(definition: TypeStudyDefinition, field: TypeStudyField) {
    return (
      definition.sections.find((section) => section.id === field.sectionId)?.name ??
      'Dold i detaljvyn'
    );
  }
  const kinds = { text: 'Text', number: 'Tal', date: 'Datum', boolean: 'Ja/nej' };
  for (const field of after.fields) {
    const previous = before?.fields.find((item) => item.id === field.id);
    if (!previous)
      lines.push(
        `${prefix}: ny egenskap ${field.name} (${kinds[field.kind]}) · ${placement(after, field)}.`,
      );
    else {
      if (previous.name !== field.name)
        lines.push(`${prefix}: egenskap ${previous.name} → ${field.name}.`);
      if (previous.kind !== field.kind)
        lines.push(
          `${prefix}: ${field.name}, värdeslag ${kinds[previous.kind]} → ${kinds[field.kind]}.`,
        );
      if (previous.sectionId !== field.sectionId && before)
        lines.push(
          `${prefix}: ${field.name}, ${placement(before, previous)} → ${placement(after, field)}.`,
        );
    }
  }
  for (const field of before?.fields ?? [])
    if (!after.fields.some((item) => item.id === field.id))
      lines.push(`${prefix}: egenskapen ${field.name} tas bort.`);
  for (const [key, label] of [
    ['sections', 'Avsnittens'],
    ['fields', 'Egenskapernas'],
  ] as const) {
    if (!before) continue;
    const a = before[key].map((item) => item.id);
    const b = after[key].map((item) => item.id);
    if (
      a.length === b.length &&
      a.every((id) => b.includes(id)) &&
      a.some((id, index) => b[index] !== id)
    )
      lines.push(`${prefix}: ${label} ordning ändras.`);
  }
  return lines;
}

export function useTypeStudy(objects: StudyObject[], relationships: StudyRelationship[]) {
  const [initial] = useState(() => {
    const samples = studyData('large', true);
    const allObjects = [...samples.objects, ...objects];
    const allRelationships = [...samples.relationships, ...relationships];
    const definitions = [
      ...[...new Set(allObjects.map((object) => object.type))].map((name) =>
        seedDefinition('object', name),
      ),
      ...[...new Set(allRelationships.map((edge) => edge.label))].map((name) =>
        seedDefinition('relationship', name),
      ),
    ];
    return {
      definitions: Object.fromEntries(definitions.map((definition) => [definition.id, definition])),
      objectTypes: Object.fromEntries(
        allObjects.map((object) => [object.id, typeId('object', object.type)]),
      ),
      relationshipTypes: Object.fromEntries(
        allRelationships.map((edge) => [edge.id, typeId('relationship', edge.label)]),
      ),
    };
  });
  const [saved, setSaved] = useState<Record<string, TypeStudyDefinition>>(initial.definitions);
  const [staged, setStaged] = useState<Record<string, TypeStudyDefinition>>({});
  const [buffers, setBuffers] = useState<Record<string, TypeStudyDefinition>>({});
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  function get(id: string): TypeStudyDefinition | undefined {
    return staged[id] ?? saved[id];
  }
  function buffer(id: string): TypeStudyDefinition | undefined {
    return buffers[id] ?? get(id);
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
  function edit(id: string, next: TypeStudyDefinition) {
    const current = get(id);
    const value = { ...next, id, kind: current?.kind ?? next.kind };
    setBuffers((previous) => ({ ...previous, [id]: value }));
    if (errors[id]) setErrors((previous) => ({ ...previous, [id]: definitionErrors(value) }));
  }
  function newType(kind: TypeStudyKind) {
    const id = `${kind}-${crypto.randomUUID()}`;
    setBuffers((previous) => ({
      ...previous,
      [id]: { ...seedDefinition(kind, ''), id },
    }));
    return id;
  }
  function stage(id: string) {
    const value = buffer(id);
    if (!value) return false;
    const problems = definitionErrors(value);
    if (Object.keys(problems).length) {
      setErrors((previous) => ({ ...previous, [id]: problems }));
      return false;
    }
    setStaged((previous) => {
      const next = { ...previous };
      if (saved[id] && sameDefinition(value, saved[id])) delete next[id];
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
  function reset() {
    setBuffers({});
    setStaged({});
    setErrors({});
  }
  const definitions = Object.values({ ...saved, ...staged });
  const allIds = [...new Set([...definitions.map(({ id }) => id), ...Object.keys(buffers)])];
  const unsentIds = Object.keys(buffers).filter((id) => {
    const current = get(id);
    return !current || !sameDefinition(buffers[id], current);
  });
  return {
    definitions,
    allIds,
    get,
    buffer,
    edit,
    newType,
    stage,
    resetBuffer,
    errors,
    unsentIds,
    staged,
    draftCount: Object.keys(staged).length,
    commit,
    reset,
    receiptLines: () =>
      Object.entries(staged).flatMap(([id, after]) => changedLines(saved[id], after)),
    objectTypeId: (object: StudyObject) =>
      initial.objectTypes[object.id] ?? typeId('object', object.type),
    relationshipTypeId: (edge: StudyRelationship) =>
      initial.relationshipTypes[edge.id] ?? typeId('relationship', edge.label),
  };
}

export type TypeStudyModel = ReturnType<typeof useTypeStudy>;
