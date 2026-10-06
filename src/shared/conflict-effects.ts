import type { DraftConflict } from './draft-conflicts.js';
import type { DefinitionRestoration, ObjectType, RelationshipType } from './map.js';

/** The private proposals an explicit conflict choice must affect before recovery reports success. */
export type PrivateConflictEffect = { target: Pick<DraftConflict, 'kind' | 'id'> } & (
  | { kind: 'discard' }
  | {
      kind: 'retain';
      before: unknown;
      after: unknown;
      restoration?: DefinitionRestoration<ObjectType | RelationshipType>;
    }
);
