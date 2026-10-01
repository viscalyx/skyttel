/*
 * PROTOTYPE - throwaway code, not production code. No tests, no server, no persistence.
 *
 * Question (viscalyx/skyttel#180): what does the text mode look like when the user selects the
 * text button in the tool rail and writes to Skyttel?
 *
 * Plan: variants of the text view, switchable with ?variant=A|C, on a standalone prototype page
 * with invented household data and scripted replies. Variant B (a writing row at the bottom of
 * the map) was rejected and removed; the letters A and C are kept so that earlier notes still match.
 *
 * Start: npm run prototype:textlage, then open http://localhost:4177/?prototype=textlage
 */
import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import logo from '../../docs/images/shuttle-logo-transparent-small.png';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './workspace.css';
import './text-mode-prototype.css';

type Kind = 'added' | 'changed' | 'removed';
type Change = { id: string; kind: Kind; name: string; type: string; what: string };
type Row = { id: number; role: 'user' | 'skyttel'; text: string; spoken: boolean };
type Mic = 'off' | 'starting' | 'on';
type Unclear = 'no' | 'checking' | 'failed';
type DraftLayout = 'list' | 'table';

const variants = [
  ['A', 'Fritt fönster'],
  ['C', 'Fast sidofält'],
] as const;
type Variant = (typeof variants)[number][0];

const script: { say: string; reply?: string; changes?: Change[]; save?: boolean }[] = [
  {
    say: 'Lägg till elavtalet hos Vattenfall för lägenheten på Storgatan.',
    reply:
      'Jag har lagt till Elavtal Vattenfall och kopplat det till Lägenheten Storgatan 4. Ändringarna ligger i ditt utkast.',
    changes: [
      {
        id: 'el',
        kind: 'added',
        name: 'Elavtal Vattenfall',
        type: 'Avtal',
        what: 'Nytt objekt',
      },
      {
        id: 'el-home',
        kind: 'added',
        name: 'Elavtal Vattenfall gäller Lägenheten Storgatan 4',
        type: 'Samband',
        what: 'Nytt samband',
      },
    ],
  },
  {
    say: 'Spotify kostar 219 kronor i månaden nu.',
    reply: 'Jag har ändrat priset för Spotify Familj till 219 kr per månad.',
    changes: [
      {
        id: 'spotify',
        kind: 'changed',
        name: 'Spotify Familj',
        type: 'Abonnemang',
        what: 'Pris: 199 kr → 219 kr per månad',
      },
    ],
  },
  {
    say: 'Vi har sagt upp garaget på Parkvägen. Ta bort det.',
    reply:
      'Jag föreslår att Garage Parkvägen tas bort. Sambandet till Volvo V60 tas bort samtidigt.',
    changes: [
      { id: 'garage', kind: 'removed', name: 'Garage Parkvägen', type: 'Garage', what: 'Tas bort' },
      {
        id: 'garage-car',
        kind: 'removed',
        name: 'Volvo V60 förvaras i Garage Parkvägen',
        type: 'Samband',
        what: 'Tas bort',
      },
    ],
  },
  {
    say: 'Vem betalar hemförsäkringen?',
    reply: 'Det finns ingen uppgift om vem som betalar Hemförsäkring. Är det Alex, Lo eller båda?',
    changes: [],
  },
  {
    say: 'Det är Lo som betalar den.',
    reply: 'Jag har lagt till att Lo betalar Hemförsäkring.',
    changes: [
      {
        id: 'lo-insurance',
        kind: 'added',
        name: 'Lo betalar Hemförsäkring',
        type: 'Samband',
        what: 'Nytt samband',
      },
    ],
  },
  { say: 'Spara hela utkastet nu.', save: true },
];

