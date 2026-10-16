// THROWAWAY comparison controls; mounted only in explicit prototype builds.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import {
  type BackgroundVariant,
  backgroundVariants,
  readBackgroundVariant,
} from './prototype-space-background.js';
import { useWorkspaceTheme } from './WorkspaceTheme.js';
import './prototype-space-background.css';

export function PrototypeBackgroundControls({
  reducedMotion,
  stars,
  objectCount,
  onPreview,
}: {
  reducedMotion: boolean;
  stars: boolean;
  objectCount: number;
  onPreview: (variant: BackgroundVariant, enabled: boolean) => void;
}) {
  const [params, setParams] = useSearchParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector('.household-map.workspace-shell')), []);
  const theme = useWorkspaceTheme();
  const variant = readBackgroundVariant(params.get('variant'));
  const current = backgroundVariants.findIndex(({ key }) => key === variant);
  const backgroundParam = params.get('background');
  const [enabled, setEnabled] = useState(backgroundParam !== 'off');
  useEffect(() => setEnabled(backgroundParam !== 'off'), [backgroundParam]);
  useEffect(() => onPreview(variant, enabled), [variant, enabled, onPreview]);
  const update = (key: string, value: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const cycle = (step: number) =>
    update(
      'variant',
      backgroundVariants[(current + step + backgroundVariants.length) % backgroundVariants.length]
        .key,
    );
  return (
    host &&
    createPortal(
      <aside className="prototype-background-controls" aria-label="Bakgrundsprototyp">
        <details className="prototype-background-details">
          <summary>
            Prototyp · {variant} · {theme.theme === 'dark' ? 'Mörkt' : 'Ljust'}
          </summary>
          <div className="prototype-background-options">
            <p>
              <strong>Kastbar bakgrundsprototyp</strong>
            </p>
            <p>{backgroundVariants[current].detail}</p>
            <label>
              Jämför bakgrund
              <select
                aria-label="Jämför bakgrund"
                value={variant}
                onChange={(event) => update('variant', event.target.value)}
              >
                {backgroundVariants.map(({ key, name }) => (
                  <option key={key} value={key}>
                    {key} · {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tema
              <select
                aria-label="Tema i prototypen"
                value={theme.mode}
                disabled={theme.pending}
                onChange={(event) =>
                  theme.changeMode(event.target.value as 'light' | 'dark' | 'system')
                }
              >
                <option value="light">Ljust</option>
                <option value="dark">Mörkt</option>
                <option value="system">System</option>
              </select>
            </label>
            <label className="prototype-background-check">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => {
                  setEnabled(event.target.checked);
                  update('background', event.target.checked ? 'on' : 'off');
                }}
              />
              Visa prototypens bakgrund
            </label>
            <p>Temat sparas i testkontot. Bakgrundsalternativet finns bara i länken.</p>
            <p>
              {objectCount} objekt · Sparat val ”Visa stjärnhimmel”: {stars ? 'på' : 'av'} · Minskad
              rörelse: {reducedMotion ? 'på' : 'av'}.
            </p>
            <p>
              Ljuspunkter visas:{' '}
              {stars && enabled && !reducedMotion && variant !== 'A' ? 'ja' : 'nej'}.
            </p>
            <p>
              {reducedMotion
                ? 'Stillastående bakgrund, inga ljuspunkter.'
                : 'Bakgrunden följer kameran. Ingen egen animation.'}
            </p>
            <p>
              Rotation, panorering och zoom: använd kartans vanliga verktyg. Piltangenter växlar
              alternativ bara när jämförelseraden har fokus.
            </p>
          </div>
        </details>
        <fieldset
          className="prototype-background-cycle"
          aria-label="Växla bakgrund"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            event.preventDefault();
            event.stopPropagation();
            cycle(event.key === 'ArrowLeft' ? -1 : 1);
          }}
        >
          <button type="button" aria-label="Föregående bakgrund" onClick={() => cycle(-1)}>
            ←
          </button>
          <output aria-live="polite">
            {variant} · {backgroundVariants[current].name}
          </output>
          <button type="button" aria-label="Nästa bakgrund" onClick={() => cycle(1)}>
            →
          </button>
        </fieldset>
      </aside>,
      host,
    )
  );
}
