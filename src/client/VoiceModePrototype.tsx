/*
 * PROTOTYPE - throwaway code, not production code. No tests, no server, no persistence.
 *
 * Question (viscalyx/skyttel#191): what does the conversation look like on a mobile device: where
 * do the voice box and the conversation notice stand, and how do they and the text view work
 * together with the on-screen keyboard and with short windows?
 *
 * Plan: three variants of the mobile layout on the standalone prototype page, switchable with
 * ?variant= and a floating bar. Each variant has its own place for the voice box and the
 * conversation notice on a narrow screen, and its own rule for the text view in a short window.
 * The two parts can also be mixed with one URL parameter each. The page keeps the design that
 * viscalyx/skyttel#178, #180, #182, #179 and #188 decided, with invented household data and
 * scripted replies. A frame shows the page in the size of a phone or an iPad, with an invented
 * on-screen keyboard. On a real touch device the page fills the visible part of the screen.
 *
 * Start: npm run prototype:mobil, then open http://localhost:4179/?prototype=mobil
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
import {
  type Axis,
  axisNames,
  ConversationNotice,
  chosen,
  closeMicrophone,
  Icon,
  type MobileParts,
  microphoneLevel,
  type NoticeId,
  notices,
  openMicrophone,
  options,
  type Parts,
  PrototypeSwitcher,
  readParts,
  type ScreenKey,
  screens,
  variants,
  Wave,
  type WaveState,
} from './VoiceModePrototypeParts.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './workspace.css';
import './voice-mode-prototype.css';

type Kind = 'added' | 'changed' | 'removed';
type Change = { id: string; kind: Kind; name: string; type: string; what: string };
type Row = { id: number; role: 'user' | 'skyttel' | 'info'; text: string; spoken: boolean };
type Mic = 'off' | 'starting' | 'on';
type Unclear = 'no' | 'checking' | 'failed';
type DraftLayout = 'list' | 'table';
type Status = 'working' | 'speaking' | 'saved' | 'starting' | 'talking' | 'waiting' | 'listening';
/** What the prototype controls have set up: the real microphone, a read-out voice, the hold limit. */
type Prefs = { realMic: boolean; aloud: boolean; holdMs: number };

/** The seven status words of the voice box, from the decision of viscalyx/skyttel#182. */
const statusWords: Record<Status, string> = {
  working: 'Skyttel arbetar',
  speaking: 'Skyttel talar',
  saved: 'Sparat',
  starting: 'Rösten startar',
  talking: 'Du talar',
  waiting: 'Väntar på ditt svar',
  listening: 'Lyssnar',
};

