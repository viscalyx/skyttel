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
import type {
  StudyCamera,
  StudyCameraAction,
  StudyObject,
  StudyPosition,
  StudyRelationship,
  StudyVariant,
} from './map-study-types.js';
import './map-study-canvas.css';

type Props = {
  objects: StudyObject[];
  relationships: StudyRelationship[];
  selectedId: string;
  selectedRelationship: string | null;
  emphasisIds: string[];
  emphasisEdges: string[];
  variant: StudyVariant;
  theme: 'light' | 'dark';
  onSelect: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onMove: (id: string, position: StudyPosition) => void;
  cameraRef: RefObject<StudyCamera | null>;
  onCameraChange: (description: string) => void;
};

type Camera = {
  center: StudyPosition;
  radius: number;
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
};
type Point = { x: number; y: number; depth: number; perspective: number };
type Box = { x: number; y: number; width: number; height: number };
type Name = { id: string; text: string; kind: 'object' | 'relationship'; priority: number };
type Gesture = {
  pointer: number;
  x: number;
  y: number;
  camera: Camera;
  moved: boolean;
  mode: 'rotate' | 'pan' | 'object';
  object?: StudyObject;
};

const changeSymbol = { added: '+', changed: '~', removed: '×' };
const changeName = { added: 'tillagt', changed: 'ändrat', removed: 'borttaget' };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function frameObjects(objects: StudyObject[], previous?: Camera): Camera {
  const points = objects.map((object) => object.position);
  const center = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    center[axis] = points.length
      ? (Math.min(...points.map((point) => point[axis])) +
          Math.max(...points.map((point) => point[axis]))) /
        2
      : 0;
  }
  const radius = Math.max(
    80,
    ...points.map((point) =>
      Math.hypot(point.x - center.x, point.y - center.y, point.z - center.z),
    ),
  );
  return {
    center,
    radius,
    yaw: previous?.yaw ?? 0.24,
    pitch: previous?.pitch ?? -0.16,
    zoom: 1,
    panX: 0,
    panY: 0,
  };
}

function rotated(point: StudyPosition, camera: Camera) {
  const x = point.x - camera.center.x;
  const y = point.y - camera.center.y;
  const z = point.z - camera.center.z;
  const side = Math.cos(camera.yaw) * x + Math.sin(camera.yaw) * z;
  const depth = -Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  return {
    x: side,
    y: Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * depth,
    z: Math.sin(camera.pitch) * y + Math.cos(camera.pitch) * depth,
  };
}

function project(point: StudyPosition, camera: Camera, width: number, height: number): Point {
  const view = rotated(point, camera);
  const distance = camera.radius * 5;
  const perspective = distance / Math.max(distance * 0.12, distance - view.z);
  const scale = (Math.min(width, height) * 0.32 * camera.zoom) / camera.radius;
  return {
    x: width / 2 + (view.x * perspective + camera.panX) * scale,
    y: height / 2 + (-view.y * perspective + camera.panY) * scale,
    depth: view.z,
    perspective,
  };
}

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width + 5 &&
    a.x + a.width + 5 > b.x &&
    a.y < b.y + b.height + 5 &&
    a.y + a.height + 5 > b.y
  );
}

