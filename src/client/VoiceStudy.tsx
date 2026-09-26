// Kastbar talstudie: tre strukturer på samma karta, ?prototype=voice&variant=A/B/C.
// Endast påhittade uppgifter i minnet. Inget ljud, ingen AI och inga riktiga sparanden.
import { useEffect, useRef, useState } from 'react';
import './voice-study.css';

export type VoiceStudyVariant = 'A' | 'B' | 'C' | 'D';
export type VoiceSaveState = 'idle' | 'pending' | 'saved' | 'failed' | 'unknown' | 'conflict';
export type VoiceStudySaveState = VoiceSaveState;
type Microphone = 'off' | 'connecting' | 'listening' | 'paused' | 'error';
type Assistant = 'idle' | 'working' | 'speaking' | 'question';
type Transcript = { id: number; speaker: 'Du' | 'Skyttel'; text: string };
type Event = { id: number; label: string; text: string };

export type VoiceStudyOptions = {
  enabled?: boolean;
  draftCount: number;
  saveState: VoiceSaveState;
  onPropose: () => void;
  onSave: () => void;
  onResolveSave: (outcome: 'saved' | 'failed' | 'unknown' | 'conflict') => void;
  onReviewConflict?: () => void;
};

const example = 'Ändra familjeabonnemanget';
const exampleMeaning =
  'Familjeabonnemanget: 189 → 199 kr per månad, betalas med Kort 4242. Lägg till Filmlyktan och Lo som användare.';
const variants = {
  D: { name: 'Kartan berättar', description: 'Förändringarna syns direkt på objekt och samband.' },
  A: { name: 'Senaste beskedet', description: 'Ett besked i fokus, med nästa möjliga handling.' },
  B: { name: 'Två spår', description: 'Samtalets läge och kartans ändringar visas var för sig.' },
  C: { name: 'Händelseföljd', description: 'De senaste stegen visar hur tal blir ett resultat.' },
};

