// Kastbar normal- och mininavigering; samma kamerakommandon i båda lägena.
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { StudyCameraAction, StudyObject, StudyPosition } from './map-study-types.js';
import { PrototypeIcon } from './VisualPrototype.js';

type Position = { x: number; y: number };
type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (action: StudyCameraAction) => void;
  movableObject?: Pick<StudyObject, 'id' | 'name' | 'position'>;
  onMove: (id: string, position: StudyPosition) => void;
  movement: string;
};

const cameraButtons: [StudyCameraAction, string, string][] = [
  ['left', 'Panorera vänster', 'pan-left'],
  ['right', 'Panorera höger', 'pan-right'],
  ['up', 'Panorera uppåt', 'pan-up'],
  ['down', 'Panorera nedåt', 'pan-down'],
  ['rotate-left', 'Rotera vänster', 'rotate-left'],
  ['rotate-right', 'Rotera höger', 'rotate-right'],
  ['tilt-up', 'Luta uppåt', 'tilt-up'],
  ['tilt-down', 'Luta nedåt', 'tilt-down'],
];
const placementDirections: [string, string, StudyPosition][] = [
  ['Vänster', 'pan-left', { x: -45, y: 0, z: 0 }],
  ['Höger', 'pan-right', { x: 45, y: 0, z: 0 }],
  ['Uppåt', 'pan-up', { x: 0, y: 45, z: 0 }],
  ['Nedåt', 'pan-down', { x: 0, y: -45, z: 0 }],
  ['Framåt', 'depth-forward', { x: 0, y: 0, z: 45 }],
  ['Bakåt', 'depth-backward', { x: 0, y: 0, z: -45 }],
];
function ActionButton({
  label,
  text = label,
  icon,
  onClick,
  iconOnly = false,
}: {
  label: string;
  text?: string;
  icon: string;
  onClick: () => void;
  iconOnly?: boolean;
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}>
      <PrototypeIcon name={icon} />
      {!iconOnly && <span>{text}</span>}
    </button>
  );
}