const script: {
  say: string;
  reply?: string;
  changes?: Change[];
  save?: boolean;
  question?: boolean;
}[] = [
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
    question: true,
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

function useConversation(draftOpenAtStart: boolean, prefs: Prefs) {
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
  const [available, setAvailableState] = useState(true);
  const [unclear, setUnclear] = useState<Unclear>('no');
  const [note, setNote] = useState('');
  const [draftOpen, setDraftOpen] = useState(draftOpenAtStart);
  // A necessary question from Skyttel that waits for an answer, and the mode it was asked in.
  const [question, setQuestion] = useState<'voice' | 'text' | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // An event notice: an error that the user closes, or that goes away at the next attempt.
  const [event, setEvent] = useState<NoticeId | null>(null);
  const [audioStopped, setAudioStopped] = useState(false);
  const [audioWillStop, setAudioWillStop] = useState(false);
  const [nextStart, setNextStart] = useState<'ok' | NoticeId>('ok');
  const [taskWillFail, setTaskWillFail] = useState(false);
  // The user pressed a conversation tool that looks switched off, with no conversation in progress.
  const [tapped, setTapped] = useState(false);
  const [held, setHeld] = useState(false);
  const [unread, setUnread] = useState<'answered' | 'asked' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const micTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The draft is saved, and "Sparat" waits for Skyttel to finish talking.
  const savedPending = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(1);
  // Messages wait in a queue while Skyttel handles an earlier one.
  const queue = useRef<{ text: string; spoken: boolean }[]>([]);
  const active = useRef(false);
  const sentAt = useRef(0);
  // Counters that make a late callback from a cancelled start or a cancelled reply do nothing.
  const starts = useRef(0);
  const turns = useRef(0);
  // A long press holds the microphone open; "heard" says that the real microphone caught speech.
  const holding = useRef(false);
  const heard = useRef(false);
  const [waiting, setWaiting] = useState(0);
  const live = useRef({
    mic,
    step,
    draft,
    textOpen,
    prefs,
    nextStart,
    audioWillStop,
    taskWillFail,
  });
  live.current = { mic, step, draft, textOpen, prefs, nextStart, audioWillStop, taskWillFail };
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(micTimer.current);
      clearTimeout(savedTimer.current);
      clearTimeout(holdTimer.current);
      closeMicrophone();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const addRow = (role: Row['role'], text: string, spoken: boolean) =>
    setRows((current) => [...current, { id: nextId.current++, role, text, spoken }]);
  // An invented measure: every row of the conversation and every draft change takes some room.
  const [memoryForced, setMemoryForced] = useState<number | null>(null);
  const [autoCompact, setAutoCompact] = useState(true);
  // The number of rows at the latest summary; only later rows count in full.
  const [summarisedRows, setSummarisedRows] = useState<number | null>(null);
  const memory =
    memoryForced ??
    Math.min(
      100,
      2 +
        (summarisedRows === null ? 0 : 12) +
        (rows.length - (summarisedRows ?? 0)) * 4 +
        draft.length * 3,
    );
  const memoryFull = memory >= 100;
  // biome-ignore lint/correctness/useExhaustiveDependencies: summarise once when the context fills
  useEffect(() => {
    if (!memoryFull || !autoCompact) return;
    setMemoryForced(null);
    setSummarisedRows(rows.length + 1);
    setRows((current) => [
      ...current,
      {
        id: nextId.current++,
        role: 'info',
        spoken: false,
        text: 'Skyttel har sammanfattat samtalet för att få plats i kontexten.',
      },
    ]);
  }, [memoryFull, autoCompact]);
  const busy = Boolean(working) || speaking;
  const consented = started || consentSaved;
  // With no conversation in progress the notice about a blocked conversation waits for a press.
  const ongoing = rows.length > 0 || mic !== 'off' || busy || textOpen;
  const idleOff = !ongoing && (!online || !available);
  const blocked = !online || !available || unclear !== 'no' || (memoryFull && !autoCompact);
  const micDisabled = !idleOff && (blocked || (working === 'text' && mic === 'off'));
  // One notice at a time: unclear saving, lost contact, full context, errors, stopped audio.
  const hinder: NoticeId | null =
    unclear === 'checking'
      ? 'unclear-checking'
      : unclear === 'failed'
        ? 'unclear-failed'
        : !online
          ? ongoing
            ? 'offline'
            : 'offline-idle'
          : !available
            ? 'unavailable'
            : memoryFull && !autoCompact
              ? 'context-full'
              : null;
  const fromTap = idleOff && tapped && unclear === 'no';
  const notice: NoticeId | null = hinder
    ? idleOff && unclear === 'no' && !tapped
      ? null
      : hinder
    : (event ?? (audioStopped ? 'audio-stopped' : null));
  useEffect(() => {
    if (!idleOff) setTapped(false);
  }, [idleOff]);
  // The order of precedence of the status words, from the decision of viscalyx/skyttel#182.
  const status: Status = working
    ? 'working'
    : speaking
      ? 'speaking'
      : justSaved
        ? 'saved'
        : mic === 'starting'
          ? 'starting'
          : talking
            ? 'talking'
            : question
              ? 'waiting'
              : 'listening';
  // The voice box belongs to the voice mode: it never shows for a conversation in text only.
  const voiceVisible =
    mic !== 'off' || (busy && origin === 'voice') || question === 'voice' || justSaved;
  const nextLine = () => script[live.current.step]?.say ?? 'Finns det något mer att göra?';

  /** "Sparat" shows for 4 seconds, counted from the moment Skyttel has finished talking. */
  function showSaved() {
    if (!savedPending.current) return;
    savedPending.current = false;
    setJustSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 4000);
  }
  /** Skyttel says the reply: with the browser's voice if the prototype control asks for it. */
  function say(reply: string) {
    const turn = turns.current;
    let over = false;
    const end = () => {
      if (over || turn !== turns.current) return;
      over = true;
      clearTimeout(timer.current);
      setSpeaking(false);
      showSaved();
      next();
    };
    setSpeaking(true);
    if (live.current.prefs.aloud && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(reply);
      utterance.lang = 'sv-SE';
      utterance.onend = end;
      utterance.onerror = end;
      window.speechSynthesis.speak(utterance);
      timer.current = setTimeout(end, 20000);
    } else timer.current = setTimeout(end, 2600);
  }
  function respond(text: string, spoken: boolean) {
    const { mic, step, draft, textOpen, taskWillFail } = live.current;
    if (taskWillFail) {
      setTaskWillFail(false);
      halt();
      setEvent('task-failed');
      return;
    }
    const entry = script[step];
    // A spoken assignment gets a spoken reply, and so does a written one while the microphone is on.
    const voice = spoken || mic === 'on';
    let reply: string;
    let asks = false;
    if (/spara/i.test(text)) {
      reply = draft.length
        ? `Sparat. ${draft.length === 1 ? '1 ändring' : `${draft.length} ändringar`} finns nu i hushållets karta.`
        : 'Utkastet är tomt. Det finns inget att spara.';
      setSaved((current) => [...current, ...draft]);
      setDraft([]);
      if (entry?.save) setStep(step + 1);
      if (draft.length && voice) savedPending.current = true;
    } else if (!entry || entry.save) {
      reply =
        'Manuset i den här prototypen är slut. Välj Börja om under Prototyplägen för att spela upp det igen.';
    } else {
      reply = entry.reply ?? '';
      asks = Boolean(entry.question);
      const changes = entry.changes ?? [];
      setDraft((current) => [
        ...current.filter((item) => !changes.some((change) => change.id === item.id)),
        ...changes,
      ]);
      setStep(step + 1);
    }
    addRow('skyttel', reply, voice);
    if (asks) setQuestion(voice ? 'voice' : 'text');
    if (!textOpen) setUnread(asks ? 'asked' : 'answered');
    setWorking(null);
    if (voice) say(reply);
    else next();
  }
  function begin(item: { text: string; spoken: boolean }) {
    active.current = true;
    setNote('');
    setOrigin(item.spoken ? 'voice' : 'text');
    setWorking(item.spoken ? 'voice' : 'text');
    timer.current = setTimeout(() => respond(item.text, item.spoken), 2400);
  }
  function next() {
    const item = queue.current.shift();
    setWaiting(queue.current.length);
    if (item) begin(item);
    else active.current = false;
  }
  function ask(text: string, spoken: boolean) {
    addRow('user', text, spoken);
    // A new attempt answers the question that waited and takes an event notice away.
    setQuestion(null);
    setEvent(null);
    if (active.current) {
      queue.current.push({ text, spoken });
      setWaiting(queue.current.length);
    } else begin({ text, spoken });
  }
  /** Stops the work in progress and drops every message that waits. */
  function halt() {
    turns.current += 1;
    clearTimeout(timer.current);
    window.speechSynthesis?.cancel();
    // The stop icon silences Skyttel; a saving that is done still shows.
    showSaved();
    queue.current = [];
    active.current = false;
    setWaiting(0);
    setWorking(null);
    setSpeaking(false);
    setTalking(false);
  }
  function stopMic() {
    starts.current += 1;
    clearTimeout(micTimer.current);
    clearTimeout(holdTimer.current);
    closeMicrophone();
    holding.current = false;
    heard.current = false;
    setHeld(false);
    setMic('off');
    setTalking(false);
    setAudioStopped(false);
  }
  /** The status is "Rösten startar" also while the browser asks about the microphone. */
  async function startMic(quick: boolean) {
    const start = ++starts.current;
    const { nextStart, audioWillStop, prefs } = live.current;
    clearTimeout(micTimer.current);
    setEvent(null);
    setMic('starting');
    let failure = nextStart === 'ok' ? null : nextStart;
    if (!failure && prefs.realMic) failure = await openMicrophone();
    if (start !== starts.current) {
      // The user cancelled the start while the browser asked about the microphone.
      if (live.current.mic === 'off') closeMicrophone();
      return;
    }
    micTimer.current = setTimeout(
      () => {
        if (failure) {
          setNextStart('ok');
          stopMic();
          setEvent(failure);
        } else if (audioWillStop) {
          // The microphone does not listen until the audio plays.
          setAudioWillStop(false);
          setAudioStopped(true);
        } else {
          setMic('on');
          if (holding.current && !prefs.realMic) setTalking(true);
        }
      },
      quick ? 350 : 900,
    );
  }
  // With the real microphone, the level decides when the user talks and when the turn is over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the loop reads the latest values from refs
  useEffect(() => {
    if (mic !== 'on' || !prefs.realMic) return;
    let loudSince = 0;
    let quietSince = 0;
    let spoke = false;
    const poll = setInterval(() => {
      const now = Date.now();
      if (active.current) spoke = false;
      if ((microphoneLevel() ?? 0) > 0.12) {
        quietSince = 0;
        loudSince ||= now;
        if (now - loudSince > 150 && !active.current) {
          spoke = true;
          heard.current = true;
          setTalking(true);
        }
        return;
      }
      loudSince = 0;
      quietSince ||= now;
      if (now - quietSince > 400) setTalking(false);
      if (spoke && now - quietSince > 1300 && !holding.current) {
        spoke = false;
        heard.current = false;
        ask(nextLine(), true);
      }
    }, 60);
    return () => clearInterval(poll);
  }, [mic, prefs.realMic]);
  // The consent box opens beside the pressed tool, so that the pointer has a short way to go.
  const askBeside = (kind: 'voice' | 'text', button: HTMLElement) => {
    const box = button.getBoundingClientRect();
    const narrow = (button.ownerDocument.defaultView?.innerWidth ?? 1280) <= 700;
    setAnchor(narrow ? { top: box.bottom + 12, left: 12 } : { top: 24, left: box.right + 18 });
    setAsking(kind);
  };
  function newConversation() {
    halt();
    setMemoryForced(null);
    setSummarisedRows(null);
    setNote('');
    setQuestion(null);
    setEvent(null);
    setUnread(null);
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
  }
  function checkSave() {
    setUnclear('no');
    addRow(
      'skyttel',
      `Kontrollen är klar. Utkastet sparades inte. ${count(draft)} ligger kvar i ditt utkast.`,
      false,
    );
  }
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
    available,
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
    autoCompact,
    setAutoCompact,
    micDisabled,
    ongoing,
    idleOff,
    notice,
    fromTap,
    held,
    question,
    status,
    voiceVisible,
    nextStart,
    setNextStart,
    audioWillStop,
    setAudioWillStop,
    taskWillFail,
    setTaskWillFail,
    nextLine: script[step]?.say,
    // The mark on the text tool shows only while the voice box is away and the text view is closed.
    unread: !textOpen && !voiceVisible ? unread : null,
    waveState: (status === 'talking'
      ? 'user'
      : status === 'speaking'
        ? 'skyttel'
        : status === 'starting' || (status === 'waiting' && mic !== 'on')
          ? 'dimmed'
          : 'still') as WaveState,
    setUnsent,
    setDraftOpen,
    setUnclear,
    /** A short press: the consent box at the first start, then the microphone on or off. */
    pressVoice(button: HTMLElement) {
      if (idleOff) setTapped(true);
      else if (micDisabled) return;
      else if (!consented) askBeside('voice', button);
      else if (mic === 'off') void startMic(false);
      else stopMic();
    },
    /** The press begins. If it lasts longer than the limit, the microphone listens until release. */
    pressStart() {
      clearTimeout(holdTimer.current);
      if (!consented || mic !== 'off' || micDisabled || idleOff) return;
      holdTimer.current = setTimeout(() => {
        holding.current = true;
        setHeld(true);
        void startMic(true);
      }, prefs.holdMs);
    },
    /** The press ends. The result is true if it was a long press, which then is over. */
    pressEnd() {
      clearTimeout(holdTimer.current);
      if (!holding.current) return false;
      const said = live.current.mic === 'on' && (!prefs.realMic || heard.current);
      stopMic();
      if (said) ask(nextLine(), true);
      return true;
    },
    pressText(button: HTMLElement) {
      if (idleOff) setTapped(true);
      else if (!consented) askBeside('text', button);
      else {
        setTextOpen((open) => !open);
        setUnread(null);
      }
    },
    closeText: () => setTextOpen(false),
    approve(remember: boolean) {
      setStarted(true);
      if (remember) setConsentSaved(true);
      if (asking === 'voice') void startMic(false);
      else {
        setTextOpen(true);
        setUnread(null);
      }
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
      const line = nextLine();
      if (blocked || busy || talking) return;
      // A prototype shortcut: the control also turns the microphone on, without the consent box.
      starts.current += 1;
      clearTimeout(micTimer.current);
      setStarted(true);
      setEvent(null);
      setAudioStopped(false);
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
    newConversation,
    /** The close button of an event notice, or of a notice that came from a press. */
    closeNotice() {
      if (fromTap) setTapped(false);
      else setEvent(null);
    },
    /** The one button of a notice. */
    noticeAction() {
      if (notice === 'audio-stopped') {
        setAudioStopped(false);
        setMic('on');
        if (holding.current && !prefs.realMic) setTalking(true);
      } else if (notice === 'unclear-failed') checkSave();
      else if (notice === 'context-full') newConversation();
    },
    /** The voice connection breaks in the middle of the conversation. */
    dropVoice() {
      if (mic === 'off') return;
      stopMic();
      setEvent('voice-dropped');
    },
    setOnline(value: boolean) {
      setOnlineState(value);
      if (!value) stopMic();
    },
    setAvailable(value: boolean) {
      setAvailableState(value);
      if (!value) stopMic();
    },
    forgetConsent() {
      setConsentSaved(false);
      setStarted(false);
    },
    reset() {
      halt();
      stopMic();
      clearTimeout(savedTimer.current);
      setMemoryForced(null);
      setSummarisedRows(null);
      setConsentSaved(false);
      setStarted(false);
      setAsking(null);
      setTextOpen(false);
      setRows([]);
      setUnsent('');
      setDraft([]);
      setSaved([]);
      setStep(0);
      setOnlineState(true);
      setAvailableState(true);
      setUnclear('no');
      setNote('');
      setDraftOpen(draftOpenAtStart);
      setQuestion(null);
      setJustSaved(false);
      setEvent(null);
      setAudioWillStop(false);
      setNextStart('ok');
      setTaskWillFail(false);
      setTapped(false);
      setUnread(null);
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
      {/* The real map has this row along its bottom edge. It does nothing here. */}
      <div className="mp-map-bar" aria-hidden="true">
        <span>Återställ vy</span>
        <span>☐ Alla etiketter</span>
        <span>☐ Visa höjdhjälp</span>
      </div>
    </div>
  );
}

/**
 * The small voice box: waveform, one of seven status words, the context mark and a small stop
 * icon. The box keeps one height and is only as wide as its content. It is not a control itself.
 */
function VoiceBox({ c, parts, reduced }: { c: Conversation; parts: Parts; reduced: boolean }) {
  if (!c.voiceVisible) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a named group, as viscalyx/skyttel#188 decided
    <div className="tp-voicebox tp-surface" role="group" aria-label="Röstruta">
      <Wave kind={parts.vag} state={c.waveState} reduced={reduced} saved={c.status === 'saved'} />
      {c.status === 'saved' && (
        <span className="vp-check">
          <Icon name="check" />
        </span>
      )}
      <span role="status">{statusWords[c.status]}</span>
      {c.memory >= 85 && (
        <span
          className="tp-context-mark"
          role="img"
          aria-label={`Kontexten är ${c.memory} procent full`}
          title={`Kontexten är ${c.memory} procent full`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" className="tp-ring" />
            <circle
              cx="12"
              cy="12"
              r="9"
              className="tp-ring-fill"
              strokeDasharray={`${(c.memory / 100) * 56.5} 56.5`}
            />
          </svg>
          <span className="mp-percent">{c.memory} %</span>
        </span>
      )}
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

/**
 * The place of the voice box. The conversation notice stands here too, also when the box is away.
 * While the text view is open the notice stands in the text view and not here. The place is a
 * part of the tool rail in the code, straight after the two conversation tools, so that the
 * reading order is the one that viscalyx/skyttel#188 decided. The styles put it on the screen.
 */
function VoiceCorner({
  c,
  parts,
  reduced,
  boxElsewhere,
}: {
  c: Conversation;
  parts: Parts;
  reduced: boolean;
  /** The voice box stands in the text view, above the message field. */
  boxElsewhere: boolean;
}) {
  const corner = useRef<HTMLDivElement>(null);
  const notice = c.textOpen ? null : c.notice;
  const { fromTap, closeNotice } = c;
  const close = useRef(closeNotice);
  close.current = closeNotice;
  // How a notice goes away when it came from a press with no conversation in progress.
  useEffect(() => {
    const page = corner.current?.ownerDocument;
    if (!fromTap || !page || parts.stang === 'knapp') return;
    if (parts.stang === 'tid') {
      const wait = setTimeout(() => close.current(), 6000);
      return () => clearTimeout(wait);
    }
    const onPointer = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.vp-notice, .workspace-talk, .tp-rail-text')) close.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    page.addEventListener('pointerdown', onPointer);
    page.addEventListener('keydown', onKey);
    return () => {
      page.removeEventListener('pointerdown', onPointer);
      page.removeEventListener('keydown', onKey);
    };
  }, [fromTap, parts.stang]);
  return (
    <div
      ref={corner}
      className={`vp-corner notis-${parts.notis}${c.voiceVisible ? ' has-box' : ''}`}
    >
      {!boxElsewhere && <VoiceBox c={c} parts={parts} reduced={reduced} />}
      {notice && (
        <ConversationNotice
          id={notice}
          look={parts.notis}
          symbols={parts.symbol}
          closable={notices[notice].kind === 'handelse' || (fromTap && parts.stang === 'knapp')}
          onClose={c.closeNotice}
          onAction={c.noticeAction}
        />
      )}
    </div>
  );
}

function Transcript({ c, touch, height }: { c: Conversation; touch: boolean; height: number }) {
  const log = useRef<HTMLOListElement>(null);
  const size = c.rows.length + (c.working ? 1 : 0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follow new rows
  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
    // In a short window the whole text view can be the part that scrolls.
    const side = log.current?.closest('.tp-side');
    if (side) side.scrollTop = side.scrollHeight;
  }, [size, height]);
  return (
    <ol ref={log} role="log" aria-label="Samtalstext" className="tp-log">
      {!c.rows.length && (
        <li className="tp-empty">Här visas det du och Skyttel säger och skriver.</li>
      )}
      {c.rows.map((row) => (
        <li key={row.id} className={`tp-row ${row.role}`}>
          {row.role !== 'info' && (
            <span className="tp-sr">{row.role === 'user' ? 'Du: ' : 'Skyttel: '}</span>
          )}
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
function DraftToggle({ c, compact = false }: { c: Conversation; compact?: boolean }) {
  if (compact)
    return (
      <button
        type="button"
        className="mp-draft-chip"
        aria-expanded={c.draftOpen}
        aria-controls="tp-draft-pane"
        aria-label={`${c.draftOpen ? 'Dölj utkastet' : 'Visa utkastet'}, ${count(c.draft)}`}
        onClick={() => c.setDraftOpen(!c.draftOpen)}
      >
        <WorkspaceIcon name="draft" />
        <span>Utkast</span>
        <span className="tp-draft-count">{c.draft.length}</span>
      </button>
    );
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

function MessageField({ c, touch, view }: { c: Conversation; touch: boolean; view: MobileView }) {
  const field = useRef<HTMLTextAreaElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the text view opens
  useEffect(() => {
    if (view.focusAtOpen) field.current?.focus();
  }, []);
  return (
    <textarea
      ref={field}
      id="tp-message"
      rows={view.short && view.mobile.kort !== 'rullar' ? 1 : 2}
      onFocus={() => view.setTyping(true)}
      onBlur={() => view.setTyping(false)}
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

/** How full the context of the conversation is, as a share of the model's context window. */
function MemoryMeter({ c }: { c: Conversation }) {
  return (
    <div
      className="tp-meter"
      title="Så mycket av samtalets kontext som är fylld. Nytt samtal tömmer den."
    >
      <span id="tp-meter-label">Kontext</span>
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

/** What the text view must know about the screen it stands on. */
type MobileView = {
  mobile: MobileParts;
  /** The rail lies along the top of a narrow screen. */
  narrow: boolean;
  /** The visible height of the screen, without the on-screen keyboard. */
  height: number;
  /** The visible height is under the limit: the keyboard is up, or the window is short. */
  short: boolean;
  typing: boolean;
  setTyping: (typing: boolean) => void;
  focusAtOpen: boolean;
};

/**
 * The text view: a docked side panel that pushes the map aside. On a touch layout it fills the
 * screen below the voice box, and its width cannot be changed.
 */
function TextView({
  c,
  layout,
  touch,
  widths,
  parts,
  reduced,
  view,
}: {
  c: Conversation;
  layout: DraftLayout;
  touch: boolean;
  widths: Widths;
  parts: Parts;
  reduced: boolean;
  view: MobileView;
}) {
  // Leave room for the tool rail and a strip of the map.
  const room = (typeof window === 'undefined' ? 1280 : window.innerWidth) - 220;
  if (!c.textOpen) return null;
  const compact = touch && view.short && view.mobile.kort === 'kompakt';
  return (
    <section
      className={`tp-side tp-columns tp-surface${c.draftOpen ? ' with-draft' : ''}`}
      aria-label="Skriv till Skyttel"
      onKeyDown={escapeCancels(c)}
    >
      {c.draftOpen && !touch && (
        <Resizer
          label="Ändra utkastlistans bredd"
          value={widths.draft}
          min={260}
          max={Math.max(260, room - widths.text)}
          onChange={(draft) => widths.set({ text: widths.text, draft })}
        />
      )}
      <DraftPane c={c} layout={layout} />
      {!touch && (
        <Resizer
          label="Ändra samtalstextens bredd"
          value={widths.text}
          min={300}
          max={Math.max(300, room - (c.draftOpen ? widths.draft : 0))}
          onChange={(text) => widths.set({ text, draft: widths.draft })}
        />
      )}
      <div className="tp-conversation">
        {compact ? (
          <header className="tp-head mp-compact">
            <h2 className="tp-sr">Skriv till Skyttel</h2>
            <MemoryMeter c={c} />
            <DraftToggle c={c} compact />
            <NewConversationButton c={c} />
            <CloseButton c={c} />
          </header>
        ) : (
          <>
            <header className="tp-head">
              <div className="tp-title">
                <h2>Skriv till Skyttel</h2>
                <MemoryMeter c={c} />
              </div>
              <NewConversationButton c={c} />
              <CloseButton c={c} />
            </header>
            <DraftToggle c={c} />
          </>
        )}
        <Transcript c={c} touch={touch} height={view.height} />
        {c.notice && (
          <ConversationNotice
            id={c.notice}
            look="textvy"
            symbols={parts.symbol}
            closable={notices[c.notice].kind === 'handelse'}
            onClose={c.closeNotice}
            onAction={c.noticeAction}
          />
        )}
        {c.note && (
          <p className="tp-note" role="status">
            {c.note}
          </p>
        )}
        {view.narrow && view.mobile.plats === 'nere' && (
          <div className="mp-voice-row">
            <VoiceBox c={c} parts={parts} reduced={reduced} />
          </div>
        )}
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
          <MessageField c={c} touch={touch} view={view} />
          <SendButton c={c} touch={touch} />
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

function ToolRail({
  c,
  parts,
  combo,
  reduced,
  boxElsewhere,
}: {
  c: Conversation;
  parts: Parts;
  combo: string;
  reduced: boolean;
  boxElsewhere: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // With the text view closed, the tool shows that Skyttel works on a written message.
  const writing = c.working === 'text' && !c.textOpen;
  // It also shows that Skyttel has answered or asked, when the voice box is away.
  const unread = writing ? null : c.unread;
  const textName = writing
    ? 'Skriv till Skyttel. Skyttel arbetar.'
    : unread === 'answered'
      ? 'Skriv till Skyttel. Skyttel har svarat.'
      : unread === 'asked'
        ? 'Skriv till Skyttel. Skyttel väntar på ditt svar.'
        : 'Skriv till Skyttel';
  const textButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // A long press ends with a click that must not also count as a short press.
  const skipClick = useRef(false);
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
        className={`workspace-talk vp-knapp-${parts.knapp}${c.idleOff ? ' vp-off' : ''}${c.held ? ' vp-held' : ''}`}
        title={
          c.mic === 'starting'
            ? 'Avbryt starten av rösten'
            : `Prata med Skyttel (${combo}). Håll in för att tala tills du släpper.${c.idleOff ? ' Inte tillgängligt just nu.' : ''}`
        }
        aria-label="Prata med Skyttel"
        aria-pressed={c.mic === 'on'}
        disabled={c.micDisabled}
        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
          skipClick.current = false;
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          c.pressStart();
        }}
        onPointerUp={() => {
          skipClick.current = c.pressEnd();
        }}
        onPointerCancel={() => {
          c.pressEnd();
        }}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          if (skipClick.current) skipClick.current = false;
          else c.pressVoice(event.currentTarget);
        }}
      >
        <WorkspaceIcon name={parts.knapp === 'stopp' && c.mic === 'on' ? 'stop' : 'mic'} />
        <span>Prata med Skyttel</span>
      </button>
      <button
        ref={textButton}
        type="button"
        className={`tp-rail-text${c.idleOff ? ' vp-off' : ''}${unread && parts.markering === 'ram' ? ' vp-ram' : ''}`}
        title={c.idleOff ? `${textName}. Inte tillgängligt just nu.` : textName}
        aria-label={textName}
        aria-expanded={c.textOpen}
        onClick={(event) => c.pressText(event.currentTarget)}
      >
        <WorkspaceIcon name="text" />
        <span>Skriv till Skyttel</span>
        {writing && <i className="tp-rail-mark" aria-hidden="true" />}
        {unread && parts.markering !== 'ram' && (
          <i className={`vp-mark ${parts.markering}`} aria-hidden="true">
            {parts.markering === 'tecken' && (unread === 'asked' ? '?' : '…')}
          </i>
        )}
      </button>
      <VoiceCorner c={c} parts={parts} reduced={reduced} boxElsewhere={boxElsewhere} />
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

/**
 * Renders its children inside an iframe so that the app's own narrow-screen rules apply. The frame
 * has the size of the chosen screen and is made smaller when the window has no room for it. The
 * invented on-screen keyboard is a part of the device, not of the app.
 */
function PhoneFrame({
  screen,
  keyboard,
  children,
}: {
  screen: ScreenKey;
  /** The height of the invented keyboard, or 0 when it is down. */
  keyboard: number;
  children: ReactNode;
}) {
  const { width, height } = screens[screen];
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    // Room for the prototype controls to the left and for the variant switcher below.
    const resize = () =>
      setScale(Math.min(1, (window.innerHeight - 96) / height, (window.innerWidth - 400) / width));
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [width, height]);
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
      <div className="mp-device" style={{ width: width * scale, height: height * scale }}>
        <iframe
          ref={mount}
          title="Prototypen i mobilstorlek"
          className="tp-phone"
          style={{ width, height, transform: `scale(${scale})` }}
        />
      </div>
      {body &&
        createPortal(
          <>
            {children}
            {keyboard > 0 && <FakeKeyboard height={keyboard} />}
          </>,
          body,
        )}
    </div>
  );
}

/** An invented on-screen keyboard. It takes room and types nothing. */
function FakeKeyboard({ height }: { height: number }) {
  const rows = ['qwertyuiopå', 'asdfghjklöä', 'zxcvbnm'];
  return (
    // A press on the keyboard must not take the focus from the message field.
    <div
      className="mp-keyboard"
      style={{ height }}
      aria-hidden="true"
      onMouseDown={(event) => event.preventDefault()}
    >
      <small>Påhittat skärmtangentbord · {height} px</small>
      {rows.map((row) => (
        <div key={row}>
          {[...row].map((key) => (
            <i key={key}>{key}</i>
          ))}
        </div>
      ))}
      <div>
        <i className="wide">mellanslag</i>
        <button
          type="button"
          tabIndex={-1}
          onClick={(event) =>
            (event.currentTarget.ownerDocument.activeElement as HTMLElement | null)?.blur()
          }
        >
          Dölj tangentbordet
        </button>
      </div>
    </div>
  );
}

/** The key combinations that do the same as the voice button. Both hold Ctrl and Space. */
const combos = {
  ctrl: { label: 'Ctrl+Mellanslag', shift: false },
  'ctrl-skift': { label: 'Ctrl+Skift+Mellanslag', shift: true },
} as const;
type ComboKey = keyof typeof combos;

/** The start outcomes that the prototype controls can set up, each with its notice. */
const startFailures: NoticeId[] = [
  'mic-denied',
  'mic-missing',
  'mic-busy',
  'no-support',
  'start-failed',
  'admin',
];

/** A visible height under this limit is a short window: the keyboard is up, or the phone lies. */
const shortLimit = 520;

const keyboardModes = {
  auto: 'Kommer upp när meddelandefältet har fokus',
  uppe: 'Alltid uppe',
  nere: 'Aldrig',
} as const;

export function VoiceModePrototype() {
  const [params, setParams] = useSearchParams();
  const { variant, mobile } = readParts(params);
  // The design of the voice mode is decided. Only the mobile parts are under review here.
  const parts = chosen;
  const dark = params.get('theme') === 'dark';
  const layout: DraftLayout = params.get('draft') === 'list' ? 'list' : 'table';
  const anchored = params.get('consent') !== 'center';
  const [draftOpenAtStart, setDraftOpenAtStart] = useState(false);
  const [widths, setWidths] = useState({ text: 400, draft: 340 });
  const [realMic, setRealMic] = useState(false);
  const [aloud, setAloud] = useState(false);
  const [holdMs, setHoldMs] = useState(450);
  const [lastKey, setLastKey] = useState('ingen');
  // A real touch device shows the page without the frame, in the visible part of the screen.
  const [realTouch] = useState(
    () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900,
  );
  const askedScreen = params.get('skarm');
  const screen: ScreenKey | null =
    askedScreen === 'av'
      ? null
      : askedScreen && askedScreen in screens
        ? (askedScreen as ScreenKey)
        : realTouch
          ? null
          : 'telefon';
  const [controlsOpen, setControlsOpen] = useState(false);
  const bare = !screen && realTouch;
  // A touch layout has no Escape key: a narrow screen, a coarse pointer, or the prototype switch.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [coarse, setCoarse] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [calm, setCalm] = useState(false);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const view = root?.ownerDocument.defaultView;
    if (!root || !view) return;
    const pointer = view.matchMedia('(max-width: 700px), (pointer: coarse)');
    const width = view.matchMedia('(max-width: 700px)');
    const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setCoarse(pointer.matches);
      setNarrow(width.matches);
      setCalm(motion.matches);
    };
    update();
    pointer.addEventListener('change', update);
    width.addEventListener('change', update);
    motion.addEventListener('change', update);
    // The visible height: the screen without the on-screen keyboard.
    const size = new view.ResizeObserver(() => setHeight(root.clientHeight));
    size.observe(root);
    setHeight(root.clientHeight);
    return () => {
      pointer.removeEventListener('change', update);
      width.removeEventListener('change', update);
      motion.removeEventListener('change', update);
      size.disconnect();
    };
  }, [root]);
  // Without the frame the page follows the visible part of the screen, which a real on-screen
  // keyboard makes smaller.
  const [visible, setVisible] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (screen || !viewport) {
      setVisible(null);
      return;
    }
    const measure = () => setVisible({ top: viewport.offsetTop, height: viewport.height });
    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
    };
  }, [screen]);
  // The frame is a mobile device, whatever pointer the computer has.
  const touch = Boolean(screen) || coarse || params.get('touch') === '1';
  const reduced = calm || params.get('rorelse') === 'minskad';
  const wide = params.get('bred') === 'sidofalt' ? 'sidofalt' : 'fyller';
  const short = touch && height > 0 && height < shortLimit;
  // The user writes: the message field has the focus. A press on Skicka must not end that.
  const [typing, setTypingNow] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setTyping = useCallback((value: boolean) => {
    clearTimeout(typingTimer.current);
    if (value) setTypingNow(true);
    else typingTimer.current = setTimeout(() => setTypingNow(false), 200);
  }, []);
  const askedKeyboard = params.get('tangentbord');
  const keyboardMode =
    askedKeyboard && askedKeyboard in keyboardModes
      ? (askedKeyboard as keyof typeof keyboardModes)
      : 'auto';
  const keyboard =
    screen && (keyboardMode === 'uppe' || (keyboardMode === 'auto' && typing))
      ? screens[screen].keyboard
      : 0;
  // The starting values of the decision: Ctrl+Shift+Space on macOS, Ctrl+Space elsewhere.
  const asked = params.get('tangent');
  const comboKey: ComboKey =
    asked && asked in combos
      ? (asked as ComboKey)
      : /Mac|iPhone|iPad/.test(navigator.platform)
        ? 'ctrl-skift'
        : 'ctrl';
  const c = useConversation(draftOpenAtStart, { realMic, aloud, holdMs });
  const latest = useRef(c);
  latest.current = c;
  useEffect(() => {
    if (!c.textOpen) setTyping(false);
  }, [c.textOpen, setTyping]);
  // The key combination follows the rule of the button: a short press toggles, a long press
  // listens until the keys are released.
  useEffect(() => {
    const page = root?.ownerDocument;
    if (!page) return;
    const pages = page === document ? [page] : [page, document];
    let down = false;
    let swallowSpace = false;
    const onDown = (event: KeyboardEvent) => {
      const match =
        event.code === 'Space' &&
        event.ctrlKey &&
        event.shiftKey === combos[comboKey].shift &&
        !event.altKey &&
        !event.metaKey;
      if (!match) return;
      event.preventDefault();
      if (event.repeat || down) return;
      down = true;
      latest.current.pressStart();
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && swallowSpace) {
        // Ctrl was released first; this Space must not also press a focused button.
        swallowSpace = false;
        event.preventDefault();
        return;
      }
      if (!down || (event.code !== 'Space' && event.key !== 'Control' && event.key !== 'Shift'))
        return;
      down = false;
      swallowSpace = event.code !== 'Space';
      event.preventDefault();
      const long = latest.current.pressEnd();
      setLastKey(`${combos[comboKey].label}, ${long ? 'långt' : 'kort'} tryck`);
      const button = page.querySelector<HTMLElement>('.workspace-talk');
      if (!long && button) latest.current.pressVoice(button);
    };
    for (const each of pages) {
      each.addEventListener('keydown', onDown);
      each.addEventListener('keyup', onUp);
    }
    return () => {
      for (const each of pages) {
        each.removeEventListener('keydown', onDown);
        each.removeEventListener('keyup', onUp);
      }
    };
  }, [root, comboKey]);
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
  // A new variant gives every part its own value again.
  const setVariant = useCallback(
    (key: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('variant', key);
          for (const axis of Object.keys(options)) next.delete(axis);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const check = (label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
  const view: MobileView = {
    mobile,
    narrow,
    height,
    short,
    typing,
    setTyping,
    focusAtOpen: !touch || params.get('fokus') === '1',
  };
  const app = (
    <div
      ref={setRoot}
      className={`household-map workspace-shell tp-root tp-variant-c mp-fit mp-plats-${mobile.plats} mp-kort-${mobile.kort} mp-bred-${wide}${touch ? ' mp-touch' : ''}${short ? ' mp-short' : ''}${typing ? ' mp-typing' : ''}${c.textOpen ? ' tp-text-open' : ''}${c.draftOpen ? ' tp-draft-open' : ''}${reduced ? ' vp-reduced' : ''}`}
      data-theme={dark ? 'dark' : 'light'}
      style={
        {
          '--tp-text-width': `${widths.text}px`,
          '--tp-draft-width': `${widths.draft}px`,
          top: visible?.top ?? 0,
          height: screen ? `calc(100% - ${keyboard}px)` : (visible?.height ?? '100%'),
        } as CSSProperties
      }
    >
      <FakeMap c={c} />
      <ToolRail
        c={c}
        parts={parts}
        combo={combos[comboKey].label}
        reduced={reduced}
        boxElsewhere={narrow && mobile.plats === 'nere' && c.textOpen}
      />
      <div className="workspace-context">
        Familjen Berg<span>Gemensam karta</span>
      </div>
      <TextView
        c={c}
        layout={layout}
        touch={touch}
        widths={{ ...widths, set: setWidths }}
        parts={parts}
        reduced={reduced}
        view={view}
      />
      <ConsentDialog c={c} anchored={anchored} />
    </div>
  );
  const select = <T extends string>(
    label: string,
    value: T,
    choices: Record<T, string>,
    onChange: (value: T) => void,
  ) => (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {(Object.entries(choices) as [T, string][]).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  const screenChoices = {
    ...Object.fromEntries(Object.entries(screens).map(([key, each]) => [key, each.label])),
    av: 'Ingen ram (hela fönstret)',
  } as Record<ScreenKey | 'av', string>;
  return (
    <>
      {screen ? (
        <PhoneFrame screen={screen} keyboard={keyboard}>
          {app}
        </PhoneFrame>
      ) : (
        app
      )}
      {bare && (
        <button
          type="button"
          className="mp-controls-toggle"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen(!controlsOpen)}
        >
          {controlsOpen ? 'Dölj reglagen' : `Prototyp ${variant}`}
        </button>
      )}
      {(!bare || controlsOpen) && <PrototypeSwitcher current={variant} onChange={setVariant} />}
      {(!bare || controlsOpen) && (
        <aside
          className={`tp-dock${screen || bare ? ' aside' : ''}${bare ? ' bare' : ''}`}
          aria-label="Prototypens reglage"
        >
          <strong>Prototyp: mobil enhet · variant {variant}</strong>
          <details>
            <summary>Prototyplägen</summary>
            <dl>
              <dt>Samtal</dt>
              <dd>{c.ongoing ? 'pågår' : 'pågår inte'}</dd>
              <dt>Medgivande</dt>
              <dd>{c.consentSaved ? 'sparat' : c.started ? 'givet för samtalet' : 'saknas'}</dd>
              <dt>Mikrofon</dt>
              <dd>
                {c.mic === 'on' ? 'på' : c.mic === 'starting' ? 'startar' : 'av'}
                {c.held && ', hålls inne'}
              </dd>
              <dt>Skyttel</dt>
              <dd>
                {c.working
                  ? `arbetar (${c.working === 'voice' ? 'talat' : 'skrivet'} uppdrag)`
                  : c.speaking
                    ? 'talar'
                    : c.question
                      ? 'har frågat och väntar'
                      : 'väntar'}
              </dd>
              <dt>Röstrutan</dt>
              <dd>{c.voiceVisible ? statusWords[c.status] : 'syns inte'}</dd>
              <dt>Samtalsnotis</dt>
              <dd>
                {c.notice
                  ? `${notices[c.notice].label} (${notices[c.notice].kind === 'hinder' ? 'hinder' : 'händelse'}${c.fromTap ? ', efter tryck' : ''})`
                  : 'ingen'}
              </dd>
              <dt>Textvy</dt>
              <dd>{c.textOpen ? 'öppen' : 'stängd'}</dd>
              <dt>Synlig höjd</dt>
              <dd>
                {height} px{short ? ', kort fönster' : ''}
              </dd>
              <dt>Skriver</dt>
              <dd>{typing ? 'ja, fältet har fokus' : 'nej'}</dd>
              <dt>Markering</dt>
              <dd>
                {c.unread === 'asked'
                  ? 'Skyttel väntar på ditt svar'
                  : c.unread === 'answered'
                    ? 'Skyttel har svarat'
                    : 'ingen'}
              </dd>
              <dt>Utkast</dt>
              <dd>{count(c.draft)}</dd>
              <dt>Tangenter</dt>
              <dd>{lastKey}</dd>
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
              <button type="button" disabled={c.mic === 'off'} onClick={c.dropVoice}>
                Rösten bryts
              </button>
              <button type="button" onClick={c.forgetConsent}>
                Glöm medgivandet
              </button>
              <button type="button" onClick={c.reset}>
                Börja om
              </button>
            </div>
            {check('Riktig mikrofon styr vågformen', realMic, setRealMic)}
            {check('Läs upp Skyttels svar med webbläsarens röst', aloud, setAloud)}
            <label>
              Nästa start av rösten
              <select
                value={c.nextStart}
                onChange={(event) => c.setNextStart(event.target.value as 'ok' | NoticeId)}
              >
                <option value="ok">Lyckas</option>
                {startFailures.map((id) => (
                  <option key={id} value={id}>
                    {notices[id].label}
                  </option>
                ))}
              </select>
            </label>
            {check(
              'Webbläsaren stoppar ljudet vid nästa start',
              c.audioWillStop,
              c.setAudioWillStop,
            )}
            {check('Nästa uppdrag misslyckas', c.taskWillFail, c.setTaskWillFail)}
            {check('Bruten kontakt', !c.online, (on) => c.setOnline(!on))}
            {check('Samtalet är inte tillgängligt', !c.available, (on) => c.setAvailable(!on))}
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
            {check('Sammanfatta automatiskt vid full kontext', c.autoCompact, c.setAutoCompact)}
            <label>
              Kontext
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
              Gräns för långt tryck
              <select value={holdMs} onChange={(event) => setHoldMs(Number(event.target.value))}>
                <option value="300">0,3 sekunder</option>
                <option value="450">0,45 sekunder</option>
                <option value="600">0,6 sekunder</option>
              </select>
            </label>
          </details>
          <details open>
            <summary>Skärm och tangentbord</summary>
            {select('Skärm', screen ?? 'av', screenChoices, (value) => set('skarm', value))}
            {select('Skärmtangentbord', keyboardMode, keyboardModes, (value) =>
              set('tangentbord', value === 'auto' ? null : value),
            )}
            {check(
              'Meddelandefältet får fokus när textvyn öppnas',
              params.get('fokus') === '1',
              (on) => set('fokus', on ? '1' : null),
            )}
            {select(
              'Textvyn på bred pekskärm',
              wide,
              { fyller: 'Fyller skärmen', sidofalt: 'Sidofält med fast bredd' },
              (value) => set('bred', value === 'fyller' ? null : value),
            )}
            {check('Minskad rörelse', params.get('rorelse') === 'minskad', (on) =>
              set('rorelse', on ? 'minskad' : null),
            )}
            {check('Mörkt tema', dark, (on) => set('theme', on ? 'dark' : null))}
            {!screen &&
              check('Pekskärm utan Escape (som iPad)', params.get('touch') === '1', (on) =>
                set('touch', on ? '1' : null),
              )}
            {check('Inställning: utkastlistan utfälld vid nytt samtal', draftOpenAtStart, (on) => {
              setDraftOpenAtStart(on);
              c.setDraftOpen(on);
            })}
          </details>
          <details>
            <summary>Blanda delar från varianterna</summary>
            {(Object.keys(options) as Axis[]).map((axis) => (
              <label key={axis}>
                {axisNames[axis]}
                <select
                  value={mobile[axis]}
                  onChange={(event) =>
                    set(
                      axis,
                      event.target.value === variants[variant][axis] ? null : event.target.value,
                    )
                  }
                >
                  {Object.entries(options[axis]).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </details>
        </aside>
      )}
    </>
  );
}
