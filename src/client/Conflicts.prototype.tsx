// Throwaway: three conflict-dialog layouts on /?prototype=conflicts&variant=A.
// Static household fixtures and in-memory draft choices; no server mutations.
import { useCallback, useEffect, useRef, useState } from 'react';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './conflicts.prototype.css';

type Field = { name: string; before: string; saved: string; mine: string; result: string };
type Case = {
  id: string;
  kind: string;
  name: string;
  reason: string;
  fields: Field[];
  effect: string;
  blocked?: string;
  repair?: string;
  hidden?: boolean;
};
const field = (
  name: string,
  before: string,
  saved: string,
  mine: string,
  result = mine,
): Field => ({ name, before, saved, mine, result });
const cases: Case[] = [
  {
    id: 'object',
    kind: 'Objekt',
    name: 'Familjens bil',
    reason: 'Ni har båda ändrat bilens namn. Lo har också ändrat beskrivningen.',
    fields: [
      field('Namn', 'Bilen', 'Familjens bil', 'Blå bilen'),
      field('Beskrivning', 'Vår bil', 'Elbil, årsmodell 2024', 'Vår bil', 'Elbil, årsmodell 2024'),
      field('Registreringsnummer', 'ABC123', 'ABC123', 'DEF456'),
    ],
    effect: 'Ditt namn och registreringsnummer kombineras med den sparade beskrivningen.',
  },
  {
    id: 'relationship',
    kind: 'Samband',
    name: 'Alex använder bilen',
    reason: 'Ni har båda ändrat startdatum för samma samband.',
    fields: [
      field('Startdatum', '2026-01-01', '2026-02-01', '2026-03-01'),
      field(
        'Uppgiftens säkerhet',
        'Osäkert uppgivet',
        'Bekräftat',
        'Osäkert uppgivet',
        'Bekräftat',
      ),
    ],
    effect: 'Ditt startdatum används. Den sparade uppgiften Bekräftat bevaras.',
  },
  {
    id: 'deleted',
    kind: 'Objekt',
    name: 'Gamla cykeln',
    reason: 'Objektet tas bort från den gemensamma kartan medan du redigerar det.',
    fields: [field('Objekt', 'Gamla cykeln', 'Borttaget', 'Pendlarcykeln', 'Borttaget')],
    effect: 'Förslaget kastas. Objektet förblir borttaget.',
    blocked: 'Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.',
  },
  {
    id: 'remove',
    kind: 'Objekt',
    name: 'Garaget',
    reason: 'Du föreslår borttagning. Lo ändrar samtidigt garagets beskrivning.',
    fields: [
      field(
        'Objekt',
        'Garaget · plats 12',
        'Garaget · plats 14',
        'Föreslagen borttagning',
        'Föreslagen borttagning',
      ),
    ],
    effect:
      'Garaget föreslås tas bort, trots den nya beskrivningen. Ingen permanent radering sker.',
  },
  {
    id: 'connections',
    kind: 'Objekt',
    name: 'Gamla lägenheten',
    reason: 'Du föreslår borttagning. Ytterligare ett sparat samband berör nu lägenheten.',
    fields: [
      field('Objekt', 'Gamla lägenheten', 'Gamla lägenheten', 'Föreslagen borttagning'),
      field(
        'Samband',
        'Inga',
        'Hemförsäkringen försäkrar lägenheten',
        'Inga',
        'Föreslagen borttagning av sambandet',
      ),
    ],
    effect: 'Både lägenheten och det tillkommande sambandet föreslås tas bort.',
  },
  {
    id: 'endpoint',
    kind: 'Samband',
    name: 'Lo använder surfplattan',
    reason: 'Surfplattan som sambandet pekar på saknas.',
    fields: [field('Till objekt', 'Surfplattan', 'Borttaget', 'Surfplattan')],
    effect: 'Förslaget till samband kastas.',
    blocked: 'Välj ett befintligt objekt innan sambandet kan läggas i utkastet.',
    repair: 'Välj annat objekt',
    hidden: true,
  },
  {
    id: 'duplicate',
    kind: 'Samband',
    name: 'Alex använder musiktjänsten',
    reason: 'Ett sparat samband har redan samma typ, riktning och objekt.',
    fields: [field('Startdatum', 'Inget sparat samband', '2026-02-01', '2026-03-01')],
    effect: 'Ditt nya samband kastas. Det befintliga sambandet behåller sina uppgifter.',
    blocked: 'Sambandet finns redan. Dina värden förs inte över automatiskt.',
    repair: 'Redigera befintligt samband',
  },
  {
    id: 'object-type',
    kind: 'Objekttyp',
    name: 'Fordon',
    reason: 'Ni har båda ändrat typens namn. Ett eget fält tillkommer i den sparade typen.',
    fields: [
      field('Namn', 'Fordon', 'Transportmedel', 'Mina fordon'),
      field(
        'Egna fält',
        'Registreringsnummer',
        'Registreringsnummer, årsmodell',
        'Registreringsnummer',
        'Registreringsnummer, årsmodell',
      ),
    ],
    effect: 'Ditt namn kombineras med de sparade egna fälten.',
    hidden: true,
  },
  {
    id: 'relationship-type',
    kind: 'Sambandstyp',
    name: 'Använder',
    reason: 'Ni har båda ändrat sambandstypens beskrivning.',
    fields: [field('Beskrivning', 'Användning', 'Regelbunden användning', 'Tillgång till objekt')],
    effect: 'Din beskrivning används.',
    hidden: true,
  },
  {
    id: 'schema',
    kind: 'Objekt',
    name: 'Solcellsanläggningen',
    reason: 'Typens eget fält Installationsår ändras från text till tal.',
    fields: [field('Installationsår', '2020', '2020', 'Våren 2021')],
    effect: 'Förslaget behöver rättas så att Installationsår är ett tal.',
    blocked: 'Värdet Våren 2021 är inte giltigt för den ändrade typen.',
    repair: 'Redigera objekt',
  },
  {
    id: 'missing-type',
    kind: 'Objekt',
    name: 'Vindsförrådet',
    reason: 'Objekttypen Förråd saknas i det aktuella underlaget.',
    fields: [field('Objekttyp', 'Förråd', 'Saknas', 'Förråd')],
    effect: 'Förslaget kastas.',
    blocked: 'Välj en tillgänglig objekttyp.',
    repair: 'Redigera objekt',
    hidden: true,
  },
  {
    id: 'deleted-relationship',
    kind: 'Samband',
    name: 'Lo använder gamla bilen',
    reason: 'Sambandet tas bort från kartan medan du ändrar dess startdatum.',
    fields: [field('Samband', 'Lo använder gamla bilen', 'Borttaget', 'Startdatum 2026-03-01')],
    effect: 'Förslaget kastas. Sambandet förblir borttaget.',
    blocked: 'Ett ändringsförslag kan inte återställa ett borttaget samband.',
  },
  {
    id: 'deleted-definition',
    kind: 'Sambandstyp',
    name: 'Förvaras i',
    reason: 'Typdefinitionen saknas nu i kartan. Ditt förslag innehåller en ändrad beskrivning.',
    fields: [
      field(
        'Typdefinition',
        'Förvaras i · förvaring',
        'Borttaget',
        'Förvaras i · plats för förvaring',
      ),
    ],
    effect: 'Typdefinitionen föreslås återställas med din ändring.',
    hidden: true,
  },
  {
    id: 'multiple',
    kind: 'Samband',
    name: 'Alex använder reservdatorn',
    reason: 'Både målet Reservdatorn och sambandstypen Använder tillfälligt saknas.',
    fields: [
      field('Till objekt', 'Reservdatorn', 'Borttaget', 'Reservdatorn'),
      field('Sambandstyp', 'Använder tillfälligt', 'Saknas', 'Använder tillfälligt'),
    ],
    effect: 'Förslaget kastas.',
    blocked: 'Två hinder: välj ett befintligt objekt och en tillgänglig sambandstyp.',
    repair: 'Redigera samband',
    hidden: true,
  },
];
const variants = ['A', 'B', 'C'] as const;
type Variant = (typeof variants)[number];
const names = { A: 'Fältjämförelse', B: 'Steg för steg', C: 'Välj resultat' };

