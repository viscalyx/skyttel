import { describe, expect, test } from 'vitest';
import { objectPropertyValues } from '../../../src/client/ObjectReadDetails.js';
import { relationshipPropertyValues } from '../../../src/client/RelationshipReadDetails.js';
import type { ObjectType, RelationshipType } from '../../../src/shared/map.js';

const type: ObjectType & RelationshipType = {
  id: 'type',
  householdId: 'household',
  revision: 1,
  name: 'Exempel',
  description: '',
  fields: [
    { id: 'yes', name: 'Ja-fält', description: '', kind: 'boolean' },
    { id: 'missing', name: 'Saknad uppgift', description: '', kind: 'text' },
  ],
};

describe.each([undefined, 'active', 'ended'] as const)('read lifecycle %s', (lifecycle) => {
  test('object and relationship readers preserve known, missing and unlisted field answers', () => {
    const customValues = { yes: true, unlisted: false, amount: 42, note: 'Text' };
    const readers = [
      objectPropertyValues(
        { name: 'Objekt', typeId: type.id, description: '', customValues, lifecycle },
        type,
      ),
      relationshipPropertyValues(
        {
          typeId: type.id,
          sourceId: 'source',
          targetId: null,
          knowledge: 'unknown',
          customValues,
          lifecycle,
        },
        type,
        new Map(),
      ),
    ];
    for (const fields of readers) {
      expect(fields.get('field:yes')).toEqual({ label: 'Ja-fält', value: 'Ja' });
      expect(fields.get('field:missing')).toEqual({
        label: 'Saknad uppgift',
        value: 'Ej uppgivet',
      });
      expect(fields.get('field:unlisted')).toEqual({ label: 'unlisted', value: 'Nej' });
      expect(fields.get('field:amount')?.value).toBe('42');
      expect(fields.get('field:note')?.value).toBe('Text');
      expect(fields.get('lifecycle')?.value).toBe(
        lifecycle === 'active'
          ? 'Gäller fortfarande'
          : lifecycle === 'ended'
            ? 'Manuellt upphört'
            : 'Följ slutdatum',
      );
    }
  });
});
