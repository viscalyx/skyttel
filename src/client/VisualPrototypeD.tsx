// Kastbar variant D: en obruten karta med flytande verktyg, i ljust och mörkt tema.
import { useEffect, useRef, useState } from 'react';
import { Brand, Detail, PrototypeIcon, Status } from './VisualPrototype.js';
import { VisualPrototypeMap } from './VisualPrototypeMap.js';
import './visual-prototype-d.css';

type Scene = 'ready' | 'listening' | 'draft' | 'saving' | 'saved' | 'error';
type Theme = 'dark' | 'light';

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      className="vp-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {theme === 'dark' ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      ) : (
        <path d="M20 15.5A9 9 0 0 1 8.5 4a9 9 0 1 0 11.5 11.5Z" />
      )}
    </svg>
  );
}

export function VisualPrototypeD({
  scene,
  setScene,
  detail,
  setDetail,
  theme,
  setTheme,
  sound,
  setSound,
}: {
  scene: Scene;
  setScene: (scene: Scene) => void;
  detail: boolean;
  setDetail: (detail: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sound: boolean;
  setSound: (sound: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [utility, setUtility] = useState<'text' | 'list' | null>(null);
  const [message, setMessage] = useState('');
  const utilityTrigger = useRef<HTMLElement | null>(null);
  const listening = scene === 'listening';
  useEffect(() => {
    if (!utility) return;
    document.getElementById('vp-d-utility-title')?.focus({ preventScroll: true });
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUtility(null);
        utilityTrigger.current?.focus({ preventScroll: true });
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [utility]);

  function openUtility(next: 'text' | 'list') {
    utilityTrigger.current = document.activeElement as HTMLElement;
    setDetail(false);
    setUtility(utility === next ? null : next);
  }

  function closeUtility() {
    setUtility(null);
    utilityTrigger.current?.focus({ preventScroll: true });
  }

  return (
    <div
      className={`vp-app vp-app-D${expanded ? ' vp-d-expanded' : ''}${detail ? ' vp-d-detail-open' : ''}`}
    >
      <VisualPrototypeMap
        variant="A"
        onSelect={() => {
          setUtility(null);
          setDetail(true);
        }}
      />

      <nav className="vp-d-toolbox" aria-label="Kartans verktyg">
        <div className="vp-d-brand">
          <Brand />
        </div>
        <div className="vp-d-actions">
          <button
            type="button"
            className={`vp-d-action vp-d-talk${listening ? ' vp-d-talk-active' : ''}`}
            aria-label={listening ? 'Avsluta samtal' : 'Prata med Skyttel'}
            title={listening ? 'Avsluta samtal' : 'Prata med Skyttel'}
            aria-pressed={listening}
            onClick={() => {
              setScene(listening ? 'ready' : 'listening');
              setSound(false);
            }}
          >
            {listening ? (
              <span
                className={`vp-d-waveform${sound ? ' vp-d-waveform-sound' : ''}`}
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4].map((bar) => (
                  <i key={bar} />
                ))}
              </span>
            ) : (
              <PrototypeIcon name="mic" />
            )}
            <span className="vp-d-label">{listening ? 'Avsluta samtal' : 'Prata med Skyttel'}</span>
            {listening && <span className="vp-d-stop" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="vp-d-action"
            aria-label="Skriv till Skyttel"
            title="Skriv till Skyttel"
            aria-expanded={utility === 'text'}
            onClick={() => openUtility('text')}
          >
            <PrototypeIcon name="text" />
            <span className="vp-d-label">Skriv till Skyttel</span>
          </button>
          <button
            type="button"
            className="vp-d-action"
            aria-label="Visa kartan som lista"
            title="Visa kartan som lista"
            aria-expanded={utility === 'list'}
            onClick={() => openUtility('list')}
          >
            <PrototypeIcon name="list" />
            <span className="vp-d-label">Kartan som lista</span>
          </button>
        </div>
        <div className="vp-d-toolbox-footer">
          <button
            type="button"
            className="vp-d-action"
            aria-label={theme === 'dark' ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
            title={theme === 'dark' ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <ThemeIcon theme={theme} />
            <span className="vp-d-label">{theme === 'dark' ? 'Ljust tema' : 'Mörkt tema'}</span>
          </button>
          <button
            type="button"
            className="vp-d-action vp-d-expand"
            aria-label={expanded ? 'Fäll ihop verktygslådan' : 'Expandera verktygslådan'}
            title={expanded ? 'Fäll ihop verktygslådan' : 'Expandera verktygslådan'}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <PrototypeIcon name={expanded ? 'back' : 'arrow'} />
            <span className="vp-d-label">Fäll ihop</span>
          </button>
        </div>
      </nav>

      <div className="vp-d-context">
        <span className="vp-d-context-dot" />
        Hushållet Lind<span>Gemensam karta</span>
      </div>
      <div className="vp-d-status">
        <Status scene={scene} onSave={() => setScene('saving')} />
        {listening && <p className="vp-d-sound-status">{sound ? 'Tal hörs' : 'Väntar på tal'}</p>}
      </div>

      {utility && (
        <aside className="vp-d-utility" aria-labelledby="vp-d-utility-title">
          <div className="vp-detail-top">
            <h2 id="vp-d-utility-title" tabIndex={-1}>
              {utility === 'text' ? 'Skriv till Skyttel' : 'Kartan som lista'}
            </h2>
            <button
              type="button"
              className="vp-icon-button"
              aria-label="Stäng panel"
              onClick={closeUtility}
            >
              <PrototypeIcon name="close" />
            </button>
          </div>
          {utility === 'text' ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) {
                  setScene('draft');
                  closeUtility();
                }
              }}
            >
              <label htmlFor="vp-d-message">Vad vill du lägga till eller ändra?</label>
              <textarea
                id="vp-d-message"
                placeholder="Familjeabonnemanget kostar 199 kr i månaden…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <p className="vp-hint">
                I den här prototypen visas ett exempelutkast när du skickar.
              </p>
              <button type="submit" className="vp-primary vp-wide" disabled={!message.trim()}>
                Visa exempelutkast
                <PrototypeIcon name="arrow" />
              </button>
            </form>
          ) : (
            <>
              <p className="vp-muted">Samma hushåll, utan att navigera i rymdkartan.</p>
              <ul className="vp-d-object-list">
                <li>
                  <strong>Alex</strong>
                  <span>Står på familjeabonnemanget. Använder Alex musikkonto.</span>
                </li>
                <li>
                  <strong>Lo</strong>
                  <span>Använder Musikgläntan.</span>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setUtility(null);
                      setDetail(true);
                    }}
                  >
                    <span>
                      <strong>Familjeabonnemang</strong>
                      <span>
                        189 kr / månad · Ger tillgång till Musikgläntan. Betalas från Gemensamt
                        bankkonto.
                      </span>
                    </span>
                    <PrototypeIcon name="arrow" />
                  </button>
                </li>
                <li>
                  <strong>Musikgläntan</strong>
                  <span>Musiktjänst. Alex musikkonto hör till tjänsten.</span>
                </li>
                <li>
                  <strong>Alex musikkonto</strong>
                  <span>Tjänstekonto · Inloggningsadress: alex@example.test</span>
                </li>
                <li>
                  <strong>Gemensamt bankkonto</strong>
                  <span>Bankkonto · Kort ·· 4242 är kopplat till bankkontot.</span>
                </li>
              </ul>
            </>
          )}
        </aside>
      )}
      {detail && <Detail onClose={() => setDetail(false)} onChange={() => setScene('draft')} />}
    </div>
  );
}
