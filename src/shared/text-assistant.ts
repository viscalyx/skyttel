import type { DraftConflict } from './draft-conflicts.js';
import type { MapDraft, ObjectType, RelationshipType, SaveOperation, SaveReceipt } from './map.js';

export type TextAssistantReview = MapDraft & {
  contentVersion: number;
  readyToSave: boolean;
  conflicts: DraftConflict[];
  unresolvedIdentities: { kind: string; id: string }[];
  pendingOperations: SaveOperation[];
  current?: { types: ObjectType[]; relationshipTypes: RelationshipType[] };
};
export interface TextAssistantView {
  id: string;
  revision: number;
  phase: 'ready' | 'working' | 'error' | 'recovery';
  review: TextAssistantReview;
  reply?: string;
  /** Provider conversation is never evidence of a saved or displayed result. */
  modelReply?: string;
  error?: string;
  receipt?: SaveReceipt;
  operations: SaveOperation[];
  selection?: { objectId: string; revision: number };
  displayedSelection?: string;
}