export function useVoiceStudy(options: VoiceStudyOptions) {
  const [externalAi, setExternalAi] = useState(false);
  const [mapWork, setMapWork] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [mic, setMic] = useState<Microphone>('off');
  const [assistant, setAssistant] = useState<Assistant>('idle');
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [textBuffer, setTextBuffer] = useState('');
  const [latestSummary, setLatestSummary] = useState('Berätta om hushållet. Kartan följer med.');
  const [error, setError] = useState('');
  const [clarification, setClarification] = useState(false);
  const [checking, setChecking] = useState(false);
  const [interruption, setInterruption] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const nextId = useRef(0);
  const pendingProposal = useRef(false);
  const previousSaveState = useRef(options.saveState);
  const enabled = options.enabled !== false;
  const consented = externalAi && mapWork && sessionActive;
  const micActive = mic === 'listening';

  function addEvent(label: string, text: string) {
    const id = ++nextId.current;
    setEvents((current) => [...current.slice(-2), { id, label, text }]);
  }
  function say(speaker: Transcript['speaker'], text: string) {
    const id = ++nextId.current;
    setTranscript((current) => [...current, { id, speaker, text }]);
  }
  function announce(text: string, label = 'Besked') {
    setLatestSummary(text);
    addEvent(label, text);
  }

  useEffect(() => {
    if (!enabled || previousSaveState.current === options.saveState) return;
    previousSaveState.current = options.saveState;
    const messages: Partial<Record<VoiceSaveState, string>> = {
      pending: 'Sparbeskedet är skickat. Väntar på kvitto.',
      saved: 'Sparat. Hela utkastet är bekräftat av kvittot.',
      failed: 'Inget sparades. Utkastet finns kvar.',
      unknown: 'Sparutfallet är okänt. Kontrollera försöket innan du fortsätter.',
      conflict: 'Inget sparades. Familjeabonnemangets pris har ändrats av någon annan.',
    };
    const message = messages[options.saveState];
    if (message) {
      setLatestSummary(message);
      const id = ++nextId.current;
      setEvents((current) => [...current.slice(-2), { id, label: 'Sparande', text: message }]);
      if (options.saveState !== 'pending') setChecking(false);
    }
  }, [enabled, options.saveState]);

  const blockedSave =
    options.saveState === 'unknown' ||
    options.saveState === 'pending' ||
    options.saveState === 'conflict';
  const canSave =
    enabled && options.draftCount > 0 && !clarification && !blockedSave && assistant !== 'working';

  function startSession(mode: 'voice' | 'text') {
    if (!enabled || !externalAi || !mapWork) {
      setNeedsConsent(true);
      return;
    }
    setNeedsConsent(false);
    setSessionActive(true);
    setError('');
    setInterruption(false);
    if (mode === 'voice') {
      setMic('connecting');
      announce('Ansluter samtalet. Mikrofonen är av tills anslutningen är klar.', 'Start');
    } else {
      announce('Samtalet är igång med text. Mikrofonen är av.', 'Start');
    }
  }

  function toggleMic() {
    if (!enabled) return;
    if (!sessionActive || !externalAi || !mapWork) {
      setNeedsConsent(true);
      announce('Välj hur Skyttel får hjälpa dig innan samtalet startar.', 'Start');
    } else if (mic === 'listening') {
      setMic('paused');
      announce('Mikrofonen är pausad. Du kan fortfarande höra Skyttel.', 'Mikrofon');
    } else if (mic === 'paused') {
      setMic('listening');
      announce('Mikrofonen är på igen.', 'Mikrofon');
    } else if (mic === 'connecting') {
      setMic('off');
      announce('Talstarten är avbruten. Du kan fortsätta med text.', 'Mikrofon');
    } else {
      startSession('voice');
    }
  }

  function finishConnection() {
    if (mic !== 'connecting') return;
    setMic('listening');
    announce('Lyssnar. Berätta vad du vill lägga till eller rätta.', 'Samtal');
  }

  function interrupt() {
    pendingProposal.current = false;
    setAssistant('idle');
    setInterruption(true);
    announce('Uppdraget är avbrutet. Redan föreslagna ändringar finns kvar.', 'Avbrott');
  }

  function endVoice() {
    pendingProposal.current = false;
    setMic('off');
    setAssistant(clarification ? 'question' : 'idle');
    announce('Rösten är av. Samtalet och utkastet finns kvar.', 'Avslut');
  }

  function endConversation() {
    pendingProposal.current = false;
    setMic('off');
    setAssistant('idle');
    setSessionActive(false);
    setExternalAi(false);
    setMapWork(false);
    setNeedsConsent(false);
    setTranscript([]);
    setTextBuffer('');
    setError('');
    setInterruption(false);
    setEvents([]);
    // En obesvarad fråga hör till utkastet och överlever samtalsminnet.
    setLatestSummary('Samtalet är avslutat. Ditt utkast och sparresultat finns kvar.');
  }

  function canWork() {
    if (!sessionActive) {
      setNeedsConsent(true);
      return false;
    }
    if (blockedSave) {
      announce('Hantera det tidigare sparförsöket innan du ändrar mer.', 'Sparande');
      return false;
    }
    return true;
  }

  function proposeExample() {
    if (!canWork()) return;
    setError('');
    setInterruption(false);
    say('Du', exampleMeaning);
    pendingProposal.current = true;
    setAssistant('working');
    announce(
      'Förstått: familjeabonnemang, betalningskort och användare. Tar fram förslag.',
      'Förstått',
    );
  }

  function finishWork() {
    if (assistant !== 'working' || !pendingProposal.current) return;
    pendingProposal.current = false;
    options.onPropose();
    setAssistant(mic === 'off' ? 'idle' : 'speaking');
    say('Skyttel', 'Förslagen finns i ditt privata utkast. Inget är sparat.');
    announce('Utkastet är uppdaterat. Familjeabonnemanget, Kort 4242 och Filmlyktan.', 'Förslag');
  }

  function finishSpeech() {
    if (assistant !== 'speaking') return;
    setAssistant(clarification ? 'question' : 'idle');
  }

  function requestSave(callback: () => void = options.onSave) {
    if (!canSave) {
      if (clarification)
        announce('Välj vilket kort du menar innan hela utkastet kan sparas.', 'Fråga');
      else if (options.saveState === 'unknown')
        announce('Kontrollera sparresultatet först.', 'Sparande');
      else if (options.saveState === 'conflict')
        announce('Lös priskonflikten innan du ger ett nytt sparbesked.', 'Konflikt');
      return;
    }
    setError('');
    say('Du', 'Spara hela utkastet.');
    callback();
  }

  function askClarification() {
    if (!canWork() || options.draftCount === 0) return;
    pendingProposal.current = false;
    setClarification(true);
    setAssistant('question');
    say('Du', 'Jag är osäker på vilket kort jag menade för Familjeabonnemanget.');
    say('Skyttel', 'Menar du Kort 4242? Kortet måste vara bestämt innan utkastet kan sparas.');
    announce('Vilket kort menar du? Bekräfta Kort 4242 innan sparande.', 'Fråga');
  }

  function chooseClarification() {
    if (!clarification || !sessionActive || blockedSave) return;
    setClarification(false);
    say('Du', 'Kort 4242.');
    setAssistant('idle');
    announce('Kort 4242 är bekräftat. Utkastet finns kvar; inget sparas.', 'Förstått');
  }

  function showChanges() {
    if (!sessionActive) return;
    say('Du', 'Vad ändras?');
    say(
      'Skyttel',
      options.draftCount > 0
        ? `Det finns ${options.draftCount} förslag i ditt privata utkast. Öppna hela utkastet för de aktuella värdena, även manuella ändringar.`
        : 'Det finns inga förslag i utkastet.',
    );
    announce('Ändringsöversikten finns i samtalet och i hela utkastet.', 'Översikt');
  }

  function submitText() {
    if (!textBuffer.trim() || !sessionActive) return;
    const normalized = textBuffer
      .trim()
      .toLocaleLowerCase('sv')
      .replace(/[.!?]+$/, '');
    const commands: Record<string, () => void> = {
      'ändra familjeabonnemanget': proposeExample,
      'spara hela utkastet': () => requestSave(),
      'vad ändras': showChanges,
      'kort 4242': chooseClarification,
      avbryt: interrupt,
    };
    const command = commands[normalized];
    if (!command) {
      setError(
        'Prototypen förstår bara exemplen under ”Det här kan du skriva”. Inga uppgifter ändras.',
      );
      return;
    }
    setTextBuffer('');
    setError('');
    command();
  }

  function simulateFailure(kind: 'microphone' | 'network') {
    pendingProposal.current = false;
    setMic('error');
    setAssistant('idle');
    setError(
      kind === 'microphone'
        ? 'Mikrofonen tilläts inte. Starta rösten igen eller fortsätt med text.'
        : 'Anslutningen bröts. Mikrofonen är av. Utkastet finns kvar; kontrollera sparresultatet om du just bad att spara.',
    );
    if (options.saveState === 'pending') options.onResolveSave('unknown');
  }

  function resolveUnknown() {
    if (options.saveState !== 'unknown') return;
    setChecking(true);
    announce('Kontrollerar samma sparförsök. Inget nytt sparande startas.', 'Kontroll');
  }

  function resolveSave(outcome: 'saved' | 'failed' | 'unknown' | 'conflict') {
    if (options.saveState !== 'pending' && !(options.saveState === 'unknown' && checking)) return;
    options.onResolveSave(outcome);
    setChecking(false);
  }

  function resolveConflict() {
    if (options.saveState !== 'conflict') return;
    options.onReviewConflict?.();
    announce(
      'Ditt prisförslag behålls i utkastet. Granska det och ge ett nytt sparbesked.',
      'Konflikt löst',
    );
  }

  const micLabel =
    !consented || mic === 'off' || mic === 'error'
      ? 'Tala med Skyttel'
      : mic === 'listening'
        ? 'Pausa mikrofon'
        : mic === 'paused'
          ? 'Återuppta mikrofon'
          : 'Avbryt talstart';
  const micStatus =
    mic === 'listening' ? 'Mikrofon på' : mic === 'paused' ? 'Mikrofon pausad' : 'Mikrofon av';
  const assistantStatus =
    assistant === 'working'
      ? 'Skyttel arbetar'
      : assistant === 'speaking'
        ? 'Skyttel talar'
        : assistant === 'question' || clarification
          ? 'Skyttel behöver ett svar'
          : mic === 'connecting'
            ? 'Ansluter samtalet'
            : mic === 'listening'
              ? 'Lyssnar på dig'
              : sessionActive
                ? 'Samtalet är kvar'
                : 'Redo när du är';
  const draftStatus =
    options.saveState === 'pending'
      ? 'Väntar på sparkvitto'
      : options.saveState === 'saved'
        ? 'Sparat · kvitto bekräftat'
        : options.saveState === 'unknown'
          ? 'Sparutfall okänt'
          : options.saveState === 'conflict'
            ? 'Konflikt · inget sparat'
            : options.saveState === 'failed'
              ? 'Inget sparat · utkastet kvar'
              : options.draftCount > 0
                ? `${options.draftCount} förslag · privat utkast`
                : 'Inga osparade förslag';
  const alert =
    options.saveState === 'unknown'
      ? 'Sparutfallet är okänt. Kontrollera samma försök innan du ändrar eller sparar mer.'
      : options.saveState === 'conflict'
        ? 'Priskonflikt: någon annan har sparat 219 kr för Familjeabonnemanget. Ditt förslag är 199 kr. Inget från försöket är sparat.'
        : options.saveState === 'failed'
          ? 'Det senaste sparförsöket avvisades. Utkastet finns kvar för ett nytt sparbesked.'
          : error;
  const statusText = `${micStatus}. ${assistantStatus}. ${draftStatus}.${clarification ? ' Kortet behöver bekräftas.' : ''}${alert ? ` ${alert}` : ''}`;

  return {
    enabled,
    externalAi,
    setExternalAi,
    mapWork,
    setMapWork,
    needsConsent,
    sessionActive,
    consented,
    mic,
    micActive,
    micLabel,
    micStatus,
    assistant,
    assistantStatus,
    draftStatus,
    statusText,
    draftCount: options.draftCount,
    saveState: options.saveState,
    transcript,
    textBuffer,
    setTextBuffer,
    latestSummary,
    alert,
    clarification,
    checking,
    interruption,
    events,
    canSave,
    toggleMic,
    startSession,
    finishConnection,
    proposeExample,
    finishWork,
    finishSpeech,
    interrupt,
    endVoice,
    endConversation,
    resetSession: () => {
      endConversation();
      setClarification(false);
      setChecking(false);
      previousSaveState.current = 'idle';
    },
    submitText,
    askClarification,
    chooseClarification,
    showChanges,
    requestSave,
    saveDraft: () => requestSave(),
    noteManualChange: () =>
      announce(
        'Din manuella ändring finns i det privata utkastet. Inget nytt är sparat.',
        'Förslag',
      ),
    simulateFailure,
    resolveUnknown,
    resolveSave,
    resolveConflict,
  };
}

