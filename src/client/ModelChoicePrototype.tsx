// THROWAWAY: actual App components host three model-control placements.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { conversationConsentTextVersion } from '../shared/conversation-consent.js';
import type { TextAssistantView } from '../shared/text-assistant.js';
import type { TranscriptRow } from './ConversationTranscript.js';
import { trapDialogTab } from './modal-focus.js';
import { modelPrototypeEnabled, prototypeMap } from './model-choice-prototype-fixture.js';
import type { Conversation, useConversation } from './use-conversation.js';
import './model-choice-prototype.css';

type Choice = { model: string; level: string };
type Variant = 'A' | 'B' | 'C';
const names = { A: 'I textvyns huvud', B: 'Vid meddelandet', C: 'I inställningarna' };
const label = (value: Choice) => `${value.model} · ${value.level}`;
const fullLabel = (value: Choice) => `GPT-6.1 ${label(value)}`;
const initial = { model: 'Terra', level: 'Hög' };
const starter: TranscriptRow[] = [
  { id: 'example-1', role: 'user', text: 'Vilka abonnemang har vi och vem betalar dem?' },
  {
    id: 'example-2',
    role: 'assistant',
    text: 'Alex betalar musikabonnemanget och Lo betalar filmabonnemanget. I ditt utkast finns också ett tidningsabonnemang som ännu inte är sparat.',
  },
];
type PrototypeState = {
  variant: Variant;
  choice: Choice;
  running: Choice | null;
  unavailable: string;
  feedback: string;
  choose: (value: Choice) => void;
  conversation: Conversation;
  finish: () => void;
  setUnavailable: (value: string) => void;
  showDialog: (button: HTMLButtonElement) => void;
};
const Context = createContext<PrototypeState | null>(null);
const usePrototype = () => useContext(Context);
const baseSession: TextAssistantView = {
  id: 'prototype-conversation',
  revision: 1,
  phase: 'ready',
  operations: [],
  contextPercentage: 12,
  review: {
    ...prototypeMap.draft,
    contentVersion: 0,
    readyToSave: true,
    conflicts: [],
    unresolvedIdentities: [],
    pendingOperations: [],
  },
};

