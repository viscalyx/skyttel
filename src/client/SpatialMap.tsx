import './spatial.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapObject, MapRelationship, MapState } from '../shared/map.js';
import { relationshipLabel } from './RelationshipEditor.js';
import { type ProjectedPoint, spatialScene } from './spatial-scene.js';

export function ProposalSymbol({ change }: { change?: { before: unknown; after: unknown } }) {
  if (!change) return null;
  const kind = !change.after ? 'removed' : !change.before ? 'added' : 'changed';
  return (
    <span
      className={`proposal-symbol ${kind}`}
      title={
        kind === 'removed'
          ? 'Föreslås tas bort'
          : kind === 'added'
            ? 'Nytt förslag'
            : 'Ändrat förslag'
      }
    >
      {kind === 'removed' ? '×' : kind === 'added' ? '+' : '~'}
    </span>
  );
}

const icons: Record<string, string> = {
  Person: '♙',
  Företag: '▣',
  Förening: '◇',
  Tjänst: '✦',
  Tjänstekonto: '◎',
  'E-postadress': '@',
  Bostad: '⌂',
  Garage: '▤',
  Fordon: '⇥',
  Abonnemang: '↻',
  Avtal: '≡',
  Hyresavtal: '⌂↔',
  Låneavtal: '↗',
  Kreditavtal: '±',
  Avbetalningsavtal: '⋯',
  Skuld: '−',
  Kreditutrymme: '⊞',
  'Utnyttjad kredit': '⊟',
  Betalningsmedel: '¤',
  Bankkonto: '▥',
  Kort: '▭',
};
const cameraActions = [
  ['left', 'Panorera vänster'],
  ['right', 'Panorera höger'],
  ['up', 'Panorera uppåt'],
  ['down', 'Panorera nedåt'],
  ['rotate-left', 'Rotera vänster'],
  ['rotate-right', 'Rotera höger'],
  ['tilt-up', 'Luta uppåt'],
  ['tilt-down', 'Luta nedåt'],
  ['in', 'Zooma in'],
  ['out', 'Zooma ut'],
] as const;

