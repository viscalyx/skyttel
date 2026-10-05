import { draftConflicts } from './draft-conflicts.js';
import type { MapDraft, MapState } from './map.js';

export type DraftProposalKind = 'object' | 'relationship' | 'objectType' | 'relationshipType';
export type DraftDiscardPlan = { removed: string[]; affected: { key: string; reason: string }[] };

export function draftProposalKey(kind: DraftProposalKind, id: string) {
  const prefix = {
    object: 'object',
    relationship: 'relationship',
    objectType: 'Objekttyp',
    relationshipType: 'Sambandstyp',
  };
  return `${prefix[kind]}-${id}`;
}

export function draftProposalRefs(draft: MapDraft) {
  const refs = (kind: DraftProposalKind, changes: { id: string }[]) =>
    changes.map(({ id }) => ({ kind, id, key: draftProposalKey(kind, id) }));
  return [
    ...refs('object', draft.changes),
    ...refs('relationship', draft.relationships ?? []),
    ...refs('objectType', draft.objectTypes ?? []),
    ...refs('relationshipType', draft.relationshipTypes ?? []),
  ];
}

export function draftDiscardPlan(
  state: MapState,
  after: MapDraft,
  kind: DraftProposalKind | 'all',
  id: string,
): DraftDiscardPlan {
  const remaining = new Set(draftProposalRefs(after).map(({ key }) => key));
  const conflicts = draftConflicts({ ...state, draft: after });
  const dependentKind = kind === 'objectType' ? 'object' : 'relationship';
  const dependents =
    kind === 'objectType'
      ? after.changes
      : kind === 'relationshipType'
        ? (after.relationships ?? [])
        : [];
  return {
    removed: draftProposalRefs(state.draft)
      .filter(({ key }) => !remaining.has(key))
      .map(({ key }) => key),
    affected: dependents
      .filter((change) => change.after?.typeId === id)
      .map((change) => {
        const conflict = conflicts.find(
          (item) => item.kind === dependentKind && item.id === change.id,
        );
        return {
          key: draftProposalKey(dependentKind, change.id),
          reason:
            conflict?.type === null
              ? kind === 'objectType'
                ? 'Objekttypen saknas.'
                : 'Sambandstypen saknas.'
              : conflict?.type
                ? 'Typens uppgifter skiljer sig från förslagets underlag. Rätta förslaget i det ordinarie flödet.'
                : 'Förslaget använder den sparade typen i stället för typförslaget.',
        };
      }),
  };
}
