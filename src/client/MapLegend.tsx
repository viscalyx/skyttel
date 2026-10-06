import type { MapDraft, MapObject, MapRelationship } from '../shared/map.js';
import { mapLegendKinds } from './map-presentation.js';

const entries = [
  { kind: 'added', symbol: '+', text: 'Grönt +: föreslås läggas till' },
  { kind: 'changed', symbol: '✎', text: 'Gul penna: föreslås ändras' },
  { kind: 'removed', symbol: '×', text: 'Rött ×: borttaget eller tidigare samband' },
  { kind: 'selection', symbol: '◯', text: 'Ring: markerat objekt' },
  { kind: 'connector', symbol: '⋯', text: 'Punkter: etikettens koppling' },
] as const;

function LegendSymbol({
  kind,
  symbol,
}: {
  kind: (typeof entries)[number]['kind'];
  symbol: string;
}) {
  return (
    <span aria-hidden="true" className={`map-legend-symbol ${kind}`}>
      <span className="map-legend-glyph">{symbol}</span>
      {['added', 'changed', 'removed'].includes(kind) && <span className="map-legend-line" />}
    </span>
  );
}

export function MapLegend({
  draft,
  objects,
  relationships,
  selectedIds,
  previousIds,
}: {
  draft: MapDraft;
  objects: Map<string, MapObject>;
  relationships: Map<string, MapRelationship>;
  selectedIds: string[];
  previousIds?: ReadonlySet<string>;
}) {
  const kinds = mapLegendKinds(draft, objects, relationships, selectedIds, previousIds);
  if (!kinds.size) return null;
  return (
    <section aria-label="Teckenförklaring i kartan" className="map-legend">
      {entries
        .filter(({ kind }) => kinds.has(kind))
        .map(({ kind, symbol, text }) => (
          <p key={kind}>
            <LegendSymbol kind={kind} symbol={symbol} />
            {text}
          </p>
        ))}
    </section>
  );
}

export function FullMapLegend() {
  return (
    <section aria-label="Kartans teckenförklaring">
      <h3>Kartans teckenförklaring</h3>
      <p>Förslag hör till ditt privata utkast tills du sparar hela utkastet.</p>
      <ul className="full-map-legend">
        <li>
          <LegendSymbol kind="added" symbol="+" />
          Grönt + visar ett nytt objekt eller samband. Nya samband har heldragna linjer. Ett nytt
          objekts gröna kontur visar förslaget.
        </li>
        <li>
          <LegendSymbol kind="changed" symbol="✎" />
          Gul penna ✎ visar ett ändrat objekt eller samband. Ett ändrat samband med samma riktade
          ändpunkter har en heldragen linje, även när typ eller andra uppgifter ändras.
        </li>
        <li>
          <LegendSymbol kind="removed" symbol="×" />
          Rött × visar en föreslagen borttagning. Borttagna samband har streckade linjer. När
          ändpunkter eller riktning ändras visas det tidigare sambandet med rött × och streckad
          linje och det nya med grönt + och heldragen linje.
        </li>
        <li>
          <LegendSymbol kind="selection" symbol="◯" />
          En separat ring visar ett markerat objekt. Den skiljer sig från det nya objektets gröna
          förslagskontur och kan finnas kvar efter sparandet.
        </li>
        <li>
          <LegendSymbol kind="connector" symbol="⋯" />
          Punktade kopplingar ⋯ binder etiketter till objekt och samband. De är inga egna samband.
          Höjdhjälpens streckade markeringar visar höjd.
        </li>
      </ul>
      <p>
        Kartans teckenförklaring följer sökning, typfilter, markering och fokus. Kamerans rörelser
        ändrar den inte. Förslagens sambandsetiketter visas utan att du behöver markera eller välja
        Alla etiketter, så långt de får plats utan att krocka.
      </p>
      <p>
        Utkastet är sparat visas i tre sekunder när ett sparförsök bekräftas. Att förslag inte syns
        i kartan bevisar inte att de är sparade. Läs genomförda sparanden i Rapporter och
        kontrollera obekräftade sparanden med samma kvitto. Konflikter kan öppnas från Karta och
        Tabell även när kartans filter döljer dem.
      </p>
    </section>
  );
}