function changed(f: Field) {
  return f.saved !== f.before && f.mine !== f.before && f.mine !== f.saved;
}
function Fields({ item, mode }: { item: Case; mode: 'saved' | 'mine' | 'result' | 'before' }) {
  return (
    <dl className="cp-fields">
      {item.fields.map((f) => (
        <div
          key={f.name}
          className={changed(f) ? 'cp-overlap' : f[mode] !== f.before ? 'cp-change' : ''}
        >
          <dt>
            {f.name}
            {changed(f) && <span className="cp-tag">Båda ändrar</span>}
            {!changed(f) && f[mode] !== f.before && (
              <span className="cp-tag">Ändrat sedan underlaget</span>
            )}
          </dt>
          <dd>{f[mode]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConflictsPrototype() {
  const [variant, setVariant] = useState<Variant>(() => {
    const v = new URLSearchParams(location.search).get('variant');
    return variants.includes(v as Variant) ? (v as Variant) : 'A';
  });
  const [index, setIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<'mine' | 'saved' | null>(null);
  const [open, setOpen] = useState(true);
  const [stale, setStale] = useState(false);
  const [revision, setRevision] = useState(1);
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState('');
  const [discard, setDiscard] = useState(false);
  const [closeAfterDiscard, setCloseAfterDiscard] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const base = cases[index];
  const item =
    revision > 1 && base.id === 'object'
      ? {
          ...base,
          fields: base.fields.map((f, i) => (i === 0 ? { ...f, saved: 'Hushållets elbil' } : f)),
        }
      : base;
  const remaining = cases.filter((c) => !resolutions[c.id]).length;
  const switchVariant = useCallback((next: Variant) => {
    setVariant(next);
    const url = new URL(location.href);
    url.searchParams.set('variant', next);
    history.replaceState(null, '', url);
  }, []);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) {
      dialog.current.close();
      opener.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.target instanceof HTMLElement) ||
        e.target.closest('input, textarea, select, [contenteditable]') ||
        !['ArrowLeft', 'ArrowRight'].includes(e.key)
      )
        return;
      e.preventDefault();
      switchVariant(variants[(variants.indexOf(variant) + (e.key === 'ArrowRight' ? 1 : 2)) % 3]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant, switchVariant]);
  function selectCase(n: number) {
    setIndex(n);
    setChoice(null);
    setStale(false);
    setEditing(false);
    setStatus('');
    requestAnimationFrame(() => heading.current?.focus());
  }
  function close() {
    if (editing && edit) {
      setCloseAfterDiscard(true);
      setDiscard(true);
    } else {
      setEditing(false);
      setOpen(false);
    }
  }
  function apply() {
    if (!choice || stale) return;
    const answer =
      choice === 'mine'
        ? item.effect
        : 'Hela förslaget för denna post kastas. Övriga förslag i utkastet finns kvar.';
    setResolutions((prev) => ({ ...prev, [item.id]: answer }));
    setStatus('Valet finns i ditt utkast. Den gemensamma kartan är inte sparad.');
    setChoice(null);
  }
  function choices() {
    return (
      <fieldset className="cp-choices">
        <legend>Välj vad som ska finnas i ditt utkast</legend>
        <label>
          <input
            type="radio"
            name="choice"
            checked={choice === 'mine'}
            disabled={!!item.blocked || !!resolutions[item.id] || stale}
            onChange={() => setChoice('mine')}
          />{' '}
          Behåll mitt förslag
        </label>
        <label>
          <input
            type="radio"
            name="choice"
            checked={choice === 'saved'}
            disabled={!!resolutions[item.id] || stale}
            onChange={() => setChoice('saved')}
          />{' '}
          Använd sparat värde
        </label>
        <p>
          Med sparat värde kastas <strong>hela ditt förslag för denna post</strong>, även dina egna
          ändringar i andra fält.
        </p>
      </fieldset>
    );
  }
  function preview() {
    return (
      <section className="cp-preview" aria-label="Resultat av valet">
        <h3>Efter ditt val</h3>
        {choice === 'mine' ? (
          <>
            <p>{item.effect}</p>
            <Fields item={item} mode="result" />
          </>
        ) : choice === 'saved' ? (
          <>
            <p>Hela ditt förslag för denna post kastas.</p>
            <Fields item={item} mode="saved" />
          </>
        ) : (
          <p>Välj ett alternativ för att se resultatet. Övriga förslag i utkastet finns kvar.</p>
        )}
      </section>
    );
  }
  return (
    <div className="cp-shell">
      <div className="cp-map" aria-hidden="true">
        <span>Alex</span>
        <span>Familjens bil</span>
        <span>Musiktjänsten</span>
        <span>Hemmet</span>
      </div>
      <header className="cp-host-header">
        <strong>Skyttel</strong>
        <span>Hushållets karta · exempeldata</span>
      </header>
      <aside className="cp-host-tools">
        <WorkspaceIcon name="search" />
        <WorkspaceIcon name="list" />
        <WorkspaceIcon name="draft" />
      </aside>
      <div className="cp-entry">
        <p>Filter: Fordon</p>
        <button ref={opener} type="button" onClick={() => setOpen(true)}>
          ⚠ {remaining} konflikter i ditt utkast
        </button>
        <p>Visar alla konflikter, även för typer och objekt som filtret döljer.</p>
        <p role="status">{status}</p>
      </div>
      <dialog
        ref={dialog}
        className={`cp-dialog cp-variant-${variant}`}
        aria-labelledby="cp-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="cp-top">
          <div>
            <small>Ditt utkast · {remaining} olösta</small>
            <h1 id="cp-title">Granska konflikter</h1>
          </div>
          <button type="button" onClick={close} aria-label="Stäng konfliktdialogen">
            ✕
          </button>
        </div>
        <div className="cp-body">
          <nav className="cp-case-list" aria-label="Alla konflikter">
            {cases.map((c, n) => (
              <button
                key={c.id}
                type="button"
                disabled={editing}
                aria-current={index === n ? 'true' : undefined}
                onClick={() => selectCase(n)}
              >
                <small>
                  {resolutions[c.id] ? '✓ Vald lösning' : c.kind}
                  {c.hidden ? ' · Utanför kartans filter' : ''}
                </small>
                <span>{c.name}</span>
              </button>
            ))}
          </nav>
          <article className="cp-detail">
            {editing ? (
              <section>
                <h2>Rätta förslaget</h2>
                <p>
                  Skiss av övergången till den gemensamma{' '}
                  {item.kind === 'Samband' ? 'sambandsdialogen' : 'objektdialogen'}.
                </p>
                <label>
                  Ny uppgift
                  <input autoFocus value={edit} onChange={(e) => setEdit(e.target.value)} />
                </label>
                <p>
                  Formulärets fullständiga fält ingår inte i denna prototyp. Tillbaka återgår till
                  samma konflikt.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCloseAfterDiscard(false);
                    if (edit) setDiscard(true);
                    else setEditing(false);
                  }}
                >
                  Tillbaka till konflikten
                </button>
              </section>
            ) : (
              <>
                <small>
                  {item.kind} · {index + 1} av {cases.length}
                </small>
                <h2 ref={heading} tabIndex={-1}>
                  {item.name}
                </h2>
                <p>{item.reason}</p>
                {stale && (
                  <div className="cp-warning" role="alert">
                    <strong>Underlaget har ändrats.</strong>
                    <p>Ditt val har nollställts. Läs den nya jämförelsen innan du väljer igen.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRevision((r) => r + 1);
                        setStale(false);
                      }}
                    >
                      Visa aktuell jämförelse
                    </button>
                  </div>
                )}
                {item.blocked && (
                  <div className="cp-warning">
                    <strong>Behöver rättas</strong>
                    <p>{item.blocked}</p>
                    {item.repair && (
                      <button
                        type="button"
                        onClick={() => {
                          setEdit('');
                          setEditing(true);
                        }}
                      >
                        {item.repair}
                      </button>
                    )}
                  </div>
                )}
                {resolutions[item.id] ? (
                  <section className="cp-preview">
                    <h3>✓ Valet finns i ditt utkast</h3>
                    <p>{resolutions[item.id]}</p>
                    <p>Gemensamt sparande sker separat från utkastet.</p>
                    <button type="button" onClick={() => selectCase((index + 1) % cases.length)}>
                      Nästa konflikt
                    </button>
                  </section>
                ) : (
                  <>
                    {variant === 'A' && (
                      <>
                        <div className="cp-comparison">
                          <section>
                            <h3>Sparat i kartan nu</h3>
                            <Fields item={item} mode="saved" />
                          </section>
                          <section>
                            <h3>Ditt förslag</h3>
                            <Fields item={item} mode="mine" />
                          </section>
                        </div>
                        {choices()}
                        {preview()}
                      </>
                    )}
                    {variant === 'B' && (
                      <>
                        <section className="cp-story">
                          <h3>1. Det här skiljer sig</h3>
                          {item.fields.map((f) => (
                            <div key={f.name}>
                              <h4>
                                {f.name}
                                {changed(f) ? ' · Båda ändrar' : ''}
                              </h4>
                              <p>
                                <strong>Sparat:</strong> {f.saved}
                              </p>
                              <p>
                                <strong>Ditt förslag:</strong> {f.mine}
                              </p>
                            </div>
                          ))}
                        </section>
                        <h3>2. Välj hur du vill fortsätta</h3>
                        {choices()}
                        <h3>3. Kontrollera resultatet</h3>
                        {preview()}
                      </>
                    )}
                    {variant === 'C' && (
                      <>
                        <div className="cp-outcomes">
                          <section>
                            <h3>Behåll mitt förslag</h3>
                            <p>{item.blocked ?? item.effect}</p>
                            <Fields item={item} mode="result" />
                            <button
                              type="button"
                              disabled={!!item.blocked || stale}
                              aria-pressed={choice === 'mine'}
                              onClick={() => setChoice('mine')}
                            >
                              Välj mitt förslag
                            </button>
                          </section>
                          <section>
                            <h3>Använd sparat värde</h3>
                            <p>
                              Hela ditt förslag för denna post kastas, även dina ändringar i andra
                              fält.
                            </p>
                            <Fields item={item} mode="saved" />
                            <button
                              type="button"
                              disabled={stale}
                              aria-pressed={choice === 'saved'}
                              onClick={() => setChoice('saved')}
                            >
                              Välj sparat värde
                            </button>
                          </section>
                        </div>
                        <details>
                          <summary>Jämför med ditt ursprungliga förslag</summary>
                          <Fields item={item} mode="mine" />
                        </details>
                        {preview()}
                      </>
                    )}
                    <details>
                      <summary>Visa tidigare underlag</summary>
                      <p>Uppgifterna som ditt förslag utgår från.</p>
                      <Fields item={item} mode="before" />
                    </details>
                    <footer className="cp-actions">
                      <p>Valet ändrar ditt utkast. Kartan sparas separat.</p>
                      <button
                        className="cp-primary"
                        type="button"
                        disabled={!choice || stale}
                        onClick={apply}
                      >
                        Lägg valet i utkastet
                      </button>
                    </footer>
                  </>
                )}
              </>
            )}
            {discard && (
              <section className="cp-warning" role="alert">
                <h3>Kasta oskickade ändringar?</h3>
                <button type="button" onClick={() => setDiscard(false)}>
                  Fortsätt redigera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEdit('');
                    setDiscard(false);
                    setEditing(false);
                    if (closeAfterDiscard) setOpen(false);
                  }}
                >
                  Kasta ändringarna och fortsätt
                </button>
              </section>
            )}
            <p className="cp-status" role="status">
              {status}
            </p>
          </article>
        </div>
        <section className="cp-lab" aria-label="Prototypkontroller">
          <strong>Kastbar prototyp</strong>
          <span>Exempeldata · inga ändringar sparas</span>
          <button
            type="button"
            disabled={editing}
            onClick={() => {
              selectCase(0);
              setChoice(null);
              setStale(true);
            }}
          >
            Simulera ny sparad ändring
          </button>
          <button
            type="button"
            disabled={editing}
            onClick={() => {
              setResolutions({});
              setRevision(1);
              selectCase(0);
            }}
          >
            Börja om
          </button>
          <details>
            <summary>Visa prototypens tillstånd</summary>
            <pre>
              {JSON.stringify(
                {
                  variant,
                  konflikt: item.id,
                  jämförelse: item.fields,
                  val: choice,
                  underlag: revision,
                  inaktuellt: stale,
                  lösningar: resolutions,
                  oskickadText: edit,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
        <nav className="cp-switcher" aria-label="Prototypvariant">
          <button
            type="button"
            aria-label="Föregående variant"
            onClick={() => switchVariant(variants[(variants.indexOf(variant) + 2) % 3])}
          >
            ←
          </button>
          <strong>
            {variant} · {names[variant]}
          </strong>
          <button
            type="button"
            aria-label="Nästa variant"
            onClick={() => switchVariant(variants[(variants.indexOf(variant) + 1) % 3])}
          >
            →
          </button>
        </nav>
      </dialog>
      {!open && (
        <p className="cp-outside-note">
          Kastbar prototyp · {variant} · {names[variant]}. Öppna konflikterna för att fortsätta.
        </p>
      )}
    </div>
  );
}