export function SpatialMap({
  state,
  active,
  objects,
  relationships,
  selection,
  disabled,
  onSelect,
  onSelectRelationship,
  onFocus,
  onClear,
  onReset,
  onRemove,
}: {
  state: MapState;
  active: boolean;
  objects: Map<string, MapObject>;
  relationships: Map<string, MapRelationship>;
  selection: { kind: 'object' | 'relationship'; id: string } | null;
  disabled: boolean;
  onSelect: (object: MapObject) => void;
  onSelectRelationship: (edge: MapRelationship) => void;
  onFocus: (id: string) => void;
  onClear: () => void;
  onReset: () => void;
  onRemove: (object: MapObject) => void;
}) {
  const [activated, setActivated] = useState(active);
  useEffect(() => {
    if (active) setActivated(true);
  }, [active]);
  const menu = useRef<HTMLDialogElement>(null);
  const [menuObject, setMenuObject] = useState<MapObject | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const held = useRef(false);
  const cancelHold = useCallback(() => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  }, []);
  function openMenu(object: MapObject, target: HTMLElement) {
    cancelHold();
    returnFocus.current = target;
    setMenuObject(object);
  }
  function closeMenu() {
    menu.current?.close();
    setMenuObject(null);
    returnFocus.current?.focus();
  }
  useEffect(() => {
    if (menuObject) menu.current?.showModal();
  }, [menuObject]);
  useEffect(() => () => cancelHold(), [cancelHold]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof spatialScene> | null>(null);
  const [points, setPoints] = useState<ProjectedPoint[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [allLabels, setAllLabels] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!activated || !canvas.current) return;
    const element = canvas.current;
    const lost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
      scene.current?.contextLost(true);
    };
    const restored = () => {
      // Three restores its renderer during the same browser event.
      queueMicrotask(() => {
        scene.current?.contextLost(false);
        setContextLost(false);
      });
    };
    element.addEventListener('webglcontextlost', lost);
    element.addEventListener('webglcontextrestored', restored);
    try {
      scene.current = spatialScene(element, setPoints);
    } catch {
      setUnavailable(true);
    }
    return () => {
      element.removeEventListener('webglcontextlost', lost);
      element.removeEventListener('webglcontextrestored', restored);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [activated]);
  useEffect(() => {
    if (!activated) return;
    scene.current?.update([...objects.keys()]);
  }, [objects, activated]);
  useEffect(() => {
    if (!resetRequested) return;
    // Reframe after the shared view has revealed previously filtered objects.
    scene.current?.reset();
    setResetRequested(false);
  }, [resetRequested]);
  const locations = new Map(
    points.filter((point) => point.visible).map((point) => [point.id, point]),
  );
  const occupied: { x: number; y: number; width: number; height: number }[] = [];
  function place(x: number, y: number, width: number, height: number) {
    let target = { x, y, width, height };
    const surfaceWidth = canvas.current?.clientWidth ?? 0;
    const surfaceHeight = canvas.current?.clientHeight ?? 0;
    for (let step = 0; step < 49; step += 1) {
      const offsets = [0, 1, -1, 2, -2, 3, -3];
      const column = offsets[step % 7];
      const row = offsets[Math.floor(step / 7)];
      const candidate =
        step === 0
          ? target
          : { x: x + column * (width + 12), y: y + row * (height + 12), width, height };
      if (
        candidate.x - width / 2 < 8 ||
        candidate.x + width / 2 > surfaceWidth - 8 ||
        candidate.y - height / 2 < 8 ||
        candidate.y + height / 2 > surfaceHeight - 8
      )
        continue;
      if (
        !occupied.some(
          (other) =>
            Math.abs(other.x - candidate.x) < (other.width + width) / 2 + 8 &&
            Math.abs(other.y - candidate.y) < (other.height + height) / 2 + 8,
        )
      ) {
        target = candidate;
        break;
      }
    }
    occupied.push(target);
    return target;
  }
  const labels = new Map(
    [...locations].map(([id, point]) => [
      id,
      place(point.x, point.y, Math.min(240, (objects.get(id)?.name.length ?? 0) * 8 + 95), 50),
    ]),
  );
  const edges = [...relationships.values()].flatMap((edge) => {
    const source = locations.get(edge.sourceId);
    const target = edge.targetId ? locations.get(edge.targetId) : undefined;
    if (!source || (edge.targetId && !target)) return [];
    const end = target ?? { x: source.x + 100, y: source.y + 80 };
    const selected =
      selection?.kind === 'relationship'
        ? selection.id === edge.id
        : selection?.id === edge.sourceId || selection?.id === edge.targetId;
    const label = place((source.x + end.x) / 2, (source.y + end.y) / 2 + 32, 170, 42);
    return [{ edge, source, end, selected, ...label }];
  });
  return (
    <section className="spatial-map" aria-label="Rymdkarta">
      <h2>Rymdkarta</h2>
      <dialog
        ref={menu}
        className="spatial-menu"
        onClickCapture={(event) => {
          if (held.current) {
            held.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
      >
        <h3>{menuObject?.name}</h3>
        <button
          type="button"
          onClick={() => {
            if (menuObject) onSelect(menuObject);
            closeMenu();
          }}
        >
          Redigera objekt
        </button>
        <button
          type="button"
          onClick={() => {
            if (menuObject) onFocus(menuObject.id);
            closeMenu();
          }}
        >
          Visa kopplingar
        </button>
        <button
          type="button"
          disabled={
            disabled ||
            state.draft.changes.some((change) => change.id === menuObject?.id && !change.after)
          }
          onClick={() => {
            if (menuObject) onRemove(menuObject);
            closeMenu();
          }}
        >
          Ta bort objekt
        </button>
        <button type="button" onClick={closeMenu}>
          Avbryt
        </button>
      </dialog>
      {contextLost && (
        <p className="graphics-notice">Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.</p>
      )}
      {unavailable && (
        <p>Rymdkartan kan inte visas. Använd Lista och detaljer för att fortsätta.</p>
      )}
      <div
        className="spatial-surface"
        role="presentation"
        onPointerDownCapture={(event) => {
          if (!event.isPrimary) cancelHold();
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label="Rymdens bakgrund. Välj innehåll med etiketterna eller listan."
          onPointerDown={(event) => {
            pointer.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (
              pointer.current &&
              Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) < 5
            )
              onClear();
            pointer.current = null;
          }}
        />
        <svg className="spatial-lines" aria-hidden="true">
          <defs>
            <marker
              id="spatial-arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          {[...locations].map(([id, point]) => {
            const label = labels.get(id);
            return (
              label && (
                <line
                  key={`leader-${id}`}
                  className="label-leader"
                  x1={point.x}
                  y1={point.y}
                  x2={label.x}
                  y2={label.y}
                  strokeDasharray={
                    Math.hypot(point.x - label.x, point.y - label.y) > 80 ? '5 5' : undefined
                  }
                />
              )
            );
          })}
          {edges.map(({ edge, source, end, x, y }) => (
            <line
              key={`edge-leader-${edge.id}`}
              className="label-leader"
              x1={(source.x + end.x) / 2}
              y1={(source.y + end.y) / 2}
              x2={x}
              y2={y}
              strokeDasharray={
                Math.hypot((source.x + end.x) / 2 - x, (source.y + end.y) / 2 - y) > 80
                  ? '5 5'
                  : undefined
              }
            />
          ))}
          {edges.map(({ edge, source, end, selected }) => (
            // biome-ignore lint/a11y/useSemanticElements: SVG geometry supplies pointer selection; the HTML label supplies the keyboard route.
            <line
              key={edge.id}
              role="button"
              tabIndex={-1}
              aria-label={`Välj samband: ${relationshipLabel(edge, state, objects)}`}
              onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onSelectRelationship(edge);
                }
              }}
              x1={source.x}
              y1={source.y}
              x2={end.x}
              y2={end.y}
              markerEnd="url(#spatial-arrow)"
              className={selected ? 'connection selected' : 'connection'}
              onClick={() => {
                if (!disabled) onSelectRelationship(edge);
              }}
            />
          ))}
        </svg>
        <div className="spatial-labels">
          {edges.map(({ edge, x, y, selected }) => (
            <button
              key={edge.id}
              type="button"
              disabled={disabled}
              className={`spatial-edge${selected ? ' selected' : ''}`}
              aria-label={`Välj samband: ${relationshipLabel(edge, state, objects)}`}
              style={{ left: x, top: y }}
              onClick={() => onSelectRelationship(edge)}
            >
              <ProposalSymbol
                change={state.draft.relationships?.find((change) => change.id === edge.id)}
              />{' '}
              →{' '}
              {state.relationshipTypes.find((type) => type.id === edge.typeId)?.forwardLabel ??
                state.relationshipTypes.find((type) => type.id === edge.typeId)?.name}
            </button>
          ))}
          {[...locations.values()].map((point) => {
            const object = objects.get(point.id);
            if (!object) return null;
            return (
              <button
                key={point.id}
                type="button"
                disabled={disabled}
                aria-label={`Välj objekt: ${object.name}`}
                aria-pressed={selection?.kind === 'object' && selection.id === object.id}
                style={{ left: labels.get(point.id)?.x, top: labels.get(point.id)?.y }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  openMenu(object, event.currentTarget);
                }}
                onPointerDown={(event) => {
                  cancelHold();
                  held.current = false;
                  if (event.pointerType === 'touch' && event.isPrimary) {
                    const target = event.currentTarget;
                    hold.current = {
                      x: event.clientX,
                      y: event.clientY,
                      timer: window.setTimeout(() => {
                        held.current = true;
                        openMenu(object, target);
                      }, 550),
                    };
                  }
                }}
                onPointerMove={(event) => {
                  if (
                    hold.current &&
                    Math.hypot(event.clientX - hold.current.x, event.clientY - hold.current.y) > 8
                  )
                    cancelHold();
                }}
                onPointerUp={cancelHold}
                onPointerCancel={cancelHold}
                onPointerLeave={cancelHold}
                onClick={(event) => {
                  if (held.current) {
                    held.current = false;
                    return;
                  }
                  if (event.ctrlKey) onFocus(object.id);
                  else onSelect(object);
                }}
              >
                <span
                  className="type-icon"
                  aria-hidden="true"
                  title={state.types.find((type) => type.id === object.typeId)?.name}
                >
                  {icons[state.types.find((type) => type.id === object.typeId)?.name ?? ''] ??
                    state.types.find((type) => type.id === object.typeId)?.name.slice(0, 2)}
                </span>
                <ProposalSymbol
                  change={state.draft.changes.find((change) => change.id === object.id)}
                />{' '}
                {object.name}
              </button>
            );
          })}
        </div>
      </div>
      <details className="camera-tools">
        <summary>Navigera rymden</summary>
        <p>
          Dra tom rymd för att rotera. Två fingrar panorerar och nypzoomar. Använd också knapparna.
        </p>
        <div className="access-actions">
          {cameraActions.map(([command, label]) => (
            <button key={command} type="button" onClick={() => scene.current?.navigate(command)}>
              {label}
            </button>
          ))}
        </div>
      </details>
      <div className="spatial-bottom-bar">
        <button
          type="button"
          onClick={() => {
            setAllLabels(false);
            onReset();
            setResetRequested(true);
          }}
        >
          Återställ vy
        </button>
        <label>
          <input
            type="checkbox"
            checked={allLabels}
            onChange={(event) => {
              setAllLabels(event.target.checked);
              if (event.target.checked) {
                scene.current?.navigate('in');
                scene.current?.navigate('in');
              }
            }}
          />{' '}
          Alla etiketter
        </label>
      </div>
      {allLabels && (
        <p className="label-note">Närmare utsnitt. Panorera för att se fler etiketter.</p>
      )}
    </section>
  );
}
