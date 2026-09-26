import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import './navigation-prototype-windows.css';

export type PrototypeWindow = { id: string; title: string; content: ReactNode };

type Position = { x: number; y: number };
type Drag = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  position: Position;
  moved: boolean;
};

const panelWidth = 340;
const panelGap = 18;

function startingPosition(index: number, width: number): Position {
  const columns = Math.max(1, Math.floor((width + panelGap) / (panelWidth + panelGap)));
  return {
    x: (index % columns) * (panelWidth + panelGap),
    y: Math.floor(index / columns) * 52,
  };
}

function clampPosition(position: Position, region: HTMLElement, panel?: HTMLElement): Position {
  return {
    x: Math.round(
      Math.max(0, Math.min(position.x, region.clientWidth - (panel?.offsetWidth ?? panelWidth))),
    ),
    y: Math.round(
      Math.max(0, Math.min(position.y, region.clientHeight - (panel?.offsetHeight ?? 0))),
    ),
  };
}

export function NavigationPrototypeWindows({
  windows,
  activeId,
  onActivate,
  onClose,
  hidden = false,
  layoutVersion = 0,
}: {
  windows: PrototypeWindow[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  hidden?: boolean;
  layoutVersion?: number;
}) {
  const prefix = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLSelectElement>(null);
  const panelRefs = useRef(new Map<string, HTMLElement>());
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragRef = useRef<Drag | null>(null);
  const previousLayoutVersion = useRef(layoutVersion);
  const previousIds = useRef(new Set<string>());
  const previousHidden = useRef(hidden);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [stack, setStack] = useState<string[]>([]);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [movementStatus, setMovementStatus] = useState('');
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 1000px)').matches);
  const visibleId = windows.some((entry) => entry.id === activeId) ? activeId : windows[0]?.id;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1000px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setStack((previous) =>
      previous.at(-1) === activeId
        ? previous
        : [...previous.filter((id) => id !== activeId), activeId],
    );
  }, [activeId]);

  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region || compact || hidden) return;
    const reset = previousLayoutVersion.current !== layoutVersion;
    previousLayoutVersion.current = layoutVersion;
    const fitPanels = (resetPositions = false) => {
      if (!region.clientWidth || !region.clientHeight) return;
      setPositions((previous) => {
        let changed = Object.keys(previous).length !== windows.length;
        const next: Record<string, Position> = {};
        windows.forEach((entry, index) => {
          const proposed =
            (!resetPositions && previous[entry.id]) || startingPosition(index, region.clientWidth);
          const position = clampPosition(proposed, region, panelRefs.current.get(entry.id));
          next[entry.id] = position;
          if (position.x !== previous[entry.id]?.x || position.y !== previous[entry.id]?.y) {
            changed = true;
          }
        });
        return changed ? next : previous;
      });
    };
    fitPanels(reset);
    const observer = new ResizeObserver(() => fitPanels());
    observer.observe(region);
    for (const panel of panelRefs.current.values()) observer.observe(panel);
    return () => observer.disconnect();
  }, [windows, compact, hidden, layoutVersion]);

  useLayoutEffect(() => {
    const added = windows.filter((entry) => !previousIds.current.has(entry.id));
    const reopened = previousHidden.current && !hidden;
    previousIds.current = new Set(windows.map((entry) => entry.id));
    previousHidden.current = hidden;
    if (hidden) return;
    const target =
      added.find((entry) => entry.id === visibleId)?.id ??
      added.at(-1)?.id ??
      (reopened ? visibleId : undefined);
    if (target) panelRefs.current.get(target)?.querySelector('h2')?.focus();
  }, [windows, hidden, visibleId]);

  const activate = (id: string) => {
    onActivate(id);
    setStack((previous) =>
      previous.at(-1) === id ? previous : [...previous.filter((entry) => entry !== id), id],
    );
  };

  const move = (id: string, position: Position) => {
    const region = regionRef.current;
    if (!region || compact) return;
    const next = clampPosition(position, region, panelRefs.current.get(id));
    setPositions((previous) => ({ ...previous, [id]: next }));
    return next;
  };

  const step = (id: string, x: number, y: number) => {
    const current = positions[id] ?? { x: 0, y: 0 };
    const next = move(id, { x: current.x + x, y: current.y + y });
    if (next) setMovementStatus(`Panelens position: ${next.x}, ${next.y}.`);
  };

  const startDrag = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (compact || event.button !== 0) return;
    activate(id);
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      position: positions[id] ?? { x: 0, y: 0 },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
  };

  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = dragRef.current;
    if (!current || event.pointerId !== current.pointerId || !draggingId) return;
    const x = event.clientX - current.startX;
    const y = event.clientY - current.startY;
    current.moved ||= Math.abs(x) + Math.abs(y) > 3;
    if (current.moved) {
      move(current.id, { x: current.position.x + x, y: current.position.y + y });
    }
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    if (event.type === 'pointercancel') dragRef.current = null;
  };

  const keyMove = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === 'Escape') {
      if (moveMenuId === id) {
        event.preventDefault();
        event.stopPropagation();
      }
      setMoveMenuId(null);
      return;
    }
    const distance = event.shiftKey ? 40 : 12;
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
      ArrowDown: { x: 0, y: distance },
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      step(id, direction.x, direction.y);
    }
  };

  const close = (id: string) => {
    const index = windows.findIndex((entry) => entry.id === id);
    const next = windows[index + 1] ?? windows[index - 1];
    setMoveMenuId(null);
    onClose(id);
    if (next) onActivate(next.id);
    requestAnimationFrame(() => {
      if (next && compact) selectorRef.current?.focus();
      else if (next) handleRefs.current.get(next.id)?.focus();
      else regionRef.current?.parentElement?.focus();
    });
  };

  return (
    <div className="np-windows" hidden={hidden || windows.length === 0} ref={regionRef}>
      <p className="np-sr-status" id={`${prefix}-move-help`}>
        Dra rubriken för att flytta panelen. Du kan också använda piltangenterna eller trycka för
        att visa flyttknappar. Skift och piltangent flyttar ett större steg.
      </p>
      <span className="np-sr-status" role="status">
        {movementStatus}
      </span>
      <label className="np-window-selector" hidden={!compact}>
        Öppna paneler ({windows.length})
        <select
          ref={selectorRef}
          value={visibleId ?? ''}
          onChange={(event) => activate(event.target.value)}
        >
          {windows.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
        </select>
      </label>
      {windows.map((entry, index) => {
        const titleId = `${prefix}-title-${entry.id}`;
        const menuId = `${prefix}-move-${entry.id}`;
        const position = positions[entry.id] ?? { x: index * 28, y: index * 28 };
        const style = {
          '--np-window-x': `${position.x}px`,
          '--np-window-y': `${position.y}px`,
          zIndex:
            entry.id === activeId ? windows.length + stack.length + 1 : stack.indexOf(entry.id) + 1,
        } as CSSProperties;
        return (
          <section
            className="np-panel np-window"
            key={entry.id}
            aria-labelledby={titleId}
            tabIndex={-1}
            hidden={compact && entry.id !== visibleId}
            data-window-id={entry.id}
            data-active={entry.id === activeId}
            data-dragging={entry.id === draggingId}
            style={style}
            onPointerDownCapture={() => activate(entry.id)}
            onFocusCapture={() => activate(entry.id)}
            ref={(element) => {
              if (element) panelRefs.current.set(entry.id, element);
              else panelRefs.current.delete(entry.id);
            }}
          >
            <header className="np-window-header">
              <h2 id={titleId} tabIndex={-1}>
                {compact ? (
                  entry.title
                ) : (
                  <button
                    className="np-window-drag"
                    type="button"
                    aria-label={`Flytta ${entry.title}`}
                    aria-describedby={`${prefix}-move-help`}
                    aria-expanded={moveMenuId === entry.id}
                    aria-controls={menuId}
                    onPointerDown={(event) => startDrag(event, entry.id)}
                    onPointerMove={drag}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onKeyDown={(event) => keyMove(event, entry.id)}
                    onClick={() => {
                      if (dragRef.current?.moved) {
                        dragRef.current = null;
                        return;
                      }
                      setMoveMenuId((previous) => (previous === entry.id ? null : entry.id));
                    }}
                    ref={(element) => {
                      if (element) handleRefs.current.set(entry.id, element);
                      else handleRefs.current.delete(entry.id);
                    }}
                  >
                    <span className="np-window-grip" aria-hidden="true">
                      ⠿
                    </span>
                    <span>
                      <span className="np-window-title">{entry.title}</span>
                      <span className="np-window-move-label">Flytta</span>
                    </span>
                  </button>
                )}
              </h2>
              <button
                type="button"
                className="np-window-close"
                aria-label={`Stäng ${entry.title}`}
                onClick={() => close(entry.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <fieldset
              className="np-window-move-controls"
              id={menuId}
              hidden={compact || moveMenuId !== entry.id}
              aria-label={`Flytta ${entry.title}`}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopPropagation();
                setMoveMenuId(null);
                handleRefs.current.get(entry.id)?.focus();
              }}
            >
              <div className="np-window-directions">
                <button type="button" onClick={() => step(entry.id, -40, 0)}>
                  Vänster
                </button>
                <button type="button" onClick={() => step(entry.id, 0, -40)}>
                  Uppåt
                </button>
                <button type="button" onClick={() => step(entry.id, 0, 40)}>
                  Nedåt
                </button>
                <button type="button" onClick={() => step(entry.id, 40, 0)}>
                  Höger
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const region = regionRef.current;
                  if (region) move(entry.id, startingPosition(index, region.clientWidth));
                  setMovementStatus('Panelens position återställd.');
                }}
              >
                Återställ position
              </button>
            </fieldset>
            <div className="np-panel-body">{entry.content}</div>
          </section>
        );
      })}
    </div>
  );
}
