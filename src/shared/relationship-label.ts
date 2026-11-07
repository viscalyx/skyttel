import type { MapState, RelationshipValue } from './map.js';
import { relationshipReverseVerb, relationshipVerb } from './relationship-verb.js';

export function relationshipLabel(
  value: RelationshipValue,
  state: Pick<MapState, 'relationshipTypes'>,
  objects: Map<string, { name: string }>,
  perspectiveId?: string,
) {
  const type = state.relationshipTypes.find((type) => type.id === value.typeId);
  const source = objects.get(value.sourceId)?.name ?? value.sourceId;
  const target = objects.get(value.targetId)?.name ?? value.targetId;
  const reverse = perspectiveId === value.targetId && relationshipReverseVerb(value, type);
  return `${reverse ? target : source} → ${reverse || relationshipVerb(value, type)} → ${reverse ? source : target}`;
}
