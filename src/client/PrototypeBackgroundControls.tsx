// THROWAWAY comparison controls; mounted only in explicit prototype builds.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { oceanLifeOptions } from './prototype-ocean.js';
import {
  type BackgroundPreview,
  backgroundMotions,
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
  const [routeParams, setRouteParams] = useSearchParams();
  // React state queues rapid control changes. Router search-param callbacks
  // alone can overwrite a choice when two controls change before navigation.
  const [params, setParams] = useState(() => new URLSearchParams(routeParams));
  useEffect(() => {
    if (routeParams.toString() !== params.toString())
      setRouteParams(params, { replace: true, preventScrollReset: true });
  }, [params, routeParams, setRouteParams]);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector('.household-map.workspace-shell')), []);
  const theme = useWorkspaceTheme();
  const preview = readBackgroundPreview(params, theme.theme);
  const {
    variant,
    composition,
    palette,
    oceanLife,
    motion,
    strength,
    layerDepth,
    simulateReduced,
    reducedBackground,
  } = preview;
  const reduce = reducedMotion || simulateReduced;
  const current = backgroundVariants.find(({ key }) => key === variant) ?? backgroundVariants[0];
  const available = variantsForTheme(theme.theme);
  const currentIndex = available.findIndex(({ key }) => key === variant);
  const displayKey = (key: string) => key.replace('-light', '-ljus');
  const enabled = params.get('background') !== 'off';
  useEffect(
    () =>
      onPreview({
        variant,
        enabled,
        composition,
        palette,
        oceanLife,
        motion,
        strength,
        layerDepth,
        simulateReduced,
        reducedBackground,
      }),
    [
      variant,
      enabled,
      composition,
      palette,
      oceanLife,
      motion,
      strength,
      layerDepth,
      simulateReduced,
      reducedBackground,
      onPreview,
    ],
  );
  const update = (key: string, value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set(key, value);
      return next;
    });
  };
  const selectAppearance = (targetTheme: 'light' | 'dark', value: string) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('light', readBackgroundPreview(previous, 'light').variant);
      next.set('dark', readBackgroundPreview(previous, 'dark').variant);
      next.set(targetTheme, value);
      next.delete('variant');
      return next;
    });
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
            Rörelseprototyp · {displayKey(variant)} ·{' '}
            {reduce || motion === 'still' ? 'Stilla' : motion === 'gentle' ? 'Försiktig' : 'Lager'}
          </summary>
          <div className="prototype-background-options">
            <p>
              <strong>Kastbar bakgrundsprototyp</strong>
            </p>
            <p>{current.detail}</p>
            <label>
              Rörelsealternativ
              <select
                aria-label="Rörelsealternativ"
                value={motion}
                onChange={(event) => update('motion', event.target.value)}
              >
                {backgroundMotions.map(({ key, name }) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Panorering och zoom: {Math.round(strength * 100)} %
              <input
                aria-label="Styrka för panorering och zoom"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={strength}
                disabled={reduce || motion === 'still' || variant === 'reference'}
                onChange={(event) => update('strength', event.target.value)}
              />
            </label>
            <label>
              Lageravstånd: {layerDepth.toFixed(1)}
              <input
                aria-label="Lageravstånd"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={layerDepth}
                disabled={reduce || motion === 'still' || variant === 'reference'}
                onChange={(event) => update('depth', event.target.value)}
              />
            </label>
            <label className="prototype-background-check">
              <input
                type="checkbox"
                checked={simulateReduced}
                onChange={(event) => update('reduce', event.target.checked ? 'on' : 'off')}
              />
              Prova minskad rörelse
            </label>
            <label>
              Bakgrund vid minskad rörelse
              <select
                aria-label="Bakgrund vid minskad rörelse"
                value={reducedBackground}
                onChange={(event) => update('reduced', event.target.value)}
              >
                <option value="freeze">Behåll alla lager stilla</option>
                <option value="quiet">Stilla utan små ljuspunkter</option>
                <option value="off">Enfärgat · dölj hela bakgrunden</option>
              </select>
            </label>
            <p>
              Systemets minskade rörelse: {reducedMotion ? 'på' : 'av'}. Provet kan slå på minskad
              rörelse, men kan inte åsidosätta systemets val. Stilla läge låser den aktuella
              bakgrundsvyn. Återgång följer kartans aktuella kamera.
            </p>
            <p>
              Lager: full rotation, vald styrka för panorering och zoom. Försiktig: full rotation,
              en femtedel av vald styrka. Lageravstånd ändrar stjärnornas parallax mot det avlägsna
              diset och förflyttningen genom E:s vatten. A:s breda ljusfält följer rotation och
              zoom; där finns inga punktlager. E:s sand och yta följer kamerans riktning i båda
              rörliga lägena. Ingen egen animation, efterrörelse, puls eller blinkning. Referens
              visar applikationens tidigare beteende utan de nya rörelsevalen.
            </p>
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
              <>
                <p>
                  {theme.theme === 'light'
                    ? 'Sandbotten nedanför, vattenyta ovanför och brutet ljus genom vattnet. Titta uppåt eller nedåt med kartans rotation.'
                    : 'Djupblått vatten med sex olika former av bioluminiscens. Fria illustrationer av djur från olika havsdjup.'}{' '}
                  Ingen egen animation eller blinkningar.
                </p>
                {theme.theme === 'dark' && (
                  <label>
                    Djurliv i mörkt E
                    <select
                      aria-label="Djurliv i mörkt E"
                      value={oceanLife}
                      onChange={(event) => update('life', event.target.value)}
                    >
                      {oceanLifeOptions.map(({ key, name }) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <label className="prototype-background-check">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => {
                  update('background', event.target.checked ? 'on' : 'off');
                }}
              />
              Visa prototypens bakgrund
            </label>
            <p>
              Du kan välja olika bakgrunder för ljust och mörkt tema. Temat sparas i testkontot;
              bakgrundsvalen och rörelseprovet finns i länken.
            </p>
            <p>
              {objectCount} objekt · Sparat val ”Visa stjärnhimmel”: {stars ? 'på' : 'av'} · Minskad
              rörelse: {reduce ? 'på' : 'av'}.
            </p>
            <p>
              Stjärnor visas:{' '}
              {stars &&
              enabled &&
              (!reduce || (variant !== 'reference' && reducedBackground === 'freeze')) &&
              ['reference', 'B', 'D'].includes(variant)
                ? 'ja'
                : 'nej'}
              .
            </p>
            <p>
              Aktuellt prov: {backgroundMotions.find(({ key }) => key === motion)?.name} · styrka{' '}
              {strength.toFixed(2)} · lageravstånd {layerDepth.toFixed(1)} ·
              {reduce ? `minskad rörelse (${reducedBackground})` : 'vanlig rörelse'}.
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
            {displayKey(variant)} ·{' '}
            {variant === 'E' && theme.theme === 'dark'
              ? oceanLifeOptions.find(({ key }) => key === oceanLife)?.name.split(' · ')[0]
              : current.name}
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