export function MapStudyNavigation({
  open,
  onClose,
  onNavigate,
  movableObject,
  onMove,
  movement,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointer: number;
    start: Position;
    origin: Position;
    preferred: Position | null;
    moved: boolean;
  } | null>(null);
  const [mini, setMini] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [size, setSize] = useState({ width: 350, height: 600 });
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [windowStatus, setWindowStatus] = useState('');
  const [dragging, setDragging] = useState(false);

  const hasOpenWork = useCallback(
    () => panelRef.current?.closest<HTMLElement>('.map-study')?.dataset.openWork === 'true',
    [],
  );
  function clampPosition(proposed: Position): Position {
    return {
      x: Math.round(Math.max(12, Math.min(proposed.x, viewport.width - size.width - 12))),
      // Keep the header anchored when the object section grows; the body scrolls.
      y: Math.round(Math.max(12, Math.min(proposed.y, viewport.height - 124))),
    };
  }
  const displayed = position ? clampPosition(position) : null;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const measure = () => {
      setSize((previous) =>
        previous.width === panel.offsetWidth && previous.height === panel.offsetHeight
          ? previous
          : { width: panel.offsetWidth, height: panel.offsetHeight },
      );
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    const resize = () => {
      measure();
      if (hasOpenWork()) setPosition(null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [open, hasOpenWork]);

  useEffect(() => {
    if (!open) return;
    if (hasOpenWork()) setPosition(null);
    handleRef.current?.focus({ preventScroll: true });
  }, [open, hasOpenWork]);

  useEffect(() => {
    const root = panelRef.current?.closest('.map-study');
    if (!open || !root) return;
    const observer = new MutationObserver(() => {
      if (hasOpenWork()) setPosition(null);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-open-work'] });
    const windows = root.querySelector('.np-windows');
    if (windows) observer.observe(windows, { childList: true });
    return () => observer.disconnect();
  }, [open, hasOpenWork]);

  useEffect(() => {
    const cancel = () => {
      if (!dragRef.current) return;
      setPosition(dragRef.current.preferred);
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, []);

  function move(proposed: Position) {
    const next = clampPosition(proposed);
    setPosition(next);
    setWindowStatus(`Navigeringsfönstret: ${next.x} från vänster, ${next.y} uppifrån.`);
  }
  function step(offset: Position) {
    const box = panelRef.current?.getBoundingClientRect();
    if (!box) return;
    move({ x: box.left + offset.x, y: box.top + offset.y });
  }
  function toggleMini() {
    if (hasOpenWork()) setPosition(null);
    setMini(!mini);
    requestAnimationFrame(() => handleRef.current?.focus({ preventScroll: true }));
  }
  function startDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary || (event.target as Element).closest('button'))
      return;
    const box = panelRef.current?.getBoundingClientRect();
    if (!box) return;
    dragRef.current = {
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: box.left, y: box.top },
      preferred: position,
      moved: false,
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function drag(event: PointerEvent<HTMLElement>) {
    const current = dragRef.current;
    if (!current || current.pointer !== event.pointerId) return;
    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    current.moved ||= Math.hypot(dx, dy) > 3;
    if (current.moved) move({ x: current.origin.x + dx, y: current.origin.y + dy });
  }
  function finishDrag(event: PointerEvent<HTMLElement>, cancelled = false) {
    const current = dragRef.current;
    if (!current || current.pointer !== event.pointerId) return;
    dragRef.current = null;
    if (cancelled) {
      setPosition(current.preferred);
      setWindowStatus('Flyttningen av navigeringsfönstret avbröts.');
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }
  function keyMove(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey || event.altKey)
      return;
    const distance = event.shiftKey ? 40 : 12;
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
      ArrowDown: { x: 0, y: distance },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    step(direction);
  }

  const style = displayed
    ? ({
        position: 'fixed',
        left: displayed.x,
        top: displayed.y,
        '--mp-navigation-top': `${displayed.y}px`,
      } as CSSProperties)
    : undefined;

  return (
    <section
      ref={panelRef}
      id="mp-navigation"
      className={`mp-navigation ${mini ? 'mp-navigation-mini' : ''}`}
      data-dragging={dragging}
      data-mini={mini}
      data-positioned={position !== null}
      hidden={!open}
      style={style}
      aria-labelledby="mp-navigation-title"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        if (dragRef.current) {
          const current = dragRef.current;
          setPosition(current.preferred);
          dragRef.current = null;
          if (handleRef.current?.hasPointerCapture(current.pointer))
            handleRef.current.releasePointerCapture(current.pointer);
          setDragging(false);
        } else onClose();
      }}
    >
      {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole lint/a11y/useSemanticElements: This focusable window title group supports keyboard movement without acting as a button or form fieldset. */}
      <header
        ref={handleRef}
        id="mp-navigation-handle"
        className="mp-navigation-header mp-navigation-drag"
        role="group"
        tabIndex={0}
        aria-labelledby="mp-navigation-title"
        aria-describedby="mp-navigation-move-help"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={(event) => finishDrag(event)}
        onPointerCancel={(event) => finishDrag(event, true)}
        onLostPointerCapture={(event) => finishDrag(event, true)}
        onKeyDown={keyMove}
      >
        <ActionButton
          label={mini ? 'Visa normal navigering' : 'Visa mininavigering'}
          iconOnly
          icon={mini ? 'maximize' : 'minimize'}
          onClick={toggleMini}
        />
        <h2 id="mp-navigation-title">Navigation</h2>
        <ActionButton label="Stäng navigering" iconOnly icon="close" onClick={onClose} />
      </header>
      <div className="mp-navigation-body np-stack">
        <p className="mp-navigation-description">
          Flytta vyn med knapparna. Ett objektval flyttar inte kameran.
        </p>
        <div className="mp-button-grid mp-camera-directions">
          {cameraButtons.map(([action, label, icon]) => (
            <ActionButton
              key={action}
              label={label}
              icon={icon}
              onClick={() => onNavigate(action)}
            />
          ))}
        </div>
        <div className="mp-button-grid mp-camera-zoom">
          <ActionButton label="Zooma in" icon="zoom-in" onClick={() => onNavigate('in')} />
          <ActionButton label="Zooma ut" icon="zoom-out" onClick={() => onNavigate('out')} />
        </div>
        <p id="mp-navigation-move-help" className="np-sr-status">
          Dra titelraden för att flytta navigeringsfönstret. Piltangenter på titelraden flyttar ett
          litet steg; Skift och piltangent flyttar ett större steg. Escape avbryter en pågående
          dragning.
        </p>
        <p className="np-sr-status" role="status">
          {windowStatus}
        </p>
        {movableObject && (
          <section className="mp-placement np-stack" aria-labelledby="mp-placement-title">
            <h3 id="mp-placement-title">Flytta {movableObject.name}</h3>
            <p className="mp-navigation-description">
              Flytta bara det markerade objektet i din personliga vy. Hushållets uppgifter ändras
              inte.
            </p>
            <div className="mp-button-grid">
              {placementDirections.map(([label, icon, offset]) => (
                <ActionButton
                  key={label}
                  label={`Flytta ${movableObject.name}: ${label.toLocaleLowerCase('sv')}`}
                  text={label}
                  icon={icon}
                  onClick={() =>
                    onMove(movableObject.id, {
                      x: movableObject.position.x + offset.x,
                      y: movableObject.position.y + offset.y,
                      z: movableObject.position.z + offset.z,
                    })
                  }
                />
              ))}
            </div>
            <p className="mp-navigation-object-status" role="status">
              {movement}
            </p>
          </section>
        )}
      </div>
    </section>
  );
}
