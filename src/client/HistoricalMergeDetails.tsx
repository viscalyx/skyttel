import type { SaveReceipt } from '../shared/map.js';
import { LifecycleDetails } from './Lifecycle.js';
import { ObjectPropertiesDetails } from './ObjectProperties.js';
import { CustomFieldsDetails } from './ObjectTypes.js';
import { ProfileImage } from './ProfileImage.js';
import { relationshipLabel } from './RelationshipEditor.js';

export function HistoricalMergeDetails({
  merge,
  householdId,
}: {
  merge: NonNullable<SaveReceipt['changes'][number]['merge']>;
  householdId?: string;
}) {
  return (
    <details>
      <summary>Granskade objekt före sammanslagningen</summary>
      {merge.objects.map((object) => (
        <div key={object.id}>
          <p>
            {object.name} · Identitet: {object.id}
          </p>
          <p>Objekttyp: {merge.types.find((type) => type.id === object.typeId)?.name}.</p>
          <ProfileImage
            householdId={householdId ?? object.householdId}
            value={object}
            typeName={merge.types.find((type) => type.id === object.typeId)?.name}
          />
          <ObjectPropertiesDetails
            showHidden
            type={merge.types.find((type) => type.id === object.typeId)}
            value={object}
          />
          <LifecycleDetails value={object} />
        </div>
      ))}
      {merge.relationships.map((edge) => (
        <div key={edge.id}>
          <p>
            Granskat samband:{' '}
            {relationshipLabel(
              edge,
              { relationshipTypes: merge.relationshipTypes },
              new Map(Object.entries(merge.objectNames).map(([id, name]) => [id, { name }])),
            )}
          </p>
          <p>
            Identitet: {edge.id}. Från {edge.sourceId} till{' '}
            {edge.targetId ?? 'okänd eller ingen ändpunkt'}.
          </p>
          <CustomFieldsDetails
            type={merge.relationshipTypes.find((type) => type.id === edge.typeId)}
            values={edge.customValues}
            showHidden
          />
          <LifecycleDetails value={edge} />
        </div>
      ))}
    </details>
  );
}