export type VoiceStudyModel = ReturnType<typeof useVoiceStudy>;
type FeedbackProps = {
  model: VoiceStudyModel;
  variant?: VoiceStudyVariant;
  onConversation: () => void;
  onDraft: () => void;
  onSave?: () => void;
};

function MicrophoneStatus({ model }: { model: VoiceStudyModel }) {
  return (
    <span className="voice-study-mic" data-active={model.micActive}>
      <span aria-hidden="true" className="voice-study-mic-dot" />
      {model.micStatus}
    </span>
  );
}

function FeedbackActions({ model, onConversation, onDraft, onSave }: FeedbackProps) {
  return (
    <div className="voice-study-actions">
      {model.saveState === 'unknown' ? (
        <button
          type="button"
          className="voice-study-primary"
          onClick={model.resolveUnknown}
          disabled={model.checking}
        >
          {model.checking ? 'Kontrollerar…' : 'Kontrollera sparresultat'}
        </button>
      ) : model.saveState === 'conflict' ? (
        <button type="button" className="voice-study-primary" onClick={onConversation}>
          Lös priskonflikten
        </button>
      ) : model.clarification ? (
        <button type="button" className="voice-study-primary" onClick={onConversation}>
          Svara om kortet
        </button>
      ) : model.assistant === 'working' ? (
        <button type="button" onClick={model.interrupt}>
          Avbryt uppdrag
        </button>
      ) : model.canSave ? (
        <button
          type="button"
          className="voice-study-primary"
          onClick={() => model.requestSave(onSave)}
        >
          Spara hela utkastet
        </button>
      ) : (
        <button type="button" onClick={onConversation}>
          {model.sessionActive ? 'Öppna samtalet' : 'Tala eller skriv'}
        </button>
      )}
      <button type="button" onClick={onDraft}>
        {model.saveState === 'saved' ? 'Visa kvittot' : 'Visa hela utkastet'}
      </button>
    </div>
  );
}

