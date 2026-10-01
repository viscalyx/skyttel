/*
 * PROTOTYPE - throwaway code, not production code. No tests, no server, no persistence.
 *
 * Question (viscalyx/skyttel#180): what does the text mode look like when the user selects the
 * text button in the tool rail and writes to Skyttel?
 *
 * Plan: one text view on a standalone prototype page with invented household data and scripted
 * replies. It is the variant that was called C (a docked side panel). Variant A (a free window)
 * and variant B (a writing row at the bottom of the map) were rejected and removed; both remain in
 * the history of the prototype branch.
 *
 * Start: npm run prototype:textlage, then open http://localhost:4177/?prototype=textlage
 */
import {
  type CSSProperties,
  type PointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
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
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [origin, setOrigin] = useState<'voice' | 'text' | null>(null);
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
  // Messages wait in a queue while Skyttel handles an earlier one.
  const queue = useRef<{ text: string; spoken: boolean }[]>([]);
  const active = useRef(false);
  const sentAt = useRef(0);
  const [waiting, setWaiting] = useState(0);
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
  // An invented measure: every row of the conversation and every draft change takes some room.
  const [memoryForced, setMemoryForced] = useState<number | null>(null);
  const memory = memoryForced ?? Math.min(100, 2 + rows.length * 4 + draft.length * 3);
  const memoryFull = memory >= 100;
  const blocked = !online || unclear !== 'no' || memoryFull;
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
      timer.current = setTimeout(() => {
        setSpeaking(false);
        next();
      }, 2600);
    } else next();
  }
  function begin(item: { text: string; spoken: boolean }) {
    active.current = true;
    setNote('');
    setOrigin(item.spoken ? 'voice' : 'text');
    setWorking(item.spoken ? 'voice' : 'text');
    timer.current = setTimeout(() => respond(item.text), 2400);
  }
  function next() {
    const item = queue.current.shift();
    setWaiting(queue.current.length);
    if (item) begin(item);
    else active.current = false;
  }
  function ask(text: string, spoken: boolean) {
    addRow('user', text, spoken);
    if (active.current) {
      queue.current.push({ text, spoken });
      setWaiting(queue.current.length);
    } else begin({ text, spoken });
  }
  /** Stops the work in progress and drops every message that waits. */
  function halt() {
    clearTimeout(timer.current);
    queue.current = [];
    active.current = false;
    setWaiting(0);
    setWorking(null);
    setSpeaking(false);
    setTalking(false);
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
  // The consent box opens beside the pressed tool, so that the pointer has a short way to go.
  const askBeside = (kind: 'voice' | 'text', button: HTMLElement) => {
    const box = button.getBoundingClientRect();
    const narrow = (button.ownerDocument.defaultView?.innerWidth ?? 1280) <= 700;
    setAnchor(narrow ? { top: box.bottom + 12, left: 12 } : { top: 24, left: box.right + 18 });
    setAsking(kind);
  };
  return {
    anchor,
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
    waiting,
    memory,
    memoryFull,
    memoryForced,
    setMemoryForced,
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
    // The voice box belongs to the voice mode: it never shows for a conversation in text only.
    voiceVisible: mic !== 'off' || speaking || (busy && origin === 'voice'),
    setUnsent,
    setDraftOpen,
    setUnclear,
    pressVoice(button: HTMLElement) {
      if (micDisabled) return;
      if (consented) toggleMic();
      else askBeside('voice', button);
    },
    pressText(button: HTMLElement) {
      if (consented) setTextOpen((open) => !open);
      else askBeside('text', button);
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
    /** On a touch layout there is one message at a time; elsewhere new messages wait in line. */
    send(oneAtATime: boolean) {
      const text = unsent.trim();
      if (!text || blocked || (oneAtATime && working)) return;
      setUnsent('');
      sentAt.current = Date.now();
      ask(text, false);
    },
    stopFromSend() {
      // A double tap on Skicka must not stop the message that the first tap sent.
      if (Date.now() - sentAt.current < 500) return;
      halt();
      setNote('Avbrutet. Utkastet är oförändrat.');
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
      halt();
      setNote('Avbrutet. Utkastet är oförändrat.');
    },
    newConversation() {
      halt();
      setMemoryForced(null);
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
      halt();
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

/**
 * The small voice box: waveform, one status word and a small stop icon. The box keeps one height
 * and is only as wide as its content. Its full behaviour belongs to issue 182.
 */
function VoiceBox({ c }: { c: Conversation }) {
  if (!c.voiceVisible) return null;
  return (
    <div className="tp-voicebox floating tp-surface">
      <Wave active={c.talking || c.speaking} muted={c.mic !== 'on' && !c.speaking} />
      <span role="status">{c.statusWord}</span>
      {c.busy && (
        <button
          type="button"
          className="tp-stop"
          aria-label="Avbryt"
          title="Avbryt"
          onClick={c.cancel}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        </button>
      )}
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
      {c.memoryFull && (
        <p className="tp-notice" role="alert">
          <span className="tp-notice-symbol" aria-hidden="true">
            !
          </span>
          Skyttels minne för samtalet är fullt. Välj Nytt samtal för att fortsätta. Utkastet ligger
          kvar.
        </p>
      )}
      {c.note && (
        <p className="tp-note" role="status">
          {c.note}
        </p>
      )}
    </>
  );
}

function Transcript({ c, touch }: { c: Conversation; touch: boolean }) {
  const log = useRef<HTMLOListElement>(null);
  const size = c.rows.length + (c.working ? 1 : 0);
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
          <span className="tp-sr">{row.role === 'user' ? 'Du: ' : 'Skyttel: '}</span>
          {row.text}
        </li>
      ))}
      {c.working && (
        <li className="tp-row working">
          Skyttel arbetar…
          {c.waiting > 0 &&
            ` ${c.waiting === 1 ? '1 meddelande väntar' : `${c.waiting} meddelanden väntar`}.`}
          {!touch && ' Tryck på Escape för att avbryta.'}
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
function DraftToggle({ c }: { c: Conversation }) {
  return (
    <div className="tp-draft-toggle">
      <button
        type="button"
        aria-expanded={c.draftOpen}
        aria-controls="tp-draft-pane"
        onClick={() => c.setDraftOpen(!c.draftOpen)}
      >
        <span className="tp-chevron" aria-hidden="true">
          {c.draftOpen ? '▸' : '◂'}
        </span>
        <WorkspaceIcon name="draft" />
        <span>{c.draftOpen ? 'Dölj utkastet' : 'Visa utkastet'}</span>
        <span className="tp-draft-count">{count(c.draft)}</span>
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

function MessageField({ c, touch }: { c: Conversation; touch: boolean }) {
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
          c.send(touch);
        }
      }}
    />
  );
}

/** On a touch layout Skicka turns into the stop icon while Skyttel works. */
function SendButton({ c, touch }: { c: Conversation; touch: boolean }) {
  return touch && c.working ? (
    <button
      key="stop"
      type="button"
      className="tp-send-stop"
      aria-label="Avbryt"
      title="Avbryt"
      onClick={(event) => {
        // The same place holds Skicka afterwards; this click must not also submit the form.
        event.preventDefault();
        c.stopFromSend();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
      </svg>
    </button>
  ) : (
    <button key="send" type="submit" className="primary" disabled={c.blocked || !c.unsent.trim()}>
      Skicka
    </button>
  );
}

/** Escape cancels only while Skyttel works, and only while the focus is in the text view. */
function escapeCancels(c: Conversation) {
  return (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || !c.working) return;
    event.preventDefault();
    c.cancel();
  };
}

/** A drag handle on the left edge of a column. Dragging to the left makes the column wider. */
function Resizer({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const start = useRef<{ x: number; value: number } | null>(null);
  const change = (next: number) => onChange(Math.round(Math.max(min, Math.min(max, next))));
  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable separator is the resize pattern
    <div
      className="tp-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`${label} (dra, eller använd vänster- och högerpil)`}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        start.current = { x: event.clientX, value };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current) change(start.current.value + start.current.x - event.clientX);
      }}
      onPointerUp={() => {
        start.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        change(value + (event.key === 'ArrowLeft' ? 24 : -24));
      }}
    />
  );
}

function CloseButton({ c }: { c: Conversation }) {
  return (
    <button type="button" className="tp-icon" aria-label="Stäng textvyn" onClick={c.closeText}>
      <WorkspaceIcon name="close" />
    </button>
  );
}

/** How full Skyttel's memory of the conversation is, as a share of the context window. */
function MemoryMeter({ c }: { c: Conversation }) {
  return (
    <div
      className="tp-meter"
      title="Så mycket av det Skyttel kan minnas av samtalet som är fyllt. Nytt samtal tömmer minnet."
    >
      <span id="tp-meter-label">Minne</span>
      <meter
        aria-labelledby="tp-meter-label"
        min={0}
        max={100}
        low={60}
        high={85}
        optimum={0}
        value={c.memory}
      />
      <span>{c.memory} %</span>
    </div>
  );
}

function NewConversationButton({ c }: { c: Conversation }) {
  return (
    <button type="button" className="tp-small" onClick={c.newConversation}>
      Nytt samtal
    </button>
  );
}

type Widths = {
  text: number;
  draft: number;
  set: (widths: { text: number; draft: number }) => void;
};

/**
 * The text view: a docked side panel that pushes the map aside. The voice box is the same box in
 * the same place whether the panel is open or not; the panel comes below it.
 */
function TextView({
  c,
  layout,
  touch,
  widths,
}: {
  c: Conversation;
  layout: DraftLayout;
  touch: boolean;
  widths: Widths;
}) {
  // Leave room for the tool rail and a strip of the map.
  const room = (typeof window === 'undefined' ? 1280 : window.innerWidth) - 220;
  return (
    <>
      <VoiceBox c={c} />
      {c.textOpen && (
        <section
          className={`tp-side tp-columns tp-surface${c.draftOpen ? ' with-draft' : ''}`}
          aria-label="Skriv till Skyttel"
          onKeyDown={escapeCancels(c)}
        >
          {c.draftOpen && (
            <Resizer
              label="Ändra utkastlistans bredd"
              value={widths.draft}
              min={260}
              max={Math.max(260, room - widths.text)}
              onChange={(draft) => widths.set({ text: widths.text, draft })}
            />
          )}
          <DraftPane c={c} layout={layout} />
          <Resizer
            label="Ändra samtalstextens bredd"
            value={widths.text}
            min={300}
            max={Math.max(300, room - (c.draftOpen ? widths.draft : 0))}
            onChange={(text) => widths.set({ text, draft: widths.draft })}
          />
          <div className="tp-conversation">
            <header className="tp-head">
              <div className="tp-title">
                <h2>Skriv till Skyttel</h2>
                <MemoryMeter c={c} />
              </div>
              <NewConversationButton c={c} />
              <CloseButton c={c} />
            </header>
            <DraftToggle c={c} />
            <Transcript c={c} touch={touch} />
            <Notices c={c} />
            <form
              className="tp-composer"
              onSubmit={(event) => {
                event.preventDefault();
                c.send(touch);
                // The message field keeps the focus, so that Escape can cancel at once.
                event.currentTarget.querySelector('textarea')?.focus();
              }}
            >
              <label htmlFor="tp-message">Meddelande till Skyttel</label>
              <MessageField c={c} touch={touch} />
              <SendButton c={c} touch={touch} />
            </form>
          </div>
        </section>
      )}
    </>
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
      style={anchored && c.anchor ? c.anchor : undefined}
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
  // With the text view closed, the tool shows that Skyttel works on a written message.
  const writing = c.working === 'text' && !c.textOpen;
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
        onClick={(event) => c.pressVoice(event.currentTarget)}
      >
        <WorkspaceIcon name={c.mic === 'on' ? 'stop' : 'mic'} />
        <span>Prata med Skyttel</span>
      </button>
      <button
        ref={textButton}
        type="button"
        className="tp-rail-text"
        title={writing ? 'Skriv till Skyttel. Skyttel arbetar.' : 'Skriv till Skyttel'}
        aria-label={writing ? 'Skriv till Skyttel. Skyttel arbetar.' : 'Skriv till Skyttel'}
        aria-expanded={c.textOpen}
        onClick={(event) => c.pressText(event.currentTarget)}
      >
        <WorkspaceIcon name="text" />
        <span>Skriv till Skyttel</span>
        {writing && <i className="tp-rail-mark" aria-hidden="true" />}
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
  const mobile = params.get('mobile') === '1';
  const dark = params.get('theme') === 'dark';
  const layout: DraftLayout = params.get('draft') === 'list' ? 'list' : 'table';
  const anchored = params.get('consent') !== 'center';
  const [draftOpenAtStart, setDraftOpenAtStart] = useState(false);
  const [widths, setWidths] = useState({ text: 400, draft: 340 });
  // A touch layout has no Escape key: a narrow screen, a coarse pointer, or the prototype switch.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [coarse, setCoarse] = useState(false);
  useLayoutEffect(() => {
    const view = root?.ownerDocument.defaultView;
    if (!view) return;
    const query = view.matchMedia('(max-width: 700px), (pointer: coarse)');
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [root]);
  const touch = coarse || params.get('touch') === '1';
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
  const app = (
    <div
      ref={setRoot}
      className={`household-map workspace-shell tp-root tp-variant-c${c.textOpen ? ' tp-text-open' : ''}${c.draftOpen ? ' tp-draft-open' : ''}`}
      data-theme={dark ? 'dark' : 'light'}
      style={
        {
          '--tp-text-width': `${widths.text}px`,
          '--tp-draft-width': `${widths.draft}px`,
        } as CSSProperties
      }
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
      <TextView c={c} layout={layout} touch={touch} widths={{ ...widths, set: setWidths }} />
      <ConsentDialog c={c} anchored={anchored} />
    </div>
  );
  return (
    <>
      {mobile ? <PhoneFrame>{app}</PhoneFrame> : app}
      <aside className={`tp-dock${mobile ? ' aside' : ''}`} aria-label="Prototypens reglage">
        <strong>Prototyp: textläget</strong>
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
            <dt>Väntar</dt>
            <dd>{c.waiting === 1 ? '1 meddelande' : `${c.waiting} meddelanden`}</dd>
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
            Minne
            <select
              value={c.memoryForced ?? ''}
              onChange={(event) =>
                c.setMemoryForced(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Följer samtalet</option>
              <option value="70">70 %</option>
              <option value="90">90 %</option>
              <option value="100">100 % (fullt)</option>
            </select>
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
              checked={params.get('touch') === '1'}
              onChange={(event) => set('touch', event.target.checked ? '1' : null)}
            />
            Pekskärm utan Escape (som iPad)
          </label>
          <label>
            <input
              type="checkbox"
              checked={layout === 'list'}
              onChange={(event) => set('draft', event.target.checked ? 'list' : null)}
            />
            Utkastlistan som lista
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
              checked={!anchored}
              onChange={(event) => set('consent', event.target.checked ? 'center' : null)}
            />
            Medgivanderutan mitt på skärmen
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
