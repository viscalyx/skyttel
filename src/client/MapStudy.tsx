// Tre kastbara sätt att utforska samma karta på ?prototype=map&variant=A/B/C.
// Godkända fria paneler och D-skalet återanvänds. Allt provtillstånd finns i minnet.
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';
import { MapStudyCanvas } from './MapStudyCanvas.js';
import { changeLabel, studyData } from './map-study-data.js';
import type {
  StudyCamera,
  StudyCameraAction,
  StudyPosition,
  StudyVariant,
} from './map-study-types.js';
import './map-study.css';

const variants = {
  A: {
    name: 'Fri överblick',
    description:
      'Utforska hela rymden. Öppna uppgifter när du behöver dem; välj själv när kameran ska komma närmare.',
  },
  B: {
    name: 'Ett sammanhang',
    description:
      'Det valda objektets direkta samband står i förgrunden. En sammanhållen läsremsa hjälper dig att följa dem.',
  },
  C: {
    name: 'Följ en kedja',
    description:
      'Bygg en synlig väg genom samband, ett steg i taget. Gå tillbaka längs vägen utan att tappa överblicken.',
  },
};

function useStudyState() {
  const [params, setParams] = useSearchParams();
  const candidate = params.get('variant');
  const variant: StudyVariant = candidate === 'B' || candidate === 'C' ? candidate : 'A';
  const [density, setDensity] = useState<'sparse' | 'dense' | 'large'>('sparse');
  const [proposals, setProposals] = useState(false);
  const [savedProposals, setSavedProposals] = useState(false);
  const [positions, setPositions] = useState<Record<string, StudyPosition>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [trail, setTrail] = useState(['subscription']);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [listKind, setListKind] = useState<'objects' | 'relationships'>('objects');
  const [page, setPage] = useState(0);
  const [noGraphics, setNoGraphics] = useState(false);
  const [stars, setStars] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [canReturnFromOverview, setCanReturnFromOverview] = useState(false);
  const [cameraDescription, setCameraDescription] = useState('Överblick');
  const [movement, setMovement] = useState('');
  const cameraRef = useRef<StudyCamera | null>(null);
  const data = useMemo(() => {
    const value = studyData(density, proposals || savedProposals);
    if (savedProposals && !proposals) {
      value.objects = value.objects.map((object) => ({
        ...object,
        change: undefined,
        description:
          object.id === 'subscription'
            ? 'Musik för hushållet, 199 kr per månad.'
            : object.id === 'film'
              ? 'Hushållets påhittade filmtjänst.'
              : object.description,
      }));
      value.relationships = value.relationships
        .filter((edge) => edge.change !== 'removed')
        .map((edge) => ({ ...edge, change: undefined }));
    }
    return value;
  }, [density, proposals, savedProposals]);
  const objects = useMemo(
    () =>
      data.objects.map((object) => ({
        ...object,
        position: positions[object.id] ?? object.position,
      })),
    [data, positions],
  );
  const relationships = data.relationships;
  function setVariant(next: StudyVariant) {
    const updated = new URLSearchParams(params);
    updated.set('variant', next);
    setParams(updated, { replace: true });
  }
  function move(id: string, position: StudyPosition) {
    const original = data.objects.find((object) => object.id === id)?.position;
    const restored =
      original &&
      (['x', 'y', 'z'] as const).every((axis) => Math.abs(original[axis] - position[axis]) < 0.001);
    setPositions((previous) => {
      const next = { ...previous, [id]: position };
      if (restored) delete next[id];
      return next;
    });
    setMovement(
      `${objects.find((object) => object.id === id)?.name}: personlig placering ${restored ? 'återställd' : 'ändrad'}. Hushållets uppgifter är oförändrade.`,
    );
  }
  function follow(from: string, id: string) {
    setSelectedEdge(null);
    setTrail((previous) => (previous.at(-1) === from ? [...previous, id] : [from, id]));
    if (focusId) setFocusId(id);
  }
  function chooseDensity(next: 'sparse' | 'dense' | 'large') {
    setDensity(next);
    setPage(0);
  }
  function commitProposals() {
    if (!proposals) return;
    setSavedProposals(true);
    setProposals(false);
    setSelectedEdge(null);
  }
  function resetProposals() {
    setNavigationOpen(false);
    setCanReturnFromOverview(false);
    setProposals(false);
    setSavedProposals(false);
    setPositions({});
    setFocusId(null);
    setTrail(['subscription']);
    setSelectedEdge(null);
    setQuery('');
    setType('');
    setPage(0);
  }
  return {
    objects,
    relationships,
    variant,
    setVariant,
    density,
    setDensity: chooseDensity,
    proposals,
    setProposals,
    savedProposals,
    setSavedProposals,
    commitProposals,
    resetProposals,
    positions,
    move,
    focusId,
    setFocusId,
    trail,
    setTrail,
    follow,
    selectedEdge,
    setSelectedEdge,
    query,
    setQuery,
    type,
    setType,
    listKind,
    setListKind,
    page,
    setPage,
    noGraphics,
    setNoGraphics,
    stars,
    setStars,
    navigationOpen,
    setNavigationOpen,
    canReturnFromOverview,
    setCanReturnFromOverview,
    cameraDescription,
    setCameraDescription,
    cameraRef,
    movement,
  };
}
type Study = ReturnType<typeof useStudyState>;
const Context = createContext<Study | null>(null);
export function useMapStudy() {
  return useContext(Context);
}
export function MapStudyProvider({ children }: { children: ReactNode }) {
  const value = useStudyState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
function useStudy() {
  const study = useMapStudy();
  if (!study) throw new Error('Kartprovet saknar sitt provtillstånd.');
  return study;
}

const cameraButtons: [StudyCameraAction, string][] = [
  ['left', 'Panorera vänster'],
  ['right', 'Panorera höger'],
  ['up', 'Panorera uppåt'],
  ['down', 'Panorera nedåt'],
  ['rotate-left', 'Rotera vänster'],
  ['rotate-right', 'Rotera höger'],
  ['tilt-up', 'Luta uppåt'],
  ['tilt-down', 'Luta nedåt'],
];

export function MapStudyMap({
  selectedId,
  selectedIds,
  onSelect,
  onClearSelection,
  onOpenDetails,
  showSelectionActions,
  onList,
  theme,
  names,
  staged,
}: {
  selectedId: string;
  selectedIds: string[];
  onSelect: (id: string, additive?: boolean) => void;
  onClearSelection: () => void;
  onOpenDetails: (id: string) => void;
  showSelectionActions: boolean;
  onList: () => void;
  theme: 'light' | 'dark';
  names: Record<string, string>;
  staged: Record<string, string>;
}) {
  const study = useStudy();
  const [relationsOpen, setRelationsOpen] = useState(false);
  const navigationTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (study.navigationOpen) navigationTitle.current?.focus({ preventScroll: true });
  }, [study.navigationOpen]);
  function closeNavigation() {
    study.setNavigationOpen(false);
    document.querySelector<HTMLButtonElement>('[data-tool="navigate"]')?.focus();
  }
  const subject =
    study.objects.find((object) => object.id === (study.focusId ?? selectedId)) ?? study.objects[3];
  const linked = study.relationships.filter(
    (edge) =>
      selectedIds.includes(edge.from) ||
      selectedIds.includes(edge.to) ||
      edge.from === study.focusId ||
      edge.to === study.focusId,
  );
  const markedRelationship = study.relationships.find((edge) => edge.id === study.selectedEdge);
  const pathEdges =
    study.variant === 'C' && selectedIds.length > 0
      ? study.relationships.filter((edge) =>
          study.trail.some(
            (id, index) =>
              index > 0 &&
              ((edge.from === id && edge.to === study.trail[index - 1]) ||
                (edge.to === id && edge.from === study.trail[index - 1])),
          ),
        )
      : [];
  const emphasizedRelationships = [
    ...linked,
    ...pathEdges,
    ...(markedRelationship ? [markedRelationship] : []),
  ];
  const emphasisIds = [
    ...new Set([
      ...selectedIds,
      ...emphasizedRelationships.flatMap((edge) => [edge.from, edge.to]),
    ]),
  ];
  const emphasisEdges = [...new Set(emphasizedRelationships.map((edge) => edge.id))];
  const objects = useMemo(
    () =>
      study.objects.map((object) => ({
        ...object,
        name: staged[object.id] ?? names[object.id] ?? object.name,
        change:
          object.change === 'added'
            ? object.change
            : staged[object.id]
              ? ('changed' as const)
              : object.change,
      })),
    [study.objects, names, staged],
  );
  const name = (id: string) =>
    staged[id] ?? names[id] ?? study.objects.find((object) => object.id === id)?.name ?? id;
  return (
    <div className="mp-map-area">
      <div className="mp-canvas-host" hidden={study.noGraphics}>
        <MapStudyCanvas
          objects={objects}
          relationships={study.relationships}
          selectedId={selectedId}
          selectedIds={selectedIds}
          selectedRelationship={study.selectedEdge}
          emphasisIds={emphasisIds}
          emphasisEdges={emphasisEdges}
          variant={study.variant}
          theme={theme}
          stars={study.stars}
          onSelect={(id, additive) => {
            study.setSelectedEdge(null);
            study.setFocusId(null);
            onSelect(id, additive);
          }}
          onOpenDetails={(id) => {
            study.setSelectedEdge(null);
            study.setFocusId(null);
            onOpenDetails(id);
          }}
          onClearSelection={onClearSelection}
          onSelectRelationship={(id) => {
            study.setSelectedEdge(id);
            const edge = study.relationships.find((item) => item.id === id);
            if (edge) onSelect(edge.from);
          }}
          onMove={study.move}
          cameraRef={study.cameraRef}
          onCameraChange={study.setCameraDescription}
          onOverviewChange={study.setCanReturnFromOverview}
        />
      </div>
      {showSelectionActions && selectedIds.length > 1 && (
        <aside className="mp-selection-actions" aria-label="Markerade objekt">
          <span role="status">{selectedIds.length} markerade</span>
        </aside>
      )}
      {study.noGraphics && (
        <section className="mp-graphics-notice np-stack">
          <h2>Kartgrafiken är dold i provet</h2>
          <p>
            Alla objekt, samband och personliga placeringar finns kvar. Fortsätt i text och lista.
          </p>
          <button type="button" onClick={onList}>
            Öppna objekt och samband
          </button>
        </section>
      )}
      <div className="mp-map-tools">
        {study.navigationOpen && (
          <section
            id="mp-navigation"
            className="mp-navigation np-stack"
            aria-labelledby="mp-navigation-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                closeNavigation();
              }
            }}
          >
            <h2 ref={navigationTitle} id="mp-navigation-title" tabIndex={-1}>
              Navigera i kartan
            </h2>
            <p>Flytta vyn med knapparna. Ett objektval flyttar inte kameran.</p>
            <button
              type="button"
              aria-pressed={study.stars}
              onClick={() => study.setStars(!study.stars)}
            >
              {study.stars ? 'Dölj stjärnhimmel' : 'Visa stjärnhimmel'}
            </button>
            <p>Systemets minskade rörelse stänger av stjärnhimlen.</p>
            <div className="mp-button-grid">
              {cameraButtons.map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => study.cameraRef.current?.navigate(action)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mp-button-grid">
              <button type="button" onClick={() => study.cameraRef.current?.navigate('in')}>
                Zooma in
              </button>
              <button type="button" onClick={() => study.cameraRef.current?.navigate('out')}>
                Zooma ut
              </button>
            </div>
            <button type="button" onClick={closeNavigation}>
              Stäng navigering
            </button>
          </section>
        )}
      </div>
      {study.variant === 'B' && selectedIds.length > 0 && (
        <aside className="mp-context-ribbon" aria-label="Valt sammanhang">
          <div>
            <span className="mp-eyebrow">ETT SAMMANHANG</span>
            <strong>
              {selectedIds.length > 1 ? `${selectedIds.length} markerade objekt` : name(subject.id)}
            </strong>
            <span>{linked.length} direkta samband · övriga finns kvar</span>
          </div>
          <button
            type="button"
            onClick={() => setRelationsOpen(!relationsOpen)}
            aria-expanded={relationsOpen}
          >
            Läs samband
          </button>
          <button type="button" onClick={() => study.cameraRef.current?.frame(emphasisIds)}>
            Rama in sammanhanget
          </button>
          {relationsOpen && (
            <ul>
              {linked.slice(0, 12).map((edge) => (
                <li key={edge.id}>
                  <button
                    type="button"
                    onClick={() => {
                      study.setSelectedEdge(edge.id);
                      onSelect(edge.from);
                    }}
                  >
                    {name(edge.from)} → {edge.label} → {name(edge.to)}
                    {edge.change && ` · ${changeLabel(edge.change)}`}
                  </button>
                </li>
              ))}
              {linked.length > 12 && (
                <li>
                  <button type="button" onClick={onList}>
                    Alla {linked.length} samband i listan
                  </button>
                </li>
              )}
            </ul>
          )}
        </aside>
      )}
      {study.variant === 'C' && (
        <nav className="mp-path-ribbon" aria-label="Din väg genom kartan">
          <span className="mp-eyebrow">DIN VÄG</span>
          <ol>
            {study.trail.map((id, index) => (
              <li key={study.trail.slice(0, index + 1).join('/')}>
                <button
                  type="button"
                  aria-current={index === study.trail.length - 1 ? 'step' : undefined}
                  onClick={() => {
                    study.setTrail((previous) => previous.slice(0, index + 1));
                    study.setSelectedEdge(null);
                    onSelect(id);
                  }}
                >
                  {index + 1}. {name(id)}
                </button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => onSelect(study.trail.at(-1) ?? selectedId)}>
            Välj nästa samband
          </button>
          <button type="button" onClick={() => study.setTrail([selectedId])}>
            Börja här
          </button>
        </nav>
      )}
      {study.focusId && (
        <div className="mp-focus-notice">
          Fokus på {name(study.focusId)}
          <button type="button" onClick={() => study.setFocusId(null)}>
            Lämna fokus · behåll kameran
          </button>
        </div>
      )}
    </div>
  );
}

