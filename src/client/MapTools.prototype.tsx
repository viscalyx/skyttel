// Throwaway: three layouts on /?prototype=map-tools&variant=A, with fictional
// household fixtures, in-memory changes, and no API calls or production changes.
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './map-tools.prototype.css';

type Variant = 'A' | 'B' | 'C';
type Item = {
  id: string;
  name: string;
  type: string;
  description: string;
  life: string;
  proposal: string;
  fields: Record<string, string>;
  before?: Record<string, string>;
};
type Link = {
  id: string;
  from: string;
  to: string;
  type: string;
  certainty: string;
  end: string;
  proposal: string;
};
type Filters = {
  query: string;
  types: string[];
  ended: boolean;
  removed: boolean;
  proposals: string[];
  selected: boolean;
};
const emptyFilters = (): Filters => ({
  query: '',
  types: [],
  ended: false,
  removed: false,
  proposals: [],
  selected: false,
});
const types = ['Person', 'Fordon', 'Garage', 'Bostad', 'Avtal', 'Tjänst', 'Solcellsanläggning'];
const proposalNames = ['Nytt', 'Ändrat', 'Föreslagen borttagning'];
const variantNames = {
  A: 'Tabell med filter ovanför',
  B: 'Filter bredvid arbetsytan',
  C: 'Avskild sökning och avsnitt',
};
const fixtures: Item[] = [
  {
    id: 'alex',
    name: 'Alex',
    type: 'Person',
    description: 'Bor i hushållet och använder cykeln för att pendla.',
    life: 'Aktuellt',
    proposal: '',
    fields: { 'E-postadress': 'alex@example.test', Telefon: 'Ej uppgivet' },
  },
  {
    id: 'bike',
    name: 'Alex blå cykel',
    type: 'Fordon',
    description:
      'Blå lastcykel med extra lång pakethållare och regnskydd. Nyckeln ligger i hallens översta låda, reservnyckeln hos Lo.',
    life: 'Aktuellt',
    proposal: 'Ändrat',
    fields: {
      Beskrivning:
        'Blå lastcykel med extra lång pakethållare och regnskydd. Nyckeln ligger i hallens översta låda, reservnyckeln hos Lo.',
      Ramnummer: 'CYKEL-2026-08',
      Inköpspris: '29 500 kr',
      'Förvaringsinstruktion som hushållet själv har lagt till':
        'Lås fast ramen i den främre bygeln. Laddaren finns på hyllan.',
    },
    before: { Inköpspris: '28 000 kr' },
  },
  {
    id: 'garage',
    name: 'Garaget på Östra Ågatan – plats 12 med laddmöjlighet',
    type: 'Garage',
    description: 'Gemensamt garage med två nycklar. Porten öppnas med separat tagg.',
    life: 'Aktuellt',
    proposal: 'Nytt',
    fields: {
      Plats: '12',
      Portkod: 'Ej uppgivet',
      Laddare: 'Osäkert uppgivet: 11 kW',
      'Tillträde från': '2026-10-01',
    },
  },
  {
    id: 'solar',
    name: 'Solcellsanläggningen',
    type: 'Solcellsanläggning',
    description: 'Paneler på södra taket, växelriktare i teknikrummet.',
    life: 'Aktuellt',
    proposal: 'Ändrat',
    fields: {
      Installationsdatum: '2024-06-12',
      'Installerad effekt': '12,4 kW',
      'Installatörens ärendenummer': 'SOL-123456789',
      'Garantins omfattning':
        'Produktgaranti 15 år, effektgaranti 25 år. Handlingarna ligger i teknikrummet.',
      'Årlig produktion': 'Okänt',
      Besiktningsanmärkningar: 'Uttryckligen inget',
    },
    before: { 'Installerad effekt': '10 kW' },
  },
  {
    id: 'old',
    name: 'Gamla musiktjänsten',
    type: 'Tjänst',
    description: 'Tidigare familjetjänst. Avtalet har upphört men uppgifterna finns kvar.',
    life: 'Upphört',
    proposal: 'Föreslagen borttagning',
    fields: { Slutdatum: '2026-08-31', Pris: '189 kr/månad' },
  },
  {
    id: 'deleted',
    name: 'Borttagna förrådet',
    type: 'Garage',
    description: 'Tidigare förråd i förra bostaden.',
    life: 'Borttaget',
    proposal: '',
    fields: { Borttaget: '2026-09-01' },
  },
  {
    id: 'insurance',
    name: 'Försäkringsavtalet för lastcykeln',
    type: 'Avtal',
    description: 'Cykelförsäkring med stöldskydd och självrisk.',
    life: 'Aktuellt',
    proposal: '',
    fields: {
      Avtalsnummer: 'FÖRS-90021',
      Pris: '89 kr/månad',
      Betalningsintervall: 'Månadsvis',
      Bindningstid: '12 månader',
      Förnyelse: '2027-01-01',
    },
  },
  ...Array.from(
    { length: 56 },
    (_, index): Item => ({
      id: `extra-${index}`,
      name: `${index % 2 ? 'Övrigt avtal' : 'Årsavtal'} ${index + 1}`,
      type: 'Avtal',
      description: `Påhittat underlag ${index + 1} för att pröva långa listor och naturlig sifferordning.`,
      life: 'Aktuellt',
      proposal: '',
      fields: {
        Avtalsnummer: `DEMO-${index + 1}`,
        Pris: `${index + 50} kr/månad`,
        Kontakt: 'Ej uppgivet',
      },
    }),
  ),
];
const initialLinks: Link[] = [
  {
    id: 'r1',
    from: 'alex',
    to: 'bike',
    type: 'använder',
    certainty: 'Bekräftat',
    end: '',
    proposal: '',
  },
  {
    id: 'r2',
    from: 'bike',
    to: 'garage',
    type: 'förvaras i',
    certainty: 'Bekräftat',
    end: '',
    proposal: 'Nytt',
  },
  {
    id: 'r3',
    from: 'insurance',
    to: 'bike',
    type: 'försäkrar',
    certainty: 'Bekräftat',
    end: '',
    proposal: '',
  },
  {
    id: 'r4',
    from: 'alex',
    to: 'old',
    type: 'använder',
    certainty: 'Osäkert uppgivet',
    end: '2026-08-31',
    proposal: '',
  },
];

