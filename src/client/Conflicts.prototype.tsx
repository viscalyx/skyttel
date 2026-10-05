// Throwaway: field-by-field conflict choices on /?prototype=conflicts&variant=A.
// Static household fixtures and in-memory draft choices; no server mutations.
import { useEffect, useRef, useState } from 'react';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './conflicts.prototype.css';

type Field = { name: string; before: string; saved: string; mine: string; result: string };
type Case = {
  id: string;
  kind: string;
  name: string;
  reason: string;
  savedBy?: string;
  acceptDeletion?: boolean;
  removeDraftRelationship?: boolean;
  removeDraftObject?: boolean;
  afterRemoval?: string;
  outsideCorrection?: string;
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
const savedChangesReason =
  'Ditt förslag skiljer sig från det som är sparat i kartan nu. {Förnamn} sparade ändringar efter att du gjorde ditt förslag, men innan du hann spara det.';
const cases: Case[] = [
  {
    id: 'object',
    kind: 'Objekt',
    name: 'Familjens bil',
    reason: savedChangesReason,
    savedBy: 'Lo',
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
    reason: savedChangesReason,
    savedBy: 'Lo',
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
    acceptDeletion: true,
    kind: 'Objekt',
    name: 'Gamla cykeln',
    reason: 'Objektet togs bort från den gemensamma kartan medan du redigerade det.',
    fields: [field('Objekt', 'Gamla cykeln', 'Borttaget', 'Pendlarcykeln', 'Borttaget')],
    effect: 'Förslaget kastas. Objektet förblir borttaget.',
    blocked: 'Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.',
  },
  {
    id: 'remove',
    kind: 'Objekt',
    name: 'Garaget',
    reason:
      'Du föreslår borttagning. {Förnamn} sparade ändringar i objektet innan du hann spara ditt förslag.',
    savedBy: 'Lo',
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
    reason: 'Du föreslår borttagning. Ytterligare ett sparat samband berör nu objektet.',
    fields: [
      field('Objekt', 'Gamla lägenheten', 'Gamla lägenheten', 'Föreslagen borttagning'),
      field(
        'Samband',
        'Inga',
        'Hemförsäkringen försäkrar lägenheten',
        'Föreslagen borttagning av sambandet',
        'Föreslagen borttagning av sambandet',
      ),
    ],
    effect: 'Både lägenheten och det tillkommande sambandet föreslås tas bort.',
  },
  {
    id: 'endpoint',
    removeDraftRelationship: true,
    afterRemoval: 'Om du vill lägga till ett nytt samband gör du det den vanliga vägen.',
    kind: 'Samband',
    name: 'Lo använder surfplattan',
    reason: 'Ett objekt som sambandet pekar på saknas.',
    fields: [field('Till objekt', 'Surfplattan', 'Borttaget', 'Surfplattan')],
    effect: 'Förslaget till samband kastas.',
    blocked: 'Sambandet kan inte läggas till eftersom ett objekt som det pekar på saknas.',
    hidden: true,
  },
  {
    id: 'duplicate',
    removeDraftRelationship: true,
    afterRemoval: 'Det redan sparade sambandet och dess uppgifter behålls.',
    kind: 'Samband',
    name: 'Alex använder musiktjänsten',
    reason: 'Ett sparat samband har redan samma typ, riktning och objekt.',
    fields: [field('Startdatum', 'Inget sparat samband', '2026-02-01', '2026-03-01')],
    effect: 'Ditt nya samband kastas. Det befintliga sambandet behåller sina uppgifter.',
    blocked: 'Sambandet finns redan. Ta bort det föreslagna sambandet ur ditt utkast.',
  },
  {
    id: 'object-type',
    kind: 'Objekttyp',
    name: 'Fordon',
    reason: savedChangesReason,
    savedBy: 'Lo',
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
    reason: savedChangesReason,
    savedBy: 'Lo',
    fields: [field('Beskrivning', 'Användning', 'Regelbunden användning', 'Tillgång till objekt')],
    effect: 'Din beskrivning används.',
    hidden: true,
  },
  {
    id: 'schema',
    outsideCorrection:
      'Stäng konfliktfönstret och rätta uppgiften i den vanliga objektdialogen. Lägg ändringen i ditt utkast och kom sedan tillbaka hit. Ditt förslag ligger kvar under tiden.',
    kind: 'Objekt',
    name: 'Solcellsanläggningen',
    reason:
      'Ett eget fält har ändrats från text till tal. Det föreslagna värdet passar inte den ändrade typen.',
    fields: [field('Installationsår', '2020', '2020', 'Våren 2021')],
    effect: 'Förslaget behöver rättas så att Installationsår är ett tal.',
    blocked: 'Det föreslagna värdet måste vara ett tal.',
  },
  {
    id: 'missing-type',
    removeDraftObject: true,
    afterRemoval: 'Övriga objekt och samband i kartan påverkas inte.',
    kind: 'Objekt',
    name: 'Vindsförrådet',
    reason: 'Den föreslagna objekttypen saknas i det aktuella underlaget.',
    fields: [field('Objekttyp', 'Förråd', 'Saknas', 'Förråd')],
    effect: 'Förslaget kastas.',
    blocked: 'Objektet kan inte läggas till eftersom objekttypen saknas.',
    hidden: true,
  },
  {
    id: 'deleted-relationship',
    acceptDeletion: true,
    kind: 'Samband',
    name: 'Lo använder gamla bilen',
    reason: 'Sambandet togs bort från den gemensamma kartan medan du redigerade det.',
    fields: [field('Samband', 'Lo använder gamla bilen', 'Borttaget', 'Startdatum 2026-03-01')],
    effect: 'Förslaget kastas. Sambandet förblir borttaget.',
    blocked: 'Ett ändringsförslag kan inte återställa ett borttaget samband.',
  },
  {
    id: 'deleted-definition',
    kind: 'Sambandstyp',
    name: 'Förvaras i',
    reason: 'Typdefinitionen saknas nu i kartan. Ditt förslag innehåller ändringar i den.',
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
    id: 'missing-relationship-type',
    outsideCorrection:
      'Stäng konfliktfönstret och lägg till sambandstypen under Inställningar → Typer och egna fält. Justera sedan sambandet i den vanliga sambandsdialogen så att det använder rätt typ och lägg ändringen i ditt utkast. När du kommer tillbaka kontrolleras konflikten på nytt.',
    kind: 'Samband',
    name: 'Alex använder reservdatorn',
    reason: 'Den föreslagna sambandstypen saknas i det aktuella underlaget.',
    fields: [
      field('Till objekt', 'Reservdatorn', 'Reservdatorn', 'Reservdatorn'),
      field('Sambandstyp', 'Använder tillfälligt', 'Saknas', 'Använder tillfälligt'),
    ],
    effect: 'Konflikten kontrolleras på nytt när sambandet använder en giltig typ.',
    blocked: 'Sambandet kan inte läggas till eftersom sambandstypen saknas.',
    hidden: true,
  },
];
type Side = 'saved' | 'mine';
const sideNames = { saved: 'Sparat i kartan nu', mine: 'Ditt förslag' };

export function ConflictsPrototype() {
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, Record<string, Side>>>({});
  const [resolutions, setResolutions] = useState<Record<string, Record<string, string>>>({});
  const [open, setOpen] = useState(true);
  const [stale, setStale] = useState(false);
  const [revision, setRevision] = useState(1);
  const [status, setStatus] = useState('');
  const [responseMode, setResponseMode] = useState('success');
  const [requestState, setRequestState] = useState<
    'idle' | 'pending' | 'rejected' | 'unknown' | 'checking'
  >('idle');
  const requestLock = useRef(false);
  const attempt = useRef<{
    id: string;
    values: Record<string, string>;
    message: string;
    applied: boolean;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState('');
  const [discard, setDiscard] = useState(false);
  const [closeAfterDiscard, setCloseAfterDiscard] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const base = cases[index];
  const locked =
    requestState === 'pending' || requestState === 'unknown' || requestState === 'checking';
  const item =
    revision > 1 && base.id === 'object'
      ? {
          ...base,
          fields: base.fields.map((f, i) => (i === 0 ? { ...f, saved: 'Hushållets elbil' } : f)),
        }
      : base;
  const removeDraftEntry = item.removeDraftRelationship || item.removeDraftObject;
  const draftThing = item.removeDraftObject ? 'Objektet' : 'Sambandet';
  const fixedOutcome = item.acceptDeletion || removeDraftEntry;
  const selected: Record<string, Side> = fixedOutcome
    ? Object.fromEntries(item.fields.map((f) => [f.name, 'saved' as const]))
    : (selections[item.id] ?? {});
  const deletedThing = item.kind === 'Samband' ? 'Sambandet' : 'Objektet';
  const differing = item.fields.filter((f) => f.saved !== f.mine);
  const unselected = differing.filter((f) => !selected[f.name]).length;
  const remaining = cases.filter((c) => !resolutions[c.id]).length;
  const value = (f: Field) =>
    f.saved === f.mine ? f.saved : selected[f.name] ? f[selected[f.name]] : 'Välj ett värde';
  // Demonstrate validation of a mixed result, rather than silently grouping choices.
  const invalid =
    item.id === 'connections' && selected.Objekt === 'mine' && selected.Samband === 'saved'
      ? 'Objektet kan inte tas bort medan sambandet till det finns kvar. Välj att ta bort sambandet eller behåll objektet.'
      : '';
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) {
      dialog.current.close();
      opener.current?.focus();
    }
  }, [open]);
  function selectCase(n: number) {
    if (requestLock.current) return;
    setIndex(n);
    setStale(false);
    setEditing(false);
    setStatus('');
    setRequestState('idle');
    requestAnimationFrame(() => heading.current?.focus());
  }
  function close() {
    if (requestState === 'pending' || requestState === 'checking') return;
    if (editing && edit) {
      setCloseAfterDiscard(true);
      setDiscard(true);
    } else {
      setEditing(false);
      setOpen(false);
    }
  }
  function selectField(f: Field, side: Side) {
    if (requestLock.current) return;
    setSelections((previous) => ({
      ...previous,
      [item.id]: { ...previous[item.id], [f.name]: side },
    }));
  }
  function completeAttempt() {
    const current = attempt.current;
    if (!current) return;
    setResolutions((previous) => ({ ...previous, [current.id]: current.values }));
    setStatus(current.message);
    requestLock.current = false;
    setRequestState('idle');
  }
  async function apply() {
    if (unselected || stale || invalid || item.outsideCorrection || requestLock.current) return;
    requestLock.current = true;
    setRequestState('pending');
    setStatus('Lägger valet i ditt utkast…');
    attempt.current = {
      id: item.id,
      values: removeDraftEntry
        ? { [draftThing]: 'Borttaget ur ditt utkast' }
        : Object.fromEntries(item.fields.map((f) => [f.name, value(f)])),
      message: removeDraftEntry
        ? `${draftThing} har tagits bort ur ditt utkast. ${item.afterRemoval} Övriga förslag i utkastet finns kvar.`
        : item.acceptDeletion
          ? `Ditt ändringsförslag har kastats. ${deletedThing} förblir borttaget. Övriga förslag i utkastet finns kvar.`
          : 'Valen finns i ditt utkast. Den gemensamma kartan är inte sparad.',
      applied: responseMode === 'success' || responseMode === 'unknown-applied',
    };
    // Simulated request only; the production flow checks the actual draft.
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (responseMode === 'rejected') {
      setRequestState('rejected');
      requestLock.current = false;
      setStatus('Valet kunde inte läggas i utkastet. Dina val finns kvar. Försök igen.');
    } else if (responseMode.startsWith('unknown')) {
      setRequestState('unknown');
      setStatus(
        'Det är oklart om valet lades i utkastet. Kontrollera utfallet innan du försöker igen.',
      );
    } else completeAttempt();
  }
  async function checkAttempt() {
    if (requestState !== 'unknown') return;
    setRequestState('checking');
    setStatus('Kontrollerar utkastet…');
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (attempt.current?.applied) completeAttempt();
    else {
      requestLock.current = false;
      setRequestState('rejected');
      setStatus(
        'Kontrollen visar att valet inte lades i utkastet. Dina val finns kvar. Du kan försöka igen.',
      );
    }
  }
  function resultFields(values?: Record<string, string>) {
    if (removeDraftEntry)
      return (
        <>
          {!values && !item.removeDraftObject && (
            <p>
              <strong>✓ Förvalt</strong>
            </p>
          )}
          <dl className="cp-fields">
            <div>
              <dt>{draftThing} i ditt utkast</dt>
              <dd>{values ? 'Borttaget ur ditt utkast' : 'Tas bort ur ditt utkast'}</dd>
            </div>
          </dl>
          <p>{item.afterRemoval}</p>
        </>
      );
    return (
      <dl className="cp-fields">
        {item.fields.map((f) => (
          <div key={f.name}>
            <dt>{f.name}</dt>
            <dd>{values?.[f.name] ?? value(f)}</dd>
          </div>
        ))}
      </dl>
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
        className="cp-dialog cp-variant-A"
        aria-labelledby="cp-title"
        aria-describedby="cp-subtitle"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="cp-top">
          <div>
            <small>Ditt utkast · {remaining} olösta</small>
            <div className="cp-title-line">
              <h1 id="cp-title">Granska konflikter</h1>
              <p id="cp-subtitle">Valen ändrar ditt utkast. Kartan sparas separat.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={requestState === 'pending' || requestState === 'checking'}
            onClick={close}
            aria-label="Stäng konfliktdialogen"
          >
            ✕
          </button>
        </div>
        <div className="cp-body">
          <nav className="cp-case-list" aria-label="Alla konflikter">
            {cases.map((c, n) => (
              <button
                key={c.id}
                type="button"
                disabled={editing || locked}
                aria-current={index === n ? 'true' : undefined}
                onClick={() => selectCase(n)}
              >
                <span className="cp-case-text">
                  <small>
                    {c.kind}
                    {c.hidden ? ' · Utanför kartans filter' : ''}
                  </small>
                  <span>{c.name}</span>
                </span>
                {resolutions[c.id] && (
                  <>
                    <span className="cp-resolved-mark" aria-hidden="true">
                      ✓
                    </span>
                    <span className="cp-visually-hidden">Vald lösning</span>
                  </>
                )}
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
                <p>Formulärets fullständiga fält ingår inte i denna prototyp.</p>
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
                <p>{item.reason.replaceAll('{Förnamn}', item.savedBy ?? 'En användare')}</p>
                {stale && (
                  <div className="cp-warning" role="alert">
                    <strong>Underlaget har ändrats.</strong>
                    <p>
                      Det sparade värdet har ändrats. Valet för den berörda egenskapen behöver göras
                      om. Dina andra val finns kvar.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStale(false);
                      }}
                    >
                      Visa aktuell jämförelse
                    </button>
                  </div>
                )}
                {item.blocked && !resolutions[item.id] && (
                  <div className="cp-warning">
                    {!fixedOutcome && <strong>Behöver rättas</strong>}
                    <p>
                      {fixedOutcome && (
                        <>
                          <span aria-hidden="true">⚠</span>{' '}
                        </>
                      )}
                      {item.blocked}
                    </p>
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
                    <h3>
                      {removeDraftEntry
                        ? `✓ ${draftThing} har tagits bort ur ditt utkast`
                        : item.acceptDeletion
                          ? '✓ Ditt ändringsförslag har kastats'
                          : '✓ Valen finns i ditt utkast'}
                    </h3>
                    {resultFields(resolutions[item.id])}
                    {item.acceptDeletion && (
                      <p>{deletedThing} förblir borttaget. Övriga förslag i utkastet finns kvar.</p>
                    )}
                    <button type="button" onClick={() => selectCase((index + 1) % cases.length)}>
                      Nästa konflikt
                    </button>
                  </section>
                ) : (
                  <>
                    <p>
                      {item.outsideCorrection ??
                        (item.removeDraftObject
                          ? 'Stäng konfliktfönstret och lägg till objekttypen under Inställningar → Typer och egna fält. Ditt förslag ligger kvar. Alternativt kan du ta bort objektet ur ditt utkast nedan.'
                          : item.removeDraftRelationship
                            ? 'Det är förvalt att ta bort sambandet ur ditt utkast. Bekräfta nedan.'
                            : item.acceptDeletion
                              ? `${deletedThing} förblir borttaget. Det är förvalt. När du accepterar kastas ditt ändringsförslag för denna post.`
                              : item.blocked
                                ? 'Ditt förslag kan inte användas i sin nuvarande form. Du kan välja det sparade värdet eller rätta förslaget där det går.'
                                : 'Klicka på det värde du vill använda för varje egenskap. Du kan blanda vänster och höger sida.')}
                    </p>
                    <div className="cp-comparison">
                      {(['saved', 'mine'] as const).map((side) => (
                        <section key={side} aria-label={sideNames[side]}>
                          <h3>{sideNames[side]}</h3>
                          <div className="cp-pick-fields">
                            {item.fields.map((f) => {
                              const overlap =
                                f.saved !== f.before && f.mine !== f.before && f.mine !== f.saved;
                              const same = f.saved === f.mine;
                              const picked = selected[f.name] === side;
                              if (removeDraftEntry || item.outsideCorrection)
                                return (
                                  <div
                                    key={f.name}
                                    className={`cp-field-choice${overlap ? ' cp-overlap' : f[side] !== f.before ? ' cp-change' : ''}`}
                                  >
                                    <span className="cp-field-name">{f.name}</span>
                                    <span className="cp-field-value">{f[side]}</span>
                                  </div>
                                );
                              return (
                                <button
                                  key={f.name}
                                  className={`cp-field-choice${overlap ? ' cp-overlap' : f[side] !== f.before ? ' cp-change' : ''}`}
                                  type="button"
                                  aria-label={`${f.name}: ${sideNames[side]} – ${f[side]}`}
                                  aria-pressed={same ? undefined : picked}
                                  disabled={
                                    same || stale || locked || (side === 'mine' && !!item.blocked)
                                  }
                                  onClick={() => selectField(f, side)}
                                >
                                  <span className="cp-field-name">
                                    {f.name}
                                    {picked && (
                                      <span className="cp-picked">
                                        {item.acceptDeletion ? '✓ Förvalt' : '✓ Vald'}
                                      </span>
                                    )}
                                  </span>
                                  {side === 'saved' && f.saved !== f.before && item.savedBy && (
                                    <span className="cp-tag">
                                      {item.savedBy} sparade ett nytt värde
                                      {overlap
                                        ? ' efter att du började ändra den här uppgiften.'
                                        : '.'}
                                    </span>
                                  )}
                                  {side === 'mine' && f.mine !== f.before && (
                                    <span className="cp-tag">Ditt föreslagna värde</span>
                                  )}
                                  <span className="cp-field-value">{f[side]}</span>
                                  {same && <span className="cp-tag">Samma värde</span>}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                    {item.outsideCorrection ? (
                      <footer className="cp-actions">
                        <button type="button" onClick={close}>
                          Stäng konfliktfönstret
                        </button>
                      </footer>
                    ) : (
                      <>
                        <p role="status">
                          {fixedOutcome
                            ? 'Du behöver inte välja några egenskaper.'
                            : unselected
                              ? `${unselected} av ${differing.length} egenskaper återstår att välja.`
                              : 'Alla egenskaper har ett valt värde.'}
                        </p>
                        {invalid && (
                          <div className="cp-warning" role="alert">
                            <strong>Valen fungerar inte tillsammans</strong>
                            <p>{invalid}</p>
                          </div>
                        )}
                        <section className="cp-preview" aria-label="Resultat av valen">
                          <h3>{fixedOutcome ? 'Efter bekräftelsen' : 'Efter dina val'}</h3>
                          {resultFields()}
                          {item.acceptDeletion && (
                            <p>Ditt ändringsförslag för denna post kastas.</p>
                          )}
                          <p>Övriga förslag i utkastet finns kvar.</p>
                        </section>
                        <footer className="cp-actions">
                          <button
                            className="cp-primary"
                            type="button"
                            disabled={!!unselected || stale || !!invalid || locked}
                            onClick={apply}
                          >
                            {removeDraftEntry
                              ? `Ta bort ${draftThing.toLowerCase()} ur ditt utkast`
                              : item.acceptDeletion
                                ? 'Acceptera borttagningen och kasta ditt förslag'
                                : 'Lägg valen i utkastet'}
                          </button>
                        </footer>
                      </>
                    )}
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
            {requestState === 'unknown' && (
              <button type="button" onClick={checkAttempt}>
                Kontrollera om valet lades i utkastet
              </button>
            )}
            <p className="cp-status" role="status">
              {status}
            </p>
          </article>
        </div>
        <section className="cp-lab" aria-label="Prototypkontroller">
          <strong>Kastbar prototyp · A, val per egenskap</strong>
          <label>
            Simulerat svar{' '}
            <select
              value={responseMode}
              disabled={locked}
              onChange={(e) => setResponseMode(e.target.value)}
            >
              <option value="success">Genomfört</option>
              <option value="rejected">Avvisat</option>
              <option value="unknown-applied">Oklart – genomfört</option>
              <option value="unknown-rejected">Oklart – inte genomfört</option>
            </select>
          </label>
          <button
            type="button"
            disabled={editing || locked}
            onClick={() => {
              selectCase(0);
              setRevision((r) => r + 1);
              setSelections((p) => {
                const changed = { ...p.object };
                delete changed.Namn;
                return { ...p, object: changed };
              });
              setResolutions((p) => {
                const next = { ...p };
                delete next.object;
                return next;
              });
              setStale(true);
            }}
          >
            Simulera ny sparad ändring
          </button>
          <button
            type="button"
            disabled={editing || locked}
            onClick={() => {
              setSelections({});
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
                  konflikt: item.id,
                  val: selections,
                  inaktuellt: stale,
                  begäran: requestState,
                  lösningar: resolutions,
                  oskickadText: edit,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      </dialog>
      {!open && (
        <p className="cp-outside-note">
          Kastbar prototyp · A, val per egenskap. Öppna konflikterna för att fortsätta.
        </p>
      )}
    </div>
  );
}
