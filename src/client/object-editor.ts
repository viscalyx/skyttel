import type { CustomValues, ObjectType, ObjectValue } from '../shared/map.js';

export type ObjectEditor = {
  id: string;
  version: number;
  contentVersion: number;
  baseRevision: number | null;
  typeRevision: number;
  value: ObjectValue;
  displacedFields?: { id: string; type: ObjectType; values: CustomValues }[];
  fieldsHandled?: boolean;
};