export function VoiceStudyFeedback(props: FeedbackProps) {
  const { model, variant = 'A' } = props;
  return (
    <section
      className={`voice-study voice-study-feedback voice-study-${variant}`}
      aria-label="Samtal och sparresultat"
    >
      <div className="voice-study-feedback-top">
        <MicrophoneStatus model={model} />
        <button type="button" className="voice-study-quiet" onClick={props.onConversation}>
          Samtal
        </button>
      </div>
      {model.alert && (
        <p className="voice-study-alert" role="alert">
          {model.alert}
        </p>
      )}
      {variant === 'D' && (
        <div className="voice-study-map-status">
          <strong>{model.draftStatus}</strong>
          <span>{model.assistantStatus}</span>
          {model.clarification && <p>Vilket kort menar du? Bekräfta Kort 4242 före sparande.</p>}
        </div>
      )}
      {variant === 'A' && (
        <div className="voice-study-latest">
          <span className="voice-study-eyebrow">{model.assistantStatus}</span>
          <p className="voice-study-main-message">{model.latestSummary}</p>
          <p className="voice-study-draft-caption">{model.draftStatus}</p>
        </div>
      )}
      {variant === 'B' && (
        <div className="voice-study-tracks">
          <div className="voice-study-track">
            <span className="voice-study-track-symbol" aria-hidden="true">
              ◌
            </span>
            <div>
              <span className="voice-study-eyebrow">Samtal</span>
              <strong>{model.assistantStatus}</strong>
            </div>
          </div>
          <div className="voice-study-track">
            <span className="voice-study-track-symbol" aria-hidden="true">
              ◇
            </span>
            <div>
              <span className="voice-study-eyebrow">Karta</span>
              <strong>{model.draftStatus}</strong>
            </div>
          </div>
          <p>{model.latestSummary}</p>
        </div>
      )}
      {variant === 'C' && (
        <div className="voice-study-sequence">
          <ol aria-label="Senaste händelser">
            {(model.events.length
              ? [...model.events].reverse()
              : [{ id: 0, label: 'Start', text: 'Berätta. Följ förslagen. Spara när du är klar.' }]
            ).map((event) => (
              <li key={event.id}>
                <span>{event.label}</span>
                <p>{event.text}</p>
              </li>
            ))}
          </ol>
          <p className="voice-study-draft-caption">
            {model.assistantStatus} · {model.draftStatus}
          </p>
        </div>
      )}
      <FeedbackActions {...props} />
      <p className="voice-study-sr" role="status" aria-live="polite" aria-atomic="true">
        {model.micStatus}. {model.assistantStatus}. {model.draftStatus}. {model.latestSummary}
      </p>
    </section>
  );
}

