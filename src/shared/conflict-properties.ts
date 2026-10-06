import { conflictRemovalProperties } from './conflict-removal.js';
import type { DraftConflict } from './draft-conflicts.js';
import { financialFields } from './financial-facts.js';
import type { MapState, ObjectType, ObjectValue, RelationshipValue } from './map.js';
import { proposedObjectTypes, proposedRelationshipTypes } from './map.js';
import { objectIconLabel } from './object-icons.js';
import { objectProperties } from './object-properties.js';

export type ConflictSide = 'saved' | 'proposed';
export type ConflictChoices = Record<string, ConflictSide>;
export interface ConflictProperty {
  key: string;
  label: string;
  labels?: Record<ConflictSide, string>;
  saved: unknown;
  proposed: unknown;
  before: unknown;
}
export function sameConflictValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const a = Object.entries(left);
  const b = Object.entries(right);
  return (
    a.length === b.length &&
    a.every(([key, value]) => sameConflictValue(value, (right as Record<string, unknown>)[key]))
  );
}
export function conflictChange(state: MapState, conflict: Pick<DraftConflict, 'kind' | 'id'>) {
  const changes =
    conflict.kind === 'object'
      ? state.draft.changes
      : conflict.kind === 'relationship'
        ? state.draft.relationships
        : conflict.kind === 'objectType'
          ? state.draft.objectTypes
          : state.draft.relationshipTypes;
  return changes?.find((change) => change.id === conflict.id);
}
export function conflictPropertyValue(value: unknown, key: ConflictProperty['key']): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[part]
          : undefined,
      value,
    );
}
export function conflictProperties(state: MapState, conflict: DraftConflict): ConflictProperty[] {
  const change = conflictChange(state, conflict);
  if (
    (conflict.kind === 'objectType' || conflict.kind === 'relationshipType') &&
    !conflict.current &&
    change?.after
  )
    return [
      {
        key: 'definition',
        label: 'Typdefinition',
        before: change.before,
        saved: null,
        proposed: change.after,
      },
    ];
  if (change && !change.after && conflict.kind === 'object' && conflict.current)
    return conflictRemovalProperties(state, conflict);
  if (!change?.after || !conflict.current) return [];
  const entries: [string, string][] =
    conflict.kind === 'object'
      ? [
          ['name', 'Namn'],
          ['typeId', 'Objekttyp'],
          ['description', 'Beskrivning'],
          ['identity', 'Identifiering'],
          ['lifecycle', 'Giltighet'],
          ['profileImageId', 'Profilbild'],
          ['iconId', 'Symbol'],
        ]
      : conflict.kind === 'relationship'
        ? [
            ['typeId', 'Sambandstyp'],
            ['sourceId', 'Från objekt'],
            ['targetId', 'Till objekt'],
            ['knowledge', 'Vad är känt?'],
            ['lifecycle', 'Giltighet'],
            ['endDate', 'Slutdatum'],
          ]
        : [
            ['name', 'Namn'],
            ['description', 'Beskrivning'],
            ['forwardLabel', 'Framåtriktad benämning'],
            ['reverseLabel', 'Omvänd benämning'],
            ['fields', 'Egna fält'],
            ['sections', 'Avsnitt'],
            ['builtins', 'Övriga uppgifter'],
            ['propertyOrder', 'Uppgifternas ordning'],
          ];
  const labels = new Map<string, Record<ConflictSide, string>>();
  if (conflict.kind === 'object' || conflict.kind === 'relationship') {
    const currentTypes = conflict.kind === 'object' ? state.types : state.relationshipTypes;
    const proposedTypes =
      conflict.kind === 'object'
        ? proposedObjectTypes(state.types, state.draft.objectTypes)
        : proposedRelationshipTypes(state.relationshipTypes, state.draft.relationshipTypes);
    const savedTypeId = 'typeId' in conflict.current ? conflict.current.typeId : undefined;
    const savedType = currentTypes.find((type) => type.id === savedTypeId);
    const proposedTypeId = 'typeId' in change.after ? change.after.typeId : undefined;
    const historicalType =
      'type' in change && change.type.id === proposedTypeId ? change.type : undefined;
    const proposedType = proposedTypes.find((type) => type.id === proposedTypeId) ?? historicalType;
    const builtinLabel = (type: typeof proposedType, key: string, fallback: string) =>
      (type && 'builtins' in type
        ? type.builtins?.find((field) => field.key === key)?.name
        : undefined) ?? fallback;
    if (conflict.kind === 'object') {
      for (const [key, fallback] of [
        ['description', 'Beskrivning'],
        ...financialFields.map((field) => [field.key, field.label]),
      ] as [string, string][]) {
        const propertyKey = key === 'description' ? key : `financialFacts.${key}`;
        const sideLabels = {
          saved: builtinLabel(savedType, key, fallback),
          proposed: builtinLabel(proposedType, key, fallback),
        };
        labels.set(propertyKey, sideLabels);
        if (key !== 'description') entries.push([propertyKey, sideLabels.proposed]);
      }
    }
    const keys = new Set(
      [change.before, change.after, conflict.current].flatMap((value) =>
        Object.keys(value && 'customValues' in value ? (value.customValues ?? {}) : {}),
      ),
    );
    for (const key of keys) {
      const historicalLabel =
        historicalType?.fields?.find((field) => field.id === key)?.name ?? key;
      const sideLabels = {
        saved: savedType?.fields?.find((field) => field.id === key)?.name ?? historicalLabel,
        proposed: proposedType?.fields?.find((field) => field.id === key)?.name ?? historicalLabel,
      };
      labels.set(`customValues.${key}`, sideLabels);
      entries.push([`customValues.${key}`, sideLabels.proposed]);
    }
  }
  return entries
    .map(([key, label]) => ({
      key,
      label: labels.get(key)?.proposed ?? label,
      ...(labels.has(key) ? { labels: labels.get(key) } : {}),
      saved: conflictPropertyValue(conflict.current, key),
      proposed: conflictPropertyValue(change.after, key),
      before: conflictPropertyValue(change.before, key),
    }))
    .filter(
      (field) =>
        field.saved !== undefined || field.proposed !== undefined || field.before !== undefined,
    );
}
/** Present each property under its actual side's definition without changing its identity. */
export function conflictPropertyLabel(field: ConflictProperty, side?: ConflictSide): string {
  return side ? (field.labels?.[side] ?? field.label) : field.label;
}
export function combineConflictProperties(fields: ConflictProperty[], choices: ConflictChoices) {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const same = sameConflictValue(field.saved, field.proposed);
    if (!same && !choices[field.key]) return null;
    const value = same || choices[field.key] === 'saved' ? field.saved : field.proposed;
    if (value === undefined) continue;
    const [group, key] = field.key.split('.');
    if (key) {
      const nested = (result[group] ?? {}) as Record<string, unknown>;
      nested[key] = value;
      result[group] = nested;
    } else result[group] = value;
  }
  return result;
}
/** The type and reference meanings are part of the comparison, not just record revisions. */
export function conflictBasis(state: MapState, conflict: DraftConflict) {
  const fields = conflictProperties(state, conflict);
  const typeIds = fields
    .filter((field) => field.key === 'typeId')
    .flatMap((field) => [field.saved, field.proposed]);
  const endpointIds = fields
    .filter((field) => ['sourceId', 'targetId'].includes(field.key))
    .flatMap((field) => [field.saved, field.proposed]);
  const basis = {
    fields,
    ...((conflict.kind === 'objectType' || conflict.kind === 'relationshipType') &&
    !conflict.current
      ? {
          restoration: {
            contentVersion: state.contentVersion,
            definition: (conflict.kind === 'objectType'
              ? state.removedDefinitions?.objectTypes
              : state.removedDefinitions?.relationshipTypes
            )?.find((type) => type.id === conflict.id),
          },
        }
      : {}),
    // Null-side cases have no selectable properties; their proposal and blockers still
    // constitute a real comparison that must be revalidated before any explicit action.
    ...(!fields.length || !conflictChange(state, conflict)?.after
      ? { special: { conflict, change: conflictChange(state, conflict) } }
      : {}),
    types: (conflict.kind === 'relationship'
      ? proposedRelationshipTypes(state.relationshipTypes, state.draft.relationshipTypes)
      : proposedObjectTypes(state.types, state.draft.objectTypes)
    ).filter((type) => typeIds.includes(type.id)),
    endpoints: state.objects
      .filter((object) => endpointIds.includes(object.id))
      .map(({ id, revision, identity }) => ({ id, revision, identity })),
  };
  // The request crosses JSON; omitted optional values must compare identically on both sides.
  return JSON.parse(JSON.stringify(basis)) as typeof basis;
}
export function conflictCombinationError(
  state: MapState,
  conflict: DraftConflict,
  value: Record<string, unknown> | null,
): string {
  if (!value) return '';
  if ('definition' in value) return '';
  if (conflict.kind === 'objectType' || conflict.kind === 'relationshipType') {
    const sections = value.sections as { id: string }[] | undefined;
    const sectionIds = new Set(sections?.map((section) => section.id) ?? ['custom-fields']);
    const fields = (value.fields ?? []) as { id: string; sectionId?: string }[];
    const builtins = (value.builtins ?? []) as { key: string; sectionId: string }[];
    if (
      [...fields, ...builtins].some(
        (property) => property.sectionId && !sectionIds.has(property.sectionId),
      )
    )
      return 'Ett valt fält hänvisar till ett avsnitt som saknas i kombinationen. Välj fält och avsnitt som fungerar tillsammans.';
    const properties = new Set(
      conflict.kind === 'objectType'
        ? objectProperties(
            value as Pick<ObjectType, 'fields' | 'sections' | 'builtins' | 'propertyOrder'>,
          ).map((property) => property.ref)
        : fields.map((field) => `field:${field.id}`),
    );
    const order = value.propertyOrder as string[] | undefined;
    if (
      order &&
      (order.length !== properties.size ||
        new Set(order).size !== order.length ||
        order.some((property) => !properties.has(property)))
    )
      return 'Den valda ordningen hänvisar till en uppgift som saknas i kombinationen.';
  }
  if (conflict.kind === 'object' || conflict.kind === 'relationship') {
    const types =
      conflict.kind === 'object'
        ? proposedObjectTypes(state.types, state.draft.objectTypes)
        : proposedRelationshipTypes(state.relationshipTypes, state.draft.relationshipTypes);
    const type = types.find((type) => type.id === value.typeId);
    if (!type) return 'Den valda typen finns inte. Välj en giltig kombination.';
    for (const [id, entry] of Object.entries(
      (value.customValues ?? {}) as Record<string, unknown>,
    )) {
      const field = type.fields?.find((field) => field.id === id);
      if (
        !field ||
        (field.kind === 'number'
          ? typeof entry !== 'number' || !Number.isFinite(entry)
          : field.kind === 'boolean'
            ? typeof entry !== 'boolean'
            : typeof entry !== 'string')
      )
        return 'Ett valt värde passar inte den valda typens egna fält.';
      if (
        field.kind === 'date' &&
        (typeof entry !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(entry) ||
          Number.isNaN(Date.parse(entry)) ||
          new Date(entry).toISOString().slice(0, 10) !== entry)
      )
        return 'Ett valt datum passar inte den valda typens egna fält.';
      if (field.kind === 'text' && typeof entry === 'string' && entry.length > 2000)
        return 'Ett valt värde är för långt för den valda typens egna fält.';
    }
  }
  if (conflict.kind === 'relationship') {
    const relationship = value as unknown as RelationshipValue;
    if (
      ['known', 'uncertain'].includes(relationship.knowledge)
        ? typeof relationship.targetId !== 'string'
        : relationship.targetId !== null
    )
      return 'Vad som är känt och målobjektet fungerar inte tillsammans. Välj båda uppgifterna så att de stämmer överens.';
    const objects = new Map(state.objects.map((object) => [object.id, object]));
    for (const change of state.draft.changes)
      if (change.after)
        objects.set(change.id, { ...change.after, id: change.id, householdId: '', revision: 0 });
      else objects.delete(change.id);
    if (
      !objects.has(relationship.sourceId) ||
      (relationship.targetId !== null && !objects.has(relationship.targetId))
    )
      return 'Ett valt objekt finns inte i kartan eller ditt utkast.';
    if (
      state.relationships.some(
        (edge) =>
          edge.id !== conflict.id &&
          edge.typeId === relationship.typeId &&
          edge.sourceId === relationship.sourceId &&
          edge.targetId === relationship.targetId,
      )
    )
      return 'Det valda sambandet finns redan i kartan.';
  }
  if (conflict.kind === 'object' && !(value as unknown as ObjectValue).name?.trim())
    return 'Objektet behöver ett namn.';
  return '';
}
export function conflictValueText(
  state: MapState,
  field: ConflictProperty,
  value: unknown,
): string {
  if (field.key === 'definition') {
    if (!value) return 'Borttaget';
    const type = value as ObjectType;
    return `${type.name}${type.description ? ` · ${type.description}` : ''}`;
  }
  if (field.key === 'identity')
    return value === undefined
      ? 'Identifierat objekt'
      : value === 'unspecified'
        ? 'Ospecificerat objekt'
        : 'Behöver redas ut';
  if (field.key === 'lifecycle')
    return value === undefined
      ? 'Följ slutdatum'
      : value === 'ended'
        ? 'Manuellt upphört'
        : 'Gäller fortfarande';
  if (value === undefined || value === null) return 'Ej uppgivet';
  if (field.key === 'typeId')
    return (
      [
        ...state.types,
        ...state.relationshipTypes,
        ...state.draft.changes.map((change) => change.type),
      ].find((type) => type.id === value)?.name ?? String(value)
    );
  if (field.key === 'sourceId' || field.key === 'targetId')
    return (
      state.draft.changes.find((change) => change.id === value)?.after?.name ??
      state.objects.find((object) => object.id === value)?.name ??
      String(value)
    );
  if (field.key === 'iconId' && typeof value === 'string') return objectIconLabel(value);
  if (field.key === 'profileImageId')
    return state.objects.some((object) => object.profileImageId === value)
      ? 'Den sparade profilbilden'
      : 'Din föreslagna profilbild';
  if (Array.isArray(value)) {
    const types = [
      ...state.types,
      ...state.relationshipTypes,
      ...(state.draft.objectTypes ?? []).flatMap((change) => (change.after ? [change.after] : [])),
      ...(state.draft.relationshipTypes ?? []).flatMap((change) =>
        change.after ? [change.after] : [],
      ),
    ];
    const section = (id: string | undefined) =>
      id === ''
        ? 'Dold uppgift'
        : (types.flatMap((type) => type.sections ?? []).find((section) => section.id === id)
            ?.name ?? 'Egna fält');
    if (field.key === 'sections')
      return value.map((entry) => entry.name).join(' → ') || 'Inga avsnitt';
    if (field.key === 'fields')
      return (
        value
          .map(
            (entry) =>
              `${entry.name}: ${({ text: 'Text', number: 'Tal', date: 'Datum', boolean: 'Ja eller nej' } as Record<string, string>)[entry.kind]} · ${section(entry.sectionId)}${entry.description ? ` — ${entry.description}` : ''}`,
          )
          .join('; ') || 'Inga egna fält'
      );
    if (field.key === 'builtins')
      return (
        value.map((entry) => `${entry.name} · ${section(entry.sectionId)}`).join('; ') ||
        'Inga övriga uppgifter'
      );
    if (field.key === 'propertyOrder')
      return (
        value
          .map((ref) => {
            const [kind, id] = String(ref).split(':');
            return kind === 'field'
              ? (types.flatMap((type) => type.fields ?? []).find((field) => field.id === id)
                  ?.name ?? 'Uppgift som saknas')
              : (types
                  .flatMap((type) => ('builtins' in type ? (type.builtins ?? []) : []))
                  .find((field) => field.key === id)?.name ?? 'Uppgift som saknas');
          })
          .join(' → ') || 'Ingen särskild ordning'
      );
  }
  if (typeof value === 'object' && 'knowledge' in value) {
    const fact = value as { knowledge: string; value?: string; reportedOn?: string };
    return `${fact.value ?? { unknown: 'Okänt', none: 'Uttryckligen inget' }[fact.knowledge] ?? ''}${fact.knowledge === 'uncertain' ? ' (Osäkert uppgivet)' : ''}${fact.reportedOn ? ` — datum för uppgiften: ${fact.reportedOn}` : ''}`;
  }
  if (field.key === 'knowledge')
    return (
      (
        {
          known: 'Känt',
          unknown: 'Okänt',
          none: 'Uttryckligen inget',
          uncertain: 'Osäkert uppgivet',
          unresolved: 'Behöver redas ut',
        } as Record<string, string>
      )[String(value)] ?? String(value)
    );
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
  return String(value);
}