const nodes = [
  { id: 'alex', name: 'Alex', type: 'Person', x: 30, y: 30 },
  { id: 'lo', name: 'Lo', type: 'Person', x: 56, y: 22 },
  { id: 'home', name: 'Lägenheten Storgatan 4', type: 'Bostad', x: 46, y: 48 },
  { id: 'car', name: 'Volvo V60', type: 'Fordon', x: 24, y: 60 },
  { id: 'spotify', name: 'Spotify Familj', type: 'Abonnemang', x: 72, y: 38 },
  { id: 'garage', name: 'Garage Parkvägen', type: 'Garage', x: 34, y: 80 },
  { id: 'insurance', name: 'Hemförsäkring', type: 'Avtal', x: 62, y: 68 },
  { id: 'el', name: 'Elavtal Vattenfall', type: 'Avtal', x: 80, y: 58, proposedOnly: true },
];
const edges = [
  { id: 'alex-home', from: 'alex', to: 'home' },
  { id: 'lo-home', from: 'lo', to: 'home' },
  { id: 'alex-car', from: 'alex', to: 'car' },
  { id: 'lo-spotify', from: 'lo', to: 'spotify' },
  { id: 'garage-car', from: 'car', to: 'garage' },
  { id: 'insurance-home', from: 'insurance', to: 'home' },
  { id: 'el-home', from: 'el', to: 'home', proposedOnly: true },
  { id: 'lo-insurance', from: 'lo', to: 'insurance', proposedOnly: true },
];
const symbols: Record<Kind, [string, string]> = {
  added: ['+', 'Läggs till'],
  changed: ['✎', 'Ändras'],
  removed: ['×', 'Tas bort'],
};

function count(draft: Change[]) {
  return draft.length === 1 ? '1 osparad ändring' : `${draft.length} osparade ändringar`;
}