export function ModelChoicePrototypeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [variant, setVariant] = useState<Variant>(() => {
    const value = new URLSearchParams(location.search).get('variant');
    return value === 'B' || value === 'C' ? value : 'A';
  });
  const [choice, setChoice] = useState(initial);
  const [running, setRunning] = useState<Choice | null>(null);
  const [unavailable, setUnavailable] = useState('');
  const [feedback, setFeedback] = useState('');
  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState(starter);
  const [microphone, setMicrophone] = useState<'on' | 'off'>('off');
  const [canceled, setCanceled] = useState(false);
  const [menuHidden, setMenuHidden] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const blocked = choice.model === unavailable;
  const session = useMemo(
    () => ({
      ...baseSession,
      canceled,
      phase: running ? ('working' as const) : ('ready' as const),
    }),
    [running, canceled],
  );
  const start = () => {
    if (running || blocked) return;
    setRunning({ ...choice });
    setCanceled(false);
    setTranscript((rows) => [
      ...rows,
      { id: crypto.randomUUID(), role: 'user', text: text || 'Visa vem som betalar abonnemangen.' },
    ]);
    setText('');
    setFeedback('');
  };
  const finish = () => {
    if (!running) return;
    setRunning(null);
    setTranscript((rows) => [
      ...rows,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Alex betalar musikabonnemanget och Lo betalar filmabonnemanget. Ditt utkast är kvar.',
      },
    ]);
    setFeedback('');
  };
  const reset = async () => {
    setRunning(null);
    setTranscript([]);
    setCanceled(false);
    return baseSession;
  };
  const conversation: Conversation = {
    inputBlocked: blocked,
    available: true,
    consent: {
      saved: { textVersion: conversationConsentTextVersion, savedAt: '2026-11-03T12:00:00Z' },
      visit: false,
      valid: true,
      known: true,
      asking: null,
      saving: false,
      error: '',
    },
    session,
    transcript,
    text,
    pending: false,
    error: '',
    unknown: false,
    working: Boolean(running),
    needsAnswer: false,
    voice: {
      state: microphone === 'on' ? 'listening' : 'idle',
      phase: microphone === 'on' ? 'listening' : null,
      microphone,
      starting: false,
      speaking: false,
      userSpeaking: false,
      working: Boolean(running) && microphone === 'on',
      error: '',
      playbackBlocked: false,
      disconnected: false,
      disabled: false,
      level: () => 0,
      activate: () => setMicrophone((value) => (value === 'on' ? 'off' : 'on')),
      start: async () => setMicrophone('on'),
      stop: async () => setMicrophone('off'),
      silence: async () => {},
      newConversation: async (resetConversation) => resetConversation(),
      playAudio: () => {},
    },
    setText,
    begin: (mode) => {
      if (mode === 'voice') setMicrophone('on');
    },
    approve: async () => {},
    decline: () => {},
    saveConsent: async () => true,
    revokeConsent: async () => false,
    send: async () => start(),
    cancel: async () => {
      setRunning(null);
      setCanceled(true);
    },
    newConversation: async () => {
      await reset();
    },
    recover: async () => {},
    retry: async () => {},
  };
  const state: PrototypeState = {
    variant,
    choice,
    running,
    unavailable,
    feedback,
    conversation,
    finish,
    setUnavailable,
    choose: (next) => {
      setChoice(next);
      setFeedback(
        `${fullLabel(next)} valt. ${running ? 'Gäller när nästa begäran börjar behandlas.' : 'Gäller nästa begäran.'}`,
      );
    },
    showDialog: (button) => {
      opener.current = button;
      dialog.current?.showModal();
    },
  };
  const cycle = useCallback(
    (delta: number) => {
      const variants: Variant[] = ['A', 'B', 'C'];
      const next = variants[(variants.indexOf(variant) + delta + 3) % 3];
      setVariant(next);
      const query = new URLSearchParams(location.search);
      query.set('variant', next);
      navigate({ pathname: location.pathname, search: query.toString() }, { replace: true });
    },
    [variant, location.pathname, location.search, navigate],
  );
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        !(event.target instanceof HTMLElement) ||
        event.target.closest(
          'input, textarea, select, [contenteditable], [role="slider"], canvas',
        ) ||
        dialog.current?.open
      )
        return;
      // Arrow shortcuts belong only to the prototype switcher, not the app's map.
      if (!event.target.closest('.model-prototype-switcher')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycle]);
  return (
    <Context value={state}>
      {children}
      <dialog
        ref={dialog}
        className="model-prototype-dialog"
        aria-labelledby="model-prototype-title"
        onKeyDown={trapDialogTab}
        onClose={() => opener.current?.focus()}
      >
        <h2 id="model-prototype-title">Modell och resonemangsnivå</h2>
        <PrototypeChoices help />
        <PrototypeScope />
        <PrototypeStatus />
        <button type="button" onClick={() => dialog.current?.close()}>
          Klart
        </button>
      </dialog>
      {menuHidden && (
        <button
          type="button"
          className="model-prototype-restore"
          onClick={() => setMenuHidden(false)}
        >
          Prototyp {variant}
        </button>
      )}
      <nav className="model-prototype-switcher" aria-label="Prototypvarianter" hidden={menuHidden}>
        <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
          ←
        </button>
        <span aria-live="polite">
          {variant} · {names[variant]}
        </span>
        <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
          →
        </button>
        <details>
          <summary>Prova</summary>
          <section aria-label="Prototypens scenarier">
            <strong>Kastbar prototyp i den riktiga appen</strong>
            <p>Exempeldata. Röst och modellsvar simuleras. Inget sparas mellan omladdningar.</p>
            <button type="button" onClick={() => setMenuHidden(true)}>
              Dölj prototypmenyn
            </button>
            <button type="button" disabled={Boolean(running) || blocked} onClick={start}>
              Starta arbete
            </button>
            <button type="button" disabled={!running} onClick={finish}>
              Slutför arbete
            </button>
            <button type="button" onClick={() => setUnavailable(unavailable ? '' : choice.model)}>
              {unavailable ? 'Återställ stöd' : 'Gör vald modell otillgänglig'}
            </button>
            <output aria-live="off">
              Val: {fullLabel(choice)}. Pågår: {running ? fullLabel(running) : 'inget'}. Röst:{' '}
              {microphone}. Utkast: 1.
            </output>
          </section>
        </details>
      </nav>
    </Context>
  );
}

