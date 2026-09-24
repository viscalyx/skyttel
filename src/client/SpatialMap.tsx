import './spatial.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MapObject, MapRelationship, MapState } from '../shared/map.js';
import { defaultViewSettings, type Position, type ViewSettings } from '../shared/personal-view.js';
import { LifecycleStatus } from './Lifecycle.js';
import { relationshipLabel } from './RelationshipEditor.js';
import { type ProjectedPoint, spatialScene } from './spatial-scene.js';
import { useObjectMovement } from './use-object-movement.js';
import type { usePersonalView } from './use-personal-view.js';

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

function arrowTip(
  source: { x: number; y: number },
  target: { x: number; y: number },
  label?: { x: number; y: number; width: number; height: number },
) {
  if (!label) return target;
  const halfWidth = label.width / 2 + 6;
  const halfHeight = label.height / 2 + 6;
  const offsetX = target.x - label.x;
  const offsetY = target.y - label.y;
  // A displaced label already exposes its object. Otherwise stop at the
  // label's reserved boundary so that the HTML button cannot hide the arrow.
  if (Math.abs(offsetX) > halfWidth || Math.abs(offsetY) > halfHeight) return target;
  const dx = source.x - target.x;
  const dy = source.y - target.y;
  if (!dx && !dy) return target;
  const fraction = Math.min(
    dx ? (halfWidth - Math.sign(dx) * offsetX) / Math.abs(dx) : Number.POSITIVE_INFINITY,
    dy ? (halfHeight - Math.sign(dy) * offsetY) / Math.abs(dy) : Number.POSITIVE_INFINITY,
    1,
  );
  return { x: target.x + dx * fraction, y: target.y + dy * fraction };
}

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
  personal,
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
  personal?: ReturnType<typeof usePersonalView>;
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
    movement.cancel();
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
  const labelLayer = useRef<HTMLDivElement>(null);
  const labelObserver = useRef<ResizeObserver | null>(null);
  const observeLabel = useCallback((element: HTMLButtonElement | null) => {
    if (!element) return;
    labelObserver.current?.observe(element);
    return () => labelObserver.current?.unobserve(element);
  }, []);
  const [labelSizes, setLabelSizes] = useState(
    new Map<string, { width: number; height: number }>(),
  );
  useLayoutEffect(() => {
    if (!activated || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      setLabelSizes((previous) => {
        const next = new Map(previous);
        let changed = false;
        for (const { target } of entries) {
          const label = target as HTMLButtonElement;
          const id = label.dataset.layoutId;
          if (!id) continue;
          const width = label.offsetWidth;
          const height = label.offsetHeight;
          if (!width || !height) continue;
          if (previous.get(id)?.width !== width || previous.get(id)?.height !== height) {
            next.set(id, { width, height });
            changed = true;
          }
        }
        return changed ? next : previous;
      });
    });
    labelObserver.current = observer;
    for (const label of labelLayer.current?.children ?? []) observer.observe(label);
    return () => {
      observer.disconnect();
      labelObserver.current = null;
    };
  }, [activated]);
  const scene = useRef<ReturnType<typeof spatialScene> | null>(null);
  const [orientation, setOrientation] = useState<Position[]>([]);
  const [moving, setMoving] = useState(false);
  const motionTimer = useRef<number>(0);
  const motion = useCallback(() => {
    setMoving(true);
    window.clearTimeout(motionTimer.current);
    motionTimer.current = window.setTimeout(() => setMoving(false), 1400);
  }, []);
  useEffect(() => () => window.clearTimeout(motionTimer.current), []);
  const settings = personal?.view?.settings ?? defaultViewSettings;
  const [localSettings, setLocalSettings] = useState(defaultViewSettings);
  const preferences = personal ? settings : localSettings;
  function configure(value: Partial<ViewSettings>) {
    if (
      (Object.keys(value) as (keyof ViewSettings)[]).every((key) => value[key] === preferences[key])
    )
      return;
    const { version: _version, ...current } = { ...preferences, version: 0 };
    const next = { ...current, ...value };
    if (personal) void personal.configure(next);
    else setLocalSettings(next);
  }
  const [points, setPoints] = useState<ProjectedPoint[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const allLabels = preferences.allLabels;
  const previousLabels = useRef(false);
  const [resetRequested, setResetRequested] = useState(false);
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
    multiple: boolean;
  } | null>(null);
  const movement = useObjectMovement(scene, {
    enabled: Boolean(personal?.view) && !personal?.pending && !contextLost,
    active,
    cancelHold,
    onMove: (id, position) => personal?.move(id, position),
  });
  useEffect(() => {
    if (!activated || !canvas.current) return;
    const element = canvas.current;
    const lost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
      movement.cancel();
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
      scene.current = spatialScene(element, setPoints, setOrientation, motion);
    } catch {
      setUnavailable(true);
    }
    return () => {
      element.removeEventListener('webglcontextlost', lost);
      element.removeEventListener('webglcontextrestored', restored);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [activated, motion, movement.cancel]);
  const personalReady = !personal || Boolean(personal.view);
  useEffect(() => {
    // The first scene update frames the layout, including saved personal positions.
    if (!activated || !personalReady) return;
    scene.current?.update([...objects.keys()], personal?.view?.positions);
  }, [objects, activated, personal?.view?.positions, personalReady]);
  useEffect(() => {
    if (!activated) return;
    scene.current?.configure(preferences);
    if (preferences.allLabels && !previousLabels.current) {
      scene.current?.navigate('in');
      scene.current?.navigate('in');
    }
    previousLabels.current = preferences.allLabels;
  }, [preferences, activated]);
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
    const target = { x, y, width, height };
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
        occupied.push(candidate);
        return candidate;
      }
    }
    // Fill remaining room for small focused groups before hiding any label.
    for (let row = height / 2 + 8; row <= surfaceHeight - height / 2 - 8; row += height + 12) {
      for (
        let column = width / 2 + 8;
        column <= surfaceWidth - width / 2 - 8;
        column += width + 12
      ) {
        const candidate = { x: column, y: row, width, height };
        if (
          !occupied.some(
            (other) =>
              Math.abs(other.x - column) < (other.width + width) / 2 + 8 &&
              Math.abs(other.y - row) < (other.height + height) / 2 + 8,
          )
        ) {
          occupied.push(candidate);
          return candidate;
        }
      }
    }
    if (allLabels) {
      occupied.push(target);
      return target;
    }
    return null;
  }
  const candidates = [
    ...[...locations].flatMap(([id, point]) => {
      const object = objects.get(id);
      if (!object) return [];
      const size = labelSizes.get(`object-${id}`) ?? {
        width: Math.min(240, object.name.length * 8 + 95),
        height: 50,
      };
      return [
        {
          key: `object-${id}`,
          ...point,
          ...size,
          priority:
            selection?.kind === 'object' && selection.id === id
              ? 0
              : state.draft.changes.some((change) => change.id === id)
                ? 2
                : 3,
        },
      ];
    }),
    ...[...relationships.values()].flatMap((edge) => {
      const source = locations.get(edge.sourceId);
      const target = edge.targetId ? locations.get(edge.targetId) : undefined;
      if (!source || (edge.targetId && !target)) return [];
      const end = target ?? { x: source.x + 100, y: source.y + 80 };
      const size = labelSizes.get(`relationship-${edge.id}`) ?? { width: 170, height: 42 };
      return [
        {
          key: `relationship-${edge.id}`,
          x: (source.x + end.x) / 2,
          y: (source.y + end.y) / 2 + size.height / 2 + 11,
          ...size,
          priority:
            selection?.kind === 'relationship' && selection.id === edge.id
              ? 0
              : selection?.kind === 'object' &&
                  [edge.sourceId, edge.targetId].includes(selection.id)
                ? 1
                : state.draft.relationships?.some((change) => change.id === edge.id)
                  ? 2
                  : 4,
        },
      ];
    }),
  ].sort((a, b) => a.priority - b.priority || a.key.localeCompare(b.key));
  const placed = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const candidate of candidates) {
    const label = place(candidate.x, candidate.y, candidate.width, candidate.height);
    if (label) placed.set(candidate.key, label);
  }
  const labels = new Map(
    [...locations.keys()].flatMap((id) => {
      const label = placed.get(`object-${id}`);
      return label ? [[id, label] as const] : [];
    }),
  );
  const edges = [...relationships.values()].flatMap((edge) => {
    const source = locations.get(edge.sourceId);
    const target = edge.targetId ? locations.get(edge.targetId) : undefined;
    if (!source || (edge.targetId && !target)) return [];
    const end = target ?? { x: source.x + 100, y: source.y + 80 };
    const tip = arrowTip(source, end, edge.targetId ? labels.get(edge.targetId) : undefined);
    const selected =
      selection?.kind === 'relationship'
        ? selection.id === edge.id
        : selection?.id === edge.sourceId || selection?.id === edge.targetId;
    return [{ edge, source, end, tip, selected }];
  });
  const labeledEdges = edges.flatMap((edge) => {
    const label = placed.get(`relationship-${edge.edge.id}`);
    return label ? [{ ...edge, ...label }] : [];
  });
  return (
    <section
      className={`spatial-map${!allLabels && placed.size < candidates.length ? ' crowded' : ''}`}
      aria-label="Rymdkarta"
    >
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
          movement.down(event);
        }}
        onPointerMoveCapture={movement.move}
        onPointerUpCapture={movement.end}
        onPointerCancelCapture={movement.cancel}
        onClickCapture={(event) => {
          if (movement.suppressClick()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label="Rymdens bakgrund. Välj innehåll med etiketterna eller listan."
          onPointerDown={(event) => {
            if (pointer.current) pointer.current.multiple = true;
            else
              pointer.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false,
                multiple: !event.isPrimary,
              };
          }}
          onPointerMove={(event) => {
            if (
              pointer.current &&
              Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 5
            )
              pointer.current.moved = true;
          }}
          onPointerUp={(event) => {
            if (
              pointer.current &&
              pointer.current.id === event.pointerId &&
              !pointer.current.moved &&
              !pointer.current.multiple &&
              Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) < 5
            )
              onClear();
            pointer.current = null;
          }}
          onPointerCancel={() => {
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
          {movement.guide &&
            (() => {
              const start = scene.current?.project(movement.guide.start);
              const end = scene.current?.project(movement.guide.end);
              return (
                start &&
                end && (
                  <g className="height-guide">
                    <circle cx={start.x} cy={start.y} r="6" />
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      markerEnd="url(#spatial-arrow)"
                    />
                    <text x={start.x + 10} y={start.y - 12}>
                      Höjdflyttning · personlig vy
                    </text>
                  </g>
                )
              );
            })()}
          {[...locations].map(([id, point]) => {
            const label = labels.get(id);
            return (
              label && (
                <line
                  key={`leader-${id}`}
                  data-object-id={id}
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
          {labeledEdges.map(({ edge, source, end, x, y }) => (
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
          {edges.map(({ edge, source, tip, selected }) => (
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
              x2={tip.x}
              y2={tip.y}
              markerEnd="url(#spatial-arrow)"
              className={selected ? 'connection selected' : 'connection'}
              onClick={() => {
                if (!disabled) onSelectRelationship(edge);
              }}
            />
          ))}
        </svg>
        <div className="spatial-labels" ref={labelLayer}>
          {labeledEdges.map(({ edge, x, y, selected }) => (
            <button
              key={edge.id}
              data-layout-id={`relationship-${edge.id}`}
              ref={observeLabel}
              type="button"
              disabled={disabled}
              className={`spatial-edge${selected ? ' selected' : ''}`}
              aria-label={`Välj samband: ${relationshipLabel(edge, state, objects)}`}
              style={{ left: x, top: y }}
              onClick={() => onSelectRelationship(edge)}
            >
              <span className="spatial-caption">
                <ProposalSymbol
                  change={state.draft.relationships?.find((change) => change.id === edge.id)}
                />{' '}
                →{' '}
                {state.relationshipTypes.find((type) => type.id === edge.typeId)?.forwardLabel ??
                  state.relationshipTypes.find((type) => type.id === edge.typeId)?.name}
              </span>
              <LifecycleStatus value={edge} />
            </button>
          ))}
          {[...locations.values()].map((point) => {
            const object = objects.get(point.id);
            if (!object || !labels.has(point.id)) return null;
            return (
              <button
                key={point.id}
                data-layout-id={`object-${point.id}`}
                ref={observeLabel}
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
                  movement.start(object.id, event);
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
                <span className="spatial-caption">
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
                </span>
                <LifecycleStatus value={object} />
              </button>
            );
          })}
        </div>
        {(moving || preferences.axisPinned) && (
          <svg
            className={`spatial-axis ${preferences.axisCorner}`}
            role="img"
            aria-label="Rummets axlar: sidled X, höjd Y, djup Z"
            viewBox="0 0 90 90"
          >
            {orientation.map((axis, index) => (
              <g key={['X', 'Y', 'Z'][index]}>
                <line x1="45" y1="45" x2={45 + axis.x * 28} y2={45 - axis.y * 28} />
                <text x={45 + axis.x * 35} y={49 - axis.y * 35}>
                  {['X', 'Y', 'Z'][index]}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
      <div className="spatial-tools">
        <details className="camera-tools">
          <summary>Navigera rymden</summary>
          <p>
            Dra tom rymd för att rotera. Två fingrar panorerar och nypzoomar. Använd också
            knapparna.
          </p>
          <div className="access-actions">
            {cameraActions.map(([command, label]) => (
              <button key={command} type="button" onClick={() => scene.current?.navigate(command)}>
                {label}
              </button>
            ))}
          </div>
        </details>
        <details className="camera-tools personal-tools">
          <summary>Ordna min vy</summary>
          <p>
            Placeringarna är bara dina. Dra objektet för att flytta. Shift eller ett andra stilla
            finger ger höjdled. Avbruten gest återställer placeringen.
          </p>
          <fieldset disabled={!personal?.view || personal.pending}>
            <legend>Flytta valt objekt</legend>
            {(
              [
                ['x', -1, 'vänster i rummet'],
                ['x', 1, 'höger i rummet'],
                ['y', 1, 'uppåt i rummet'],
                ['y', -1, 'nedåt i rummet'],
                ['z', -1, 'inåt i rummet'],
                ['z', 1, 'utåt i rummet'],
              ] as const
            ).map(([axis, step, label]) => (
              <button
                key={label}
                type="button"
                disabled={selection?.kind !== 'object'}
                onClick={() => {
                  if (selection?.kind !== 'object') return;
                  const position = scene.current?.position(selection.id);
                  if (position) {
                    const next = { ...position, [axis]: position[axis] + step };
                    scene.current?.place(selection.id, next);
                    void personal?.move(selection.id, next);
                  }
                }}
              >
                Flytta {label}
              </button>
            ))}
          </fieldset>
          <fieldset disabled={personal && (!personal.view || personal.pending)}>
            <legend>Personliga visningsval</legend>
            {(
              [
                ['invertX', 'Vänd panorering i sidled'],
                ['invertY', 'Vänd panorering i höjdled'],
                ['axisPinned', 'Visa axlar hela tiden'],
                ['stars', 'Visa stjärnhimmel'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) => configure({ [key]: event.target.checked })}
                />
                {label}
              </label>
            ))}
            <label htmlFor="personal-axis-corner">Axelvisarens hörn</label>
            <select
              id="personal-axis-corner"
              value={preferences.axisCorner}
              onChange={(event) =>
                configure({ axisCorner: event.target.value as ViewSettings['axisCorner'] })
              }
            >
              <option value="bottom-right">Nere till höger</option>
              <option value="bottom-left">Nere till vänster</option>
              <option value="top-right">Uppe till höger</option>
              <option value="top-left">Uppe till vänster</option>
            </select>
          </fieldset>
          {personal && (
            <button
              type="button"
              disabled={personal.pending}
              onClick={() => void personal.refresh()}
            >
              Läs in min aktuella vy
            </button>
          )}
        </details>
      </div>
      {personal?.message && (
        <p aria-live="polite" className="personal-view-status">
          {personal.message}
        </p>
      )}
      <div className="spatial-bottom-bar">
        <button
          type="button"
          onClick={() => {
            configure({ allLabels: false });
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
            disabled={personal && (!personal.view || personal.pending)}
            onChange={(event) => {
              configure({ allLabels: event.target.checked });
            }}
          />{' '}
          Alla etiketter
        </label>
      </div>
      {!allLabels && placed.size < candidates.length && (
        <p className="label-note">
          {placed.size} av {candidates.length} etiketter visas för läsbarhet. Alla objekt och
          samband finns i listan. Sök eller välj ett objekt och visa dess kopplingar.
        </p>
      )}
      {allLabels && (
        <p className="label-note">Närmare utsnitt. Panorera för att se fler etiketter.</p>
      )}
    </section>
  );
}
