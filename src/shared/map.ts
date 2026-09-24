import type { FinancialFact, FinancialFacts } from './financial-facts.js';
import type { Lifecycle } from './lifecycle.js';

export interface TypeDefinition {
  id: string;
  householdId: string;
  revision: number;
  name: string;
  description: string;
}
export interface CustomField {
  id: string;
  name: string;
  description: string;
  kind: 'text' | 'number' | 'date' | 'boolean';
}
export interface ObjectType extends TypeDefinition {
  fields?: CustomField[];
}
export interface ObjectTypeChange {
  id: string;
  before: ObjectType | null;
  after: ObjectType;
}
export type CustomValues = Record<string, string | number | boolean>;
export type RelationshipType = TypeDefinition;

export interface ObjectValue {
  typeId: string;
  name: string;
  description: string;
  identity?: 'unspecified' | 'unresolved';
  financialFacts?: FinancialFacts;
  customValues?: CustomValues;
  lifecycle?: Lifecycle;
}
export interface MapObject extends ObjectValue {
  id: string;
  householdId: string;
  revision: number;
}
export interface DraftChange {
  id: string;
  before: MapObject | null;
  after: ObjectValue | null;
  type: ObjectType;
}
export interface MapDraft {
  version: number;
  changes: DraftChange[];
  relationships?: DraftRelationshipChange[];
  objectTypes?: ObjectTypeChange[];
}
export interface MapState {
  userId: string;
  contentVersion: number;
  types: ObjectType[];
  objects: MapObject[];
  relationshipTypes: RelationshipType[];
  relationships: MapRelationship[];
  draft: MapDraft;
}
export interface SaveReceipt {
  contentVersion: number;
  operationId: string;
  draftVersion: number;
  householdId: string;
  userId: string;
  savedAt: string;
  relationships?: RelationshipChange[];
  objectTypes?: ObjectTypeChange[];
  changes: { before: MapObject | null; after: MapObject | null; type: ObjectType }[];
}

interface SaveOperationIdentity {
  operationId: string;
  householdId: string;
  userId: string;
  draftVersion: number;
  contentVersion: number;
  createdAt: string;
}
export type SaveOperation = SaveOperationIdentity &
  (
    | { status: 'pending' }
    | { status: 'succeeded'; receipt: SaveReceipt }
    | { status: 'rejected'; error: string }
  );

export type Knowledge = 'known' | 'unknown' | 'none' | 'uncertain' | 'unresolved';
export interface RelationshipValue {
  typeId: string;
  sourceId: string;
  targetId: string | null;
  knowledge: Knowledge;
  lifecycle?: Lifecycle;
  endDate?: FinancialFact;
}
export interface MapRelationship extends RelationshipValue {
  id: string;
  householdId: string;
  revision: number;
}
export interface RelationshipChange {
  id: string;
  before: MapRelationship | null;
  after: RelationshipValue | null;
  type: RelationshipType;
  objectNames?: Record<string, string>;
}
export interface DraftRelationshipChange extends RelationshipChange {
  // Object deletions that require this generated relationship deletion.
  removedWithObjects?: string[];
}

export function proposedRelationships(
  saved: MapRelationship[],
  changes: RelationshipChange[] = [],
) {
  const result = new Map(saved.map((value) => [value.id, value]));
  for (const change of changes) {
    if (change.after)
      result.set(change.id, {
        ...change.after,
        id: change.id,
        householdId: change.type.householdId,
        revision: change.before?.revision ?? 0,
      });
    else result.delete(change.id);
  }
  return result;
}

export function proposedObjectTypes(saved: ObjectType[], changes: ObjectTypeChange[] = []) {
  const result = new Map(saved.map((type) => [type.id, type]));
  for (const change of changes) result.set(change.id, change.after);
  return [...result.values()];
}
