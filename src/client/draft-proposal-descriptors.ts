import { draftProposalKey } from '../shared/draft-discard.js';
import type {
  DraftChange,
  DraftRelationshipChange,
  MapDraft,
  ObjectTypeChange,
  RelationshipTypeChange,
} from '../shared/map.js';
import { relationshipDetails } from './relationship-description.js';

export type DraftProposalDescriptor = { key: string; name: string } & (
  | { kind: 'Objekt'; change: DraftChange }
  | { kind: 'Samband'; change: DraftRelationshipChange }
  | { kind: 'Objekttyp'; change: ObjectTypeChange }
  | { kind: 'Sambandstyp'; change: RelationshipTypeChange }
);

/** One identity and display name for every draft row and its full reader. */
export function draftProposalDescriptors(draft: MapDraft): DraftProposalDescriptor[] {
  return [
    ...draft.changes.map((change) => ({
      key: draftProposalKey('object', change.id),
      name: change.after?.name ?? change.before?.name ?? 'Objekt',
      kind: 'Objekt' as const,
      change,
    })),
    ...(draft.relationships ?? []).map((change) => {
      const value = change.after ?? change.before;
      return {
        key: draftProposalKey('relationship', change.id),
        name: value
          ? relationshipDetails(
              value,
              change.type.forwardLabel ?? change.type.name,
              change.objectNames,
            )
          : 'Samband',
        kind: 'Samband' as const,
        change,
      };
    }),
    ...(draft.objectTypes ?? []).map((change) => ({
      key: draftProposalKey('objectType', change.id),
      name: change.after?.name ?? change.before?.name ?? 'Objekttyp',
      kind: 'Objekttyp' as const,
      change,
    })),
    ...(draft.relationshipTypes ?? []).map((change) => ({
      key: draftProposalKey('relationshipType', change.id),
      name: change.after?.name ?? change.before?.name ?? 'Sambandstyp',
      kind: 'Sambandstyp' as const,
      change,
    })),
  ];
}
