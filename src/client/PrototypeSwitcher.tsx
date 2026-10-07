// Throwaway development control shared by UI prototype variants.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const prototypeVariants = [
  { key: 'A', name: 'Valcirklar i två kolumner' },
  { key: 'B', name: 'Ett par per egenskap' },
  { key: 'C', name: 'Ett val i taget' },
  { key: 'D', name: 'Två kolumner utan valcirklar' },
];

export function PrototypeSwitcher({ current }: { current: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const index = Math.max(
    0,
    prototypeVariants.findIndex((variant) => variant.key === current),
  );
  function cycle(direction: number) {
    const next =
      prototypeVariants[(index + direction + prototypeVariants.length) % prototypeVariants.length];
    const search = new URLSearchParams(location.search);
    search.set('variant', next.key);
    navigate({ pathname: location.pathname, search: search.toString() }, { replace: true });
  }

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'production') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      cycle(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!import.meta.env.DEV || import.meta.env.MODE === 'production') return null;
  return (
    <nav className="prototype-switcher" aria-label="Byt prototypvariant">
      <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
        ←
      </button>
      <span aria-live="polite">
        <small>PROTOTYP</small>
        <strong>
          {prototypeVariants[index].key} · {prototypeVariants[index].name}
        </strong>
      </span>
      <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
        →
      </button>
    </nav>
  );
}