export function MapStudyPages({
  page,
  selectedId,
  selectedIds,
  onToggleSelection,
  onClearSelection,
  onReveal,
  onOpenDetails,
  onEdit,
  names,
  staged,
}: {
  page: 'list' | 'detail';
  selectedId: string;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  onReveal: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onEdit: () => void;
  names: Record<string, string>;
  staged: Record<string, string>;
}) {
  const study = useStudy();
  const subject = study.objects.find((object) => object.id === selectedId);
  const name = (id: string) =>
    staged[id] ?? names[id] ?? study.objects.find((object) => object.id === id)?.name ?? id;
  function follow(from: string, id: string) {
    study.follow(from, id);
    onOpenDetails(id);
  }
  function edgeRows(edges: typeof study.relationships) {
    return (
      <ul className="mp-relations">
        {edges.map((edge) => (
          <li key={edge.id} data-selected={edge.id === study.selectedEdge}>
            <p>
              <strong>{name(edge.from)}</strong> <span>→ {edge.label} →</span>{' '}
              <strong>{name(edge.to)}</strong>
            </p>
            {edge.change && (
              <p className="mp-change">
                {changeLabel(edge.change)}
                {edge.id === 'payment' ? ' · sparad koppling före förslaget' : ''}
              </p>
            )}
            <div className="mp-button-grid">
              <button
                type="button"
                onClick={() => {
                  study.setSelectedEdge(edge.id);
                  onOpenDetails(edge.from);
                }}
              >
                Visa samband
              </button>
              <button
                type="button"
                onClick={() =>
                  follow(
                    edge.from === selectedId ? edge.from : edge.to,
                    edge.from === selectedId ? edge.to : edge.from,
                  )
                }
              >
                Följ till {name(edge.from === selectedId ? edge.to : edge.from)}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (page === 'list') {
    const query = study.query.trim().toLocaleLowerCase('sv');
    const objects = study.objects.filter(
      (object) =>
        (!study.type || object.type === study.type) &&
        `${name(object.id)} ${object.type}`.toLocaleLowerCase('sv').includes(query),
    );
    const edges = study.relationships.filter(
      (edge) =>
        `${name(edge.from)} ${edge.label} ${name(edge.to)}`
          .toLocaleLowerCase('sv')
          .includes(query) &&
        (!study.type ||
          [edge.from, edge.to].some(
            (id) => study.objects.find((object) => object.id === id)?.type === study.type,
          )),
    );
    const total = study.listKind === 'objects' ? objects.length : edges.length;
    const last = Math.max(0, Math.ceil(total / 50) - 1);
    const currentPage = Math.min(study.page, last);
    const start = currentPage * 50;
    return (
      <div className="np-stack mp-list">
        <p>
          Sök i hela hushållets innehåll. Välj en träff för att markera och visa den i kartan. Lägg
          till flera objekt i markeringen med deras knappar. Detaljer öppnas separat.
        </p>
        <label htmlFor="mp-search">Sök objekt eller samband</label>
        <input
          id="mp-search"
          type="search"
          value={study.query}
          onChange={(event) => {
            study.setQuery(event.target.value);
            study.setPage(0);
          }}
        />
        <label htmlFor="mp-filter">Objekttyp</label>
        <select
          id="mp-filter"
          value={study.type}
          onChange={(event) => {
            study.setType(event.target.value);
            study.setPage(0);
          }}
        >
          <option value="">Alla typer</option>
          {[...new Set(study.objects.map((object) => object.type))].sort().map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <div className="mp-button-grid">
          <button
            type="button"
            aria-pressed={study.listKind === 'objects'}
            onClick={() => {
              study.setListKind('objects');
              study.setPage(0);
            }}
          >
            Objekt ({objects.length})
          </button>
          <button
            type="button"
            aria-pressed={study.listKind === 'relationships'}
            onClick={() => {
              study.setListKind('relationships');
              study.setPage(0);
            }}
          >
            Samband ({edges.length})
          </button>
        </div>
        <p role="status">
          {total} träffar.{' '}
          {total ? `Visar ${start + 1}–${Math.min(start + 50, total)}.` : 'Pröva en annan sökning.'}
        </p>
        <button type="button" disabled={!selectedIds.length} onClick={onClearSelection}>
          Avmarkera alla ({selectedIds.length})
        </button>
        {study.listKind === 'objects' ? (
          <ul className="mp-object-list">
            {objects.slice(start, start + 50).map((object) => (
              <li key={object.id}>
                <button
                  type="button"
                  aria-pressed={selectedIds.includes(object.id)}
                  onClick={() => {
                    study.setSelectedEdge(null);
                    onReveal(object.id);
                  }}
                >
                  <strong>{name(object.id)}</strong>
                  <span>
                    {object.type}
                    {object.ended ? ' · Upphört' : ''}
                  </span>
                  {(object.change || staged[object.id]) && (
                    <span className="mp-change">
                      {changeLabel(
                        object.change === 'added'
                          ? 'added'
                          : staged[object.id]
                            ? 'changed'
                            : object.change,
                      )}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`${selectedIds.includes(object.id) ? 'Avmarkera' : 'Lägg till i markeringen:'} ${name(object.id)}`}
                  aria-pressed={selectedIds.includes(object.id)}
                  onClick={() => {
                    study.setSelectedEdge(null);
                    study.setFocusId(null);
                    onToggleSelection(object.id);
                  }}
                >
                  {selectedIds.includes(object.id) ? 'Avmarkera' : 'Lägg till i markeringen'}
                </button>
                <button
                  type="button"
                  aria-label={`Visa detaljer för ${name(object.id)}`}
                  onClick={() => {
                    study.setSelectedEdge(null);
                    onOpenDetails(object.id);
                  }}
                >
                  Visa detaljer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          edgeRows(edges.slice(start, start + 50))
        )}
        {last > 0 && (
          <nav className="mp-button-grid" aria-label="Listsidor">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => study.setPage(currentPage - 1)}
            >
              Föregående sida
            </button>
            <button
              type="button"
              disabled={currentPage === last}
              onClick={() => study.setPage(currentPage + 1)}
            >
              Nästa sida
            </button>
            <span>
              Sida {currentPage + 1} av {last + 1}
            </span>
          </nav>
        )}
      </div>
    );
  }
  if (!subject)
    return <p>Objektet ingår inte i detta provläge. Öppna ett annat objekt i listan.</p>;
  const linked = study.relationships.filter(
    (edge) => edge.from === selectedId || edge.to === selectedId,
  );
  const selectedEdge = linked.find((edge) => edge.id === study.selectedEdge);
  const directions: [string, StudyPosition][] = [
    ['Vänster', { x: -45, y: 0, z: 0 }],
    ['Höger', { x: 45, y: 0, z: 0 }],
    ['Uppåt', { x: 0, y: 45, z: 0 }],
    ['Nedåt', { x: 0, y: -45, z: 0 }],
    ['Framåt', { x: 0, y: 0, z: 45 }],
    ['Bakåt', { x: 0, y: 0, z: -45 }],
  ];
  return (
    <div className="np-stack mp-details">
      <p className="np-kicker">
        {subject.type}
        {subject.ended ? ' · Upphört' : ''}
      </p>
      <h3>{name(selectedId)}</h3>
      <p>{subject.description}</p>
      {(subject.change || staged[selectedId]) && (
        <p className="mp-change">
          {changeLabel(
            subject.change === 'added' ? 'added' : staged[selectedId] ? 'changed' : subject.change,
          )}{' '}
          · privat utkast
        </p>
      )}
      <div className="mp-button-grid">
        <button type="button" onClick={() => study.cameraRef.current?.frame([selectedId])}>
          Visa nära i kartan
        </button>
        <button type="button" onClick={() => study.setFocusId(selectedId)}>
          Framhäv kopplingar
        </button>
        <button type="button" onClick={onEdit}>
          Ändra uppgifter
        </button>
      </div>
      {selectedEdge && (
        <section className="mp-selected-edge" aria-label="Valt samband">
          <h3>Valt samband</h3>
          <p>
            {name(selectedEdge.from)} → {selectedEdge.label} → {name(selectedEdge.to)}
          </p>
          <p>
            {selectedEdge.change
              ? `${changeLabel(selectedEdge.change)} · privat utkast`
              : 'Sparat i hushållets karta'}
          </p>
          <button
            type="button"
            onClick={() =>
              follow(
                selectedId,
                selectedEdge.from === selectedId ? selectedEdge.to : selectedEdge.from,
              )
            }
          >
            Följ sambandet
          </button>
        </section>
      )}
      <details className="mp-placement">
        <summary>Ordna min vy</summary>
        <p>
          Flytta endast din personliga placering. Avstånd och höjd beskriver inga hushållsuppgifter.
        </p>
        <div className="mp-button-grid">
          {directions.map(([label, offset]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                study.move(selectedId, {
                  x: subject.position.x + offset.x,
                  y: subject.position.y + offset.y,
                  z: subject.position.z + offset.z,
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p role="status">{study.movement}</p>
      </details>
    </div>
  );
}

export function MapStudyLab({
  selectedId,
  onList,
  onSelect,
  savePending,
  onResolveSave,
}: {
  selectedId: string;
  onList: () => void;
  onSelect: (id: string) => void;
  savePending?: boolean;
  onResolveSave?: (success: boolean) => void;
}) {
  const study = useStudy();
  const [expanded, setExpanded] = useState(false);
  const switchVariant = (direction: number) => {
    const keys: StudyVariant[] = ['A', 'B', 'C'];
    study.setVariant(keys[(keys.indexOf(study.variant) + direction + 3) % 3]);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !(event.target instanceof Element) ||
        event.target.closest(
          'input, textarea, select, [contenteditable], .np-windows, .mp-map-area, .np-theme',
        )
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        switchVariant(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <aside className="np-lab mp-lab" aria-label="Prototypens provverktyg">
      <div className="np-lab-row mp-switcher">
        <span className="mp-prototype-label">KARTPROV</span>
        <button
          type="button"
          aria-label="Föregående kartalternativ"
          onClick={() => switchVariant(-1)}
        >
          ←
        </button>
        <strong>
          {study.variant} · {variants[study.variant].name}
        </strong>
        <button type="button" aria-label="Nästa kartalternativ" onClick={() => switchVariant(1)}>
          →
        </button>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          Provlägen
        </button>
      </div>
      <p className="np-lab-description">{variants[study.variant].description}</p>
      {expanded && (
        <div className="mp-lab-expanded np-stack">
          <p>
            Kastbar prototyp · påhittade uppgifter · inget sparas. Simulerat tal och sparande.
            Panelmodellen är den godkända B.
          </p>
          <div className="np-lab-row">
            {(['A', 'B', 'C'] as const).map((variant) => (
              <button
                key={variant}
                type="button"
                aria-pressed={study.variant === variant}
                onClick={() => study.setVariant(variant)}
              >
                {variant} · {variants[variant].name}
              </button>
            ))}
          </div>
          <label htmlFor="mp-density">Kartans omfattning</label>
          <select
            id="mp-density"
            disabled={savePending}
            value={study.density}
            onChange={(event) => study.setDensity(event.target.value as Study['density'])}
          >
            <option value="sparse">Gles · 8 objekt</option>
            <option value="dense">Tät · 56 objekt</option>
            <option value="large">Stor · 500 objekt och 1 500 samband</option>
          </select>
          <p>
            Nya provobjekt flyttar inte befintliga objekt eller kameran. Välj Visa hela kartan i
            verktygslådan för en ny överblick. Samma knapp tar dig tillbaka till vyn du lämnade.
          </p>
          <div className="mp-button-grid">
            <button
              type="button"
              aria-pressed={study.proposals}
              disabled={savePending}
              onClick={() => {
                study.setSavedProposals(false);
                study.setProposals(!study.proposals);
              }}
            >
              Visa privata förslag
            </button>
            <button
              type="button"
              aria-pressed={study.noGraphics}
              onClick={() => study.setNoGraphics(!study.noGraphics)}
            >
              Dölj kartgrafik
            </button>
            <button
              type="button"
              onClick={() => {
                onList();
                setExpanded(false);
              }}
            >
              Öppna text och lista
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect('subscription');
                setExpanded(false);
              }}
            >
              Börja vid familjeabonnemanget
            </button>
          </div>
          <p>
            Pröva: följ betalningen, ändra en personlig placering, lägg till förslagen och gå
            tillbaka till föregående kameravy.
          </p>
          <dl className="mp-state">
            <dt>Objekt / samband</dt>
            <dd>
              {study.objects.length} / {study.relationships.length}
            </dd>
            <dt>Urval</dt>
            <dd>
              {study.objects.find((object) => object.id === selectedId)?.name ??
                'Inget i detta provläge'}
            </dd>
            <dt>Kamera</dt>
            <dd>{study.cameraDescription}</dd>
            <dt>Fokus</dt>
            <dd>{study.focusId ?? 'Hela kartan'}</dd>
            <dt>Personliga flyttar</dt>
            <dd>{Object.keys(study.positions).length}</dd>
            <dt>Privata förslag</dt>
            <dd>{study.proposals ? 'Visas med +, ~ och ×' : 'Dolda'}</dd>
          </dl>
        </div>
      )}
      {savePending && (
        <div className="np-lab-row">
          <span>Sparandet väntar på simulerat svar:</span>
          <button type="button" onClick={() => onResolveSave?.(true)}>
            Simulera kvitto
          </button>
          <button type="button" onClick={() => onResolveSave?.(false)}>
            Simulera sparfel
          </button>
        </div>
      )}
      <span className="mp-state-line">
        {study.objects.length} objekt · {study.relationships.length} samband ·{' '}
        {Object.keys(study.positions).length} personliga flyttar ·{' '}
        {study.proposals ? 'Privata förslag visas' : 'Sparad karta'} · allt i minnet
      </span>
    </aside>
  );
}