function Popup({
  title,
  children,
  footer,
  onClose,
  className = '',
  hint = 'Ändringar läggs i ditt utkast. Kartan sparas separat.',
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    if (className === 'mt-guard')
      dialog?.querySelector<HTMLButtonElement>('footer .mt-primary')?.focus();
    return () => {
      dialog?.close();
    };
  }, [className]);
  return (
    <dialog
      ref={ref}
      className={`mt-dialog ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <h2>{title}</h2>
          {hint && <p>{hint}</p>}
        </div>
        <button type="button" aria-label="Stäng dialogen" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="mt-dialog-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}

export function MapToolsPrototype() {
  const initial = new URLSearchParams(location.search).get('variant');
  const [variant, setVariant] = useState<Variant>(
    initial === 'B' || initial === 'C' ? initial : 'A',
  );
  const [view, setView] = useState<'table' | 'map'>('table');
  const [items, setItems] = useState(fixtures);
  const [links, setLinks] = useState(initialLinks);
  const [tableFilters, setTableFilters] = useState(emptyFilters);
  const [mapFilters, setMapFilters] = useState(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(initial !== 'C');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapFilterOpen, setMapFilterOpen] = useState(false);
  const [sort, setSort] = useState<'name' | 'type'>('name');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string[]>(['bike']);
  const [selected, setSelected] = useState('bike');
  const [explored, setExplored] = useState<string[]>([]);
  const [editor, setEditor] = useState<Item | null>(null);
  const [baseline, setBaseline] = useState('');
  const [relationObject, setRelationObject] = useState<string | null>(null);
  const [relation, setRelation] = useState<Link | null>(null);
  const [relationBaseline, setRelationBaseline] = useState('');
  const [picker, setPicker] = useState('');
  const [request, setRequest] = useState<'idle' | 'pending' | 'rejected' | 'unknown'>('idle');
  const [simulation, setSimulation] = useState('success');
  const completion = useRef<(() => void) | null>(null);
  const [guard, setGuard] = useState<(() => void) | null>(null);
  const [guardFields, setGuardFields] = useState(false);
  const [notice, setNotice] = useState('');
  const [textView, setTextView] = useState<'conversation' | 'draft' | null>(null);
  const [message, setMessage] = useState('');
  const [section, setSection] = useState('Grunduppgifter');
  const opener = useRef<HTMLElement | null>(null);
  const mapReturn = useRef<string | null>(null);
  const tableScroll = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const filters = view === 'table' ? tableFilters : mapFilters;
  const setFilters = view === 'table' ? setTableFilters : setMapFilters;
  const draftCount =
    items.filter((item) => item.proposal).length + links.filter((link) => link.proposal).length;
  const dirty = Boolean(
    (editor && JSON.stringify(editor) !== baseline) ||
      (relation && JSON.stringify(relation) !== relationBaseline),
  );
  const busy = request === 'pending' || request === 'unknown';
  const itemName = (id: string) => items.find((item) => item.id === id)?.name || id;
  const sentence = (link: Link) =>
    `${itemName(link.from)} ${link.type} ${link.certainty === 'Okänt' || link.certainty === 'Uttryckligen inget' ? link.certainty : itemName(link.to)}`;

  function matches(item: Item, values: Filters) {
    const text = [item.name, item.type, item.description, ...Object.entries(item.fields).flat()]
      .join(' ')
      .toLocaleLowerCase('sv');
    return (
      values.query
        .toLocaleLowerCase('sv')
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => text.includes(word)) &&
      (!values.types.length || values.types.includes(item.type)) &&
      (values.ended || item.life !== 'Upphört') &&
      (values.removed || item.life !== 'Borttaget') &&
      (!values.proposals.length || values.proposals.includes(item.proposal)) &&
      (!values.selected || item.id === selected)
    );
  }
  const found = items.filter((item) => matches(item, filters));
  const ordered = [...found].sort(
    (a, b) =>
      (sort === 'name'
        ? a.name.localeCompare(b.name, 'sv', { numeric: true })
        : a.type.localeCompare(b.type, 'sv') ||
          a.name.localeCompare(b.name, 'sv', { numeric: true })) * (descending ? -1 : 1),
  );
  const pageCount = Math.max(1, Math.ceil(ordered.length / 50));
  const actualPage = Math.min(page, pageCount);
  const visible = ordered.slice((actualPage - 1) * 50, actualPage * 50);
  const activeFilters = Boolean(
    filters.query ||
      filters.types.length ||
      filters.ended ||
      filters.removed ||
      filters.proposals.length ||
      filters.selected,
  );
  const mapSeeds = [...found.map((item) => item.id), ...explored];
  const eligibleLinks = links.filter((link) => mapFilters.ended || !link.end);
  const mapIds = new Set([
    ...mapSeeds,
    ...eligibleLinks
      .filter((link) => mapSeeds.includes(link.from) || mapSeeds.includes(link.to))
      .flatMap((link) => [link.from, link.to]),
  ]);
  const mapItems = items.filter(
    (item) =>
      mapIds.has(item.id) &&
      item.life !== 'Borttaget' &&
      (mapFilters.ended || item.life !== 'Upphört'),
  );
  const neighbors = new Set(
    eligibleLinks
      .filter((link) => link.from === selected || link.to === selected)
      .flatMap((link) => [link.from, link.to]),
  );
  mapItems.sort(
    (a, b) =>
      (b.id === selected ? 2 : neighbors.has(b.id) ? 1 : 0) -
      (a.id === selected ? 2 : neighbors.has(a.id) ? 1 : 0),
  );

  function changeFilters(patch: Partial<Filters>) {
    setFilters((old) => ({ ...old, ...patch }));
    if (view === 'table') setPage(1);
    else setExplored([]);
  }
  function toggleFilter(key: 'types' | 'proposals', value: string) {
    changeFilters({
      [key]: filters[key].includes(value)
        ? filters[key].filter((entry) => entry !== value)
        : [...filters[key], value],
    });
  }
  function restoreFocus() {
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus();
      else document.getElementById('mt-heading')?.focus();
    });
  }
  function guardAction(action: () => void) {
    if (busy) {
      setNotice('Vänta på utfallet innan du lämnar formuläret.');
      return;
    }
    if (dirty) {
      setGuardFields(false);
      setGuard(() => action);
    } else action();
  }
  function closeForms() {
    setEditor(null);
    setRelation(null);
    setRelationObject(null);
    setRequest('idle');
    setNotice('');
    restoreFocus();
  }
  function openEditor(item?: Item) {
    opener.current = document.activeElement as HTMLElement;
    const next = item
      ? structuredClone(item)
      : {
          id: `new-${Date.now()}`,
          name: '',
          type: 'Fordon',
          description: '',
          life: 'Aktuellt',
          proposal: 'Nytt',
          fields: { Registreringsnummer: '', Inköpspris: '', Kommentar: '' },
        };
    setEditor(next);
    setBaseline(JSON.stringify(next));
    setSection('Grunduppgifter');
    setRequest('idle');
    setNotice('');
  }
  function openRelations(id: string) {
    opener.current = document.activeElement as HTMLElement;
    setRelationObject(id);
    setPicker('');
    setNotice('');
  }
  function editRelation(link?: Link) {
    const next = link
      ? structuredClone(link)
      : {
          id: `rel-${Date.now()}`,
          from: relationObject || selected,
          to: '',
          type: 'använder',
          certainty: 'Bekräftat',
          end: '',
          proposal: 'Nytt',
        };
    setRelation(next);
    setRelationBaseline(JSON.stringify(next));
    setRequest('idle');
    setNotice('');
  }
  function submit(action: () => void) {
    completion.current = action;
    setNotice('');
    if (simulation === 'success') action();
    else {
      setRequest(
        simulation === 'pending' ? 'pending' : simulation === 'rejected' ? 'rejected' : 'unknown',
      );
      setNotice(
        simulation === 'rejected'
          ? 'Ändringen avvisades. Alla formulärvärden finns kvar. Rätta eller försök igen.'
          : simulation === 'unknown'
            ? 'Resultatet är oklart. Kontrollera om ändringen lades i utkastet innan du försöker igen.'
            : 'Lägger ändringen i ditt utkast…',
      );
    }
  }
  function finishRequest(done: boolean) {
    setRequest('idle');
    if (done) completion.current?.();
    else setNotice('Ändringen lades inte i utkastet. Du kan försöka igen.');
  }
  function stageEditor(nextRelations: boolean) {
    if (
      editor &&
      JSON.stringify(editor) === baseline &&
      items.some((item) => item.id === editor.id)
    ) {
      setEditor(null);
      if (nextRelations) setRelationObject(editor.id);
      else restoreFocus();
      return;
    }
    if (!editor?.name.trim()) {
      setNotice('Ange objektets namn.');
      setSection('Grunduppgifter');
      requestAnimationFrame(() => document.getElementById('mt-name')?.focus());
      return;
    }
    const value = {
      ...editor,
      name: editor.name.trim(),
      proposal: items.some((item) => item.id === editor.id) ? editor.proposal || 'Ändrat' : 'Nytt',
    };
    submit(() => {
      setItems((old) =>
        old.some((item) => item.id === value.id)
          ? old.map((item) => (item.id === value.id ? value : item))
          : [...old, value],
      );
      setSelected(value.id);
      setEditor(null);
      setRequest('idle');
      setNotice('Objektet lades i ditt utkast.');
      if (nextRelations) setRelationObject(value.id);
      else restoreFocus();
    });
  }
  const duplicate =
    relation &&
    links.find(
      (link) =>
        link.id !== relation.id &&
        link.from === relation.from &&
        link.to === relation.to &&
        link.type === relation.type &&
        link.proposal !== 'Föreslagen borttagning',
    );
  function stageRelation() {
    if (!relation) return;
    if (duplicate) {
      setNotice('Sambandet finns redan.');
      return;
    }
    if (
      (relation.certainty === 'Bekräftat' || relation.certainty === 'Osäkert uppgivet') &&
      !relation.to
    ) {
      setNotice('Välj det andra objektet.');
      return;
    }
    const value = {
      ...relation,
      proposal: links.some((link) => link.id === relation.id)
        ? relation.proposal || 'Ändrat'
        : 'Nytt',
    };
    submit(() => {
      setLinks((old) =>
        old.some((link) => link.id === value.id)
          ? old.map((link) => (link.id === value.id ? value : link))
          : [...old, value],
      );
      setRelation(null);
      setRequest('idle');
      setNotice('Sambandet lades i ditt utkast. Du kan hantera nästa samband.');
    });
  }
  function switchView(next: 'table' | 'map') {
    guardAction(() => {
      closeForms();
      if (view === 'table') savedScroll.current = tableScroll.current?.scrollTop || 0;
      setView(next);
      if (next === 'table')
        requestAnimationFrame(() => {
          if (tableScroll.current) tableScroll.current.scrollTop = savedScroll.current;
          if (mapReturn.current) document.getElementById(mapReturn.current)?.focus();
        });
    });
  }
  function showMap(item: Item) {
    mapReturn.current = `map-${item.id}`;
    savedScroll.current = tableScroll.current?.scrollTop || 0;
    setSelected(item.id);
    setMapFilters({ ...emptyFilters(), ended: true });
    setExplored([]);
    setView('map');
    setNotice(
      `${item.name} är markerat. Kartans sökning och filter är återställda. Kameran visar objektet och dess direkta samband.`,
    );
  }
  function cycleVariant(direction: number) {
    guardAction(() => {
      const next = (['A', 'B', 'C'] as Variant[])[
        (['A', 'B', 'C'].indexOf(variant) + direction + 3) % 3
      ];
      const url = new URL(location.href);
      url.searchParams.set('variant', next);
      history.replaceState(null, '', url);
      setVariant(next);
      setFilterOpen(next !== 'C');
    });
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable], dialog')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycleVariant(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const filterControls = (
    <div className="mt-filter-fields">
      <fieldset>
        <legend>Objekttyp</legend>
        {types.map((type) => (
          <label key={type}>
            <input
              type="checkbox"
              checked={filters.types.includes(type)}
              onChange={() => toggleFilter('types', type)}
            />
            {type}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Ta med</legend>
        <label>
          <input
            type="checkbox"
            checked={filters.ended}
            onChange={(event) => changeFilters({ ended: event.target.checked })}
          />
          Upphörda
        </label>
        {view === 'table' && (
          <label>
            <input
              type="checkbox"
              checked={filters.removed}
              onChange={(event) => changeFilters({ removed: event.target.checked })}
            />
            Borttagna
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={filters.selected}
            onChange={(event) => changeFilters({ selected: event.target.checked })}
          />
          Bara markerade
        </label>
      </fieldset>
      {draftCount > 0 && (
        <fieldset>
          <legend>Förslag i ditt utkast</legend>
          {proposalNames.map((proposal) => (
            <label key={proposal}>
              <input
                type="checkbox"
                checked={filters.proposals.includes(proposal)}
                onChange={() => toggleFilter('proposals', proposal)}
              />
              {proposal}
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="button"
        onClick={() => {
          setFilters(emptyFilters());
          setPage(1);
          setExplored([]);
        }}
      >
        Återställ sökning och filter
      </button>
    </div>
  );
  const searchField = (
    <label className="mt-search">
      Sök i {view === 'table' ? 'tabellen' : 'kartan'}
      <input
        ref={searchRef}
        value={filters.query}
        placeholder="Namn, typ, beskrivning eller uppgift…"
        onChange={(event) => changeFilters({ query: event.target.value })}
      />
      <span>Namn och egna fält ingår. Samband ingår inte.</span>
    </label>
  );
  const stateControls = (
    <aside className="mt-demo">
      <details>
        <summary>Prototyp · påhittade uppgifter · simulering och tillstånd</summary>
        <label>
          Utfall när ändringen läggs i utkastet
          <select
            aria-label="Utfall när ändringen läggs i utkastet"
            value={simulation}
            onChange={(event) => setSimulation(event.target.value)}
          >
            <option value="success">Genomfört</option>
            <option value="pending">Väntande</option>
            <option value="rejected">Avvisat</option>
            <option value="unknown">Oklart</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setItems((old) => old.map((item) => ({ ...item, proposal: '' })));
            setLinks((old) => old.map((link) => ({ ...link, proposal: '' })));
            setTableFilters((old) => ({ ...old, proposals: [] }));
            setMapFilters((old) => ({ ...old, proposals: [] }));
            setNotice(
              'Förslagen är tömda i demot. Utkastfiltret är återställt; övriga filter behålls.',
            );
          }}
        >
          Simulera att sista förslaget försvinner
        </button>
        <pre>
          {JSON.stringify(
            {
              variant,
              view,
              tableFilters,
              mapFilters,
              sort,
              descending,
              page: actualPage,
              expanded,
              selected,
              explored,
              draftCount,
              dirty,
              request,
              message,
              editor,
              relation,
              proposals: [
                ...items.filter((item) => item.proposal),
                ...links.filter((link) => link.proposal),
              ],
            },
            null,
            2,
          )}
        </pre>
      </details>
    </aside>
  );
  const requestNotice = (
    <>
      {notice && (
        <p className="mt-notice" role={request === 'rejected' ? 'alert' : 'status'}>
          {notice}
        </p>
      )}
      {request === 'pending' && (
        <button type="button" onClick={() => finishRequest(true)}>
          Demo: slutför begäran
        </button>
      )}
      {request === 'unknown' && (
        <div className="mt-actions">
          <button type="button" onClick={() => finishRequest(true)}>
            Kontrollera om ändringen lades i utkastet
          </button>
          <button type="button" onClick={() => finishRequest(false)}>
            Demo: kontroll visar utebliven ändring
          </button>
        </div>
      )}
    </>
  );
  const editorSections = editor
    ? [
        {
          title: 'Grunduppgifter',
          body: (
            <>
              <label>
                Namn
                <input
                  id="mt-name"
                  value={editor.name}
                  aria-invalid={notice === 'Ange objektets namn.'}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                />
              </label>
              <label>
                Objekttyp
                <select
                  aria-label="Objekttyp"
                  value={editor.type}
                  onChange={(event) => {
                    const type = event.target.value;
                    const apply = () => setEditor({ ...editor, type, fields: {} });
                    if (Object.values(editor.fields).some(Boolean)) {
                      setGuardFields(true);
                      setGuard(() => apply);
                    } else apply();
                  }}
                >
                  {types.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Identitet
                <select
                  aria-label="Identitet"
                  value={editor.fields.Identitet || 'identifierat'}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      fields: { ...editor.fields, Identitet: event.target.value },
                    })
                  }
                >
                  <option value="identifierat">Identifierat objekt</option>
                  <option value="ospecificerat">Ospecificerat objekt</option>
                </select>
              </label>
              <label className="mt-wide">
                Beskrivning
                <textarea
                  rows={4}
                  value={editor.description}
                  onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                />
              </label>
            </>
          ),
        },
        {
          title: 'Egna fält',
          body: (
            <>
              {Object.entries(editor.fields).map(([name, value]) => (
                <label key={name}>
                  {name}
                  <textarea
                    rows={2}
                    value={value}
                    onChange={(event) =>
                      setEditor({
                        ...editor,
                        fields: { ...editor.fields, [name]: event.target.value },
                      })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() =>
                  setEditor({
                    ...editor,
                    fields: {
                      ...editor.fields,
                      [`Eget fält ${Object.keys(editor.fields).length + 1}`]: '',
                    },
                  })
                }
              >
                Demo: lägg till eget fält
              </button>
            </>
          ),
        },
        {
          title: 'Ekonomiska uppgifter',
          body: (
            <>
              <label>
                Pris eller belopp
                <input
                  value={editor.fields.Pris || ''}
                  onChange={(event) =>
                    setEditor({ ...editor, fields: { ...editor.fields, Pris: event.target.value } })
                  }
                />
              </label>
              <label>
                Uppgiftens säkerhet
                <select
                  aria-label="Uppgiftens säkerhet"
                  value={editor.fields.Säkerhet || 'Bekräftat'}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      fields: { ...editor.fields, Säkerhet: event.target.value },
                    })
                  }
                >
                  <option>Bekräftat</option>
                  <option>Okänt</option>
                  <option>Uttryckligen inget</option>
                  <option>Osäkert uppgivet</option>
                </select>
              </label>
              <label>
                Betalningsintervall
                <select
                  aria-label="Betalningsintervall"
                  value={editor.fields.Betalningsintervall || 'Månadsvis'}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      fields: { ...editor.fields, Betalningsintervall: event.target.value },
                    })
                  }
                >
                  <option>Månadsvis</option>
                  <option>Årligen</option>
                  <option>Engångsbelopp</option>
                </select>
              </label>
            </>
          ),
        },
        {
          title: 'Livscykel och utseende',
          body: (
            <>
              <label>
                Status
                <select
                  aria-label="Status"
                  value={editor.life}
                  onChange={(event) => setEditor({ ...editor, life: event.target.value })}
                >
                  <option>Aktuellt</option>
                  <option>Upphört</option>
                </select>
              </label>
              <label>
                Slutdatum
                <input
                  type="date"
                  value={editor.fields.Slutdatum || ''}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      fields: { ...editor.fields, Slutdatum: event.target.value },
                    })
                  }
                />
              </label>
              <label>
                Ikon
                <select
                  aria-label="Ikon"
                  value={editor.fields.Ikon || 'Standard'}
                  onChange={(event) =>
                    setEditor({ ...editor, fields: { ...editor.fields, Ikon: event.target.value } })
                  }
                >
                  <option>Standard</option>
                  <option>Cykel</option>
                  <option>Bil</option>
                  <option>Hus</option>
                </select>
              </label>
              <p>Profilbild: utrymme för befintlig bildväljare i implementationen.</p>
            </>
          ),
        },
      ]
    : [];

  return (
    <div className={`mt-root mt-${variant}`}>
      <a href="#mt-heading" className="mt-skip">
        Till arbetsytan
      </a>
      <nav className="mt-tools" aria-label="Kartverktyg">
        <span className="mt-brand" title="Skyttel">
          S
        </span>
        <button
          type="button"
          aria-label="Karta"
          title="Karta"
          aria-pressed={view === 'map'}
          onClick={() => switchView('map')}
        >
          <WorkspaceIcon name="overview" />
        </button>
        <button
          type="button"
          aria-label="Tabell"
          title="Tabell"
          aria-pressed={view === 'table'}
          onClick={() => switchView('table')}
        >
          <WorkspaceIcon name="list" />
        </button>
        <button
          type="button"
          aria-label={activeFilters ? 'Sökning och filter – aktiva' : 'Sökning och filter'}
          title="Sökning och filter"
          data-active={activeFilters}
          onClick={() => {
            if (view === 'map') {
              setSearchOpen(true);
              setMapFilterOpen(true);
            } else setFilterOpen(!filterOpen);
          }}
        >
          <WorkspaceIcon name="search" />
          {activeFilters && <small>Aktiv</small>}
        </button>
        <button
          type="button"
          aria-label="Nytt objekt"
          title="Nytt objekt"
          onClick={() => openEditor()}
        >
          <span aria-hidden="true">＋</span>
        </button>
        <button
          type="button"
          aria-label="Skriv till Skyttel"
          title="Skriv till Skyttel"
          onClick={() => setTextView('conversation')}
        >
          <WorkspaceIcon name="text" />
        </button>
        {draftCount > 0 && (
          <div className="mt-draft-tool">
            <button
              type="button"
              aria-label="Utkast"
              title="Utkast"
              onClick={() => setTextView('draft')}
            >
              <WorkspaceIcon name="draft" />
              <small>{draftCount}</small>
            </button>
          </div>
        )}
      </nav>
      <main className="mt-main">
        <header className="mt-heading">
          <div>
            <p>SKYTTEL · PÅHITTAT HUSHÅLL</p>
            <h1 id="mt-heading" tabIndex={-1}>
              {view === 'table' ? 'Hushållets tabell' : 'Hushållets karta'}
            </h1>
            <span>Sparade uppgifter och ditt utkast</span>
          </div>
          <button type="button" className="mt-primary" onClick={() => openEditor()}>
            ＋ Nytt objekt
          </button>
        </header>
        {!editor && !relationObject && notice && (
          <p className="mt-notice" role="status">
            {notice}
          </p>
        )}
        {view === 'table' ? (
          <div className="mt-table-layout">
            <section className="mt-table-search" aria-label="Tabellens sökning och filter">
              {searchField}
              <div className="mt-actions">
                <button
                  type="button"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  Filter{activeFilters ? ' · aktiva' : ''}
                </button>
                {filters.query && (
                  <button type="button" onClick={() => changeFilters({ query: '' })}>
                    Rensa sökning
                  </button>
                )}
              </div>
              {filterOpen && variant !== 'C' && filterControls}
            </section>
            <section className="mt-table-results" aria-label="Objekt i läsläge">
              <div className="mt-result-heading">
                <p role="status">{found.length} träffar · läsläge</p>
                <label>
                  Sortering
                  <select
                    aria-label="Sortering"
                    value={`${sort}-${descending ? 'desc' : 'asc'}`}
                    onChange={(event) => {
                      setSort(event.target.value.startsWith('name') ? 'name' : 'type');
                      setDescending(event.target.value.endsWith('desc'));
                    }}
                  >
                    <option value="name-asc">Namn A–Ö</option>
                    <option value="name-desc">Namn Ö–A</option>
                    <option value="type-asc">Typ A–Ö</option>
                    <option value="type-desc">Typ Ö–A</option>
                  </select>
                </label>
              </div>
              <section
                className="mt-table-scroll"
                ref={tableScroll}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Focus enables keyboard scrolling of the wide table.
                tabIndex={0}
                aria-label="Rullbar objekttabell"
              >
                <table>
                  <caption className="mt-sr">
                    Hushållets objekt. Expandera en rad för alla uppgifter.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Namn</th>
                      <th scope="col">Typ</th>
                      <th scope="col">Beskrivning</th>
                      <th scope="col">Status</th>
                      <th scope="col">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <Fragment key={item.id}>
                        <tr data-selected={selected === item.id}>
                          <th scope="row" data-label="Namn">
                            <button
                              type="button"
                              className="mt-row-toggle"
                              aria-expanded={expanded.includes(item.id)}
                              aria-controls={`details-${item.id}`}
                              onClick={() => {
                                setSelected(item.id);
                                setExpanded((old) =>
                                  old.includes(item.id)
                                    ? old.filter((id) => id !== item.id)
                                    : [...old, item.id],
                                );
                              }}
                            >
                              <span aria-hidden="true">
                                {expanded.includes(item.id) ? '▾' : '▸'}
                              </span>
                              {item.name}
                            </button>
                          </th>
                          <td data-label="Typ">{item.type}</td>
                          <td data-label="Beskrivning">
                            <span className="mt-truncate">{item.description}</span>
                            {filters.query &&
                              Object.entries(item.fields).some(([name, value]) =>
                                `${name} ${value}`
                                  .toLocaleLowerCase('sv')
                                  .includes(filters.query.toLocaleLowerCase('sv')),
                              ) && (
                                <small className="mt-match">
                                  Träff i detaljuppgift:{' '}
                                  {Object.entries(item.fields)
                                    .filter(([name, value]) =>
                                      `${name} ${value}`
                                        .toLocaleLowerCase('sv')
                                        .includes(filters.query.toLocaleLowerCase('sv')),
                                    )
                                    .map(([name]) => name)
                                    .join(', ')}
                                </small>
                              )}
                          </td>
                          <td data-label="Status">
                            <span>{item.life}</span>
                            {item.proposal && (
                              <span className="mt-badge" data-kind={item.proposal}>
                                ◇ {item.proposal}
                              </span>
                            )}
                          </td>
                          <td data-label="Åtgärder">
                            <div className="mt-row-actions">
                              <button
                                type="button"
                                aria-label={`Redigera ${item.name}`}
                                title="Redigera"
                                onClick={() => openEditor(item)}
                              >
                                <WorkspaceIcon name="detail" />
                                <span>Redigera</span>
                              </button>
                              <button
                                type="button"
                                aria-label={`Samband för ${item.name}`}
                                title={`Samband för ${item.name}`}
                                onClick={() => openRelations(item.id)}
                              >
                                <span aria-hidden="true">↔</span>
                                <span>
                                  {
                                    links.filter(
                                      (link) => link.from === item.id || link.to === item.id,
                                    ).length
                                  }
                                </span>
                              </button>
                              {item.life !== 'Borttaget' && (
                                <button
                                  type="button"
                                  aria-label={`Visa ${item.name} i kartan`}
                                  id={`map-${item.id}`}
                                  title="Visa i kartan"
                                  onClick={() => showMap(item)}
                                >
                                  <WorkspaceIcon name="focus" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expanded.includes(item.id) && (
                          <tr id={`details-${item.id}`} className="mt-detail-row">
                            <td colSpan={5}>
                              <div className="mt-details">
                                <h3>{item.name} · alla uppgifter</h3>
                                <p>{item.description}</p>
                                <dl>
                                  {Object.entries(item.fields).map(([name, value]) => (
                                    <div key={name}>
                                      <dt>{name}</dt>
                                      <dd>
                                        {item.proposal && item.before?.[name] && (
                                          <>
                                            <span className="mt-before">
                                              Sparat: {item.before[name]}
                                            </span>
                                            <span className="mt-proposed">◇ Ditt förslag: </span>
                                          </>
                                        )}
                                        {value || 'Ej uppgivet'}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                {!visible.length && (
                  <div className="mt-empty">
                    <h2>Inga objekt matchar</h2>
                    <p>Ändra sökningen eller återställ sökning och filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTableFilters(emptyFilters());
                        setPage(1);
                      }}
                    >
                      Återställ sökning och filter
                    </button>
                  </div>
                )}
              </section>
              <nav className="mt-pages" aria-label="Tabellsidor">
                <button
                  type="button"
                  disabled={actualPage === 1}
                  onClick={() => {
                    setPage(actualPage - 1);
                    if (tableScroll.current) tableScroll.current.scrollTop = 0;
                  }}
                >
                  Föregående
                </button>
                <span>
                  Sida {actualPage} av {pageCount} · 50 objekt per sida
                </span>
                <button
                  type="button"
                  disabled={actualPage === pageCount}
                  onClick={() => {
                    setPage(actualPage + 1);
                    if (tableScroll.current) tableScroll.current.scrollTop = 0;
                  }}
                >
                  Nästa
                </button>
              </nav>
            </section>
          </div>
        ) : (
          <section
            className="mt-map"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: The map surface owns the type-to-search interaction.
            tabIndex={0}
            aria-label="Kartytan. Börja skriva för att söka."
            onKeyDown={(event) => {
              if (
                event.target !== event.currentTarget ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.nativeEvent.isComposing
              )
                return;
              if (/^[\p{L}\p{N}]$/u.test(event.key)) {
                event.preventDefault();
                setMapFilters((old) => ({ ...old, query: event.key }));
                setExplored([]);
                setSearchOpen(true);
                setMapFilterOpen(false);
              }
            }}
            onCompositionEnd={(event) => {
              if (event.target === event.currentTarget && event.data) {
                setMapFilters((old) => ({ ...old, query: event.data }));
                setSearchOpen(true);
              }
            }}
          >
            <div className="mt-map-caption">
              <p role="status">
                {found.length} sökträffar · direkt kopplade objekt visas som sammanhang
              </p>
              {!mapFilters.ended && (
                <p>
                  Upphörda objekt och samband döljs.{' '}
                  <button type="button" onClick={() => changeFilters({ ended: true })}>
                    Ta med upphörda
                  </button>
                </p>
              )}
              {explored.length > 0 && (
                <button type="button" onClick={() => setExplored([])}>
                  Tillbaka till sökträffarna
                </button>
              )}
            </div>
            <div className="mt-map-nodes">
              {mapItems.slice(0, 12).map((item) => (
                <article
                  key={item.id}
                  data-selected={selected === item.id}
                  data-context={!found.includes(item)}
                >
                  <span className="mt-badge">
                    {found.includes(item) ? '● Sökträff' : '↔ Sammanhang'}
                  </span>
                  <button
                    type="button"
                    className="mt-node-name"
                    onClick={() => setSelected(item.id)}
                  >
                    {item.name}
                  </button>
                  <small>{item.type}</small>
                  <div className="mt-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item.id);
                        setExplored((old) => [...new Set([...old, item.id])]);
                      }}
                    >
                      Visa samband i kartan
                    </button>
                    <button
                      type="button"
                      aria-label={`Samband för ${item.name}`}
                      onClick={() => openRelations(item.id)}
                    >
                      Samband
                    </button>
                    <button type="button" onClick={() => openEditor(item)}>
                      Redigera
                    </button>
                  </div>
                  <ul>
                    {eligibleLinks
                      .filter(
                        (link) =>
                          (link.from === item.id || link.to === item.id) &&
                          mapIds.has(link.from) &&
                          mapIds.has(link.to),
                      )
                      .map((link) => (
                        <li key={link.id}>{sentence(link)}</li>
                      ))}
                  </ul>
                </article>
              ))}
            </div>
            {!mapItems.length && (
              <div className="mt-empty">
                <h2>Inga objekt matchar</h2>
                <button type="button" onClick={() => setMapFilters(emptyFilters())}>
                  Återställ sökning och filter
                </button>
              </div>
            )}
            <p className="mt-prototype-note">
              Prototypens karta visar högst 12 objekt som läsbara noder. Den prövar sökning och
              navigation; rymdkartans rendering byggs inte om.
            </p>
          </section>
        )}
        {stateControls}
      </main>
      {view === 'table' && variant === 'C' && filterOpen && (
        <Popup
          title="Tabellens filter"
          hint="Filter ändrar vilka objekt tabellen visar."
          className="mt-filter-dialog"
          onClose={() => setFilterOpen(false)}
          footer={
            <button type="button" className="mt-primary" onClick={() => setFilterOpen(false)}>
              Visa {found.length} träffar
            </button>
          }
        >
          {filterControls}
        </Popup>
      )}
      {view === 'map' && searchOpen && (
        <section
          className="mt-search-panel"
          aria-label="Kartans sökning och filter"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setSearchOpen(false);
            }
          }}
        >
          <header>
            <h2>Sök i kartan</h2>
            <button type="button" onClick={() => setSearchOpen(false)}>
              Stäng
            </button>
          </header>
          {searchField}
          <div className="mt-actions">
            <button type="button" onClick={() => changeFilters({ query: '' })}>
              Rensa sökning
            </button>
            <button
              type="button"
              aria-expanded={mapFilterOpen}
              onClick={() => setMapFilterOpen(!mapFilterOpen)}
            >
              Filter
            </button>
          </div>
          {mapFilterOpen && filterControls}
          <p role="status">{found.length} sökträffar</p>
        </section>
      )}
      {editor && (
        <Popup
          title={
            items.some((item) => item.id === editor.id)
              ? `Redigera ${editor.name || 'objekt'}`
              : 'Nytt objekt'
          }
          onClose={() => guardAction(closeForms)}
          className={`mt-editor mt-editor-${variant}`}
          footer={
            <>
              <button type="button" disabled={busy} onClick={() => guardAction(closeForms)}>
                Avbryt
              </button>
              <button
                type="button"
                disabled={busy}
                className="mt-primary"
                onClick={() => stageEditor(false)}
              >
                Lägg i utkastet och stäng
              </button>
              <button type="button" disabled={busy} onClick={() => stageEditor(true)}>
                Lägg i utkastet och öppna samband
              </button>
            </>
          }
        >
          {variant === 'B' && (
            <nav className="mt-section-nav" aria-label="Formulärets avsnitt">
              {editorSections.map(({ title }) => (
                <button
                  type="button"
                  key={title}
                  aria-pressed={section === title}
                  onClick={() => {
                    setSection(title);
                    document.getElementById(`section-${title}`)?.scrollIntoView({ block: 'start' });
                  }}
                >
                  {title}
                </button>
              ))}
            </nav>
          )}
          <div className="mt-editor-content">
            {requestNotice}
            <fieldset disabled={busy} className="mt-field-container">
              {editorSections.map(({ title, body }) =>
                variant === 'C' ? (
                  <section className="mt-form-section" key={title} data-open={section === title}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={section === title}
                        aria-controls={`section-${title}`}
                        onClick={() => setSection(section === title ? '' : title)}
                      >
                        {section === title ? '▾' : '▸'} {title}
                      </button>
                    </h3>
                    {section === title && (
                      <div className="mt-form-grid" id={`section-${title}`}>
                        {body}
                      </div>
                    )}
                  </section>
                ) : (
                  <section id={`section-${title}`} className="mt-form-section" key={title}>
                    <h3>{title}</h3>
                    <div className="mt-form-grid">{body}</div>
                  </section>
                ),
              )}
            </fieldset>
            <aside className="mt-demo">
              <p>Pröva ett vybyte med oskickade formulärändringar:</p>
              <button type="button" onClick={() => switchView(view === 'table' ? 'map' : 'table')}>
                Demo: byt till {view === 'table' ? 'kartan' : 'tabellen'}
              </button>
            </aside>
          </div>
        </Popup>
      )}
      {relationObject && (
        <Popup
          title={`Samband för ${itemName(relationObject)}`}
          onClose={() => guardAction(closeForms)}
          className={`mt-relations mt-relations-${variant}`}
          footer={
            <button type="button" disabled={busy} onClick={() => guardAction(closeForms)}>
              Stäng samband
            </button>
          }
        >
          {requestNotice}
          <div className="mt-relations-layout">
            <section>
              <h3>Befintliga samband</h3>
              <ul className="mt-link-list">
                {links
                  .filter((link) => link.from === relationObject || link.to === relationObject)
                  .map((link) => (
                    <li key={link.id}>
                      <strong>{sentence(link)}</strong>
                      <span>
                        {link.certainty}
                        {link.end && ` · Upphört ${link.end}`}
                      </span>
                      {link.proposal && <span className="mt-badge">◇ {link.proposal}</span>}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => guardAction(() => editRelation(link))}
                      >
                        Redigera samband
                      </button>
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                disabled={busy}
                className="mt-primary"
                onClick={() => guardAction(() => editRelation())}
              >
                Nytt samband
              </button>
              <p>Saknas det andra objektet? Skapa det separat med Nytt objekt och återvänd hit.</p>
            </section>
            {relation && (
              <section>
                <h3>
                  {links.some((link) => link.id === relation.id)
                    ? 'Redigera samband'
                    : 'Nytt samband'}
                </h3>
                <fieldset disabled={busy} className="mt-field-container">
                  <div className="mt-form-grid">
                    <label>
                      Sambandstyp
                      <select
                        aria-label="Sambandstyp"
                        value={relation.type}
                        onChange={(event) => setRelation({ ...relation, type: event.target.value })}
                      >
                        {['använder', 'äger', 'förvaras i', 'försäkrar', 'betalar'].map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Uppgiftens säkerhet
                      <select
                        aria-label="Uppgiftens säkerhet"
                        value={relation.certainty}
                        onChange={(event) =>
                          setRelation({ ...relation, certainty: event.target.value })
                        }
                      >
                        {['Bekräftat', 'Okänt', 'Uttryckligen inget', 'Osäkert uppgivet'].map(
                          (type) => (
                            <option key={type}>{type}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Från objekt
                      <select
                        aria-label="Från objekt"
                        value={relation.from}
                        onChange={(event) => setRelation({ ...relation, from: event.target.value })}
                      >
                        {items
                          .filter(
                            (item) =>
                              item.life !== 'Borttaget' &&
                              item.proposal !== 'Föreslagen borttagning',
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.type}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRelation({ ...relation, from: relation.to, to: relation.from })
                      }
                    >
                      Byt riktning
                    </button>
                    <label className="mt-wide">
                      Sök det andra objektet
                      <input value={picker} onChange={(event) => setPicker(event.target.value)} />
                    </label>
                    <label className="mt-wide">
                      Till objekt
                      <select
                        aria-label="Till objekt"
                        value={relation.to}
                        onChange={(event) => setRelation({ ...relation, to: event.target.value })}
                      >
                        <option value="">Välj objekt</option>
                        {items
                          .filter(
                            (item) =>
                              item.life !== 'Borttaget' &&
                              item.proposal !== 'Föreslagen borttagning' &&
                              (item.id === relation.to ||
                                `${item.name} ${item.type} ${item.description}`
                                  .toLocaleLowerCase('sv')
                                  .includes(picker.toLocaleLowerCase('sv'))),
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.type} · {item.description}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Slutdatum
                      <input
                        type="date"
                        value={relation.end}
                        onChange={(event) => setRelation({ ...relation, end: event.target.value })}
                      />
                    </label>
                  </div>
                  <p className="mt-sentence">{sentence(relation)}</p>
                  {duplicate && (
                    <p className="mt-notice">
                      Sambandet finns redan.{' '}
                      <button
                        type="button"
                        onClick={() => guardAction(() => editRelation(duplicate))}
                      >
                        Redigera befintligt samband
                      </button>
                    </p>
                  )}
                  <div className="mt-actions">
                    <button type="button" className="mt-primary" onClick={stageRelation}>
                      Lägg i utkastet
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        guardAction(() => {
                          setRelation(null);
                          setNotice('');
                        })
                      }
                    >
                      Avbryt redigeringen
                    </button>
                    {links.some((link) => link.id === relation.id) && (
                      <button
                        type="button"
                        onClick={() =>
                          guardAction(() => {
                            const value = { ...relation, proposal: 'Föreslagen borttagning' };
                            submit(() => {
                              setLinks((old) =>
                                old.map((link) => (link.id === value.id ? value : link)),
                              );
                              setRelation(null);
                              setRequest('idle');
                              setNotice('Föreslagen borttagning lades i ditt utkast.');
                            });
                          })
                        }
                      >
                        Föreslå borttagning
                      </button>
                    )}
                  </div>
                </fieldset>
              </section>
            )}
          </div>
        </Popup>
      )}
      {guard && (
        <Popup
          title={guardFields ? 'Ta bort tidigare egna fält?' : 'Lämna ändrade uppgifter?'}
          hint=""
          onClose={() => setGuard(null)}
          className="mt-guard"
          footer={
            <>
              <button type="button" className="mt-primary" onClick={() => setGuard(null)}>
                Fortsätt redigera
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = guard;
                  setGuard(null);
                  action();
                }}
              >
                {guardFields ? 'Ta bort fältvärdena och byt typ' : 'Kasta ändringarna och fortsätt'}
              </button>
            </>
          }
        >
          <p>
            {guardFields
              ? 'Vid typbytet försvinner följande egna fält från formuläret. Bekräfta för att ta bort värdena.'
              : 'Ändringar som ännu inte lagts i ditt utkast går förlorade. Redan lagda förslag finns kvar.'}
          </p>
          {guardFields && editor && (
            <div>
              <h3>Berörda egna fält</h3>
              <ul>
                {Object.entries(editor.fields).map(([name, value]) => (
                  <li key={name}>
                    {name}: {value || 'Ej uppgivet'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Popup>
      )}
      {textView && (
        <Popup
          title={textView === 'conversation' ? 'Skriv till Skyttel' : 'Visa utkastet'}
          hint=""
          onClose={() => {
            setTextView(null);
            restoreFocus();
          }}
          className="mt-text-demo"
          footer={
            <button type="button" onClick={() => setTextView(null)}>
              Stäng textvyn
            </button>
          }
        >
          <p>Inget samtal startas när textvyn öppnas.</p>
          {textView === 'conversation' ? (
            <label>
              Meddelande till Skyttel
              <textarea
                value={message}
                rows={5}
                onChange={(event) => setMessage(event.target.value)}
              />
              <small>Din oskickade text bevaras mellan karta och tabell.</small>
            </label>
          ) : (
            <>
              <p>
                {draftCount} förslag i ditt utkast. Detaljutformningen prövas i ett eget ärende.
              </p>
              <a
                href="http://localhost:5174/?prototype=conflicts&variant=A"
                target="_blank"
                rel="noreferrer"
              >
                Öppna den redan godkända konfliktdialogens prototyp
              </a>
              <p>Den öppnas separat. Stäng den för att återgå hit med bevarat underlag.</p>
            </>
          )}
        </Popup>
      )}
      {import.meta.env.DEV && (
        <nav className="mt-switcher" aria-label="Prototypvarianter">
          <button type="button" aria-label="Föregående variant" onClick={() => cycleVariant(-1)}>
            ←
          </button>
          <span>
            <strong>{variant}</strong> · {variantNames[variant]}
          </span>
          <button type="button" aria-label="Nästa variant" onClick={() => cycleVariant(1)}>
            →
          </button>
        </nav>
      )}
    </div>
  );
}
