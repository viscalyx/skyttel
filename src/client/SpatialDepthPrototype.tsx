// THROWAWAY: six depth/text comparisons on the existing entry route.
// Open /?prototype=spatial-depth&variant=A. No server, login or persistence.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { MapObject, MapRelationship, MapState } from '../shared/map.js';
import { defaultViewSettings, type PersonalView } from '../shared/personal-view.js';
import { SpatialMap } from './SpatialMap.js';
import './workspace.css';
import './SpatialDepthPrototype.css';

const variants = [
  { id: 'A', name: 'Dagens vy', symbols: false, strong: false, text: false },
  { id: 'B', name: 'Mild · symboler', symbols: true, strong: false, text: false },
  { id: 'C', name: 'Stark · symboler', symbols: true, strong: true, text: false },
  { id: 'D', name: 'Mild · symboler + text', symbols: true, strong: false, text: true },
  { id: 'E', name: 'Stark · symboler + text', symbols: true, strong: true, text: true },
  {
    id: 'F',
    name: 'Som E · text högst 15 px',
    symbols: true,
    strong: true,
    text: true,
    maxTextScale: 15 / 13,
  },
];
const examples = [
  ['Alex', 'Person', -7, 4, 12],
  ['Lo', 'Person', 5, 5, -12],
  ['Vårt hem', 'Bostad', 0, 0, 0],
  ['Alex blå cykel', 'Fordon', -12, -2, 13],
  ['Familjens bil', 'Fordon', 10, -3, -10],
  ['Garaget', 'Garage', 12, 3, 6],
  ['Musik hemma', 'Tjänst', -8, 9, -14],
  ['Musikabonnemang', 'Abonnemang', -14, 8, -4],
  ['Elavtalet', 'Avtal', 5, -9, 14],
  ['Hemförsäkringen', 'Avtal', -5, -9, -12],
  ['Lönekontot', 'Bankkonto', 13, -10, 0],
  ['Vårt betalkort', 'Kort', -14, -10, 5],
  ['Solcellsanläggningen på taket', 'Tjänst', 0, 12, 6],
  ['Bostadslånet', 'Låneavtal', 17, 7, -9],
  ['Alex e-postadress', 'E-postadress', -18, 2, -9],
] as const;
const types = [...new Set(examples.map(([, type]) => type))].map((name) => ({
  id: name,
  name,
  description: '',
  householdId: 'prototype',
  revision: 1,
}));
const objects: MapObject[] = examples.map(([name, typeId], index) => ({
  id: `object-${index}`,
  householdId: 'prototype',
  revision: 1,
  name,
  typeId,
  description: '',
}));
const relationships: MapRelationship[] = [
  [0, 2],
  [1, 2],
  [0, 3],
  [1, 4],
  [4, 5],
  [0, 6],
  [6, 7],
  [2, 8],
  [2, 9],
  [0, 10],
  [10, 11],
  [2, 12],
  [2, 13],
  [0, 14],
].map(([source, target], index) => ({
  id: `edge-${index}`,
  householdId: 'prototype',
  revision: 1,
  typeId: 'connected',
  sourceId: `object-${source}`,
  targetId: `object-${target}`,
  knowledge: 'known',
}));
const state: MapState = {
  userId: 'prototype',
  contentVersion: 1,
  types,
  objects,
  relationships,
  relationshipTypes: [
    {
      id: 'connected',
      householdId: 'prototype',
      revision: 1,
      name: 'Hör ihop med',
      description: '',
      forwardLabel: 'hör ihop med',
    },
  ],
  draft: { version: 0, changes: [] },
};
const objectMap = new Map(objects.map((object) => [object.id, object]));
const edgeMap = new Map(relationships.map((edge) => [edge.id, edge]));
const initialView: PersonalView = {
  contentVersion: 1,
  settings: { ...defaultViewSettings, version: 0 },
  positions: examples.map(([, , x, y, z], index) => ({
    id: `object-${index}`,
    x,
    y,
    z,
    version: 0,
  })),
};