export function VoiceStudyConversation({
  model,
  onDraft,
}: {
  model: VoiceStudyModel;
  onDraft: () => void;
}) {
  return (
    <div className="voice-study voice-study-conversation">
      {!model.sessionActive ? (
        <section className="voice-study-consent" aria-label="Starta ett samtal">
          <span className="voice-study-eyebrow">Tala med Skyttel</span>
          <h3>Berätta. Följ kartan.</h3>
          <p>
            OpenAI behandlar ditt tal, dina meddelanden, ditt utkast och relevanta kartuppgifter.
            Mikrofonen startar först när du väljer det.
          </p>
          <label>
            <input
              type="checkbox"
              checked={model.externalAi}
              onChange={(event) => model.setExternalAi(event.target.checked)}
            />
            <span>Jag tillåter att OpenAI behandlar uppgifterna i detta samtal.</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={model.mapWork}
              onChange={(event) => model.setMapWork(event.target.checked)}
            />
            <span>
              Jag tillåter förslag och sparande av hela mitt utkast när jag uttryckligen ber om det.
            </span>
          </label>
          <div className="voice-study-actions">
            <button
              type="button"
              className="voice-study-primary"
              disabled={!model.externalAi || !model.mapWork}
              onClick={() => model.startSession('voice')}
            >
              Starta talsamtal
            </button>
            <button
              type="button"
              disabled={!model.externalAi || !model.mapWork}
              onClick={() => model.startSession('text')}
            >
              Börja med text
            </button>
          </div>
          <p className="voice-study-muted">
            Samtalet sparas inte som hushållsinnehåll. Förslag finns kvar i ditt privata utkast.
          </p>
        </section>
      ) : (
        <>
          <div className="voice-study-session-heading">
            <MicrophoneStatus model={model} />
            <span>{model.assistantStatus}</span>
          </div>
          <div className="voice-study-actions">
            <button type="button" onClick={model.toggleMic}>
              {model.micLabel}
            </button>
            {model.mic !== 'off' && (
              <button type="button" onClick={model.endVoice}>
                Stäng av rösten
              </button>
            )}
            {(model.assistant === 'working' || model.assistant === 'speaking') && (
              <button type="button" onClick={model.interrupt}>
                Avbryt uppdrag
              </button>
            )}
          </div>
          <ol className="voice-study-transcript" aria-label="Samtalstext">
            {model.transcript.length === 0 && (
              <li className="voice-study-transcript-empty">
                Dina ord och Skyttels svar visas här. Prova familjeabonnemanget i provkontrollerna.
              </li>
            )}
            {model.transcript.map((line) => (
              <li key={line.id} data-speaker={line.speaker}>
                <span>{line.speaker}</span>
                <p>{line.text}</p>
              </li>
            ))}
          </ol>
          {model.clarification && (
            <div className="voice-study-question">
              <strong>Vilket kort menar du?</strong>
              <p>Bekräfta Kort 4242. Frågan behöver besvaras innan utkastet kan sparas.</p>
              <button type="button" onClick={model.chooseClarification}>
                Det är Kort 4242
              </button>
            </div>
          )}
          {model.saveState === 'conflict' && (
            <div className="voice-study-question">
              <strong>Vilket pris ska Familjeabonnemanget ha?</strong>
              <p>
                Ditt förslag: 199 kr. Sparat av någon annan: 219 kr. Ett val uppdaterar bara
                utkastet.
              </p>
              <button type="button" onClick={model.resolveConflict}>
                Behåll mitt förslag: 199 kr
              </button>
              <button type="button" onClick={onDraft}>
                Granska hela utkastet
              </button>
            </div>
          )}
          <form
            className="voice-study-composer"
            onSubmit={(event) => {
              event.preventDefault();
              model.submitText();
            }}
          >
            <label htmlFor="voice-study-message">Skriv till Skyttel</label>
            <textarea
              id="voice-study-message"
              value={model.textBuffer}
              onChange={(event) => model.setTextBuffer(event.target.value)}
              rows={2}
              placeholder="Skriv ett av exemplen nedan"
            />
            <button
              type="submit"
              className="voice-study-primary"
              disabled={!model.textBuffer.trim()}
            >
              Skicka
            </button>
          </form>
          <details className="voice-study-examples">
            <summary>Det här kan du skriva i prototypen</summary>
            <p>Endast dessa exempel tolkas; annan text ändrar inget.</p>
            <ul>
              {[example, 'Vad ändras?', 'Spara hela utkastet', 'Kort 4242', 'Avbryt'].map(
                (command) => (
                  <li key={command}>
                    <button type="button" onClick={() => model.setTextBuffer(command)}>
                      {command}
                    </button>
                  </li>
                ),
              )}
            </ul>
            <p>Familjeabonnemanget betyder: {exampleMeaning}</p>
          </details>
          <div className="voice-study-conversation-footer">
            <button type="button" onClick={onDraft}>
              Visa hela utkastet
            </button>
            <button type="button" onClick={model.endConversation}>
              Avsluta samtalet
            </button>
          </div>
          <p className="voice-study-muted">
            Att avsluta tar bort samtalsminnet. Utkast och kvitton finns kvar. Ett sparat resultat
            bekräftas av statusen och kvittot.
          </p>
        </>
      )}
    </div>
  );
}