function useConversation(draftOpenAtStart: boolean) {
  const [consentSaved, setConsentSaved] = useState(false);
  const [started, setStarted] = useState(false);
  const [asking, setAsking] = useState<'voice' | 'text' | null>(null);
  const [textOpen, setTextOpen] = useState(false);
  const [mic, setMic] = useState<Mic>('off');
  const [talking, setTalking] = useState(false);
  const [working, setWorking] = useState<'voice' | 'text' | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [unsent, setUnsent] = useState('');
  const [draft, setDraft] = useState<Change[]>([]);
  const [saved, setSaved] = useState<Change[]>([]);
  const [step, setStep] = useState(0);
  const [online, setOnlineState] = useState(true);
  const [unclear, setUnclear] = useState<Unclear>('no');
  const [note, setNote] = useState('');
  const [draftOpen, setDraftOpen] = useState(draftOpenAtStart);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const micTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(1);
  const live = useRef({ mic, step, draft });
  live.current = { mic, step, draft };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(micTimer.current);
    },
    [],
  );

  const addRow = (role: Row['role'], text: string, spoken: boolean) =>
    setRows((current) => [...current, { id: nextId.current++, role, text, spoken }]);
  const blocked = !online || unclear !== 'no';
  const busy = Boolean(working) || speaking;
  const consented = started || consentSaved;

  function respond(text: string) {
    const { mic, step, draft } = live.current;
    const entry = script[step];
    let reply: string;
    if (/spara/i.test(text)) {
      reply = draft.length
        ? `Sparat. ${draft.length === 1 ? '1 ändring' : `${draft.length} ändringar`} finns nu i hushållets karta.`
        : 'Utkastet är tomt. Det finns inget att spara.';
      setSaved((current) => [...current, ...draft]);
      setDraft([]);
      if (entry?.save) setStep(step + 1);
    } else if (!entry || entry.save) {
      reply =
        'Manuset i den här prototypen är slut. Välj Börja om under Prototyplägen för att spela upp det igen.';
    } else {
      reply = entry.reply ?? '';
      const changes = entry.changes ?? [];
      setDraft((current) => [
        ...current.filter((item) => !changes.some((change) => change.id === item.id)),
        ...changes,
      ]);
      setStep(step + 1);
    }
    addRow('skyttel', reply, mic === 'on');
    setWorking(null);
    if (mic === 'on') {
      setSpeaking(true);
      timer.current = setTimeout(() => setSpeaking(false), 2600);
    }
  }
  function ask(text: string, spoken: boolean) {
    clearTimeout(timer.current);
    setSpeaking(false);
    setNote('');
    addRow('user', text, spoken);
    setWorking(spoken ? 'voice' : 'text');
    timer.current = setTimeout(() => respond(text), 2400);
  }
  function toggleMic() {
    clearTimeout(micTimer.current);
    if (mic === 'off') {
      setMic('starting');
      micTimer.current = setTimeout(() => setMic('on'), 900);
    } else {
      setMic('off');
      setTalking(false);
    }
  }
  const micDisabled = blocked || (working === 'text' && mic === 'off');
  return {
    consentSaved,
    started,
    asking,
    textOpen,
    mic,
    talking,
    working,
    speaking,
    rows,
    unsent,
    draft,
    saved,
    step,
    online,
    unclear,
    note,
    draftOpen,
    blocked,
    busy,
    micDisabled,
    nextLine: script[step]?.say,
    statusWord: working
      ? 'Skyttel arbetar'
      : speaking
        ? 'Skyttel talar'
        : mic === 'starting'
          ? 'Rösten startar'
          : mic === 'on'
            ? talking
              ? 'Du talar'
              : 'Lyssnar'
            : 'Mikrofonen är av',
    voiceVisible: mic !== 'off' || busy,
    setUnsent,
    setDraftOpen,
    setUnclear,
    pressVoice() {
      if (micDisabled) return;
      if (consented) toggleMic();
      else setAsking('voice');
    },
    pressText() {
      if (consented) setTextOpen((open) => !open);
      else setAsking('text');
    },
    closeText: () => setTextOpen(false),
    approve(remember: boolean) {
      setStarted(true);
      if (remember) setConsentSaved(true);
      if (asking === 'voice') toggleMic();
      else setTextOpen(true);
      setAsking(null);
    },
    decline: () => setAsking(null),
    send() {
      const text = unsent.trim();
      if (!text || blocked) return;
      setUnsent('');
      ask(text, false);
    },
    speak() {
      const line = script[step]?.say ?? 'Finns det något mer att göra?';
      if (blocked || busy || talking) return;
      // A prototype shortcut: the control also turns the microphone on, without the consent box.
      clearTimeout(micTimer.current);
      setStarted(true);
      setMic('on');
      setTalking(true);
      timer.current = setTimeout(() => {
        setTalking(false);
        ask(line, true);
      }, 1500);
    },
    cancel() {
      clearTimeout(timer.current);
      setWorking(null);
      setSpeaking(false);
      setTalking(false);
      setNote('Avbrutet. Utkastet är oförändrat.');
    },
    newConversation() {
      clearTimeout(timer.current);
      setWorking(null);
      setSpeaking(false);
      setTalking(false);
      setNote('');
      setDraftOpen(draftOpenAtStart);
      setRows([
        {
          id: nextId.current++,
          role: 'skyttel',
          spoken: mic === 'on',
          text: draft.length
            ? `Nytt samtal. ${count(draft)} ligger kvar i ditt utkast.`
            : 'Nytt samtal. Utkastet är tomt.',
        },
      ]);
    },
    setOnline(value: boolean) {
      setOnlineState(value);
      if (!value) {
        clearTimeout(micTimer.current);
        setMic('off');
        setTalking(false);
      }
    },
    checkSave() {
      setUnclear('no');
      addRow(
        'skyttel',
        `Kontrollen är klar. Utkastet sparades inte. ${count(draft)} ligger kvar i ditt utkast.`,
        false,
      );
    },
    forgetConsent() {
      setConsentSaved(false);
      setStarted(false);
    },
    reset() {
      clearTimeout(timer.current);
      clearTimeout(micTimer.current);
      setConsentSaved(false);
      setStarted(false);
      setAsking(null);
      setTextOpen(false);
      setMic('off');
      setTalking(false);
      setWorking(null);
      setSpeaking(false);
      setRows([]);
      setUnsent('');
      setDraft([]);
      setSaved([]);
      setStep(0);
      setOnlineState(true);
      setUnclear('no');
      setNote('');
      setDraftOpen(draftOpenAtStart);
    },
  };
}
type Conversation = ReturnType<typeof useConversation>;

