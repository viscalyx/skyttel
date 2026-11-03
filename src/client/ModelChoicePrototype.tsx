// THROWAWAY: three conversation layouts on /households/prototype?variant=A|B|C.
// Fixture shell only: no authentication, model, microphone, or persistence calls.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import './workspace.css';
import './model-choice-prototype.css';

type Choice = { model: string; level: string };
const initial = { model: 'Terra', level: 'Hög' };
const variants = ['A', 'B', 'C'] as const;
type Variant = (typeof variants)[number];
const names = { A: 'I samtalets huvud', B: 'Vid meddelandet', C: 'Gemensam sidopanel' };
const label = (choice: Choice) => `GPT-6.1 ${choice.model} · ${choice.level}`;

function Choices({
  choice,
  choose,
  unavailable,
}: {
  choice: Choice;
  choose: (next: Choice) => void;
  unavailable: string;
}) {
  const id = useId();
  return (
    <div className="mp-choices">
      <label htmlFor={`${id}-model`}>
        Modell
        <select
          id={`${id}-model`}
          value={choice.model}
          onChange={(e) => choose({ ...choice, model: e.target.value })}
        >
          {['Terra', 'Sol'].map((model) => (
            <option key={model} value={model} disabled={unavailable === model}>
              GPT-6.1 {model}
              {unavailable === model ? ' — inte tillgänglig' : ''}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-level`}>
        Resonemangsnivå
        <select
          id={`${id}-level`}
          value={choice.level}
          aria-describedby={`${id}-help`}
          onChange={(e) => choose({ ...choice, level: e.target.value })}
        >
          {['Låg', 'Medium', 'Hög'].map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      <p id={`${id}-help`} className="mp-help">
        Hög ger mer utrymme för krävande uppgifter och kan ta längre tid. Låg och medium ger mindre
        utrymme. Resultat och väntetid kan variera.
      </p>
    </div>
  );
}

export function ModelChoicePrototype() {
  const [variant, setVariant] = useState<Variant>(() => {
    const value = new URLSearchParams(location.search).get('variant');
    return variants.find((v) => v === value) ?? 'A';
  });
  const [choice, setChoice] = useState<Choice>(initial);
  const [remembered, setRemembered] = useState<Choice>(initial);
  const [running, setRunning] = useState<Choice | null>(null);
  const [unavailable, setUnavailable] = useState('');
  const [textOpen, setTextOpen] = useState(true);
  const [voice, setVoice] = useState(false);
  const [dark, setDark] = useState(false);
  const [message, setMessage] = useState('Vilka abonnemang betalar Alex?');
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState('Visa hushållets abonnemang.');
  const [answer, setAnswer] = useState(
    'Här är hushållets abonnemang. Vill du se vem som betalar dem?',
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const blocked = choice.model === unavailable;
  const pending = running && label(running) !== label(choice);
  const switchVariant = useCallback((delta: number) => {
    setVariant((current) => {
      const next =
        variants[(variants.indexOf(current) + delta + variants.length) % variants.length];
      const url = new URL(location.href);
      url.searchParams.set('variant', next);
      history.replaceState(null, '', url);
      return next;
    });
  }, []);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        !(event.target instanceof HTMLElement) ||
        event.target.closest('input, textarea, select, [contenteditable], [role="slider"]') ||
        dialog.current?.open
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        switchVariant(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [switchVariant]);
  function choose(next: Choice) {
    setChoice(next);
    setRemembered(next);
    setFeedback(
      `${label(next)} valt. ${running ? 'Gäller när nästa begäran börjar behandlas.' : 'Gäller nästa begäran.'}`,
    );
  }
  function open(event: React.MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    dialog.current?.showModal();
  }
  function start() {
    if (running || blocked) return;
    setRunning({ ...choice });
    setSent(message || 'Vilka abonnemang betalar Alex?');
    setMessage('');
    setFeedback(`Skyttel arbetar med ${label(choice)}.`);
  }
  function finish() {
    setRunning(null);
    setAnswer('Alex betalar för musiktjänsten. Uppgiften finns i kartan.');
    setFeedback('Svaret är klart. Ditt utkast är kvar.');
  }
  const controls = <Choices choice={choice} choose={choose} unavailable={unavailable} />;
  const status = (
    <div className="mp-status" role="status" aria-live="polite" aria-atomic="true">
      {blocked ? (
        <p>
          GPT-6.1 {choice.model} är inte tillgänglig. Välj en annan modell för att fortsätta.
          Samtalet och ditt utkast är kvar.
        </p>
      ) : null}
      {running ? (
        <p>
          <strong>Pågår: {label(running)}</strong>
          {pending && (
            <>
              <br />
              Nästa begäran: {label(choice)}.
            </>
          )}
        </p>
      ) : null}
      <span>{feedback}</span>
    </div>
  );
  const scope = (
    <p className="mp-help">
      Samma val gäller text och röst. GPT-Live 1 lyssnar och talar; den valda modellen arbetar med
      dina uppdrag.
    </p>
  );
  const preferences = (
    <p className="mp-help">
      Ditt senaste val används i nya samtal på alla dina enheter och i alla dina hushåll. Andra
      pågående samtal behåller sina val.
    </p>
  );
  const picker = (
    <button className="mp-picker" type="button" aria-haspopup="dialog" onClick={open}>
      {label(choice)} <span aria-hidden="true">⌄</span>
      <span className="visually-hidden">. Ändra modell och resonemangsnivå</span>
    </button>
  );
  return (
    <div className="household-map workspace-shell mp-root" data-theme={dark ? 'dark' : 'light'}>
      <header className="mp-header">
        <strong>
          Skyttel <span> / Hushållet Lind</span>
        </strong>
        <span className="mp-tag">Kastbar prototyp · exempeldata</span>
      </header>
      <main className={`mp-layout mp-variant-${variant}`}>
        <nav className="mp-tools" aria-label="Samtalets visning">
          <button type="button" aria-pressed={textOpen} onClick={() => setTextOpen(!textOpen)}>
            Textvy
          </button>
          <button type="button" aria-pressed={voice} onClick={() => setVoice(!voice)}>
            Röstläge
          </button>
          {variant === 'C' && (
            <button type="button" onClick={open} aria-haspopup="dialog">
              Samtalsval
            </button>
          )}
        </nav>
        <section className="mp-map" aria-label="Hushållets karta, exempeldata">
          <div className="mp-node mp-person">
            Alex <small>Person</small>
          </div>
          <div className="mp-link">betalar ↓</div>
          <div className="mp-node">
            Musikabonnemang <small>129 kr / månad</small>
          </div>
          <div className="mp-link">gäller ↓</div>
          <div className="mp-node">
            Musiktjänst <small>Tjänst</small>
          </div>
          <p className="mp-draft">
            Ditt utkast · 1 föreslagen ändring
            <br />
            <small>Kontaktadress för musiktjänsten</small>
          </p>
        </section>
        <div className="mp-conversation">
          {variant === 'A' && (
            <section className="mp-card mp-shared" aria-label="Samtalets modellval">
              <div className="mp-row">
                <h1>Samtal med Skyttel</h1>
                {picker}
              </div>
              {scope}
              {status}
            </section>
          )}
          {variant === 'C' && (
            <aside className="mp-card mp-sidebar" aria-label="Samtalsval">
              <h1>Samtalsval</h1>
              {controls}
              {scope}
              {preferences}
              {status}
            </aside>
          )}
          {voice && (
            <section className="mp-card mp-voice" aria-label="Röstruta">
              <strong>▥ {running ? 'Skyttel arbetar' : 'Lyssnar'}</strong>
              <span>Simulerat röstläge</span>
              {variant === 'B' && (
                <>
                  {picker}
                  {!textOpen && status}
                </>
              )}
            </section>
          )}
          {textOpen && (
            <section className="mp-card mp-text" aria-label="Textvy">
              <header>
                <h2>Samtalstext</h2>
                <span className="mp-help">Kontext 12 %</span>
              </header>
              <div className="mp-messages">
                <p className="mp-user">{sent}</p>
                <p>{answer}</p>
                {running && <p>Skyttel arbetar…</p>}
              </div>
              {variant === 'B' && (
                <div className="mp-inline">
                  <strong>Val för ditt uppdrag</strong>
                  {controls}
                  {status}
                  <details>
                    <summary>Text och röst använder samma val</summary>
                    {scope}
                    {preferences}
                  </details>
                </div>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  start();
                }}
              >
                <label htmlFor="mp-message">Skriv till Skyttel</label>
                <textarea
                  id="mp-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit" disabled={Boolean(running) || blocked}>
                  Skicka exempel
                </button>
              </form>
            </section>
          )}
          {!textOpen && !voice && (
            <section className="mp-card">
              <p>Samtalet och ditt utkast är kvar.</p>
              {variant === 'B' && picker}
            </section>
          )}
        </div>
      </main>
      <dialog
        ref={dialog}
        className="mp-dialog"
        aria-labelledby="mp-dialog-title"
        onClose={() => opener.current?.focus()}
      >
        <h2 id="mp-dialog-title">Modell och resonemangsnivå</h2>
        {controls}
        {scope}
        {preferences}
        <p>
          Ändringar gäller när nästa begäran börjar behandlas. Pågående arbete fortsätter med sina
          ursprungliga val.
        </p>
        {status}
        <button type="button" onClick={() => dialog.current?.close()}>
          Klart
        </button>
      </dialog>
      <aside className="mp-lab" aria-label="Prototypens scenarier">
        <details>
          <summary>Prova tillstånd · endast prototyp</summary>
          <div className="mp-lab-actions">
            <button type="button" onClick={start} disabled={Boolean(running) || blocked}>
              Starta arbete
            </button>
            <button type="button" onClick={finish} disabled={!running}>
              Slutför arbete
            </button>
            <button type="button" onClick={() => setUnavailable(unavailable ? '' : choice.model)}>
              {unavailable ? 'Återställ stöd' : 'Gör vald modell otillgänglig'}
            </button>
            <button type="button" onClick={() => setDark(!dark)}>
              Byt tema
            </button>
          </div>
          <p>
            Prova: starta arbete → ändra val → slutför → starta igen. Växla text/röst. Ingen
            mikrofon eller modell används. Allt nollställs vid omladdning.
          </p>
          <output aria-live="off">
            Variant {variant} | Samtal: {label(choice)} | Pågår:{' '}
            {running ? label(running) : 'inget'} | Ihågkommet (simulerat): {label(remembered)} |
            Otillgänglig: {unavailable || 'ingen'} | Text: {String(textOpen)} | Röst:{' '}
            {String(voice)} | Utkast: 1
          </output>
        </details>
      </aside>
      {import.meta.env.DEV && (
        <nav className="mp-switcher" aria-label="Prototypvarianter">
          <button type="button" aria-label="Föregående variant" onClick={() => switchVariant(-1)}>
            ←
          </button>
          <strong aria-live="polite">
            {variant} · {names[variant]}
          </strong>
          <button type="button" aria-label="Nästa variant" onClick={() => switchVariant(1)}>
            →
          </button>
        </nav>
      )}
    </div>
  );
}
