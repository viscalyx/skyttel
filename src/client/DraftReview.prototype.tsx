// Throwaway: three arrangements of Visa utkastet inside the text view on
// /households/:id?prototype=draft-review&variant=A. Real app host; fictional draft actions.
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { draftConflicts } from '../shared/draft-conflicts.js';
import { type FinancialFact, financialFields } from '../shared/financial-facts.js';
import type {
  MapState,
  ObjectType,
  ObjectValue,
  RelationshipType,
  RelationshipValue,
} from '../shared/map.js';
import { ConflictsPrototype } from './Conflicts.prototype.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './draft-review.prototype.css';

type Variant = 'A' | 'B' | 'C';
type Proposal = {
  id: string;
  name: string;
  kind: string;
  action: string;
  source: string;
  saved: Record<string, string>;
  base?: Record<string, string>;
  mine: Record<string, string>;
  hidden?: boolean;
  question?: string;
  conflict?: boolean;
  dependsOn?: string;
};
type SaveState = 'idle' | 'pending' | 'unknown' | 'checking' | 'rejected' | 'saved';
const names = {
  A: 'Samtal och granskning bredvid',
  B: 'Grupper i textvyn',
  C: 'Ett förslag åt gången',
};
const seeds: Proposal[] = [
  {
    id: 'car',
    name: 'Blå bilen',
    kind: 'Objekt',
    action: 'Ändra',
    source: 'Manuellt',
    saved: {
      Namn: 'Familjens bil',
      Beskrivning: 'Elbil, årsmodell 2024',
      Registreringsnummer: 'ABC123',
    },
    mine: { Namn: 'Blå bilen', Beskrivning: 'Vår bil', Registreringsnummer: 'DEF456' },
    conflict: true,
  },
  {
    id: 'garage',
    name: 'Garaget på Östra Ågatan – plats 12 med laddmöjlighet',
    kind: 'Objekt',
    action: 'Lägg till',
    source: 'Manuellt',
    saved: {},
    mine: {
      Namn: 'Garaget på Östra Ågatan – plats 12 med laddmöjlighet',
      Plats: '12',
      Beskrivning: 'Två nycklar. Separat tagg för porten.',
    },
    hidden: true,
  },
  {
    id: 'link',
    name: 'Alex använder garaget',
    kind: 'Samband',
    action: 'Lägg till',
    source: 'Manuellt',
    saved: {},
    mine: {
      Från: 'Alex',
      Sambandstyp: 'Använder',
      Till: 'Garaget på Östra Ågatan',
      'Uppgiftens säkerhet': 'Bekräftat',
    },
    dependsOn: 'garage',
    hidden: true,
  },
  {
    id: 'rent',
    name: 'Hyran betalas från ett bankkonto',
    kind: 'Samband',
    action: 'Lägg till',
    source: 'Samtal',
    saved: {},
    mine: {
      Från: 'Hyresavtalet',
      Sambandstyp: 'Betalas från',
      Till: 'Ospecificerat objekt: bankkonto',
      'Uppgiftens säkerhet': 'Osäkert uppgivet',
    },
    hidden: true,
  },
  {
    id: 'tablet',
    name: 'Lo använder surfplattan',
    kind: 'Samband',
    action: 'Lägg till',
    source: 'Samtal',
    saved: {},
    mine: { Från: 'Lo', Sambandstyp: 'Använder', Till: 'Vilken surfplatta?' },
    question: 'Två surfplattor har samma namn. Välj vilket objekt som avses.',
    hidden: true,
  },
  {
    id: 'type',
    name: 'Solcellsanläggning',
    kind: 'Objekttyp',
    action: 'Ändra',
    source: 'Typinställningar',
    saved: { Namn: 'Solcellsanläggning', 'Egna fält': 'Installationsdatum' },
    mine: { Namn: 'Solcellsanläggning', 'Egna fält': 'Installationsdatum, Effekt (kW)' },
    hidden: true,
  },
  {
    id: 'relationship-type',
    name: 'Förvaras i',
    kind: 'Sambandstyp',
    action: 'Lägg till',
    source: 'Typinställningar',
    saved: {},
    mine: {
      Namn: 'Förvaras i',
      'Från objekt': 'Alla objekttyper',
      'Till objekt': 'Bostad, Garage',
    },
    hidden: true,
  },
  {
    id: 'oldbike',
    name: 'Gamla cykeln',
    kind: 'Objekt',
    action: 'Ta bort',
    source: 'Manuellt',
    saved: { Namn: 'Gamla cykeln', Beskrivning: 'Grön cykel utan batteri', Samband: 'Inga' },
    mine: {},
  },
  {
    id: 'oldlink',
    name: 'Alex använder musiktjänsten',
    kind: 'Samband',
    action: 'Ta bort',
    source: 'Manuellt',
    saved: { Från: 'Alex', Sambandstyp: 'Använder', Till: 'Musiktjänsten' },
    mine: {},
    hidden: true,
  },
];
function fixtures(many = false) {
  return [
    ...structuredClone(seeds),
    ...(many
      ? Array.from(
          { length: 36 },
          (_, i): Proposal => ({
            id: `extra-${i}`,
            name: `Försäkringsavtal för hushållets fordon ${i + 1}`,
            kind: 'Objekt',
            action: 'Ändra',
            source: 'Manuellt',
            saved: { Namn: `Försäkringsavtal ${i + 1}`, Pris: '250 kr/månad' },
            mine: { Namn: `Försäkringsavtal för hushållets fordon ${i + 1}`, Pris: '290 kr/månad' },
            hidden: true,
          }),
        )
      : []),
  ];
}
function environmentDraft(state: MapState): Proposal[] {
  const conflicts = draftConflicts(state);
  const fact = (f: FinancialFact) =>
    `${f.knowledge === 'unknown' ? 'Okänt' : f.knowledge === 'none' ? 'Uttryckligen inget' : `${f.knowledge === 'uncertain' ? 'Osäkert uppgivet: ' : ''}${f.value}`}${f.reportedOn ? ` · uppgivet ${f.reportedOn}` : ''}`;
  const action = (before: unknown, after: unknown) =>
    after ? (before ? 'Ändra' : 'Lägg till') : 'Ta bort';
  const names = Object.fromEntries(
    [
      ...state.objects,
      ...state.draft.changes.flatMap((c) => (c.after ? [{ ...c.after, id: c.id }] : [])),
    ].map((o) => [o.id, o.name]),
  );
  const object = (v: ObjectValue | null, type: ObjectType): Record<string, string> =>
    v
      ? {
          Namn: v.name,
          Objekttyp: type.name,
          Beskrivning: v.description || 'Ej uppgivet',
          ...(v.identity
            ? {
                Identitet:
                  v.identity === 'unspecified'
                    ? 'Ospecificerat objekt'
                    : 'Obesvarad identitetsfråga',
              }
            : {}),
          Status: v.lifecycle === 'ended' ? 'Upphört' : 'Aktuellt',
          ...Object.fromEntries(
            financialFields.flatMap((f) =>
              v.financialFacts?.[f.key]
                ? [[f.label, fact(v.financialFacts[f.key] as FinancialFact)]]
                : [],
            ),
          ),
          ...Object.fromEntries(
            Object.entries(v.customValues ?? {}).map(([id, value]) => [
              type.fields?.find((f) => f.id === id)?.name ?? 'Eget fält',
              String(value),
            ]),
          ),
        }
      : {};
  const link = (v: RelationshipValue | null, type: RelationshipType): Record<string, string> =>
    v
      ? {
          Från: names[v.sourceId] ?? 'Ospecificerat objekt',
          Sambandstyp: type.forwardLabel ?? type.name,
          Till: v.targetId
            ? (names[v.targetId] ?? 'Ospecificerat objekt')
            : v.knowledge === 'none'
              ? 'Uttryckligen inget'
              : 'Okänt',
          'Uppgiftens säkerhet':
            v.knowledge === 'uncertain'
              ? 'Osäkert uppgivet'
              : v.knowledge === 'unresolved'
                ? 'Obesvarad fråga'
                : 'Bekräftat',
          Status: v.lifecycle === 'ended' ? 'Upphört' : 'Aktuellt',
          ...(v.endDate ? { Slutdatum: fact(v.endDate) } : {}),
          ...Object.fromEntries(
            Object.entries(v.customValues ?? {}).map(([id, value]) => [
              type.fields?.find((f) => f.id === id)?.name ?? 'Eget fält',
              String(value),
            ]),
          ),
        }
      : {};
  return [
    ...state.draft.changes.map((c) => ({
      id: c.id,
      name: c.after?.name ?? c.before?.name ?? 'Objekt',
      kind: 'Objekt',
      action: action(c.before, c.after),
      source: 'Miljöns utkast · simulerad arbetskopia',
      saved: object(state.objects.find((o) => o.id === c.id) ?? c.before, c.beforeType ?? c.type),
      base: object(c.before, c.beforeType ?? c.type),
      mine: object(c.after, c.type),
      conflict: conflicts.some((x) => x.kind === 'object' && x.id === c.id),
    })),
    ...(state.draft.relationships ?? []).map((c) => {
      const saved = link(state.relationships.find((r) => r.id === c.id) ?? c.before, c.type);
      const mine = link(c.after, c.type);
      const displayed = c.after ? mine : saved;
      return {
        id: c.id,
        name: `${displayed.Från} ${displayed.Sambandstyp} ${displayed.Till}`,
        kind: 'Samband',
        action: action(c.before, c.after),
        source: 'Miljöns utkast · simulerad arbetskopia',
        saved,
        mine,
        conflict: conflicts.some((x) => x.kind === 'relationship' && x.id === c.id),
      };
    }),
    ...(['objectTypes', 'relationshipTypes'] as const).flatMap((key) =>
      (state.draft[key] ?? []).map(
        (c): Proposal => ({
          id: c.id,
          name: c.after?.name ?? c.before?.name ?? 'Typ',
          kind: key === 'objectTypes' ? 'Objekttyp' : 'Sambandstyp',
          action: action(c.before, c.after),
          source: 'Miljöns utkast · simulerad arbetskopia',
          saved: c.before
            ? {
                Namn: c.before.name,
                Beskrivning: c.before.description,
                'Egna fält': c.before.fields?.map((f) => f.name).join(', ') ?? 'Inga',
              }
            : {},
          mine: c.after
            ? {
                Namn: c.after.name,
                Beskrivning: c.after.description,
                'Egna fält': c.after.fields?.map((f) => f.name).join(', ') ?? 'Inga',
              }
            : {},
        }),
      ),
    ),
  ];
}
function Modal({
  title,
  children,
  onClose,
  label = 'Stäng dialogen',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement;
    ref.current?.showModal();
    (ref.current?.querySelector('[data-default]') as HTMLElement | null)?.focus();
    return () => {
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      className="dr-modal"
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose} aria-label={label}>
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function DraftReviewPrototype({
  source,
  host,
  onCountChange,
  onVariantChange,
  onOpen,
  onClose,
}: {
  source: MapState;
  host: HTMLElement | null;
  onCountChange: (count: number) => void;
  onVariantChange: (variant: string) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const initial = new URLSearchParams(location.search).get('variant');
  const [variant, setVariant] = useState<Variant>(
    initial === 'B' || initial === 'C' ? initial : 'A',
  );
  const [items, setItems] = useState<Proposal[]>(() => environmentDraft(source));
  const [selected, setSelected] = useState('car');
  const [query, setQuery] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [response, setResponse] = useState('success');
  const [notice, setNotice] = useState('');
  const [edit, setEdit] = useState<Proposal | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [discardForm, setDiscardForm] = useState(false);
  const [discard, setDiscard] = useState<string[] | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictItem, setConflictItem] = useState<Proposal | null>(null);
  const [report, setReport] = useState(false);
  const [savedItems, setSavedItems] = useState<Proposal[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [demo, setDemo] = useState('environment');
  const lock = useRef(false);
  const returnButton = useRef<HTMLElement | null>(null);
  const frozen = ['pending', 'unknown', 'checking'].includes(saveState);
  const blockers = items.filter((i) => i.question || i.conflict);
  const filtered = items.filter((i) =>
    `${i.name} ${i.kind} ${i.action}`
      .toLocaleLowerCase('sv')
      .includes(query.toLocaleLowerCase('sv')),
  );
  const item = filtered.find((i) => i.id === selected) ?? filtered[0];
  const activeIndex = filtered.findIndex((i) => i.id === item?.id);
  const dirty = edit && JSON.stringify(form) !== JSON.stringify(edit.mine);
  const hidden = items.filter((i) => i.hidden || i.kind.includes('typ')).length;

  function changeVariant(next: Variant) {
    const url = new URL(location.href);
    url.searchParams.set('variant', next);
    history.replaceState(null, '', url);
    setVariant(next);
  }
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('input,textarea,select,button,[contenteditable],dialog')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const keys: Variant[] = ['A', 'B', 'C'];
        const next = keys[(keys.indexOf(variant) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
        const url = new URL(location.href);
        url.searchParams.set('variant', next);
        history.replaceState(null, '', url);
        setVariant(next);
      }
    }
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [variant]);
  function openDraft() {
    onOpen();
  }
  function correct(i: Proposal) {
    returnButton.current = document.activeElement as HTMLElement;
    setEdit(i);
    setForm({ ...i.mine });
  }
  function closeEdit() {
    if (dirty) setDiscardForm(true);
    else setEdit(null);
  }
  function putInDraft() {
    if (edit?.question && (!form.Till || form.Till === 'Vilken surfplatta?')) return;
    if (!edit) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === edit.id ? { ...i, name: form.Namn || i.name, mine: form, question: undefined } : i,
      ),
    );
    if (edit.kind === 'Samband') setEdit({ ...edit, mine: form, question: undefined });
    else setEdit(null);
    setNotice('Ändringen ligger i ditt utkast. Kartan är inte sparad.');
  }
  function askDiscard(i: Proposal) {
    const dependent = items.filter((other) => other.dependsOn === i.id).map((other) => other.id);
    setDiscard([i.id, ...dependent]);
  }
  async function save() {
    if (lock.current || frozen || blockers.length || !items.length) return;
    lock.current = true;
    setAttempt((n) => n + 1);
    setSaveState('pending');
    setNotice('Sparar hela ditt utkast…');
    const snapshot = structuredClone(items);
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (response === 'success') finishSave(snapshot);
    else if (response === 'rejected') {
      setSaveState('rejected');
      setNotice('Sparandet avvisades. Inget sparades. Dina förslag finns kvar.');
      lock.current = false;
    } else {
      setSavedItems(snapshot);
      setSaveState('unknown');
      setNotice(
        'Det är oklart om utkastet sparades. Kontrollera sparandet innan du ändrar eller sparar mer.',
      );
    }
  }
  function finishSave(snapshot: Proposal[]) {
    setSavedItems(snapshot);
    setItems([]);
    setSaveState('saved');
    setNotice('Sparat');
    lock.current = false;
  }
  async function checkSave() {
    if (saveState !== 'unknown') return;
    setSaveState('checking');
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (response === 'unknown-rejected') {
      setSaveState('rejected');
      setNotice('Kontrollen visar att inget sparades. Förslagen finns kvar. Du kan försöka igen.');
      lock.current = false;
    } else finishSave(savedItems);
  }
  function scenario(next: string) {
    setDemo(next);
    setQuery('');
    setSelected('car');
    setSaveState('idle');
    setNotice('');
    setSavedItems([]);
    setAttempt(0);
    lock.current = false;
    setItems(next === 'empty' || next === 'no-icon' ? [] : fixtures(next === 'many'));
    if (next === 'environment') setItems(environmentDraft(source));
    if (next === 'clean')
      setItems(
        fixtures().map((i) => ({
          ...i,
          conflict: false,
          question: undefined,
          mine: { ...i.mine, ...(i.id === 'tablet' ? { Till: 'Los surfplatta' } : {}) },
        })),
      );
    if (next === 'no-icon') {
      setSaveState('unknown');
      setSavedItems(fixtures());
      setResponse('unknown-applied');
      setNotice('Det är oklart om utkastet sparades. Kontrollera sparandet.');
      lock.current = true;
    }
  }
  function differences(i: Proposal) {
    return (
      <div className="dr-diff">
        <section>
          <h4>Sparat i kartan nu</h4>
          {!Object.keys(i.saved).length ? (
            <p>Finns inte i kartan.</p>
          ) : (
            <dl>
              {Object.entries(i.saved).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        <section>
          <h4>Ditt förslag</h4>
          {i.action === 'Ta bort' ? (
            <p className="dr-delete">× Föreslagen borttagning. Ingen permanent radering.</p>
          ) : (
            <dl>
              {Object.entries(i.mine).map(([k, v]) => (
                <div key={k} className={i.saved[k] !== v ? 'dr-changed' : ''}>
                  <dt>
                    {k}
                    {i.saved[k] !== v && <small> · {i.saved[k] ? 'Ändrat' : 'Nytt'}</small>}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    );
  }
  function detail(i: Proposal) {
    return (
      <article className="dr-detail" key={i.id}>
        <small>
          {i.kind} · {i.source}
        </small>
        <h3>{i.name}</h3>
        <span className={`dr-badge ${i.action === 'Ta bort' ? 'dr-removal' : ''}`}>
          {i.action === 'Lägg till' ? '+' : i.action === 'Ta bort' ? '×' : '✎'} {i.action}
        </span>
        {i.hidden && (
          <p className="dr-hidden-note">
            Visas inte med kartans nuvarande filter. Ingår i hela ditt utkast.
          </p>
        )}
        {i.question && (
          <div className="dr-warning">
            <strong>Fråga före sparande</strong>
            <p>{i.question}</p>
            <button type="button" disabled={frozen} onClick={() => correct(i)}>
              Välj rätt objekt
            </button>
          </div>
        )}
        {i.conflict && (
          <div className="dr-warning">
            <strong>Konflikt före sparande</strong>
            <p>
              {demo === 'environment'
                ? 'Sparade uppgifter har ändrats medan förslaget ligger i ditt utkast.'
                : 'Lo sparade nya uppgifter medan du redigerade.'}
            </p>
            <button
              type="button"
              disabled={frozen}
              onClick={() => {
                returnButton.current = document.activeElement as HTMLElement;
                setConflictItem(i);
                setConflictOpen(true);
              }}
            >
              Granska konflikter
            </button>
          </div>
        )}
        {differences(i)}
        <div className="dr-row-actions">
          {i.action !== 'Ta bort' && (
            <button
              type="button"
              disabled={frozen || i.conflict === true}
              onClick={() => correct(i)}
            >
              {i.kind.includes('typ') ? 'Rätta i typinställningar' : 'Rätta förslaget'}
            </button>
          )}
          <button type="button" disabled={frozen} onClick={() => askDiscard(i)}>
            Kasta förslaget
          </button>
        </div>
        {i.id === 'rent' && (
          <p className="dr-muted">
            Ospecificerat objekt och Osäkert uppgivet är giltiga uppgifter. Ingen obesvarad fråga
            här.
          </p>
        )}
        {i.action === 'Ta bort' && (
          <p>
            Kasta förslaget för att behålla det sparade{' '}
            {i.kind === 'Objekt' ? 'objektet' : 'sambandet'}.
          </p>
        )}
      </article>
    );
  }
  const draftHeader = (
    <header className="dr-draft-header">
      <div>
        <h2>
          Ditt utkast <span className="dr-count">{items.length}</span>
        </h2>
        <p>Förslagen blir gemensamma när du sparar hela utkastet.</p>
      </div>
    </header>
  );
  const overview = (
    <div className="dr-summary">
      <span>{items.length} förslag totalt</span>
      {hidden > 0 && <span>{hidden} utanför kartans filter eller i typer</span>}
      {blockers.length > 0 && <strong>⚠ {blockers.length} hinder före sparande</strong>}
    </div>
  );
  const search = items.length > 0 && (
    <label className="dr-search">
      Sök bland förslagen
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          const found = items.find((i) =>
            `${i.name} ${i.kind} ${i.action}`
              .toLocaleLowerCase('sv')
              .includes(e.target.value.toLocaleLowerCase('sv')),
          );
          if (found) setSelected(found.id);
        }}
      />
    </label>
  );
  const saving = (
    <footer className="dr-save">
      <p role="status">
        {['pending', 'checking', 'unknown', 'rejected'].includes(saveState)
          ? notice || 'Kontrollerar sparandet…'
          : blockers.length
            ? 'Lös frågan och konflikten före sparande.'
            : items.length
              ? 'Spara gäller alla förslag, även de som sökningen döljer.'
              : 'Utkastet är tomt.'}
      </p>
      <div>
        {saveState === 'unknown' ? (
          <button type="button" className="dr-primary" onClick={checkSave}>
            Kontrollera sparandet
          </button>
        ) : (
          <button
            type="button"
            className="dr-primary"
            disabled={!items.length || frozen || blockers.length > 0}
            onClick={save}
          >
            {saveState === 'pending'
              ? 'Sparar…'
              : saveState === 'checking'
                ? 'Kontrollerar…'
                : `Spara hela utkastet${items.length ? ` (${items.length})` : ''}`}
          </button>
        )}
        <button
          type="button"
          disabled={!items.length || frozen}
          onClick={() => setDiscard(items.map((i) => i.id))}
        >
          Kasta hela utkastet
        </button>
      </div>
    </footer>
  );
  const empty = (
    <div className="dr-empty">
      <WorkspaceIcon name="draft" />
      <h3>Ditt utkast är tomt</h3>
      <p>Förslag från objekt, samband och typinställningar samlas här.</p>
      <button type="button" onClick={onClose}>
        Tillbaka till kartan
      </button>
    </div>
  );
  function choose(id: string) {
    setSelected(id);
  }
  const list = (
    <nav className="dr-index" aria-label="Förslag i ditt utkast">
      {filtered.map((i) => (
        <button
          type="button"
          key={i.id}
          aria-current={item?.id === i.id ? 'true' : undefined}
          onClick={() => choose(i.id)}
        >
          <small>
            {i.kind} · {i.action}
          </small>
          <strong>{i.name}</strong>
          {(i.question || i.conflict) && (
            <span className="dr-needs">⚠ {i.question ? 'Fråga' : 'Konflikt'}</span>
          )}
        </button>
      ))}
    </nav>
  );
  const noMatches = (
    <p className="dr-empty">
      Inga förslag matchar sökningen.{' '}
      <button type="button" onClick={() => setQuery('')}>
        Visa alla {items.length} förslag
      </button>
    </p>
  );

  useEffect(() => onCountChange(items.length), [items.length, onCountChange]);
  useEffect(() => onVariantChange(variant), [variant, onVariantChange]);
  return (
    <div className={`dr-root dr-controller dr-variant-${variant}`}>
      {host &&
        createPortal(
          <div className={`dr-root dr-panel dr-variant-${variant}`}>
            <section className="dr-draft" aria-label="Visa utkastet">
              {draftHeader}
              {overview}
              {search}
              <div className="dr-review">
                {!items.length ? (
                  empty
                ) : !filtered.length ? (
                  noMatches
                ) : variant === 'A' ? (
                  <div className="dr-split">
                    {list}
                    {item && detail(item)}
                  </div>
                ) : variant === 'B' ? (
                  <div className="dr-groups">
                    {['Objekt', 'Samband', 'Objekttyp', 'Sambandstyp'].map((kind) => {
                      const group = filtered.filter((i) => i.kind === kind);
                      return (
                        group.length > 0 && (
                          <section key={kind}>
                            <h3>
                              {kind} <small>({group.length})</small>
                            </h3>
                            {group.map((i) => (
                              <details
                                key={i.id}
                                open={selected === i.id}
                                onToggle={(e) => {
                                  if (e.currentTarget.open && selected !== i.id) choose(i.id);
                                }}
                              >
                                <summary>
                                  <span className="dr-badge">{i.action}</span>
                                  <strong>{i.name}</strong>
                                  {(i.question || i.conflict) && (
                                    <span>⚠ {i.question ? 'Fråga' : 'Konflikt'}</span>
                                  )}
                                </summary>
                                {detail(i)}
                              </details>
                            ))}
                          </section>
                        )
                      );
                    })}
                  </div>
                ) : (
                  <div className="dr-guided">
                    <div className="dr-step">
                      <button
                        type="button"
                        disabled={activeIndex <= 0}
                        onClick={() => choose(filtered[activeIndex - 1].id)}
                      >
                        ← Föregående
                      </button>
                      <span>
                        {activeIndex + 1} av {filtered.length}
                      </span>
                      <button
                        type="button"
                        disabled={activeIndex >= filtered.length - 1}
                        onClick={() => choose(filtered[activeIndex + 1].id)}
                      >
                        Nästa →
                      </button>
                    </div>
                    <label>
                      Gå till förslag
                      <select value={item?.id ?? ''} onChange={(e) => choose(e.target.value)}>
                        {filtered.map((i, n) => (
                          <option key={i.id} value={i.id}>
                            {n + 1}. {i.name}
                            {i.question || i.conflict ? ' · ⚠ hinder' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    {item && detail(item)}
                    <p className="dr-muted">
                      Granskningen ändrar inga förslag. Spara gäller fortfarande hela utkastet.
                    </p>
                  </div>
                )}
              </div>
              {saving}
            </section>
          </div>,
          host,
        )}
      {['unknown', 'pending', 'checking', 'rejected', 'saved'].includes(saveState) && (
        <div className="dr-global-status" role="status">
          <strong>
            {saveState === 'saved'
              ? '✓ Sparat'
              : saveState === 'checking'
                ? 'Kontrollerar sparandet…'
                : notice}
          </strong>
          {saveState === 'unknown' && (
            <button type="button" onClick={openDraft}>
              Öppna sparstatus
            </button>
          )}
          {saveState === 'saved' && (
            <button type="button" onClick={() => setReport(true)}>
              Visa ändringarna
            </button>
          )}
        </div>
      )}
      {notice && !['unknown', 'pending', 'checking', 'rejected', 'saved'].includes(saveState) && (
        <p className="dr-notice" role="status">
          {notice}
        </p>
      )}
      <details className="dr-lab">
        <summary>Prototypkontroller</summary>
        <strong>Kastbar prototyp · inga riktiga sparanden</strong>
        <div>
          <label>
            Exempel
            <select
              value={demo}
              disabled={
                !!edit ||
                conflictOpen ||
                !!discard ||
                saveState === 'pending' ||
                saveState === 'checking'
              }
              onChange={(e) => scenario(e.target.value)}
            >
              <option value="mixed">Blandat · fråga och konflikt</option>
              <option value="environment">Miljöns utkast · simulerad arbetskopia</option>
              <option value="clean">Redo att spara</option>
              <option value="many">Många · 45 förslag</option>
              <option value="empty">Tomt utkast</option>
              <option value="no-icon">Oklart sparande utan utkastikon</option>
            </select>
          </label>
          <label>
            Simulerat sparsvar
            <select
              value={response}
              disabled={frozen}
              onChange={(e) => setResponse(e.target.value)}
            >
              <option value="success">Genomfört</option>
              <option value="rejected">Avvisat</option>
              <option value="unknown-applied">Oklart · genomfört</option>
              <option value="unknown-rejected">Oklart · inte genomfört</option>
            </select>
          </label>
        </div>
        <details>
          <summary>Visa prototypens tillstånd</summary>
          <pre>
            {JSON.stringify(
              {
                variant,
                valtFörslag: selected,
                utkast: items,
                formulär: form,
                sparstatus: saveState,
                sparförsök: attempt,
                sparadeFörslag: savedItems.length,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </details>
      <nav className="dr-switcher" aria-label="Välj prototypvariant">
        <button
          type="button"
          onClick={() => changeVariant(variant === 'A' ? 'C' : variant === 'B' ? 'A' : 'B')}
          aria-label="Föregående variant"
        >
          ←
        </button>
        <span>
          {variant} · {names[variant]}
        </span>
        <button
          type="button"
          onClick={() => changeVariant(variant === 'A' ? 'B' : variant === 'B' ? 'C' : 'A')}
          aria-label="Nästa variant"
        >
          →
        </button>
      </nav>
      {edit && (
        <Modal
          title={
            edit.question
              ? 'Välj rätt objekt för sambandet'
              : edit.kind.includes('typ')
                ? 'Typer och egna fält'
                : edit.kind === 'Samband'
                  ? 'Redigera samband'
                  : 'Redigera objekt'
          }
          onClose={closeEdit}
        >
          <p className="dr-modal-note">
            Skiss av den gemensamma rättningen. Ändringar i formuläret ingår i utkastet först när du
            väljer Lägg i utkastet.
          </p>
          <div className="dr-form-scroll">
            <h3>{edit.name}</h3>
            {Object.entries(form).map(([key, value]) => (
              <label key={key} htmlFor={`dr-field-${key}`}>
                {key}
                {edit.question && key === 'Till' ? (
                  <select
                    id={`dr-field-${key}`}
                    value={value}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  >
                    <option>Vilken surfplatta?</option>
                    <option>Los surfplatta · blått fodral</option>
                    <option>Familjens surfplatta · i köket</option>
                  </select>
                ) : (
                  <input
                    id={`dr-field-${key}`}
                    value={value}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
          </div>
          <footer>
            <button type="button" onClick={closeEdit}>
              Tillbaka till utkastet
            </button>
            <button
              type="button"
              className="dr-primary"
              disabled={!!edit.question && form.Till === 'Vilken surfplatta?'}
              onClick={putInDraft}
            >
              {edit.kind === 'Objekt' ? 'Lägg i utkastet och stäng' : 'Lägg i utkastet'}
            </button>
          </footer>
          {discardForm && (
            <Modal title="Kasta oskickade ändringar?" onClose={() => setDiscardForm(false)}>
              <p className="dr-form-scroll">
                Formulärändringarna går förlorade. Förslag som redan ligger i ditt utkast behålls.
              </p>
              <footer>
                <button type="button" data-default onClick={() => setDiscardForm(false)}>
                  Fortsätt redigera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscardForm(false);
                    setEdit(null);
                  }}
                >
                  Kasta ändringarna och fortsätt
                </button>
              </footer>
            </Modal>
          )}
        </Modal>
      )}
      {discard && (
        <Modal
          title={discard.length === items.length ? 'Kasta hela ditt utkast?' : 'Kasta förslaget?'}
          onClose={() => setDiscard(null)}
        >
          <div className="dr-form-scroll">
            <p>
              Följande {discard.length} förslag kastas. Det som redan är sparat i kartan påverkas
              inte.
            </p>
            {discard.length > 1 && discard.length < items.length && (
              <p className="dr-warning">
                Sambandet nedan behöver det nya objektet och kastas tillsammans med objektförslaget.
              </p>
            )}
            <ul>
              {items
                .filter((i) => discard.includes(i.id))
                .map((i) => (
                  <li key={i.id}>
                    {i.kind}: {i.name}
                  </li>
                ))}
            </ul>
          </div>
          <footer>
            <button type="button" data-default onClick={() => setDiscard(null)}>
              Behåll förslagen
            </button>
            <button
              type="button"
              onClick={() => {
                setItems((p) => p.filter((i) => !discard.includes(i.id)));
                setDiscard(null);
                setNotice('Förslagen har kastats. Det sparade innehållet i kartan är oförändrat.');
              }}
            >
              Kasta {discard.length} förslag
            </button>
          </footer>
        </Modal>
      )}
      <div className="dr-conflict-host">
        <ConflictsPrototype
          key={demo}
          example={
            conflictItem
              ? {
                  name: conflictItem.name,
                  kind: conflictItem.kind,
                  savedBy: demo === 'environment' ? undefined : 'Lo',
                  fields: [
                    ...new Set([
                      ...Object.keys(conflictItem.saved),
                      ...Object.keys(conflictItem.mine),
                    ]),
                  ].map((name) => ({
                    name,
                    before: conflictItem.base?.[name] ?? conflictItem.saved[name] ?? 'Ej uppgivet',
                    saved: conflictItem.saved[name] ?? 'Ej uppgivet',
                    mine: conflictItem.mine[name] ?? 'Ej uppgivet',
                    result: conflictItem.mine[name] ?? 'Ej uppgivet',
                  })),
                }
              : undefined
          }
          visible={conflictOpen}
          onReturn={() => {
            setConflictOpen(false);
            requestAnimationFrame(() => returnButton.current?.focus());
          }}
          onResolved={(values) => {
            setItems((p) =>
              p.map((i) =>
                i.id === conflictItem?.id
                  ? { ...i, conflict: false, mine: values, name: values.Namn ?? i.name }
                  : i,
              ),
            );
            setNotice('Konfliktvalen ligger i ditt utkast. Kartan sparas separat.');
          }}
        />
      </div>
      {report && (
        <Modal title="Rapporter → Ändringshistorik" onClose={() => setReport(false)}>
          <div className="dr-form-scroll">
            <p>Gemensamma sparade ändringar · läsläge</p>
            {savedItems.length ? (
              <>
                <h3>Senaste demosparandet · Alex · nu</h3>
                {savedItems.map((i) => (
                  <details key={i.id}>
                    <summary>
                      {i.kind}: {i.name} · {i.action}
                    </summary>
                    {differences(i)}
                  </details>
                ))}
              </>
            ) : (
              <p>Inget demosparande att visa.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