export function SpatialDepthPrototype() {
  const [params, setParams] = useSearchParams();
  const variant = variants.find(({ id }) => id === params.get('variant')) ?? variants[0];
  const [view, setView] = useState(initialView);
  const [selection, setSelection] = useState<{
    kind: 'object' | 'relationship';
    id: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [navigationMount, setNavigationMount] = useState<HTMLDivElement | null>(null);
  const [cameraMount, setCameraMount] = useState<HTMLDivElement | null>(null);
  const [focus, setFocus] = useState<{ id: string; objectIds: string[] }>();
  function changeVariant(id: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('variant', id);
        return next;
      },
      { replace: true },
    );
  }
  function cycle(direction: number) {
    changeVariant(
      variants[(variants.indexOf(variant) + direction + variants.length) % variants.length].id,
    );
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        !(event.target instanceof Element) ||
        event.target.closest(
          'input, textarea, select, button, canvas, [contenteditable], .map-navigation',
        ) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const limits = variant.strong ? [0.49, 1.69] : [0.7, 1.3];
  const symbolRange = limits.map((scale) => Math.round(34 * scale)).join('–');
  const textRange = variant.text
    ? limits
        .map((scale) => (13 * Math.min(scale, variant.maxTextScale ?? Infinity)).toFixed(1))
        .join('–')
    : '13';
  return (
    <main
      className="household-map workspace-shell depth-prototype"
      data-theme="dark"
      data-symbol-scaling={variant.symbols || undefined}
      data-text-scaling={variant.text || undefined}
    >
      <header className="depth-prototype-intro workspace-context">
        <span className="depth-prototype-tag">PROTOTYP · RYMDKÄNSLA</span>
        <h1>Hur känns avståndet?</h1>
        <p>Rotera, zooma och välj objekt. Växla sedan läge med samma kameravy.</p>
        <p>Exempelkarta · flyttar och val gäller bara här tills du laddar om.</p>
        <details>
          <summary>Vad ändras i detta läge?</summary>
          <p role="status">
            {variant.name}. Symbolcirkel: {symbolRange} px. Namn: {textRange} px. Ikon:{' '}
            {variant.symbols ? 'följer cirkelns storlek' : 'fast 24 px'}. Typtext
            {variant.text ? ' och sambandsnamn följer också djupet' : ' har fast storlek'}.
            Objektens klickytor är minst 44 × 44 px.
          </p>
          <p>
            Mild skala: 70–130 %. Stark skala: 49–169 %. Textlägena visar även små texter för att du
            ska kunna bedöma läsbarheten.
          </p>
          {variant.id === 'F' && (
            <p>Som E på avstånd. Närmaste namn stannar vid 15 px jämfört med dagens 13 px.</p>
          )}
        </details>
      </header>
      <div className="depth-prototype-camera workspace-tools" ref={setCameraMount} />
      <div ref={setNavigationMount} />
      <div className="map-space">
        <SpatialMap
          active
          state={state}
          objects={objectMap}
          relationships={edgeMap}
          disabled={false}
          selection={selection}
          selectedIds={selectedIds}
          depthPrototype={variant}
          cameraMount={cameraMount}
          navigationMount={navigationMount}
          focusRequest={focus}
          personal={{
            view,
            pending: false,
            message: '',
            refresh: async () => setView(initialView),
            move: async (id, position) =>
              setView((current) => ({
                ...current,
                positions: current.positions.map((point) =>
                  point.id === id ? { ...point, ...position } : point,
                ),
              })),
            configure: async (settings) =>
              setView((current) => ({ ...current, settings: { ...settings, version: 0 } })),
          }}
          onSelect={(object, additive) => {
            setSelectedIds((ids) =>
              additive
                ? ids.includes(object.id)
                  ? ids.filter((id) => id !== object.id)
                  : [...ids, object.id]
                : [object.id],
            );
            setSelection({ kind: 'object', id: object.id });
          }}
          onSelectRelationship={(edge) => setSelection({ kind: 'relationship', id: edge.id })}
          onFocus={(id) => setFocus({ id: String(Date.now()), objectIds: [id] })}
          onClear={() => {
            setSelection(null);
            setSelectedIds([]);
          }}
          onReset={() => {
            setSelection(null);
            setSelectedIds([]);
          }}
          onRemove={() => {}}
        />
      </div>
      <nav
        className="depth-prototype-switcher workspace-feedback"
        aria-label="Välj prototypvariant"
      >
        <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
          ←
        </button>
        <label>
          <span>Jämför sex lägen</span>
          <select
            aria-label="Prototypvariant"
            value={variant.id}
            onChange={(event) => changeVariant(event.target.value)}
          >
            {variants.map(({ id, name }) => (
              <option key={id} value={id}>
                {id} · {name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
          →
        </button>
        <p aria-live="polite">
          {variant.text ? 'Texten följer djupet' : 'Texten har fast storlek'} ·
          {selection
            ? ` valt: ${selection.kind === 'object' ? objectMap.get(selection.id)?.name : 'samband'}`
            : ' inget valt'}
        </p>
      </nav>
    </main>
  );
}