export function usePrototypeConversation(
  options: Parameters<typeof useConversation>[0],
): Conversation {
  const state = usePrototype();
  if (!state) throw new Error('Prototype conversation needs its provider');
  return {
    ...state.conversation,
    begin: (mode) => {
      state.conversation.begin(mode);
      options.onStarted?.(mode);
    },
  };
}

function PrototypeChoices({ help = false }: { help?: boolean }) {
  const state = usePrototype();
  const id = useId();
  if (!state) return null;
  return (
    <div className="model-prototype-choices">
      <label htmlFor={`${id}-model`}>
        Modell
        <select
          id={`${id}-model`}
          value={state.choice.model}
          onChange={(event) => state.choose({ ...state.choice, model: event.target.value })}
        >
          {['Terra', 'Sol'].map((model) => (
            <option key={model} value={model} disabled={state.unavailable === model}>
              GPT-6.1 {model}
              {state.unavailable === model ? ' — otillgänglig' : ''}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-level`}>
        Resonemangsnivå
        <select
          id={`${id}-level`}
          value={state.choice.level}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(event) => state.choose({ ...state.choice, level: event.target.value })}
        >
          {['Låg', 'Medium', 'Hög'].map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      {help && (
        <p id={`${id}-help`}>
          Hög ger mer utrymme för krävande uppgifter och kan ta längre tid. Låg och medium ger
          mindre utrymme. Resultat och väntetid kan variera.
        </p>
      )}
    </div>
  );
}
function PrototypeScope() {
  return (
    <div className="model-prototype-scope">
      <p>
        Samma val gäller text och röst. GPT-Live 1 lyssnar och talar; den valda modellen arbetar med
        dina uppdrag.
      </p>
      <p>
        Ditt senaste val används i nya samtal på alla dina enheter och i alla dina hushåll. Andra
        pågående samtal behåller sina val.
      </p>
      <p>
        Ändringar gäller när nästa begäran börjar behandlas. Pågående arbete fortsätter med sina
        ursprungliga val.
      </p>
    </div>
  );
}
function PrototypeStatus() {
  const state = usePrototype();
  if (!state) return null;
  const changed = state.running && label(state.running) !== label(state.choice);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="model-prototype-status">
      {state.choice.model === state.unavailable && (
        <p>
          GPT-6.1 {state.choice.model} är inte tillgänglig. Välj en annan modell för att fortsätta.
          Samtalet och ditt utkast är kvar.
        </p>
      )}
      {changed ? (
        <p>
          Pågår: {label(state.running as Choice)}. Nästa begäran: {label(state.choice)}.
        </p>
      ) : (
        state.feedback && <p>{state.feedback}</p>
      )}
    </div>
  );
}

export function PrototypeModelControls({
  place,
}: {
  place: 'header' | 'composer' | 'voice' | 'settings';
}) {
  const state = usePrototype();
  if (!modelPrototypeEnabled || !state) return null;
  if (place === 'settings')
    return (
      <section className="conversation-setting model-prototype-setting">
        <h2>Modell och resonemangsnivå</h2>
        <p className="conversation-setting-scope">Gäller ditt samtal i både text- och röstläge.</p>
        <PrototypeChoices help />
        <PrototypeScope />
        <PrototypeStatus />
      </section>
    );
  if (place === 'header' && state.variant === 'B') return null;
  if (place === 'composer' && state.variant !== 'B') return null;
  if (place === 'composer')
    return (
      <section className="model-prototype-inline" aria-label="Modellval">
        <PrototypeChoices />
        <details>
          <summary>Om modell och resonemang</summary>
          <p>Hög ger mer utrymme för krävande uppgifter och kan ta längre tid.</p>
          <PrototypeScope />
        </details>
        <PrototypeStatus />
      </section>
    );
  return (
    <div className={`model-prototype-compact model-prototype-${place}`}>
      {state.variant === 'C' ? (
        <Link to={`/households/prototype/settings/conversation?variant=${state.variant}`}>
          {fullLabel(state.choice)} · Ändra i inställningar
        </Link>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Modell och resonemangsnivå: ${fullLabel(state.choice)}`}
          onClick={(event) => state.showDialog(event.currentTarget)}
        >
          {fullLabel(state.choice)} <span aria-hidden="true">⌄</span>
        </button>
      )}
      <PrototypeStatus />
    </div>
  );
}