function StudyGlyph({ object }: { object: StudyObject }) {
  const type = object.type.toLocaleLowerCase('sv');
  if (type === 'person') return <span className="ms-glyph-initial">{object.name.slice(0, 1)}</span>;
  const path = type.includes('musik')
    ? 'M9 17V5l10-2v12M9 8l10-2M9 17c0 1.7-1.8 3-4 3s-3-1.3-3-3 1.8-3 4-3c1.2 0 2.2.3 3 1m10 0c0 1.7-1.8 3-4 3s-3-1.3-3-3 1.8-3 4-3c1.2 0 2.2.3 3 1'
    : type.includes('e-post')
      ? 'M4 5h16v14H4z M4 6l8 7 8-7'
      : type.includes('bank')
        ? 'M3 8l9-5 9 5H3z M6 12v6m6-6v6m6-6v6M3 21h18'
        : type.includes('kort')
          ? 'M3 5h18v14H3z M3 10h18M6 15h4'
          : type.includes('avtal') || type.includes('abonnemang')
            ? 'M5 4h14v17H5z M8 2v5m8-5v5M5 10h14M8 14h8M8 17h5'
            : type.includes('konto')
              ? 'M3 4h18v16H3z M7 9a2 2 0 1 0 4 0 2 2 0 0 0-4 0M5 17a4 4 0 0 1 8 0m3-8h2m-2 4h2'
              : type.includes('bostad') || type.includes('garage')
                ? 'M3 11l9-8 9 8M5 10v11h14V10M9 21v-7h6v7'
                : type.includes('fordon')
                  ? 'M2 16a4 4 0 1 0 8 0 4 4 0 0 0-8 0m12 0a4 4 0 1 0 8 0 4 4 0 0 0-8 0M6 16l4-9 8 9H6m3-9h5m2-3h3l-1 12'
                  : 'M5 6h14v12H5z M10 9l5 3-5 3z';
  return (
    <svg className="ms-object-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export function MapStudyCanvas(props: Props) {
  const {
    objects,
    relationships,
    selectedId,
    selectedRelationship,
    emphasisIds,
    emphasisEdges,
    variant,
    theme,
    cameraRef,
  } = props;
  const rootRef = useRef<HTMLElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [camera, setCamera] = useState(() => frameObjects(objects));
  const currentCamera = useRef(camera);
  const history = useRef<Camera[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const ignoreClick = useRef(false);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [measurements, setMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [statusHeight, setStatusHeight] = useState(32);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const helpId = useId();
  const emphasized = useMemo(() => new Set(emphasisIds), [emphasisIds]);
  const emphasizedEdges = useMemo(() => new Set(emphasisEdges), [emphasisEdges]);
  const faded = emphasisIds.length > 0;
  const sparse = objects.length < 20;

  const updateCamera = useCallback((next: Camera, remember = false) => {
    if (remember) history.current = [...history.current.slice(-29), currentCamera.current];
    currentCamera.current = next;
    setCamera(next);
  }, []);

  function navigate(action: StudyCameraAction) {
    const next = { ...currentCamera.current };
    const step = (next.radius * 0.13) / next.zoom;
    if (action === 'left') next.panX += step;
    if (action === 'right') next.panX -= step;
    if (action === 'up') next.panY += step;
    if (action === 'down') next.panY -= step;
    if (action === 'in') next.zoom = clamp(next.zoom * 1.2, 0.15, 14);
    if (action === 'out') next.zoom = clamp(next.zoom / 1.2, 0.15, 14);
    if (action === 'rotate-left') next.yaw -= 0.16;
    if (action === 'rotate-right') next.yaw += 0.16;
    if (action === 'tilt-up') next.pitch = clamp(next.pitch - 0.12, -1.3, 1.3);
    if (action === 'tilt-down') next.pitch = clamp(next.pitch + 0.12, -1.3, 1.3);
    updateCamera(next, true);
  }

  function frame(ids?: string[]) {
    const targets = ids?.length
      ? latest.current.objects.filter((object) => ids.includes(object.id))
      : latest.current.objects;
    if (targets.length) updateCamera(frameObjects(targets, currentCamera.current), true);
  }

  function back() {
    const previous = history.current.pop();
    if (previous) updateCamera(previous);
  }

  useImperativeHandle(cameraRef, () => ({ navigate, frame, back }));

  useEffect(() => {
    latest.current.onCameraChange(
      `Zoom ${Math.round(camera.zoom * 100)} %, rotation ${Math.round((camera.yaw * 180) / Math.PI)}°, lutning ${Math.round((camera.pitch * 180) / Math.PI)}°. ${history.current.length} tidigare vyer.`,
    );
  }, [camera]);

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
    if (!root) return;
    let lastWheel = -Infinity;
    const wheel = (event: WheelEvent) => {
      // Ctrl/meta and two-finger browser zoom always retain their native behaviour.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      const now = performance.now();
      const current = currentCamera.current;
      updateCamera(
        { ...current, zoom: clamp(current.zoom * Math.exp(-event.deltaY * 0.0015), 0.15, 14) },
        now - lastWheel > 400,
      );
      lastWheel = now;
    };
    root.addEventListener('wheel', wheel, { passive: false });
    return () => root.removeEventListener('wheel', wheel);
  }, [updateCamera]);

  const points = useMemo(
    () =>
      new Map(
        objects.map((object) => [
          object.id,
          project(object.position, camera, size.width, size.height),
        ]),
      ),
    [objects, camera, size],
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
      priority:
        object.id === selectedId
          ? 0
          : object.id === hoverId
            ? 1
            : emphasized.has(object.id)
              ? 4
              : object.change
                ? 5
                : 6,
    }));
    for (const edge of relationships.filter(
      (relationship) =>
        relationship.id === selectedRelationship ||
        relationship.from === selectedId ||
        relationship.to === selectedId,
    )) {
      result.push({
        id: `edge:${edge.id}`,
        text: `${edge.change ? `${changeSymbol[edge.change]} ` : ''}${edge.label}`,
        kind: 'relationship',
        priority: edge.id === selectedRelationship ? 2 : 3,
      });
    }
    return result.sort((a, b) => a.priority - b.priority);
  }, [objects, relationships, selectedId, selectedRelationship, hoverId, emphasized]);

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

  const labels = useMemo(() => {
    const clearance = sparse ? 23 : 11;
    const markerBoxes: Box[] = [...points.values()].map((point) => ({
      x: point.x - clearance,
      y: point.y - clearance,
      width: clearance * 2,
      height: clearance * 2,
    }));
    const occupied: Box[] = [
      { x: 0, y: size.height - statusHeight - 22, width: size.width, height: statusHeight + 22 },
    ];
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
  }, [names, measurements, points, edges, size, statusHeight, sparse]);

  function beginPointer(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey) return;
    if (gesture.current) return;
    const target = event.target as Element;
    ignoreClick.current = false;
    if (target.closest('[data-edge-id]')) return;
    const objectId = target.closest('[data-object-id]')?.getAttribute('data-object-id');
    const object = objects.find((candidate) => candidate.id === objectId);
    gesture.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      camera: currentCamera.current,
      moved: false,
      mode: object ? 'object' : event.shiftKey ? 'pan' : 'rotate',
      object,
    };
    ignoreClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!object) event.currentTarget.focus({ preventScroll: true });
  }

  function movePointer(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved && drag.mode !== 'object')
      history.current = [...history.current.slice(-29), drag.camera];
    drag.moved = true;
    ignoreClick.current = true;
    const scale =
      (Math.min(size.width, size.height) * 0.32 * drag.camera.zoom) / drag.camera.radius;
    if (drag.mode === 'object' && drag.object) {
      const perspective = project(
        drag.object.position,
        drag.camera,
        size.width,
        size.height,
      ).perspective;
      const side = dx / scale / perspective;
      const vertical = -dy / scale / perspective;
      const depth = -Math.sin(drag.camera.pitch) * vertical;
      const original = drag.object.position;
      latest.current.onMove(drag.object.id, {
        x: original.x + Math.cos(drag.camera.yaw) * side - Math.sin(drag.camera.yaw) * depth,
        y: original.y + Math.cos(drag.camera.pitch) * vertical,
        z: original.z + Math.sin(drag.camera.yaw) * side + Math.cos(drag.camera.yaw) * depth,
      });
    } else if (drag.mode === 'pan') {
      updateCamera({
        ...drag.camera,
        panX: drag.camera.panX + dx / scale,
        panY: drag.camera.panY + dy / scale,
      });
    } else {
      updateCamera({
        ...drag.camera,
        yaw: drag.camera.yaw + dx * 0.006,
        pitch: clamp(drag.camera.pitch + dy * 0.006, -1.3, 1.3),
      });
    }
  }

  function endPointer(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (event.type === 'pointercancel' && drag.moved && drag.object)
      latest.current.onMove(drag.object.id, drag.object.position);
    if (event.type === 'pointercancel' && drag.moved && !drag.object) updateCamera(drag.camera);
    // Pointer capture retargets click to the surface, so selection happens explicitly here.
    if (!drag.moved && drag.object && event.type !== 'pointercancel')
      latest.current.onSelect(drag.object.id);
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Escape' && gesture.current) {
      const drag = gesture.current;
      if (drag.object) latest.current.onMove(drag.object.id, drag.object.position);
      else updateCamera(drag.camera);
      gesture.current = null;
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
      frame();
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
      className={`ms-canvas ms-canvas-${variant} ${sparse ? 'ms-canvas-sparse' : ''}`}
      data-theme={theme}
      data-camera={`${camera.yaw.toFixed(3)},${camera.pitch.toFixed(3)},${camera.zoom.toFixed(3)},${camera.panX.toFixed(2)},${camera.panY.toFixed(2)},${camera.radius.toFixed(2)},${camera.center.x.toFixed(2)},${camera.center.y.toFixed(2)},${camera.center.z.toFixed(2)}`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The 3D surface needs keyboard focus for its documented arrow controls.
      tabIndex={0}
      aria-label="Hushållets interaktiva tredimensionella karta"
      aria-describedby={helpId}
      onKeyDown={keyboard}
      onClick={(event) => {
        const edge = (event.target as Element)
          .closest('[data-edge-id]')
          ?.getAttribute('data-edge-id');
        if (edge && !ignoreClick.current) latest.current.onSelectRelationship(edge);
      }}
      onPointerDown={beginPointer}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={() => {
        const drag = gesture.current;
        if (drag?.moved && drag.object) latest.current.onMove(drag.object.id, drag.object.position);
        else if (drag?.moved) updateCamera(drag.camera);
        gesture.current = null;
      }}
    >
      <p id={helpId} className="ms-screen-reader">
        Dra bakgrunden för att rotera. Håll Skift och dra för att förflytta vyn. Piltangenter
        förflyttar vyn; Skift och pilar roterar. Plus och minus zoomar i kartan. Ctrl eller kommando
        med plus och minus behåller webbläsarens zoom. Dra ett objekt för att flytta det. Samtliga
        objekt och samband finns även i textvyn.
      </p>
      {invalid ? (
        <p className="ms-graphics-error" role="alert">
          Kartan kan inte ritas eftersom en position saknas. Öppna textvyn för att läsa objekten och
          sambanden.
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
                      if (!ignoreClick.current)
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
          {visibleObjects
            .sort((a, b) => (points.get(a.id)?.depth ?? 0) - (points.get(b.id)?.depth ?? 0))
            .map((object, index) => {
              const point = points.get(object.id) as Point;
              const selected = object.id === selectedId;
              const muted = faded && !emphasized.has(object.id) && !selected;
              return (
                <button
                  key={object.id}
                  type="button"
                  data-object-id={object.id}
                  className={`ms-marker ${selected ? 'ms-marker-selected' : ''} ${muted ? 'ms-marker-muted' : ''} ${object.change ? `ms-change-${object.change}` : ''}`}
                  style={
                    {
                      left: point.x,
                      top: point.y,
                      zIndex: selected ? 4 : 2,
                      '--ms-depth': clamp(point.perspective, 0.7, 1.5),
                      '--ms-order': index,
                    } as CSSProperties
                  }
                  aria-label={`${object.name}, ${object.type}${object.change ? `, ${changeName[object.change]}` : ''}${object.ended ? ', upphört' : ''}`}
                  aria-pressed={selected}
                  tabIndex={selected ? 0 : -1}
                  title={`${object.name} · ${object.type}`}
                  onFocus={() => setHoverId(object.id)}
                  onBlur={() => setHoverId(null)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== 'touch' && !gesture.current) setHoverId(object.id);
                  }}
                  onPointerLeave={() => setHoverId(null)}
                  onClick={(event) => {
                    if (event.detail === 0) latest.current.onSelect(object.id);
                  }}
                >
                  <span className="ms-marker-dot" aria-hidden="true">
                    {sparse && <StudyGlyph object={object} />}
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
                className={`ms-name ${label.id === selectedId ? 'ms-name-selected' : ''} ${label.kind === 'relationship' ? 'ms-name-relationship' : ''} ${faded && label.kind === 'object' && !emphasized.has(label.id) && label.id !== selectedId ? 'ms-name-muted' : ''}`}
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
                className={`ms-name ${name.id === selectedId ? 'ms-name-selected' : ''} ${name.kind === 'relationship' ? 'ms-name-relationship' : ''}`}
              >
                {name.text}
              </span>
            ))}
          </div>
          <p ref={statusRef} className="ms-label-status">
            {namedObjects} av {objects.length} namn får plats · {visibleObjects.length}{' '}
            objektmarkörer i vyn.
            <span> Alla objekt och samband finns i textvyn.</span>
          </p>
        </>
      )}
    </section>
  );
}
