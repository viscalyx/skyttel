import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Position } from '../shared/personal-view.js';
import type { spatialScene } from './spatial-scene.js';

type Gesture = {
  id: string;
  primary: number;
  origin: Position;
  segment: Position;
  x: number;
  y: number;
  currentX: number;
  currentY: number;
  height: boolean;
  moved: boolean;
  second?: { id: number; x: number; y: number };
};

export function useObjectMovement(
  scene: RefObject<ReturnType<typeof spatialScene> | null>,
  {
    enabled,
    active,
    onMove,
    cancelHold,
  }: {
    enabled: boolean;
    active: boolean;
    onMove: (id: string, position: Position) => unknown;
    cancelHold: () => void;
  },
) {
  const gesture = useRef<Gesture | null>(null);
  const suppressed = useRef(false);
  const [guide, setGuide] = useState<{ start: Position; end: Position } | null>(null);
  const cancel = useCallback(() => {
    const current = gesture.current;
    if (current) {
      scene.current?.place(current.id, current.origin);
      suppressed.current = true;
    }
    gesture.current = null;
    setGuide(null);
    cancelHold();
  }, [scene, cancelHold]);
  useEffect(() => {
    if (!active || !enabled) cancel();
    window.addEventListener('blur', cancel);
    const visibility = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, enabled, cancel]);
  function rebase(current: Gesture, height: boolean) {
    current.segment = scene.current?.position(current.id) ?? current.segment;
    current.x = current.currentX;
    current.y = current.currentY;
    current.height = height;
  }
  return {
    guide,
    cancel,
    suppressClick() {
      const value = suppressed.current;
      suppressed.current = false;
      return value;
    },
    start(id: string, event: ReactPointerEvent) {
      if (!enabled || !active || event.button !== 0 || !event.isPrimary || gesture.current) return;
      const origin = scene.current?.position(id);
      if (!origin) return;
      suppressed.current = false;
      gesture.current = {
        id,
        primary: event.pointerId,
        origin,
        segment: origin,
        x: event.clientX,
        y: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        height: event.shiftKey,
        moved: false,
      };
    },
    down(event: ReactPointerEvent) {
      const current = gesture.current;
      if (!current || event.pointerId === current.primary) return;
      cancelHold();
      event.stopPropagation();
      if (current.second || event.pointerType !== 'touch') {
        cancel();
        return;
      }
      current.second = { id: event.pointerId, x: event.clientX, y: event.clientY };
      rebase(current, true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.setPointerCapture(current.primary);
    },
    move(event: ReactPointerEvent) {
      const current = gesture.current;
      if (!current) return;
      if (!event.buttons) {
        cancel();
        return;
      }
      if (event.pointerId === current.second?.id) {
        if (Math.hypot(event.clientX - current.second.x, event.clientY - current.second.y) > 10)
          cancel();
        return;
      }
      if (event.pointerId !== current.primary) return;
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8)
        return;
      current.moved = true;
      suppressed.current = true;
      cancelHold();
      event.currentTarget.setPointerCapture(event.pointerId);
      const height = Boolean(current.second) || event.shiftKey;
      if (height !== current.height) rebase(current, height);
      current.currentX = event.clientX;
      current.currentY = event.clientY;
      const position = scene.current?.displacement(
        current.segment,
        event.clientX - current.x,
        event.clientY - current.y,
        height,
      );
      if (position) {
        const end = scene.current?.place(current.id, position) ?? position;
        setGuide(height ? { start: current.segment, end } : null);
      }
      event.preventDefault();
      event.stopPropagation();
    },
    end(event: ReactPointerEvent) {
      const current = gesture.current;
      if (!current) return;
      if (event.pointerId === current.second?.id) {
        current.second = undefined;
        rebase(current, event.shiftKey);
        setGuide(null);
        return;
      }
      if (event.pointerId !== current.primary) return;
      if (current.second) {
        cancel();
        return;
      }
      gesture.current = null;
      setGuide(null);
      cancelHold();
      const position = scene.current?.position(current.id);
      if (current.moved && position) void onMove(current.id, position);
    },
  };
}
