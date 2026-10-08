import { useId, useLayoutEffect, useRef } from 'react';
import { hasEnded } from '../shared/lifecycle.js';
import type { MapObject, MapState } from '../shared/map.js';
import { relationshipLabel } from '../shared/relationship-label.js';
import type { HouseholdReadEntry, householdReadRelationships } from './HouseholdReadDialog.js';
import type { HouseholdTableRow } from './HouseholdTable.js';
import { moveObjectActionFocus, ObjectActionButtons } from './ObjectActionButtons.js';
import { ObjectReadDetails } from './ObjectReadDetails.js';
import { RelationshipReadDetails } from './RelationshipReadDetails.js';
import { useMovableWindow } from './use-movable-window.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
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
  onRevealObject,
  onFocusObject,
  onRemoveObject,
  mapAvailable = true,
  active = true,
  order = 0,
  focusRequest = 0,
  offset = 0,
  onActivate,
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
  onRevealObject?: (object: MapObject) => void;
  onFocusObject?: (id: string) => void;
  onRemoveObject?: (object: MapObject) => Promise<boolean> | undefined;
  mapAvailable?: boolean;
  active?: boolean;
  order?: number;
  focusRequest?: number;
  offset?: number;
  onActivate?: () => void;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const focusedOrder = useRef<{ id: string; request: number } | null>(null);
  const movable = useMovableWindow(panel, active && Boolean(object), offset);
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
    if (
      active &&
      item?.id &&
      (focusedOrder.current?.id !== item.id || focusedOrder.current.request !== focusRequest)
    ) {
      focusedOrder.current = { id: item.id, request: focusRequest };
      heading.current?.focus({ preventScroll: true });
    }
  }, [item?.id, active, focusRequest]);
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
      ref={panel}
      hidden={!active}
      className={`map-inspector map-selection-details${object ? ' object-property-window' : ''}`}
      style={
        object && movable.position
          ? { left: movable.position.x, top: movable.position.y, right: 'auto', zIndex: order }
          : undefined
      }
      aria-labelledby={titleId}
      data-selection-kind={object ? 'object' : 'relationship'}
      data-selection-id={item.id}
      data-dragging={movable.dragging}
      onPointerDownCapture={() => onActivate?.()}
      onFocusCapture={() => onActivate?.()}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole lint/a11y/useSemanticElements: The focusable title group provides a keyboard alternative to dragging. */}
      <header
        role="group"
        className="object-property-header"
        tabIndex={object ? 0 : undefined}
        aria-label={object ? `Flytta uppgiftsfönstret för ${name}` : undefined}
        aria-describedby={object ? `${titleId}-move-help` : undefined}
        {...(object ? movable.handle : {})}
      >
        <h2 ref={heading} id={titleId} tabIndex={-1}>
          {object ? object.object.name : 'Valt samband'}
        </h2>
        <button
          type="button"
          aria-label="Stäng uppgifterna"
          title="Stäng uppgiftsfönstret"
          onClick={onClose}
        >
          <WorkspaceIcon name="close" />
        </button>
      </header>
      {!object && <p className="map-selection-summary">{name}</p>}
      {object && (
        <span hidden id={`${titleId}-move-help`}>
          Dra titelraden eller fokusera den och använd piltangenterna. Skift flyttar ett större
          steg. Escape avbryter en flytt eller stänger detta fönster.
        </span>
      )}
      <div className="object-property-body">
        {!object && <p>{hasEnded(item) ? 'Upphört' : 'Aktuellt'}</p>}
        {previous && <p>× Ersätts i utkastet. Detta är det sparade sambandet före ändringen.</p>}
        {object ? (
          <ObjectReadDetails
            row={object}
            full
            showHeading={false}
            status={object.removed ? 'Borttaget' : hasEnded(item) ? 'Upphört' : 'Aktuellt'}
          />
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
      </div>
      <div
        className={object ? 'object-property-actions' : 'access-actions'}
        role="toolbar"
        aria-label={object ? `Objektåtgärder för ${name}` : 'Sambandsåtgärder'}
        onKeyDown={moveObjectActionFocus}
      >
        {object ? (
          <ObjectActionButtons
            object={object.object}
            state={state}
            disabled={disabled}
            removed={object.removed}
            mapAvailable={mapAvailable}
            onEdit={(value) => onEditObject(value, restoreFocus())}
            onRelationships={(value) =>
              onRead({ kind: 'relationships', id: value.id, restoreFocus: restoreFocus() })
            }
            onReveal={onRevealObject}
            onFocus={onFocusObject}
            onRemove={
              onRemoveObject &&
              ((value) => {
                const opener = document.activeElement;
                const result = onRemoveObject(value);
                return result?.then((removed) => {
                  requestAnimationFrame(() => {
                    if (
                      document.activeElement !== opener &&
                      document.activeElement !== document.body
                    )
                      return;
                    if (
                      opener instanceof HTMLElement &&
                      opener.isConnected &&
                      !opener.matches(':disabled')
                    )
                      opener.focus({ preventScroll: true });
                    else if (heading.current?.isConnected)
                      heading.current.focus({ preventScroll: true });
                    else onClose();
                  });
                  return removed;
                });
              })
            }
          />
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
      {object && (
        <span className="visually-hidden" role="status">
          {movable.status}
        </span>
      )}
    </section>
  );
}
