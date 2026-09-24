/** Camera gestures on empty space never create object edits. */
export function cameraGestures(
  canvas: HTMLCanvasElement,
  camera: {
    rotate: (x: number, y: number) => void;
    pan: (x: number, y: number) => void;
    zoom: (factor: number) => void;
  },
) {
  const pointers = new Map<number, { x: number; y: number; button: number }>();
  let enabled = true;
  function down(event: PointerEvent) {
    if (!enabled) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    canvas.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    const before = pointers.get(event.pointerId);
    if (!before || !enabled) return;
    const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
    const dx = event.clientX - before.x;
    const dy = event.clientY - before.y;
    if (other && pointers.size === 2) {
      camera.pan(dx / 2, dy / 2);
      const oldDistance = Math.hypot(before.x - other.x, before.y - other.y);
      const distance = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (oldDistance > 2 && distance > 2) camera.zoom(oldDistance / distance);
    } else if (pointers.size === 1) {
      if (before.button === 2 || event.shiftKey) camera.pan(dx, dy);
      else
        camera.rotate(
          (2 * Math.PI * dx) / canvas.clientHeight,
          (2 * Math.PI * dy) / canvas.clientHeight,
        );
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: before.button });
  }
  function end(event: PointerEvent) {
    pointers.delete(event.pointerId);
  }
  function cancel() {
    pointers.clear();
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    if (!enabled) return;
    if (event.ctrlKey || (!event.deltaX && !event.shiftKey))
      camera.zoom(Math.exp(event.deltaY * 0.002));
    else camera.pan(event.deltaX || event.deltaY, event.deltaX ? event.deltaY : 0);
  }
  function context(event: Event) {
    event.preventDefault();
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', end);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', context);
  window.addEventListener('blur', cancel);
  return {
    enabled(value: boolean) {
      enabled = value;
      if (!value) cancel();
    },
    dispose() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', end);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', context);
      window.removeEventListener('blur', cancel);
    },
  };
}
