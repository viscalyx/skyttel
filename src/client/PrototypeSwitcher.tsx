// THROWAWAY: shared development-only controls for comparing UI prototypes.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

export type PrototypeVariant = { key: string; name: string; description: string };

export function PrototypeSwitcher({
  variants,
  current,
  state,
  onSwitch,
}: {
  variants: PrototypeVariant[];
  current: string;
  state: unknown;
  onSwitch: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const [showState, setShowState] = useState(false);
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  function choose(key: string) {
    const next = new URLSearchParams(params);
    next.set('variant', key);
    setParams(next, { replace: true });
    onSwitch();
  }
  function cycle(direction: number) {
    choose(variants[(index + direction + variants.length) % variants.length].key);
  }
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !(event.target instanceof Element) ||
        event.target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  });
  if (!import.meta.env.DEV) return null;
  return (
    <aside className="prototype-switcher" aria-label="Jämför filterprototyper">
      {showState && <pre className="prototype-state">{JSON.stringify(state, null, 2)}</pre>}
      <div className="prototype-switcher-main">
        <button type="button" onClick={() => cycle(-1)} aria-label="Föregående prototyp">
          ←
        </button>
        <div className="prototype-switcher-label" aria-live="polite">
          <small>
            PROTOTYP {index + 1} / {variants.length}
          </small>
          <strong>
            {current} · {variants[index].name}
          </strong>
        </div>
        <button type="button" onClick={() => cycle(1)} aria-label="Nästa prototyp">
          →
        </button>
        <nav aria-label="Välj filterprototyp">
          {variants.map((variant) => (
            <button
              type="button"
              key={variant.key}
              aria-label={`${variant.key}: ${variant.name}`}
              aria-pressed={current === variant.key}
              onClick={() => choose(variant.key)}
            >
              {variant.key}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="prototype-state-toggle"
          aria-expanded={showState}
          onClick={() => setShowState(!showState)}
        >
          Tillstånd
        </button>
      </div>
      <p>{variants[index].description}</p>
    </aside>
  );
}
