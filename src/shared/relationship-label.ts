import type { Knowledge, MapState, RelationshipValue } from './map.js';

export const knowledgeLabels: Record<Knowledge, string> = {
  known: 'Känt',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
  uncertain: 'Osäkert uppgivet',
  unresolved: 'Obesvarad identitetsfråga',
};
export function relationshipLabel(
  value: RelationshipValue,
  state: Pick<MapState, 'relationshipTypes'>,
  objects: Map<string, { name: string }>,
  perspectiveId?: string,
) {
  const type = state.relationshipTypes.find((type) => type.id === value.typeId);
  const source = objects.get(value.sourceId)?.name ?? value.sourceId;
  const target = value.targetId
    ? (objects.get(value.targetId)?.name ?? value.targetId)
    : knowledgeLabels[value.knowledge];
  const reverse = perspectiveId === value.targetId && type?.reverseLabel;
  return `${reverse ? target : source} → ${reverse || type?.forwardLabel || type?.name || value.typeId} → ${reverse ? source : target}${value.knowledge === 'uncertain' ? ' (Osäkert uppgivet)' : ''}`;
}
