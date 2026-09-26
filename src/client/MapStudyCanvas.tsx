// Kastbar kartstudie: tre lässtrategier delar samma bestående 3D-kamera.
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { defaultViewSettings } from '../shared/personal-view.js';
import type {
  StudyCamera,
  StudyCameraAction,
  StudyObject,
  StudyPosition,
  StudyRelationship,
  StudyVariant,
} from './map-study-types.js';
import { ProfileStudyGlyph } from './ProfileStudyGlyph.js';
import { SpatialHeightGuide } from './SpatialHeightGuide.js';
import { type ProjectedPoint, type SpatialCameraSnapshot, spatialScene } from './spatial-scene.js';
import { useObjectMovement } from './use-object-movement.js';
import './map-study-canvas.css';

type Props = {
  objects: StudyObject[];
  relationships: StudyRelationship[];
  selectedId: string;
  selectedIds: string[];
  selectedRelationship: string | null;
  emphasisIds: string[];
  emphasisEdges: string[];
  variant: StudyVariant;
  theme: 'light' | 'dark';
  stars?: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onClearSelection: () => void;
  onOpenDetails: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onMove: (id: string, position: StudyPosition) => void;
  cameraRef: RefObject<StudyCamera | null>;
  onCameraChange: (description: string) => void;
  onOverviewChange: (canReturn: boolean) => void;
};

type Box = { x: number; y: number; width: number; height: number };
type Name = {
  id: string;
  text: string;
  kind: 'object' | 'relationship';
  priority: number;
  change?: StudyObject['change'];
};

const changeSymbol = { added: '+', changed: '✎', removed: '×' };
const changeName = {
  added: 'föreslås läggas till',
  changed: 'föreslås ändras',
  removed: 'föreslås tas bort',
};
const dragThreshold = 8;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width + 5 &&
    a.x + a.width + 5 > b.x &&
    a.y < b.y + b.height + 5 &&
    a.y + a.height + 5 > b.y
  );
}