export function VoiceStudyLab({
  model,
  variant,
  onVariant,
  onNoGraphics,
  newColor,
  onNewColor,
}: {
  model: VoiceStudyModel;
  variant: VoiceStudyVariant;
  onVariant: (variant: VoiceStudyVariant) => void;
  onNoGraphics?: () => void;
  newColor?: 'blue' | 'green';
  onNewColor?: (color: 'blue' | 'green') => void;
}) {
  const keys: VoiceStudyVariant[] = ['D', 'A', 'B', 'C'];
  function cycle(direction: number) {
    onVariant(keys[(keys.indexOf(variant) + direction + keys.length) % keys.length]);
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        target.closest(
          'input, textarea, select, button, [contenteditable="true"], [role="slider"], .ms-stage, .mp-map-area, .np-panel, .np-windows, .mp-navigation',
        ) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        onVariant(
          keys[
            (keys.indexOf(variant) + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) %
              keys.length
          ],
        );
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (import.meta.env.PROD) return null;
  return (
    <aside
      className="voice-study voice-study-lab np-lab mp-lab"
      aria-label="Prototypens provkontroller"
    >
      <div className="voice-study-lab-switcher">
        <span className="voice-study-lab-label">Kastbar talprototyp</span>
        <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
          ←
        </button>
        <span>
          <strong>
            {variant} · {variants[variant].name}
          </strong>
          <small>{variants[variant].description}</small>
        </span>
        <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
          →
        </button>
        <details className="voice-study-lab-controls">
          <summary>Prova tillstånd</summary>
          <div className="voice-study-lab-menu">
            <p>
              Simulerat tal, AI och sparande. Inget ljud spelas in eller skickas. Alla uppgifter är
              påhittade.
            </p>
            {onNewColor && (
              <fieldset className="voice-study-color-choice">
                <legend>Färg för nya objekt och samband</legend>
                <button
                  type="button"
                  aria-pressed={newColor === 'blue'}
                  onClick={() => onNewColor('blue')}
                >
                  Blått för nytt
                </button>
                <button
                  type="button"
                  aria-pressed={newColor === 'green'}
                  onClick={() => onNewColor('green')}
                >
                  Grönt för nytt
                </button>
              </fieldset>
            )}
            <div className="voice-study-lab-group">
              <strong>För samtalet framåt</strong>
              <button
                type="button"
                disabled={model.mic !== 'connecting'}
                onClick={model.finishConnection}
              >
                Anslutning klar
              </button>
              <button
                type="button"
                disabled={!model.sessionActive || model.mic !== 'listening'}
                onClick={model.proposeExample}
              >
                Tal klart: familjeabonnemang
              </button>
              <button
                type="button"
                disabled={model.assistant !== 'working'}
                onClick={model.finishWork}
              >
                Arbete klart
              </button>
              <button
                type="button"
                disabled={model.assistant !== 'speaking'}
                onClick={model.finishSpeech}
              >
                Svar klart
              </button>
              <button
                type="button"
                disabled={!model.sessionActive || model.draftCount === 0}
                onClick={model.askClarification}
              >
                Tal klart: oklart kort
              </button>
            </div>
            <div className="voice-study-lab-group">
              <strong>Välj sparförsökets resultat</strong>
              <button
                type="button"
                disabled={model.saveState !== 'pending' && !model.checking}
                onClick={() => model.resolveSave('saved')}
              >
                Kvitto: sparat
              </button>
              <button
                type="button"
                disabled={model.saveState !== 'pending' && !model.checking}
                onClick={() => model.resolveSave('failed')}
              >
                Kvitto: avvisat
              </button>
              <button
                type="button"
                disabled={model.saveState !== 'pending'}
                onClick={() => model.resolveSave('unknown')}
              >
                Kvittot saknas
              </button>
              <button
                type="button"
                disabled={model.saveState !== 'pending'}
                onClick={() => model.resolveSave('conflict')}
              >
                Priskonflikt
              </button>
            </div>
            <div className="voice-study-lab-group">
              <strong>Störningar och alternativ</strong>
              <button
                type="button"
                disabled={!model.sessionActive}
                onClick={() => model.simulateFailure('microphone')}
              >
                Mikrofon nekad
              </button>
              <button
                type="button"
                disabled={!model.sessionActive}
                onClick={() => model.simulateFailure('network')}
              >
                Nätet bryts
              </button>
              {onNoGraphics && (
                <button type="button" onClick={onNoGraphics}>
                  Visa utan grafik
                </button>
              )}
            </div>
            <p className="voice-study-state">
              Tillstånd: mikrofon {model.mic} · assistent {model.assistant} · sparande{' '}
              {model.saveState} · {model.draftCount} förslag · medgivanden{' '}
              {model.consented ? 'klara' : 'saknas'} · fråga{' '}
              {model.clarification ? 'öppen' : 'ingen'}. Samma tillstånd följer med mellan
              alternativen.
            </p>
          </div>
        </details>
      </div>
    </aside>
  );
}
