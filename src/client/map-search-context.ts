import { hasEnded } from '../shared/lifecycle.js';
import type { MapObject, MapRelationship } from '../shared/map.js';

export type MapSearchSource = {
  objects: Map<string, MapObject>;
  relationships: Map<string, MapRelationship>;
  previousRelationships?: MapRelationship[];
};

/** One hop from each search hit or explicitly explored object; never recursive. */
export function mapSearchContext(
  { objects, relationships, previousRelationships = [] }: MapSearchSource,
  hits: Iterable<string>,
  explored: string[],
  includeEnded: boolean,
) {
  const roots = new Set([...hits, ...explored]);
  const visible = new Set<string>();
  const edges = new Map<string, MapRelationship>();
  const previousIds = new Set<string>();
  let hiddenEnded = false;
  for (const id of roots) {
    const object = objects.get(id);
    if (!object) continue;
    if (!includeEnded && hasEnded(object)) hiddenEnded = true;
    else visible.add(id);
  }
  const connections = [
    ...[...relationships.values()].map((edge) => ({ edge, previous: false })),
    ...previousRelationships.map((edge) => ({ edge, previous: true })),
  ];
  for (const { edge, previous } of connections) {
    if (!roots.has(edge.sourceId) && (!edge.targetId || !roots.has(edge.targetId))) continue;
    const source = objects.get(edge.sourceId);
    const target = edge.targetId ? objects.get(edge.targetId) : undefined;
    if (!source || (edge.targetId && !target)) continue;
    if (!includeEnded && (hasEnded(edge) || hasEnded(source) || (target && hasEnded(target)))) {
      hiddenEnded = true;
      continue;
    }
    visible.add(source.id);
    if (target) visible.add(target.id);
    if (previous) previousIds.add(edge.id);
    else edges.set(edge.id, edge);
  }
  return {
    objects: new Map([...objects].filter(([id]) => visible.has(id))),
    relationships: edges,
    hiddenEnded,
    previousIds,
  };
}
