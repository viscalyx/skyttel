import type { MapState, RelationshipValue } from './map.js';

/** Private form-attempt evidence, separate from the current household state and shared saves. */
export type RelationshipFormOutcome = {
  stagingId: string;
  relationshipId: string;
} & (
  | { status: 'staged'; draftVersion: number; value: RelationshipValue | null }
  | { status: 'duplicate' }
);
/** Null establishes absence only for a still-admissible server-issued attempt.
 * Unavailable evidence (including expiry and legacy absence) is the HTTP 409
 * error relationship_confirmation_unavailable, so older clients cannot mistake
 * expiry for absence. Capacity uses relationship_confirmation_capacity (409). */
export type RelationshipFormResult = { outcome: RelationshipFormOutcome | null; state: MapState };