export function MapStudyCanvas(props: Props) {
  const {
    objects,
    relationships,
    selectedId,
    selectedIds,
    selectedRelationship,
    emphasisIds,
    emphasisEdges,
    variant,
    theme,
    stars = true,
    cameraRef,
  } = props;
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof spatialScene> | null>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [camera, setCamera] = useState<SpatialCameraSnapshot | null>(null);
  const [projected, setProjected] = useState<ProjectedPoint[]>([]);
  const [graphicsError, setGraphicsError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const history = useRef<SpatialCameraSnapshot[]>([]);
  const overviewReturn = useRef<SpatialCameraSnapshot | null>(null);
  const cameraGesture = useRef<SpatialCameraSnapshot | null>(null);
  const activeObject = useRef<string | null>(null);
  const clickGuard = useRef<{
    pointer: number;
    x: number;
    y: number;
    moved: boolean;
    handled: boolean;
    suppressed: boolean;
    empty: boolean;
    active: boolean;
  } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [measurements, setMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [statusHeight, setStatusHeight] = useState(32);
  const [guidePanel, setGuidePanel] = useState<Box>({ x: 12, y: 12, width: 310, height: 80 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const helpId = useId();
  const selection = useMemo(() => new Set(selectedIds), [selectedIds]);
  const emphasized = useMemo(() => new Set(emphasisIds), [emphasisIds]);
  const emphasizedEdges = useMemo(() => new Set(emphasisEdges), [emphasisEdges]);
  const faded = emphasisIds.length > 0;
  const cancelHold = useCallback(() => {}, []);
  const movement = useObjectMovement(sceneRef, {
    enabled: !graphicsError,
    active: true,
    cancelHold,
    onMove: (id, position) => latest.current.onMove(id, position),
  });

  useEffect(() => {
    const down = (event: globalThis.KeyboardEvent) => {
      if (
        event.key === 'Shift' &&
        !(
          event.target instanceof Element &&
          event.target.closest('input, textarea, select, [contenteditable]')
        )
      )
        setShiftHeld(true);
    };
    const up = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Shift') setShiftHeld(false);
    };
    const blur = () => {
      setShiftHeld(false);
      if (clickGuard.current) clickGuard.current.suppressed = true;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const synchronizeCamera = useCallback(() => {
    const snapshot = sceneRef.current?.snapshot();
    if (!snapshot) return;
    setCamera((previous) =>
      JSON.stringify(previous) === JSON.stringify(snapshot) ? previous : snapshot,
    );
    const distance = Math.hypot(
      snapshot.position.x - snapshot.target.x,
      snapshot.position.y - snapshot.target.y,
      snapshot.position.z - snapshot.target.z,
    );
    latest.current.onCameraChange(
      `Kameravstånd ${Math.round(distance)}. ${history.current.length} tidigare vyer.`,
    );
  }, []);

  const rememberCamera = useCallback(() => {
    const snapshot = sceneRef.current?.snapshot();
    if (snapshot) history.current = [...history.current.slice(-29), snapshot];
  }, []);

  function navigate(action: StudyCameraAction) {
    if (graphicsError) return;
    rememberCamera();
    sceneRef.current?.navigate(action);
  }

  function frame(ids?: string[]) {
    if (graphicsError) return;
    rememberCamera();
    if (ids?.length) sceneRef.current?.reveal(ids);
    else sceneRef.current?.reset();
    synchronizeCamera();
  }

  function focusSelection(ids: string[]) {
    const scene = sceneRef.current;
    const root = rootRef.current;
    if (!scene || !root || !ids.length || graphicsError) return;
    const canvas = root.getBoundingClientRect();
    const centerX = canvas.left + canvas.width / 2;
    const centerY = canvas.top + canvas.height / 2;
    const markerMargin = 32;
    let halfWidth = canvas.width / 2 - markerMargin;
    let halfHeight = canvas.height / 2 - markerMargin;
    const overlays = root
      .closest('.map-study')
      ?.querySelectorAll(
        '.vp-d-toolbox, .vp-d-status, .mp-lab, .mp-selection-actions, .voice-map-key',
      );
    for (const overlay of overlays ?? []) {
      const box = overlay.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (box.top < centerY && box.bottom > centerY) {
        if (box.right <= centerX)
          halfWidth = Math.min(halfWidth, centerX - box.right - markerMargin);
        if (box.left >= centerX) halfWidth = Math.min(halfWidth, box.left - centerX - markerMargin);
      }
      if (box.left < centerX && box.right > centerX) {
        if (box.bottom <= centerY)
          halfHeight = Math.min(halfHeight, centerY - box.bottom - markerMargin);
        if (box.top >= centerY) halfHeight = Math.min(halfHeight, box.top - centerY - markerMargin);
      }
    }
    const aspect = canvas.width / canvas.height;
    const widthFraction = (2 * Math.max(24, halfWidth)) / canvas.width;
    const heightFraction = (2 * Math.max(24, halfHeight)) / canvas.height;
    const padding = Math.max(
      1.35,
      Math.min(aspect, 1) / Math.min(aspect * widthFraction, heightFraction),
    );
    rememberCamera();
    scene.reveal(ids, padding);
    synchronizeCamera();
  }

  function back() {
    const previous = history.current.pop();
    if (previous && !graphicsError) sceneRef.current?.restore(previous);
  }

  function showOverview() {
    const scene = sceneRef.current;
    if (!scene || graphicsError) return;
    overviewReturn.current ??= scene.snapshot();
    scene.reset();
    latest.current.onOverviewChange(true);
    synchronizeCamera();
  }

  function toggleOverview() {
    const scene = sceneRef.current;
    if (!scene || graphicsError) return;
    if (overviewReturn.current) {
      scene.restore(overviewReturn.current);
      overviewReturn.current = null;
      latest.current.onOverviewChange(false);
      synchronizeCamera();
    } else {
      showOverview();
    }
  }

  useImperativeHandle(cameraRef, () => ({ navigate, frame, focusSelection, back, toggleOverview }));

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      setSize({ width: Math.max(1, box.width), height: Math.max(1, box.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    overviewReturn.current = null;
    latest.current.onOverviewChange(false);
    let remembered = false;
    const cameraPointers = new Set<number>();
    let lastWheel = -Infinity;
    const pointerStart = (event: globalThis.PointerEvent) => {
      if (
        event.target !== canvas &&
        !(event.target instanceof Element && event.target.closest('[data-object-id]')) &&
        !cameraPointers.size
      )
        return;
      if (!cameraPointers.size) {
        cameraGesture.current = sceneRef.current?.snapshot() ?? null;
        remembered = false;
      }
      cameraPointers.add(event.pointerId);
    };
    const pointerEnd = (event: globalThis.PointerEvent) => {
      cameraPointers.delete(event.pointerId);
      if (!cameraPointers.size) {
        const start = cameraGesture.current;
        cameraGesture.current = null;
        if (event.type === 'pointercancel' && start) sceneRef.current?.restore(start);
      }
    };
    const wheelStart = () => {
      const now = performance.now();
      if (now - lastWheel > 400) rememberCamera();
      lastWheel = now;
    };
    const lost = (event: Event) => {
      event.preventDefault();
      sceneRef.current?.contextLost(true);
      movement.cancel();
      activeObject.current = null;
      setGraphicsError(
        'Grafiken har avbrutits. Öppna text och lista för att fortsätta med alla objekt och samband.',
      );
    };
    const restored = () =>
      queueMicrotask(() => {
        sceneRef.current?.contextLost(false);
        setGraphicsError(null);
      });
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    root.addEventListener('pointerdown', pointerStart, true);
    root.addEventListener('pointerup', pointerEnd, true);
    root.addEventListener('pointercancel', pointerEnd, true);
    root.addEventListener('wheel', wheelStart, { capture: true, passive: true });
    try {
      sceneRef.current = spatialScene(
        canvas,
        (values) => {
          setProjected(values);
          synchronizeCamera();
        },
        undefined,
        () => {
          const snapshot = sceneRef.current?.snapshot();
          if (
            cameraGesture.current &&
            !remembered &&
            JSON.stringify(snapshot) !== JSON.stringify(cameraGesture.current)
          ) {
            history.current = [...history.current.slice(-29), cameraGesture.current];
            remembered = true;
          }
          synchronizeCamera();
        },
        root,
        {
          getRotationCenter: () => {
            const positions = latest.current.selectedIds.flatMap((id) => {
              const position =
                sceneRef.current?.position(id) ??
                latest.current.objects.find((object) => object.id === id)?.position;
              return position && Object.values(position).every(Number.isFinite) ? [position] : [];
            });
            if (!positions.length) return null;
            return positions.reduce(
              (center, position) => ({
                x: center.x + position.x / positions.length,
                y: center.y + position.y / positions.length,
                z: center.z + position.z / positions.length,
              }),
              { x: 0, y: 0, z: 0 },
            );
          },
        },
      );
    } catch {
      setGraphicsError(
        'Grafiken kunde inte starta. Öppna text och lista för att läsa och ändra alla objekt och samband.',
      );
    }
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      root.removeEventListener('pointerdown', pointerStart, true);
      root.removeEventListener('pointerup', pointerEnd, true);
      root.removeEventListener('pointercancel', pointerEnd, true);
      root.removeEventListener('wheel', wheelStart, true);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [rememberCamera, synchronizeCamera, movement.cancel]);

  useEffect(() => {
    if (
      objects.some((object) =>
        Object.values(object.position).some((value) => !Number.isFinite(value)),
      )
    )
      return;
    sceneRef.current?.update(
      objects.map((object) => object.id),
      objects.map((object) => ({ id: object.id, version: 0, ...object.position })),
      relationships.map((edge) => ({ sourceId: edge.from, targetId: edge.to })),
    );
  }, [objects, relationships]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', changed);
    return () => preference.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    sceneRef.current?.configure(
      { ...defaultViewSettings, stars: stars && !reducedMotion },
      {
        background: theme === 'light' ? '#eef3f3' : '#101b29',
        starColor: theme === 'light' ? '#486b7a' : undefined,
      },
    );
  }, [theme, stars, reducedMotion]);

  const points = useMemo(
    () => new Map(projected.filter((point) => point.visible).map((point) => [point.id, point])),
    [projected],
  );
  const edges = useMemo(() => {
    const pairCounts = new Map<string, number>();
    return relationships.flatMap((relationship) => {
      const a = points.get(relationship.from);
      const b = points.get(relationship.to);
      if (!a || !b) return [];
      const pair = [relationship.from, relationship.to].sort().join(':');
      const ordinal = pairCounts.get(pair) ?? 0;
      pairCounts.set(pair, ordinal + 1);
      const length = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const curve = ordinal === 0 ? 0 : (ordinal % 2 ? 1 : -1) * (18 + ordinal * 10);
      const cx = (a.x + b.x) / 2 - ((b.y - a.y) * curve) / length;
      const cy = (a.y + b.y) / 2 + ((b.x - a.x) * curve) / length;
      const t = 0.67;
      const arrow = {
        x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t ** 2 * b.x,
        y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t ** 2 * b.y,
      };
      const angle = Math.atan2(
        (1 - t) * (cy - a.y) + t * (b.y - cy),
        (1 - t) * (cx - a.x) + t * (b.x - cx),
      );
      const tip = { x: arrow.x + Math.cos(angle) * 4, y: arrow.y + Math.sin(angle) * 4 };
      const left = {
        x: arrow.x - Math.cos(angle) * 3 - Math.sin(angle) * 3,
        y: arrow.y - Math.sin(angle) * 3 + Math.cos(angle) * 3,
      };
      const right = {
        x: arrow.x - Math.cos(angle) * 3 + Math.sin(angle) * 3,
        y: arrow.y - Math.sin(angle) * 3 - Math.cos(angle) * 3,
      };
      return [
        {
          relationship,
          d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
          arrow: `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
          middle: { x: (a.x + 2 * cx + b.x) / 4, y: (a.y + 2 * cy + b.y) / 4 },
        },
      ];
    });
  }, [relationships, points]);

  const names = useMemo<Name[]>(() => {
    const result: Name[] = objects.map((object) => ({
      id: object.id,
      text: `${object.change ? `${changeSymbol[object.change]} ` : ''}${object.name}${object.ended ? ' · upphört' : ''}`,
      kind: 'object',
      change: object.change,
      priority: selection.has(object.id)
        ? 0
        : object.id === hoverId
          ? 1
          : object.change
            ? 2
            : emphasized.has(object.id)
              ? 4
              : 6,
    }));
    for (const edge of relationships.filter(
      (relationship) =>
        relationship.id === selectedRelationship ||
        relationship.change ||
        selection.has(relationship.from) ||
        selection.has(relationship.to),
    )) {
      result.push({
        id: `edge:${edge.id}`,
        text: `${edge.change ? `${changeSymbol[edge.change]} ` : ''}${edge.label}`,
        kind: 'relationship',
        change: edge.change,
        priority: edge.id === selectedRelationship ? 2 : 3,
      });
    }
    return result.sort((a, b) => a.priority - b.priority);
  }, [objects, relationships, selection, selectedRelationship, hoverId, emphasized]);

  useLayoutEffect(() => {
    const layer = measurementRef.current;
    if (!layer || !names.length) return;
    const measure = () => {
      const next: Record<string, { width: number; height: number }> = {};
      for (const element of layer.querySelectorAll<HTMLElement>('[data-name-id]')) {
        const box = element.getBoundingClientRect();
        next[element.dataset.nameId ?? ''] = {
          width: Math.ceil(box.width),
          height: Math.ceil(box.height),
        };
      }
      setMeasurements((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      if (statusRef.current) setStatusHeight(statusRef.current.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const element of layer.children) observer.observe(element);
    if (statusRef.current) observer.observe(statusRef.current);
    document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [names]);

  const guideId = movement.heightActive
    ? movement.guide?.id
    : selection.has(selectedId)
      ? selectedId
      : null;
  const guidePosition = guideId ? sceneRef.current?.position(guideId) : null;
  const heightGuide =
    guidePosition && (shiftHeld || movement.heightActive)
      ? {
          start:
            movement.guide && movement.guide.id === guideId ? movement.guide.start : guidePosition,
          end: guidePosition,
        }
      : null;
  const heightGuideVisible = Boolean(heightGuide);
  const guideScale = Math.max(1, (camera?.overviewDistance ?? 30) / 100);

  useLayoutEffect(() => {
    if (!heightGuideVisible || !rootRef.current) return;
    const root = rootRef.current;
    const map = root.closest('.map-study');
    const canvasBox = root.getBoundingClientRect();
    const selection = map?.querySelector('.mp-selection-actions')?.getBoundingClientRect();
    const toolbox = map?.querySelector('.vp-d-toolbox')?.getBoundingClientRect();
    const context = map?.querySelector('.vp-d-context')?.getBoundingClientRect();
    const verticalTools = toolbox && toolbox.height > toolbox.width;
    const x = selection
      ? selection.left - canvasBox.left
      : verticalTools
        ? toolbox.right - canvasBox.left + 16
        : 12;
    const y = Math.max(
      12,
      selection ? selection.bottom - canvasBox.top + 12 : 0,
      context ? context.bottom - canvasBox.top + 12 : 0,
      toolbox && !verticalTools ? toolbox.bottom - canvasBox.top + 12 : 0,
    );
    const next = {
      x: Math.max(12, x),
      y,
      width: Math.min(310, size.width - Math.max(12, x) - 12),
      height: 80,
    };
    setGuidePanel((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );
  });

  const labels = useMemo(() => {
    const clearance = 23;
    const markerBoxes: Box[] = [...points.values()].map((point) => ({
      x: point.x - clearance,
      y: point.y - clearance,
      width: clearance * 2,
      height: clearance * 2,
    }));
    const occupied: Box[] = [
      { x: 0, y: size.height - statusHeight - 22, width: size.width, height: statusHeight + 22 },
    ];
    if (heightGuideVisible) occupied.push(guidePanel);
    const placed: (Name & Box & { point: { x: number; y: number } })[] = [];
    for (const name of names) {
      const dimensions = measurements[name.id];
      const point =
        name.kind === 'object'
          ? points.get(name.id)
          : edges.find((edge) => `edge:${edge.relationship.id}` === name.id)?.middle;
      if (
        !dimensions ||
        !point ||
        point.x < 0 ||
        point.x > size.width ||
        point.y < 0 ||
        point.y > size.height
      )
        continue;
      const { width, height } = dimensions;
      const gap = name.kind === 'object' ? clearance + 8 : 9;
      const candidates = [
        { x: point.x + gap, y: point.y - height / 2 },
        { x: point.x - width - gap, y: point.y - height / 2 },
        { x: point.x - width / 2, y: point.y + gap },
        { x: point.x - width / 2, y: point.y - height - gap },
        { x: point.x + gap, y: point.y - height - gap },
        { x: point.x - width - gap, y: point.y + gap },
      ];
      // The selected name gets first use of space, including a short leader if needed.
      if (name.priority < 3) {
        for (const offset of [55, 95, 145]) {
          candidates.push(
            {
              x: clamp(point.x - width / 2, 12, size.width - width - 12),
              y: point.y - height - offset,
            },
            { x: clamp(point.x - width / 2, 12, size.width - width - 12), y: point.y + offset },
          );
        }
        candidates.push(
          { x: clamp(point.x - width / 2, 12, size.width - width - 12), y: 12 },
          {
            x: clamp(point.x - width / 2, 12, size.width - width - 12),
            y: size.height - statusHeight - height - 30,
          },
        );
      }
      const candidate = candidates
        .map((position) => ({ ...position, width, height }))
        .find(
          (box) =>
            box.x >= 10 &&
            box.y >= 10 &&
            box.x + width <= size.width - 10 &&
            box.y + height <= size.height - 10 &&
            !occupied.some((other) => overlaps(box, other)) &&
            !markerBoxes.some((other) => overlaps(box, other)),
        );
      if (candidate) {
        occupied.push(candidate);
        placed.push({ ...name, ...candidate, point });
      }
    }
    return placed;
  }, [names, measurements, points, edges, size, statusHeight, heightGuideVisible, guidePanel]);

  function beginPointer(event: PointerEvent<HTMLElement>) {
    if (graphicsError || event.button !== 0 || !event.isPrimary) return;
    const target = event.target as Element;
    if (target.closest('[data-edge-id]')) return;
    const objectId = target.closest('[data-object-id]')?.getAttribute('data-object-id');
    if (!objectId) {
      event.currentTarget.focus({ preventScroll: true });
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      activeObject.current = objectId;
      movement.start(objectId, event);
    }
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    const objectId = (event.target as Element)
      .closest('[data-object-id]')
      ?.getAttribute('data-object-id');
    if (
      objectId &&
      (event.key === 'Enter' || event.key === ' ') &&
      (!event.altKey || event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat || activeObject.current) return;
      const additive = event.ctrlKey || event.metaKey;
      if (additive && event.altKey && event.key === 'Enter') latest.current.onOpenDetails(objectId);
      else latest.current.onSelect(objectId, additive);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape' && activeObject.current) {
      movement.cancel();
      activeObject.current = null;
      if (clickGuard.current) clickGuard.current.suppressed = true;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const actions: Record<string, StudyCameraAction> = {
      ArrowLeft: event.shiftKey ? 'rotate-left' : 'left',
      ArrowRight: event.shiftKey ? 'rotate-right' : 'right',
      ArrowUp: event.shiftKey ? 'tilt-up' : 'up',
      ArrowDown: event.shiftKey ? 'tilt-down' : 'down',
      '+': 'in',
      '=': 'in',
      '-': 'out',
    };
    if (actions[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      navigate(actions[event.key]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      showOverview();
    }
  }

  const invalid = objects.some((object) =>
    Object.values(object.position).some((value) => !Number.isFinite(value)),
  );
  const visibleObjects = objects.filter((object) => {
    const point = points.get(object.id);
    return point && point.x >= 0 && point.x <= size.width && point.y >= 0 && point.y <= size.height;
  });
  const namedObjects = labels.filter((label) => label.kind === 'object').length;

  return (
    <section
      ref={rootRef}
      className={`ms-canvas ms-canvas-${variant}`}
      data-theme={theme}
      data-camera={JSON.stringify(camera)}
      data-stars={stars && !reducedMotion ? 'true' : 'false'}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The 3D surface needs keyboard focus for its documented arrow controls.
      tabIndex={0}
      aria-label="Hushållets interaktiva tredimensionella karta"
      aria-describedby={helpId}
      onKeyDown={keyboard}
      onPointerDownCapture={(event) => {
        if (event.isPrimary) {
          movement.suppressClick();
          clickGuard.current = {
            pointer: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
            handled: false,
            suppressed: false,
            empty:
              event.button === 0 &&
              (event.target === canvasRef.current || event.target === rootRef.current),
            active: true,
          };
        } else if (clickGuard.current) clickGuard.current.suppressed = true;
        movement.down(event);
      }}
      onPointerMoveCapture={(event) => {
        const guard = clickGuard.current;
        if (guard?.active && guard.pointer === event.pointerId) {
          if (Math.hypot(event.clientX - guard.x, event.clientY - guard.y) > dragThreshold)
            guard.moved = true;
          else if (guard.empty && !guard.moved && !guard.suppressed) {
            // Keep click jitter out of the native camera gesture handler too.
            // A second pointer or an established drag always passes through.
            event.stopPropagation();
          }
        }
        movement.move(event);
      }}
      onPointerUpCapture={(event) => {
        const guard = clickGuard.current;
        if (guard?.pointer === event.pointerId) {
          guard.active = false;
          if (guard.empty) {
            const target = document.elementFromPoint(event.clientX, event.clientY);
            if (
              Math.hypot(event.clientX - guard.x, event.clientY - guard.y) > dragThreshold ||
              (target !== canvasRef.current && target !== rootRef.current)
            )
              guard.suppressed = true;
          }
        }
        movement.end(event);
        activeObject.current = null;
      }}
      onPointerCancelCapture={() => {
        movement.cancel();
        activeObject.current = null;
        if (clickGuard.current) {
          clickGuard.current.suppressed = true;
          clickGuard.current.active = false;
        }
      }}
      onClickCapture={(event) => {
        const suppressed = movement.suppressClick();
        if (
          event.detail > 0 &&
          (suppressed || clickGuard.current?.moved || clickGuard.current?.suppressed)
        ) {
          if (clickGuard.current) clickGuard.current.suppressed = true;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClick={(event) => {
        const target = event.target as Element;
        const objectId = target.closest('[data-object-id]')?.getAttribute('data-object-id');
        if (objectId) {
          if (event.detail > 1) return;
          if (event.detail > 0 && clickGuard.current) {
            if (clickGuard.current.handled) return;
            clickGuard.current.handled = true;
          }
          const additive = event.ctrlKey || event.metaKey;
          if (additive && event.altKey) latest.current.onOpenDetails(objectId);
          else latest.current.onSelect(objectId, additive);
          return;
        }
        const edge = target.closest('[data-edge-id]')?.getAttribute('data-edge-id');
        if (edge) {
          latest.current.onSelectRelationship(edge);
          return;
        }
        const guard = clickGuard.current;
        if (
          (target === canvasRef.current || target === rootRef.current) &&
          event.detail > 0 &&
          guard?.empty &&
          !guard.active &&
          !guard.moved &&
          !guard.suppressed &&
          !guard.handled
        ) {
          guard.handled = true;
          latest.current.onClearSelection();
        }
      }}
      onDoubleClick={(event) => {
        const objectId = (event.target as Element)
          .closest('[data-object-id]')
          ?.getAttribute('data-object-id');
        if (!objectId) return;
        event.preventDefault();
        event.stopPropagation();
        if (
          clickGuard.current?.moved ||
          clickGuard.current?.suppressed ||
          ((event.ctrlKey || event.metaKey) && event.altKey)
        )
          return;
        latest.current.onOpenDetails(objectId);
      }}
      onContextMenu={(event) => {
        const objectId = (event.target as Element)
          .closest('[data-object-id]')
          ?.getAttribute('data-object-id');
        if (!event.ctrlKey || !objectId) return;
        event.preventDefault();
        const suppressed = movement.suppressClick();
        movement.cancel();
        activeObject.current = null;
        const guard = clickGuard.current;
        if (suppressed || guard?.moved || guard?.suppressed || guard?.handled) return;
        if (guard) guard.handled = true;
        if (event.altKey) latest.current.onOpenDetails(objectId);
        else latest.current.onSelect(objectId, true);
      }}
      onPointerDown={beginPointer}
      onLostPointerCapture={(event) => {
        const guard = clickGuard.current;
        if (guard?.active && guard.pointer === event.pointerId) guard.suppressed = true;
        if (event.target === rootRef.current && activeObject.current) {
          movement.cancel();
          activeObject.current = null;
          if (clickGuard.current) clickGuard.current.suppressed = true;
        }
      }}
    >
      <canvas ref={canvasRef} className="ms-renderer" tabIndex={-1} aria-hidden="true" />
      <p id={helpId} className="ms-screen-reader">
        Dra bakgrunden för att rotera. Håll Skift och dra för att förflytta vyn. Piltangenter
        förflyttar vyn; Skift och pilar roterar. Plus och minus zoomar i kartan. Ctrl eller kommando
        med plus och minus behåller webbläsarens zoom. Klick, Enter eller mellanslag markerar ett
        objekt. Håll Ctrl eller kommando samtidigt för att lägga till eller ta bort objekt ur
        urvalet. Klick i tom rymd avmarkerar allt och släcker framhävda samband. Dubbelklick öppnar
        detaljer. Ctrl eller kommando tillsammans med Alt och klick eller Enter öppnar också
        detaljer. På Mac heter Alt-tangenten Option. Dra ett objekt för att flytta det. Skift eller
        ett andra stillastående finger ger höjdflyttning. Alla objekt och samband finns även i
        textvyn.
      </p>
      {invalid || graphicsError ? (
        <p className="ms-graphics-error" role="alert">
          {graphicsError ??
            'Kartan kan inte ritas eftersom en position saknas. Öppna text och lista för att läsa objekten och sambanden.'}
        </p>
      ) : (
        <>
          {/* biome-ignore lint/a11y/useSemanticElements: This SVG contains selectable paths, so its accessible children must not be an atomic image. */}
          <svg
            className="ms-connections"
            role="group"
            width={size.width}
            height={size.height}
            aria-label="Riktade samband i kartan"
          >
            <title>Riktade samband i hushållets karta</title>
            {edges.map(({ relationship, d, arrow, middle }) => {
              const selected = relationship.id === selectedRelationship;
              const muted = faded && !emphasizedEdges.has(relationship.id) && !selected;
              return (
                <g
                  key={relationship.id}
                  className={`ms-edge ${selected ? 'ms-edge-selected' : ''} ${emphasizedEdges.has(relationship.id) ? 'ms-edge-emphasized' : ''} ${muted ? 'ms-edge-muted' : ''} ${relationship.change ? `ms-change-${relationship.change}` : ''}`}
                >
                  <path className="ms-edge-underlay" d={d} />
                  <path className="ms-edge-line" d={d} />
                  <polygon className="ms-edge-arrow" points={arrow} />
                  {relationship.change && (
                    <text className="ms-edge-change" x={middle.x} y={middle.y - 6}>
                      {changeSymbol[relationship.change]}
                    </text>
                  )}
                  {/* biome-ignore lint/a11y/useSemanticElements: SVG paths provide the hit target; text-view buttons provide the same selection. */}
                  <path
                    d={d}
                    data-edge-id={relationship.id}
                    className="ms-edge-target"
                    role="button"
                    tabIndex={selected ? 0 : -1}
                    aria-label={`${objects.find((object) => object.id === relationship.from)?.name ?? ''} ${relationship.label} ${objects.find((object) => object.id === relationship.to)?.name ?? ''}${relationship.change ? `, ${changeName[relationship.change]}` : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      latest.current.onSelectRelationship(relationship.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        latest.current.onSelectRelationship(relationship.id);
                      }
                    }}
                  />
                </g>
              );
            })}
            {labels
              .filter((label) => label.priority < 3)
              .map((label) => (
                <line
                  key={label.id}
                  className="ms-label-leader"
                  x1={label.point.x}
                  y1={label.point.y}
                  x2={clamp(label.point.x, label.x, label.x + label.width)}
                  y2={clamp(label.point.y, label.y, label.y + label.height)}
                />
              ))}
          </svg>
          {heightGuide && (
            <svg
              className="ms-height-layer"
              width={size.width}
              height={size.height}
              aria-label="Hjälp för höjdflyttning"
            >
              <title>Höjdflyttning i den personliga vyn</title>
              <SpatialHeightGuide
                panelBounds={guidePanel}
                start={{ x: 0, y: 0, z: 0 }}
                end={{
                  x: (heightGuide.end.x - heightGuide.start.x) / guideScale,
                  y: (heightGuide.end.y - heightGuide.start.y) / guideScale,
                  z: (heightGuide.end.z - heightGuide.start.z) / guideScale,
                }}
                project={(position) =>
                  sceneRef.current?.project({
                    x: heightGuide.start.x + position.x * guideScale,
                    y: heightGuide.start.y + position.y * guideScale,
                    z: heightGuide.start.z + position.z * guideScale,
                  })
                }
              />
            </svg>
          )}
          {visibleObjects
            .sort((a, b) => (points.get(b.id)?.depth ?? 0) - (points.get(a.id)?.depth ?? 0))
            .map((object, index) => {
              const point = points.get(object.id) as ProjectedPoint;
              const selected = selection.has(object.id);
              const muted = faded && !emphasized.has(object.id) && !selected;
              return (
                <button
                  key={object.id}
                  type="button"
                  data-object-id={object.id}
                  data-position={JSON.stringify(
                    sceneRef.current?.position(object.id) ?? object.position,
                  )}
                  className={`ms-marker ${selected ? 'ms-marker-selected' : ''} ${muted ? 'ms-marker-muted' : ''} ${object.change ? `ms-change-${object.change}` : ''}`}
                  style={
                    {
                      left: point.x,
                      top: point.y,
                      zIndex: selected ? 4 : 2,
                      '--ms-depth': point.scale,
                      '--ms-order': index,
                    } as CSSProperties
                  }
                  aria-label={`${object.name}, ${object.type}${object.change ? `, ${changeName[object.change]}` : ''}${object.ended ? ', upphört' : ''}`}
                  aria-pressed={selected}
                  tabIndex={selected ? 0 : -1}
                  title={`${object.name} · ${object.type}${object.change ? ` · ${changeName[object.change]} · ${object.description}` : ''}`}
                  onFocus={() => setHoverId(object.id)}
                  onBlur={() => setHoverId(null)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch' && !activeObject.current)
                      setHoverId(object.id);
                  }}
                  onPointerLeave={() => setHoverId(null)}
                >
                  <span className="ms-marker-dot" aria-hidden="true">
                    <ProfileStudyGlyph object={object} />
                  </span>
                  {object.change && (
                    <span className="ms-marker-change" aria-hidden="true">
                      {changeSymbol[object.change]}
                    </span>
                  )}
                </button>
              );
            })}
          <div className="ms-label-layer" aria-hidden="true">
            {labels.map((label) => (
              <span
                key={label.id}
                data-object-id={label.kind === 'object' ? label.id : undefined}
                data-edge-id={label.kind === 'relationship' ? label.id.slice(5) : undefined}
                className={`ms-name ${label.change ? `ms-change-${label.change}` : ''} ${selection.has(label.id) ? 'ms-name-selected' : ''} ${label.kind === 'relationship' ? 'ms-name-relationship' : ''} ${faded && label.kind === 'object' && !emphasized.has(label.id) && !selection.has(label.id) ? 'ms-name-muted' : ''}`}
                style={{ left: label.x, top: label.y, width: label.width }}
              >
                {label.text}
              </span>
            ))}
          </div>
          <div ref={measurementRef} className="ms-name-measurements" aria-hidden="true">
            {names.map((name) => (
              <span
                key={name.id}
                data-name-id={name.id}
                className={`ms-name ${name.change ? `ms-change-${name.change}` : ''} ${selection.has(name.id) ? 'ms-name-selected' : ''} ${name.kind === 'relationship' ? 'ms-name-relationship' : ''}`}
              >
                {name.text}
              </span>
            ))}
          </div>
          <p ref={statusRef} className="ms-label-status">
            {namedObjects} av {objects.length} namn får plats · {visibleObjects.length}{' '}
            objektmarkörer i vyn.
            <span> Alla objekt och samband finns i textvyn.</span>
            <span className="ms-gesture-hint">
              Klick markerar · Tom rymd avmarkerar allt · Ctrl/⌘-klick ändrar urvalet · Dubbelklick
              eller Ctrl/⌘+Alt-klick öppnar detaljer · Skift eller ett stilla andra finger ger
              höjdflyttning.
            </span>
          </p>
        </>
      )}
    </section>
  );
}
