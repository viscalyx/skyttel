// THROWAWAY: combined design in the real map and its existing settings page.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import type { PrototypeBackgroundSettings } from '../shared/personal-view.js';
import {
  type BackgroundPreview,
  backgroundVariants,
  readBackgroundPreview,
  variantsForTheme,
} from './prototype-space-background.js';
import { useWorkspaceTheme } from './WorkspaceTheme.js';
import './prototype-space-background.css';

export function PrototypeBackgroundSettingsPanel({
  value,
  pending,
  reduced,
  onChange,
}: {
  value: PrototypeBackgroundSettings;
  pending: boolean;
  reduced: boolean;
  onChange: (value: PrototypeBackgroundSettings) => void;
}) {
  const change = (patch: Partial<PrototypeBackgroundSettings>) => {
    if (!pending) onChange({ ...value, ...patch });
  };
  return (
    <section className="prototype-background-settings" aria-labelledby="background-heading">
      <h2 id="background-heading">Bakgrund</h2>
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          aria-disabled={pending || undefined}
          onChange={(event) => change({ enabled: event.target.checked })}
        />
        Visa bakgrund
      </label>
      <fieldset disabled={!value.enabled} aria-disabled={pending || undefined}>
        <legend>Bakgrundsval</legend>
        {(['light', 'dark'] as const).map((target) => (
          <label key={target}>
            Bakgrund i {target === 'light' ? 'ljust' : 'mörkt'} tema
            <select
              aria-label={`Bakgrund i ${target === 'light' ? 'ljust' : 'mörkt'} tema`}
              value={value[target]}
              aria-disabled={pending || undefined}
              onChange={(event) => change({ [target]: event.target.value })}
            >
              {variantsForTheme(target)
                .filter((item) => item.key !== 'reference')
                .map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </fieldset>
      <fieldset
        disabled={!value.enabled || reduced}
        aria-disabled={pending || undefined}
        aria-describedby="background-motion-help"
      >
        <legend>Rörelse</legend>
        {(['pan', 'zoom', 'depth'] as const).map((key) => (
          <label key={key}>
            {key === 'pan' ? 'Panoreringsstyrka' : key === 'zoom' ? 'Zoomstyrka' : 'Lageravstånd'}:{' '}
            {key === 'depth' ? value[key].toFixed(1) : `${Math.round(value[key] * 100)} %`}
            <input
              type="range"
              aria-label={
                key === 'pan' ? 'Panoreringsstyrka' : key === 'zoom' ? 'Zoomstyrka' : 'Lageravstånd'
              }
              min={key === 'depth' ? 0.5 : 0}
              max={key === 'depth' ? 2 : 1}
              step={key === 'depth' ? 0.1 : 0.05}
              value={value[key]}
              aria-disabled={pending || undefined}
              aria-valuetext={
                key === 'depth' ? value[key].toFixed(1) : `${Math.round(value[key] * 100)} procent`
              }
              onChange={(event) => change({ [key]: Number(event.target.value) })}
            />
          </label>
        ))}
        <button
          type="button"
          aria-disabled={pending || undefined}
          onClick={() => change({ pan: 0.7, zoom: 0.7, depth: 1 })}
        >
          Återställ rörelse
        </button>
      </fieldset>
      <p id="background-motion-help">
        {reduced
          ? 'Bakgrunden är stilla eftersom minskad rörelse är aktiverad.'
          : !value.enabled
            ? 'Slå på bakgrunden för att ändra dess val och rörelse.'
            : 'Panorering och zoom kan ändras var för sig. Återställ rörelse ändrar bara dessa styrkor och lageravståndet.'}
      </p>
      <p>Dina val sparas direkt för dig i det här hushållet.</p>
    </section>
  );
}

export function PrototypeBackgroundControls({
  reducedMotion,
  objectCount,
  onPreview,
  settings,
  onChange,
  ready,
  pending,
  active,
}: {
  reducedMotion: boolean;
  objectCount: number;
  onPreview: (preview: BackgroundPreview) => void;
  settings: PrototypeBackgroundSettings;
  onChange: (value: PrototypeBackgroundSettings) => void;
  ready: boolean;
  pending: boolean;
  active: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const initial = useRef(new URLSearchParams(params));
  const applied = useRef(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector('.household-map.workspace-shell')), []);
  const theme = useWorkspaceTheme();
  // URL choices initialise the disposable personal view once; ordinary settings
  // thereafter use the real personal-view save/conflict/failure flow.
  useEffect(() => {
    if (!ready || applied.current) return;
    applied.current = true;
    const query = initial.current;
    if (!['light', 'dark', 'background', 'pan', 'zoom', 'depth'].some((key) => query.has(key)))
      return;
    const light = readBackgroundPreview(query, 'light');
    const dark = readBackgroundPreview(query, 'dark');
    onChange({
      ...settings,
      ...(query.has('light')
        ? { light: light.variant as PrototypeBackgroundSettings['light'] }
        : {}),
      ...(query.has('dark') ? { dark: dark.variant as PrototypeBackgroundSettings['dark'] } : {}),
      ...(query.has('background') ? { enabled: light.enabled } : {}),
      ...(query.has('pan') ? { pan: light.strength } : {}),
      ...(query.has('zoom') ? { zoom: light.zoomStrength } : {}),
      ...(query.has('depth') ? { depth: light.layerDepth } : {}),
    });
  }, [ready, onChange, settings]);
  const [simulateReduced, setSimulateReduced] = useState(() => params.get('reduce') === 'on');
  const [reference, setReference] = useState(() => params.get('reference') === 'on');
  const variant = reference ? 'reference' : settings[theme.theme];
  useEffect(
    () =>
      onPreview({
        variant,
        enabled: settings.enabled,
        composition: 'sparse',
        palette: 'pearl',
        oceanLife: 'all',
        motion: 'gentle',
        strength: settings.pan,
        zoomStrength: settings.zoom,
        layerDepth: settings.depth,
        simulateReduced,
      }),
    [
      variant,
      settings.enabled,
      settings.pan,
      settings.zoom,
      settings.depth,
      simulateReduced,
      onPreview,
    ],
  );
  const update = (key: string, value: string) => {
    if (key === 'reduce') setSimulateReduced(value === 'on');
    if (key === 'reference') setReference(value === 'on');
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  const available = variantsForTheme(theme.theme).filter((item) => item.key !== 'reference');
  const current = backgroundVariants.find((item) => item.key === variant);
  const cycle = (step: number) => {
    if (pending || !ready) return;
    const index = available.findIndex((item) => item.key === variant);
    onChange({
      ...settings,
      [theme.theme]: available[(index + step + available.length) % available.length].key,
    });
  };
  const share = new URLSearchParams({
    light: settings.light,
    dark: settings.dark,
    background: settings.enabled ? 'on' : 'off',
    pan: String(settings.pan),
    zoom: String(settings.zoom),
    depth: String(settings.depth),
    ...(simulateReduced ? { reduce: 'on' } : {}),
  });
  return (
    host &&
    active &&
    createPortal(
      <aside className="prototype-background-controls" aria-label="Bakgrundsprototyp">
        <details className="prototype-background-details">
          <summary>Samlad bakgrundsprototyp</summary>
          <div className="prototype-background-options">
            <p>
              <strong>Kastbar prototyp · endast påhittade uppgifter</strong>
            </p>
            <p>Ändra bakgrunden under Inställningar → Rymdkartan → Bakgrund.</p>
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
                checked={simulateReduced}
                onChange={(event) => update('reduce', event.target.checked ? 'on' : 'off')}
              />
              Prova minskad rörelse
            </label>
            <p>
              Systemets minskade rörelse: {reducedMotion ? 'på' : 'av'}. Provet kan inte åsidosätta
              systemets val.
            </p>
            <label className="prototype-background-check">
              <input
                type="checkbox"
                checked={reference}
                onChange={(event) => update('reference', event.target.checked ? 'on' : 'off')}
              />
              Jämför tidigare bakgrund
            </label>
            <p>
              Referensen använder det gamla stjärnvalet. Stäng av jämförelsen för att bedöma den nya
              designen.
            </p>
            <a href={`?${share}`}>Länk till aktuella bakgrundsval</a>
            <p>
              Starta med --legacy-off eller --legacy-on för att prova tidigare sparade val. Utan
              flagga: ny personlig vy.
            </p>
            <output>
              {objectCount} objekt · {settings.enabled ? 'på' : 'av'} · ljust {settings.light} ·
              mörkt {settings.dark} · panorering {settings.pan} · zoom {settings.zoom} · lager{' '}
              {settings.depth} ·{' '}
              {reducedMotion || simulateReduced ? 'alla lager stilla' : 'försiktig kamerarörelse'}
            </output>
            <p>
              Ingen egen animation. Minskad rörelse behåller vyn; återgång följer bara nya
              kamerarörelser. Återställ vy återger kamerakopplingen.
            </p>
          </div>
        </details>
        <fieldset
          className="prototype-background-cycle"
          aria-label="Växla bakgrund"
          disabled={!ready || !settings.enabled || reference}
          aria-disabled={pending || undefined}
          onKeyDown={(event) => {
            if (
              !['ArrowLeft', 'ArrowRight'].includes(event.key) ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            cycle(event.key === 'ArrowLeft' ? -1 : 1);
          }}
        >
          <button type="button" aria-label="Föregående bakgrund" onClick={() => cycle(-1)}>
            ←
          </button>
          <output aria-live="polite">{current?.name}</output>
          <button type="button" aria-label="Nästa bakgrund" onClick={() => cycle(1)}>
            →
          </button>
        </fieldset>
      </aside>,
      host,
    )
  );
}
