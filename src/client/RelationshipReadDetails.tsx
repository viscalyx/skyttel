import type { MapObject, RelationshipType, RelationshipValue } from '../shared/map.js';
import { knowledgeLabels } from '../shared/relationship-label.js';
import { factText } from './ObjectReadDetails.js';
import { customReadFields, lifecycleText } from './read-field-values.js';

export function relationshipPropertyValues(
  value: RelationshipValue,
  type: RelationshipType | undefined,
  objects: Map<string, MapObject>,
  objectNames?: Record<string, string>,
) {
  const fields = new Map<string, { label: string; value: string }>([
    ['type', { label: 'Typ', value: type?.name ?? 'Borttagen typ' }],
    [
      'source',
      {
        label: 'Från objekt',
        value:
          objects.get(value.sourceId)?.name ??
          objectNames?.[value.sourceId] ??
          'Objektet finns inte längre',
      },
    ],
    ['direction', { label: 'Riktning', value: type?.forwardLabel ?? type?.name ?? 'Ej uppgivet' }],
    ['reverse', { label: 'Omvänd riktning', value: type?.reverseLabel || 'Ej uppgivet' }],
    [
      'target',
      {
        label: 'Till objekt',
        value: value.targetId
          ? (objects.get(value.targetId)?.name ??
            objectNames?.[value.targetId] ??
            'Objektet finns inte längre')
          : knowledgeLabels[value.knowledge],
      },
    ],
    ['knowledge', { label: 'Uppgiftens säkerhet', value: knowledgeLabels[value.knowledge] }],
    [
      'lifecycle',
      {
        label: 'Status',
        value: lifecycleText(value.lifecycle),
      },
    ],
    ['endDate', { label: 'Slutdatum', value: factText(value.endDate) }],
  ]);
  for (const [key, field] of customReadFields(type?.fields, value.customValues))
    fields.set(key, field);
  return fields;
}

export function RelationshipReadDetails({
  value,
  type,
  before,
  beforeType,
  objects,
}: {
  value: RelationshipValue;
  type?: RelationshipType;
  before?: RelationshipValue | null;
  beforeType?: RelationshipType;
  objects: Map<string, MapObject>;
}) {
  const after = relationshipPropertyValues(value, type, objects);
  const saved = before
    ? relationshipPropertyValues(before, beforeType ?? type, objects)
    : new Map();
  return (
    <dl className="household-read-properties">
      {[...new Set([...after.keys(), ...saved.keys()])].map((key) => {
        const current = after.get(key);
        const previous = saved.get(key);
        const changed = Boolean(
          before && (current?.value !== previous?.value || current?.label !== previous?.label),
        );
        return (
          <div key={key}>
            <dt>{current?.label ?? previous?.label}</dt>
            <dd>
              {changed && (
                <div className="household-table-before">
                  Sparat: {previous?.value ?? 'Ej uppgivet'}
                </div>
              )}
              {changed && <span className="household-table-proposed">◇ Ditt förslag: </span>}
              {current?.value ?? 'Ej uppgivet'}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
