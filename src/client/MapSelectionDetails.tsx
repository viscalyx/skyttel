import { useId, useLayoutEffect, useRef } from 'react';
import type { MapObject, MapState } from '../shared/map.js';
import type { HouseholdReadEntry, householdReadRelationships } from './HouseholdReadDialog.js';
import type { HouseholdTableRow } from './HouseholdTable.js';
import { ObjectReadDetails } from './ObjectReadDetails.js';
import { relationshipLabel } from './RelationshipEditor.js';
import { RelationshipReadDetails } from './RelationshipReadDetails.js';
import './map-selection-details.css';

type RelationshipRow = ReturnType<typeof householdReadRelationships>[number];

/** Read the selected map item; ordinary edits use the same complete native forms. */
export function MapSelectionDetails({
  object,
  relationship,
  previous,
  state,
  objects,
  disabled,
  onRead,
  onEditObject,
  onEditRelationship,
  onClose,
}: {
  object?: HouseholdTableRow;
  relationship?: RelationshipRow;
  previous?: boolean;
  state: MapState;
  objects: Map<string, MapObject>;
  disabled: boolean;
  onRead: (entry: HouseholdReadEntry) => void;
  onEditObject: (object: MapObject, restoreFocus: () => void) => void;
  onEditRelationship: (id: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const item = object?.object ?? relationship?.value;
  const name =
    object?.object.name ??
    (relationship &&
      relationshipLabel(
        relationship.value,
        { relationshipTypes: relationship.type ? [relationship.type] : state.relationshipTypes },
        objects,
      ));
  useLayoutEffect(() => {
    if (item?.id) heading.current?.focus({ preventScroll: true });
  }, [item?.id]);
  if (!item || !name) return null;
  function restoreFocus() {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected && !opener.matches(':disabled'))
        opener.focus({ preventScroll: true });
      else heading.current?.focus({ preventScroll: true });
    };
  }
  return (
    <section
      className="map-inspector map-selection-details"
      aria-labelledby={titleId}
      data-selection-kind={object ? 'object' : 'relationship'}
      data-selection-id={item.id}
    >
      <h2 ref={heading} id={titleId} tabIndex={-1}>
        {object ? object.object.name : 'Valt samband'}
      </h2>
      <p className="map-selection-summary">{name}</p>
      <button type="button" onClick={onClose}>
        Stäng uppgifterna
      </button>
      {previous && <p>× Ersätts i utkastet. Detta är det sparade sambandet före ändringen.</p>}
      <div className="access-actions">
        {object ? (
          <>
            <button
              type="button"
              onClick={() => onRead({ kind: 'object', id: item.id, restoreFocus: restoreFocus() })}
            >
              Läs alla uppgifter för {name}
            </button>
            <button
              type="button"
              disabled={disabled || object.removed || object.proposal === 'Föreslagen borttagning'}
              onClick={() => onEditObject(object.object, restoreFocus())}
            >
              Redigera {name}
            </button>
            <button
              type="button"
              onClick={() =>
                onRead({ kind: 'relationships', id: item.id, restoreFocus: restoreFocus() })
              }
            >
              Samband för {name}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || previous || relationship?.proposal === 'Föreslagen borttagning'}
            onClick={() => onEditRelationship(item.id)}
          >
            Redigera valt samband
          </button>
        )}
      </div>
      {object ? (
        <ObjectReadDetails row={object} full />
      ) : (
        relationship && (
          <RelationshipReadDetails
            value={relationship.value}
            type={relationship.type}
            before={previous ? undefined : relationship.before}
            beforeType={relationship.beforeType}
            objects={objects}
          />
        )
      )}
    </section>
  );
}