function ChangeSymbol({ kind }: { kind: Kind }) {
  return (
    <span className={`tp-symbol ${kind}`} role="img" aria-label={symbols[kind][1]}>
      {symbols[kind][0]}
    </span>
  );
}

function FakeMap({ c }: { c: Conversation }) {
  const proposed = (id: string) => c.draft.find((change) => change.id === id)?.kind;
  const stored = (id: string) => c.saved.find((change) => change.id === id)?.kind;
  const visible = (item: { id: string; proposedOnly?: boolean }) =>
    stored(item.id) !== 'removed' &&
    (!item.proposedOnly || Boolean(proposed(item.id)) || stored(item.id) === 'added');
  const point = (id: string) => nodes.find((node) => node.id === id) ?? nodes[0];
  return (
    <div className="tp-map" aria-label="Påhittad hushållskarta" role="img">
      <svg aria-hidden="true">
        {edges.filter(visible).map((edge) => (
          <line
            key={edge.id}
            className={proposed(edge.id)}
            x1={`${point(edge.from).x}%`}
            y1={`${point(edge.from).y}%`}
            x2={`${point(edge.to).x}%`}
            y2={`${point(edge.to).y}%`}
          />
        ))}
      </svg>
      {nodes.filter(visible).map((node) => {
        const kind = proposed(node.id);
        return (
          <div
            key={node.id}
            className={`tp-node${kind ? ` ${kind}` : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="tp-orb">
              {node.name[0]}
              {kind && <ChangeSymbol kind={kind} />}
            </span>
            <span>{node.name}</span>
            <small>{node.type}</small>
          </div>
        );
      })}
    </div>
  );
}

function Wave({ active, muted }: { active: boolean; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`tp-wave${active ? ' has-sound' : ''}${muted ? ' muted' : ''}`}
    >
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function CancelButton({ c }: { c: Conversation }) {
  return c.busy ? (
    <button type="button" className="tp-cancel" onClick={c.cancel}>
      Avbryt
    </button>
  ) : null;
}

/** The small voice box: waveform and one status word. Its full behaviour belongs to issue 182. */
function VoiceBox({
  c,
  cancel,
  floating,
}: {
  c: Conversation;
  cancel?: boolean;
  floating?: boolean;
}) {
  if (!c.voiceVisible) return null;
  return (
    <div className={`tp-voicebox${floating ? ' floating tp-surface' : ''}`}>
      <Wave active={c.talking || c.speaking} muted={c.mic !== 'on' && !c.speaking} />
      <span role="status">{c.statusWord}</span>
      {cancel && <CancelButton c={c} />}
    </div>
  );
}

function Notices({ c }: { c: Conversation }) {
  return (
    <>
      {!c.online && (
        <p className="tp-notice" role="alert">
          <span className="tp-notice-symbol" aria-hidden="true">
            !
          </span>
          Ingen kontakt med Skyttel. Du kan läsa samtalstexten. Det går inte att skicka eller tala
          förrän kontakten är tillbaka.
        </p>
      )}
      {c.unclear === 'checking' && (
        <p className="tp-notice" role="alert">
          <span className="tp-notice-symbol" aria-hidden="true">
            ?
          </span>
          Det är oklart om utkastet sparades. Skyttel kontrollerar det och berättar vad som hände.
        </p>
      )}
      {c.unclear === 'failed' && (
        <div className="tp-notice" role="alert">
          <span className="tp-notice-symbol" aria-hidden="true">
            ?
          </span>
          <span>
            Skyttel kunde inte kontrollera om utkastet sparades.
            <button type="button" onClick={c.checkSave}>
              Kontrollera om utkastet sparades
            </button>
          </span>
        </div>
      )}
      {c.note && (
        <p className="tp-note" role="status">
          {c.note}
        </p>
      )}
    </>
  );
}

function Transcript({ c, cancelInLog }: { c: Conversation; cancelInLog?: boolean }) {
  const log = useRef<HTMLOListElement>(null);
  const size = c.rows.length + (c.busy ? 1 : 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follow new rows
  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [size]);
  return (
    <ol ref={log} role="log" aria-label="Samtalstext" className="tp-log">
      {!c.rows.length && (
        <li className="tp-empty">Här visas det du och Skyttel säger och skriver.</li>
      )}
      {c.rows.map((row) => (
        <li key={row.id} className={`tp-row ${row.role}`}>
          <strong>
            {row.role === 'user' ? 'Du' : 'Skyttel'}
            {row.spoken && (
              <span className="tp-spoken" title="Sagt med röst">
                <WorkspaceIcon name="mic" />
                <span className="tp-sr">sagt med röst</span>
              </span>
            )}
          </strong>
          <p>{row.text}</p>
        </li>
      ))}
      {cancelInLog && c.busy && (
        <li className="tp-row working">
          <span>{c.working ? 'Skyttel arbetar…' : 'Skyttel talar…'}</span>
          <CancelButton c={c} />
        </li>
      )}
    </ol>
  );
}

function DraftChanges({ c, layout }: { c: Conversation; layout: DraftLayout }) {
  if (!c.draft.length) return <p className="tp-draft-empty">Utkastet är tomt.</p>;
  return layout === 'table' ? (
    <div className="tp-table-wrap">
      <table>
        <caption className="tp-sr">Osparade ändringar i utkastet</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="tp-sr">Ändring</span>
            </th>
            <th scope="col">Namn</th>
            <th scope="col">Typ</th>
            <th scope="col">Vad som ändras</th>
          </tr>
        </thead>
        <tbody>
          {c.draft.map((change) => (
            <tr key={change.id}>
              <td>
                <ChangeSymbol kind={change.kind} />
              </td>
              <td>{change.name}</td>
              <td>{change.type}</td>
              <td>{change.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <ul>
      {c.draft.map((change) => (
        <li key={change.id}>
          <ChangeSymbol kind={change.kind} />
          <span>
            {change.name}
            <small>
              {change.type} · {change.what}
            </small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The row that folds the draft pane out beside the conversation text. */
function DraftToggle({ c, side }: { c: Conversation; side: 'left' | 'right' }) {
  const outward = side === 'right' ? '▸' : '◂';
  const inward = side === 'right' ? '◂' : '▸';
  return (
    <div className="tp-draft tp-draft-toggle">
      <button
        type="button"
        aria-expanded={c.draftOpen}
        aria-controls="tp-draft-pane"
        onClick={() => c.setDraftOpen(!c.draftOpen)}
      >
        <span>Utkast</span>
        <span>
          {side === 'left' && `${c.draftOpen ? inward : outward} `}
          {count(c.draft)}
          {side === 'right' && ` ${c.draftOpen ? inward : outward}`}
        </span>
      </button>
    </div>
  );
}

function DraftPane({ c, layout }: { c: Conversation; layout: DraftLayout }) {
  return c.draftOpen ? (
    <section id="tp-draft-pane" className="tp-draft tp-draft-pane" aria-label="Utkast">
      <h3>Utkast</h3>
      <DraftChanges c={c} layout={layout} />
    </section>
  ) : null;
}

function MessageField({ c }: { c: Conversation }) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus(), []);
  return (
    <textarea
      ref={field}
      id="tp-message"
      rows={2}
      maxLength={4000}
      placeholder="Berätta vad du vill göra…"
      value={c.unsent}
      onChange={(event) => c.setUnsent(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          c.send();
        }
      }}
    />
  );
}

function SendButton({ c }: { c: Conversation }) {
  return (
    <button type="submit" className="primary" disabled={c.blocked || !c.unsent.trim()}>
      Skicka
    </button>
  );
}

function CloseButton({ c }: { c: Conversation }) {
  return (
    <button type="button" className="tp-icon" aria-label="Stäng textvyn" onClick={c.closeText}>
      <WorkspaceIcon name="close" />
    </button>
  );
}

function NewConversationButton({ c }: { c: Conversation }) {
  return (
    <button type="button" className="tp-small" onClick={c.newConversation}>
      Nytt samtal
    </button>
  );
}

/** A: a free, movable window like the other tools. The voice box stays a separate small box. */
function VariantA({ c, layout }: { c: Conversation; layout: DraftLayout }) {
  const [position, setPosition] = useState({ x: 112, y: 84 });
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const view = event.currentTarget.ownerDocument.defaultView ?? window;
    setPosition({
      x: Math.max(
        0,
        Math.min(view.innerWidth - 120, drag.current.left + event.clientX - drag.current.x),
      ),
      y: Math.max(
        0,
        Math.min(view.innerHeight - 120, drag.current.top + event.clientY - drag.current.y),
      ),
    });
  };
  return (
    <>
      <VoiceBox c={c} floating cancel={!c.textOpen} />
      {c.textOpen && (
        <section
          className={`tp-window tp-surface${c.draftOpen ? ' with-draft' : ''}`}
          aria-label="Skriv till Skyttel"
          style={{
            left: position.x,
            top: position.y,
            maxHeight: `calc(100dvh - ${position.y + 24}px)`,
          }}
        >
          <header
            className="tp-head tp-drag"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest('button')) return;
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                left: position.x,
                top: position.y,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            <h2>Skriv till Skyttel</h2>
            <NewConversationButton c={c} />
            <CloseButton c={c} />
          </header>
          <div className="tp-columns">
            <div className="tp-conversation">
              <DraftToggle c={c} side="right" />
              <Transcript c={c} cancelInLog />
              <Notices c={c} />
              <form
                className="tp-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  c.send();
                }}
              >
                <label htmlFor="tp-message">Meddelande till Skyttel</label>
                <MessageField c={c} />
                <SendButton c={c} />
              </form>
            </div>
            <DraftPane c={c} layout={layout} />
          </div>
        </section>
      )}
    </>
  );
}

/** C: a docked column that pushes the map aside. The voice box and Avbryt sit in its heading. */
function VariantC({ c, layout }: { c: Conversation; layout: DraftLayout }) {
  if (!c.textOpen) return <VoiceBox c={c} floating cancel />;
  return (
    <section
      className={`tp-side tp-columns tp-surface${c.draftOpen ? ' with-draft' : ''}`}
      aria-label="Skriv till Skyttel"
    >
      <DraftPane c={c} layout={layout} />
      <div className="tp-conversation">
        <header className="tp-head">
          <h2>Skriv till Skyttel</h2>
          <NewConversationButton c={c} />
          <CloseButton c={c} />
        </header>
        {c.voiceVisible && (
          <div className="tp-side-voice">
            <VoiceBox c={c} cancel />
          </div>
        )}
        <DraftToggle c={c} side="left" />
        <Transcript c={c} />
        <Notices c={c} />
        <form
          className="tp-composer"
          onSubmit={(event) => {
            event.preventDefault();
            c.send();
          }}
        >
          <label htmlFor="tp-message">Meddelande till Skyttel</label>
          <MessageField c={c} />
          <SendButton c={c} />
        </form>
      </div>
    </section>
  );
}

function ConsentDialog({ c, anchored }: { c: Conversation; anchored: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [remember, setRemember] = useState(false);
  useEffect(() => {
    if (c.asking && !dialog.current?.open) dialog.current?.showModal();
  }, [c.asking]);
  if (!c.asking) return null;
  return (
    <dialog
      ref={dialog}
      className={`tp-consent${anchored ? ' anchored' : ''}`}
      aria-labelledby="tp-consent-title"
      onCancel={c.decline}
    >
      <h2 id="tp-consent-title">Samtal med Skyttel</h2>
      <p>
        OpenAI behandlar det du säger och skriver, ditt utkast och de kartuppgifter som behövs.
        Skyttel föreslår ändringar och sparar dem bara när du ber om det. Samtalet sparas inte.
      </p>
      <p>Säg eller skriv inga lösenord eller fullständiga konto- och kortnummer.</p>
      <label className="tp-check">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
        />
        Fråga inte igen för det här hushållet
      </label>
      <div className="tp-consent-actions">
        <button type="button" className="primary" onClick={() => c.approve(remember)}>
          Godkänn och starta
        </button>
        <button type="button" onClick={c.decline}>
          Avbryt
        </button>
      </div>
    </dialog>
  );
}

function ToolRail({ c }: { c: Conversation }) {
  const [expanded, setExpanded] = useState(false);
  const textButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !c.textOpen) textButton.current?.focus();
    wasOpen.current = c.textOpen;
  }, [c.textOpen]);
  const idle = (icon: Parameters<typeof WorkspaceIcon>[0]['name'], label: string) => (
    <button
      type="button"
      title={`${label} (ingår inte i prototypen)`}
      aria-label={label}
      data-secondary
    >
      <WorkspaceIcon name={icon} />
      <span>{label}</span>
    </button>
  );
  return (
    <nav className={`workspace-tools${expanded ? ' expanded' : ''}`} aria-label="Kartans verktyg">
      <span className="workspace-brand">
        <img src={logo} alt="" />
        <span>skyttel.</span>
      </span>
      <button
        type="button"
        className="workspace-talk"
        title={
          c.mic === 'starting' ? 'Avbryt starten av rösten' : 'Prata med Skyttel (Ctrl+Mellanslag)'
        }
        aria-label="Prata med Skyttel"
        aria-pressed={c.mic === 'on'}
        disabled={c.micDisabled}
        onClick={c.pressVoice}
      >
        <WorkspaceIcon name={c.mic === 'on' ? 'stop' : 'mic'} />
        <span>Prata med Skyttel</span>
      </button>
      <button
        ref={textButton}
        type="button"
        title="Skriv till Skyttel"
        aria-label="Skriv till Skyttel"
        aria-expanded={c.textOpen}
        onClick={c.pressText}
      >
        <WorkspaceIcon name="text" />
        <span>Skriv till Skyttel</span>
      </button>
      {idle('search', 'Sök i kartan')}
      {idle('list', 'Lista')}
      {idle('draft', 'Utkast och historik')}
      <div className="workspace-tools-footer">
        {idle('settings', 'Inställningar')}
        {idle('profile', 'Din profil')}
        {idle('info', 'Information och hjälp')}
        <button
          type="button"
          aria-label={expanded ? 'Dölj verktygens namn' : 'Visa verktygens namn'}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <WorkspaceIcon name="expand" />
          <span>Fäll ihop</span>
        </button>
      </div>
    </nav>
  );
}

/** Renders its children inside an iframe so that the app's own narrow-screen rules apply. */
function PhoneFrame({ children }: { children: ReactNode }) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const mount = useCallback((frame: HTMLIFrameElement | null) => {
    const target = frame?.contentDocument;
    if (!target) return;
    target.documentElement.lang = 'sv';
    target.head.replaceChildren(
      ...[...document.head.querySelectorAll('style, link[rel="stylesheet"]')].map((node) =>
        node.cloneNode(true),
      ),
    );
    target.body.style.margin = '0';
    setBody(target.body);
  }, []);
  return (
    <div className="tp-stage">
      <iframe ref={mount} title="Prototypen i mobilstorlek" className="tp-phone" />
      {body && createPortal(children, body)}
    </div>
  );
}

export function TextModePrototype() {
  const [params, setParams] = useSearchParams();
  const variant: Variant = variants.find(([key]) => key === params.get('variant'))?.[0] ?? 'A';
  const mobile = params.get('mobile') === '1';
  const dark = params.get('theme') === 'dark';
  const layout: DraftLayout = params.get('draft') === 'table' ? 'table' : 'list';
  const anchored = params.get('consent') === 'anchored';
  const [draftOpenAtStart, setDraftOpenAtStart] = useState(false);
  const c = useConversation(draftOpenAtStart);
  const set = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const cycle = useCallback(
    (offset: number) => {
      const index = variants.findIndex(([key]) => key === variant);
      set('variant', variants[(index + offset + variants.length) % variants.length][0]);
    },
    [variant, set],
  );
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycle]);

  const app = (
    <div
      className={`household-map workspace-shell tp-root tp-variant-${variant.toLowerCase()}${c.textOpen ? ' tp-text-open' : ''}${c.draftOpen ? ' tp-draft-open' : ''}`}
      data-theme={dark ? 'dark' : 'light'}
    >
      <FakeMap c={c} />
      <ToolRail c={c} />
      <div className="workspace-context">
        Familjen Berg<span>Gemensam karta</span>
      </div>
      {!c.textOpen && (
        <div className="tp-floating-notices">
          <Notices c={c} />
        </div>
      )}
      {variant === 'A' && <VariantA c={c} layout={layout} />}
      {variant === 'C' && <VariantC c={c} layout={layout} />}
      <ConsentDialog c={c} anchored={anchored} />
    </div>
  );
  const label = variants.find(([key]) => key === variant)?.[1];
  return (
    <>
      {mobile ? <PhoneFrame>{app}</PhoneFrame> : app}
      <aside className={`tp-dock${mobile ? ' aside' : ''}`} aria-label="Prototypens reglage">
        <div className="tp-switcher">
          <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
            ←
          </button>
          <strong>
            {variant} ({label})
          </strong>
          <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
            →
          </button>
        </div>
        <details>
          <summary>Prototyplägen</summary>
          <dl>
            <dt>Medgivande</dt>
            <dd>{c.consentSaved ? 'sparat' : c.started ? 'givet för samtalet' : 'saknas'}</dd>
            <dt>Textvy</dt>
            <dd>{c.textOpen ? 'öppen' : 'stängd'}</dd>
            <dt>Mikrofon</dt>
            <dd>{c.mic === 'on' ? 'på' : c.mic === 'starting' ? 'startar' : 'av'}</dd>
            <dt>Skyttel</dt>
            <dd>
              {c.working
                ? `arbetar (${c.working === 'voice' ? 'talat' : 'skrivet'} uppdrag)`
                : c.speaking
                  ? 'talar'
                  : 'väntar'}
            </dd>
            <dt>Utkast</dt>
            <dd>{count(c.draft)}</dd>
            <dt>Oskickad text</dt>
            <dd>{c.unsent ? 'finns' : 'ingen'}</dd>
          </dl>
          <div className="tp-dock-actions">
            <button
              type="button"
              disabled={c.blocked || c.busy || c.talking}
              onClick={c.speak}
              title="Slår på mikrofonen om den är av"
            >
              Säg nästa replik
            </button>
            <button
              type="button"
              disabled={!c.nextLine}
              onClick={() => c.setUnsent(c.nextLine ?? '')}
            >
              Fyll i nästa replik som text
            </button>
            <button type="button" onClick={c.forgetConsent}>
              Glöm medgivandet
            </button>
            <button type="button" onClick={c.reset}>
              Börja om
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={!c.online}
              onChange={(event) => c.setOnline(!event.target.checked)}
            />
            Bruten kontakt
          </label>
          <label>
            Oklart sparande
            <select
              value={c.unclear}
              onChange={(event) => c.setUnclear(event.target.value as Unclear)}
            >
              <option value="no">Nej</option>
              <option value="checking">Skyttel kontrollerar själv</option>
              <option value="failed">Egen kontroll misslyckades</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={layout === 'table'}
              onChange={(event) => set('draft', event.target.checked ? 'table' : null)}
            />
            Utkastlistan som tabell
          </label>
          <label>
            <input
              type="checkbox"
              checked={draftOpenAtStart}
              onChange={(event) => {
                setDraftOpenAtStart(event.target.checked);
                c.setDraftOpen(event.target.checked);
              }}
            />
            Inställning: utkastlistan utfälld vid nytt samtal
          </label>
          <label>
            <input
              type="checkbox"
              checked={anchored}
              onChange={(event) => set('consent', event.target.checked ? 'anchored' : null)}
            />
            Medgivanderutan vid knappen
          </label>
          <label>
            <input
              type="checkbox"
              checked={dark}
              onChange={(event) => set('theme', event.target.checked ? 'dark' : null)}
            />
            Mörkt tema
          </label>
          <label>
            <input
              type="checkbox"
              checked={mobile}
              onChange={(event) => set('mobile', event.target.checked ? '1' : null)}
            />
            Visa som mobil (390 × 780)
          </label>
        </details>
      </aside>
    </>
  );
}
