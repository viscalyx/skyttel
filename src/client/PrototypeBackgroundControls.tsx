// THROWAWAY comparison controls; mounted only in explicit prototype builds.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import {
  type BackgroundPreview,
  backgroundVariants,
  readBackgroundPreview,
  variantsForTheme,
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
  onPreview: (preview: BackgroundPreview) => void;
}) {
  const [params, setParams] = useSearchParams();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector('.household-map.workspace-shell')), []);
  const theme = useWorkspaceTheme();
  const { variant, composition, palette } = readBackgroundPreview(params, theme.theme);
  const current = backgroundVariants.find(({ key }) => key === variant) ?? backgroundVariants[0];
  const available = variantsForTheme(theme.theme);
  const currentIndex = available.findIndex(({ key }) => key === variant);
  const displayKey = (key: string) => key.replace('-light', '-ljus');
  const backgroundParam = params.get('background');
  const [enabled, setEnabled] = useState(backgroundParam !== 'off');
  useEffect(() => setEnabled(backgroundParam !== 'off'), [backgroundParam]);
  useEffect(
    () => onPreview({ variant, enabled, composition, palette }),
    [variant, enabled, composition, palette, onPreview],
  );
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
  const selectAppearance = (targetTheme: 'light' | 'dark', value: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('light', readBackgroundPreview(previous, 'light').variant);
        next.set('dark', readBackgroundPreview(previous, 'dark').variant);
        next.set(targetTheme, value);
        next.delete('variant');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const cycle = (step: number) =>
    selectAppearance(
      theme.theme,
      available[(currentIndex + step + available.length) % available.length].key,
    );
  return (
    host &&
    createPortal(
      <aside className="prototype-background-controls" aria-label="Bakgrundsprototyp">
        <details className="prototype-background-details">
          <summary>
            Prototyp · {displayKey(variant)} · {theme.theme === 'dark' ? 'Mörkt' : 'Ljust'}
          </summary>
          <div className="prototype-background-options">
            <p>
              <strong>Kastbar bakgrundsprototyp</strong>
            </p>
            <p>{current.detail}</p>
            {(['light', 'dark'] as const).map((targetTheme) => (
              <label key={targetTheme}>
                Bakgrund i {targetTheme === 'light' ? 'ljust' : 'mörkt'} tema
                <select
                  aria-label={`Bakgrund i ${targetTheme === 'light' ? 'ljust' : 'mörkt'} tema`}
                  value={readBackgroundPreview(params, targetTheme).variant}
                  onChange={(event) => selectAppearance(targetTheme, event.target.value)}
                >
                  {variantsForTheme(targetTheme).map(({ key, name }) => (
                    <option key={key} value={key}>
                      {displayKey(key)} · {name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
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
            {variant === 'D' && (
              <>
                <label>
                  Fördelning i D
                  <select
                    aria-label="Fördelning i D"
                    value={composition}
                    onChange={(event) => update('composition', event.target.value)}
                  >
                    <option value="sparse">Gles rymd · mycket tomrum</option>
                    <option value="galaxies">Galaxfält · fler grupper</option>
                    <option value="nebulae">Nebulosor · bredare dis och stoft</option>
                  </select>
                </label>
                {theme.theme === 'light' && (
                  <label>
                    Färger i ljust D
                    <select
                      aria-label="Färger i ljust D"
                      value={palette}
                      onChange={(event) => update('palette', event.target.value)}
                    >
                      <option value="pearl">Pärlemor</option>
                      <option value="dawn">Gryningsblå</option>
                      <option value="lavender">Lavendel</option>
                    </select>
                  </label>
                )}
                <p>
                  Spiralgalax, galax från kanten, elliptiska galaxer, nebulosor, stoft, stjärnhopar
                  och en ringform. Illustration av rymden med fria färger och skalor.
                </p>
              </>
            )}
            {variant === 'E' && (
              <p>
                {theme.theme === 'light'
                  ? 'Solstrålar, mjukt ljusspel och genomskinliga manetformer i pärlemor och turkos.'
                  : 'Djupblått vatten med glesa blågröna ljusorgan och manetformer. Inga solstrålar.'}{' '}
                Fria illustrationer av havet. Ingen egen animation eller blinkningar.
              </p>
            )}
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
            <p>
              Du kan välja olika bakgrunder för ljust och mörkt tema. Temat sparas i testkontot;
              bakgrundsvalen och D:s fördelning finns i länken.
            </p>
            <p>
              {objectCount} objekt · Sparat val ”Visa stjärnhimmel”: {stars ? 'på' : 'av'} · Minskad
              rörelse: {reducedMotion ? 'på' : 'av'}.
            </p>
            <p>
              Ljuspunkter visas:{' '}
              {stars && enabled && !reducedMotion && ['reference', 'B', 'D'].includes(variant)
                ? 'ja'
                : 'nej'}
              .
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
            {displayKey(variant)} · {current.name}
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
