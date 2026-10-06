import type { MapState, RelationshipValue } from './map.js';

/** Private form-attempt evidence, separate from the current household state and shared saves. */
export type RelationshipFormOutcome = {
  stagingId: string;
  relationshipId: string;
} & (
  | { status: 'staged'; draftVersion: number; value: RelationshipValue | null }
  | { status: 'duplicate' }
);
export type RelationshipFormResult = { outcome: RelationshipFormOutcome | null; state: MapState };
