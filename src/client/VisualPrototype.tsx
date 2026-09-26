// Kastbar visuell studie: fyra riktningar på /?prototype=visual&variant=D.
// Endast påhittade uppgifter. Ingen anslutning till hushåll, mikrofon eller API.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import largeLogo from '../../docs/images/shuttle-logo-transparent.png';
import smallLogo from '../../docs/images/shuttle-logo-transparent-small.png';
import { VisualPrototypeD } from './VisualPrototypeD.js';
import { VisualPrototypeMap } from './VisualPrototypeMap.js';
import './visual-prototype.css';

type Variant = 'A' | 'B' | 'C' | 'D';
type Scene = 'ready' | 'listening' | 'draft' | 'saving' | 'saved' | 'error';
const variants = {
  A: { name: 'Nattljus', description: 'Mörk helhet · svävande ytor · lågmält färgljus' },
  B: { name: 'Dagsljus', description: 'Ljus helhet · tydliga linjer · generöst med luft' },
  C: { name: 'Horisont', description: 'Mörk karta · ljusa arbetsytor · tydliga nivåer' },
  D: { name: 'Fri rymd', description: 'Hela ytan · flytande verktyg · ljust och mörkt' },
};
const statuses: Record<Scene, { title: string; text: string; icon: string }> = {
  ready: { title: 'Din gemensamma karta', text: 'Inga osparade ändringar', icon: 'check' },
  listening: { title: 'Lyssnar', text: 'Berätta vad som hör ihop. Du kan avbryta.', icon: 'mic' },
  draft: {
    title: 'Ditt privata utkast · 2 ändringar',
    text: 'Ännu inte i den gemensamma kartan. Säg ”spara” när du är klar.',
    icon: 'edit',
  },
  saving: { title: 'Sparar hela utkastet…', text: 'Väntar på resultat.', icon: 'clock' },
  saved: {
    title: 'Hela utkastet är sparat',
    text: 'Ändringarna finns i hushållets gemensamma karta.',
    icon: 'check',
  },
  error: {
    title: 'Ändringarna kunde inte sparas',
    text: 'Ditt privata utkast finns kvar. Försök igen.',
    icon: 'alert',
  },
};

export function PrototypeIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    edit: 'm15 4 5 5M4 15 16 3l5 5L9 20l-6 1 1-6',
    close: 'm6 6 12 12M18 6 6 18',
    check: 'm5 12 4 4L19 6',
    clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    alert: 'M12 8v5M12 17h.01M12 3 2 21h20L12 3',
    settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 11v6M12 7h.01',
    activity: 'M3 12h4l3-7 4 14 3-7h4',
    arrow: 'm9 5 7 7-7 7',
    back: 'm15 5-7 7 7 7',
    text: 'M4 5h16M12 5v15M8 20h8',
  };
  return (
    <svg
      className="vp-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.list} />
    </svg>
  );
}

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`vp-brand ${large ? 'vp-brand-large' : ''}`}>
      <img src={large ? largeLogo : smallLogo} alt="" />
      <span>
        skyttel<span className="vp-brand-dot">.</span>
      </span>
    </div>
  );
}

export function Detail({ onClose, onChange }: { onClose: () => void; onChange: () => void }) {
  const [name, setName] = useState('Familjeabonnemang');
  const [price, setPrice] = useState('189');
  return (
    <aside className="vp-detail" aria-labelledby="vp-detail-title">
      <div className="vp-detail-top">
        <span className="vp-eyebrow">ABONNEMANG</span>
        <button
          className="vp-icon-button"
          type="button"
          onClick={onClose}
          aria-label="Stäng detaljer"
        >
          <PrototypeIcon name="close" />
        </button>
      </div>
      <div className="vp-detail-symbol">♫</div>
      <h2 id="vp-detail-title" tabIndex={-1}>
        Familjeabonnemang
      </h2>
      <p className="vp-muted">Musikgläntan · Musik för hela hushållet</p>
      <div className="vp-amount">
        189 <span>kr / månad</span>
      </div>
      <div className="vp-facts">
        <div>
          <span>Betalar</span>
          <strong>Alex</strong>
        </div>
        <div>
          <span>Betalningsmedel</span>
          <strong>Gemensamt bankkonto</strong>
        </div>
        <div>
          <span>Använder tjänsten</span>
          <strong>Alex och Lo</strong>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onChange();
        }}
      >
        <h3>Ändra uppgifter</h3>
        <label htmlFor="vp-name">Namn</label>
        <input id="vp-name" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="vp-field-row">
          <div>
            <label htmlFor="vp-price">Pris, kr</label>
            <input
              id="vp-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="vp-interval">Intervall</label>
            <select id="vp-interval" defaultValue="month">
              <option value="month">Månad</option>
              <option value="year">År</option>
            </select>
          </div>
        </div>
        <p className="vp-hint">Förslaget läggs i ditt privata utkast.</p>
        <button className="vp-primary vp-wide" type="submit">
          Lägg i utkast <PrototypeIcon name="arrow" />
        </button>
      </form>
    </aside>
  );
}

export function Status({ scene, onSave }: { scene: Scene; onSave: () => void }) {
  const status = statuses[scene];
  return (
    <div className={`vp-status vp-status-${scene}`} role="status">
      <span className="vp-status-symbol">
        <PrototypeIcon name={status.icon} />
      </span>
      <div>
        <strong>{status.title}</strong>
        <span>{status.text}</span>
      </div>
      {scene === 'draft' || scene === 'error' ? (
        <button type="button" onClick={onSave}>
          {scene === 'error' ? 'Försök igen' : 'Spara hela utkastet'}
        </button>
      ) : null}
    </div>
  );
}

function Voice({ scene, setScene }: { scene: Scene; setScene: (scene: Scene) => void }) {
  return (
    <div className="vp-voice">
      <button
        type="button"
        className={`vp-primary vp-speak ${scene === 'listening' ? 'vp-listening' : ''}`}
        onClick={() => setScene(scene === 'listening' ? 'ready' : 'listening')}
      >
        <PrototypeIcon name="mic" />
        {scene === 'listening' ? 'Avsluta samtal' : 'Prata med Skyttel'}
        <span className="vp-wave" aria-hidden="true">
          ▂▅▇▃▆▂
        </span>
      </button>
      <span>
        {scene === 'listening'
          ? 'Samtalsläge visas som exempel'
          : 'Berätta. Se sambanden växa fram.'}
      </span>
    </div>
  );
}

export function VisualPrototype() {
  const [params, setParams] = useSearchParams();
  const candidate = params.get('variant');
  const variant: Variant =
    candidate === 'B' || candidate === 'C' || candidate === 'D' ? candidate : 'A';
  const theme = params.get('theme') === 'light' ? 'light' : 'dark';
  function setTheme(next: 'dark' | 'light') {
    setParams(
      (previous) => {
        previous.set('theme', next);
        return previous;
      },
      { replace: true },
    );
  }
  const [sound, setSound] = useState(false);
  const [detail, setDetail] = useState(false);
  const [scene, setScene] = useState<Scene>('ready');
  const [utility, setUtility] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const detailTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const switcher = document.querySelector('.vp-switcher');
    const root = document.querySelector('.vp-root');
    if (!switcher || !root) return;
    const observer = new ResizeObserver(() => {
      const height = switcher.getBoundingClientRect().height;
      const inFlow = height > (variant === 'D' ? 190 : 130);
      root.classList.toggle('vp-large-controls', inFlow);
      (root as HTMLElement).style.setProperty(
        '--vp-switcher-clearance',
        `${inFlow ? 20 : height + 28}px`,
      );
    });
    observer.observe(switcher);
    return () => observer.disconnect();
  }, [variant]);
  useEffect(() => {
    if (variant === 'D') return;
    if (detail) {
      detailTrigger.current = document.activeElement as HTMLElement;
      document.getElementById('vp-detail-title')?.focus({ preventScroll: true });
    } else detailTrigger.current?.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 760px)').matches) {
      if (detail) document.querySelector('.vp-detail')?.scrollIntoView({ block: 'start' });
      else document.querySelector('.vp-root')?.scrollTo({ top: 0 });
    }
  }, [detail, variant]);
  function cycle(direction: number) {
    const keys: Variant[] = ['A', 'B', 'C', 'D'];
    const next = keys[(keys.indexOf(variant) + direction + keys.length) % keys.length];
    setParams(
      (previous) => {
        previous.set('variant', next);
        return previous;
      },
      { replace: true },
    );
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') {
        setDetail(false);
        setUtility(null);
        return;
      }
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]'))
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const toolbar = (
    <div className="vp-tools">
      <button
        type="button"
        aria-label="Sök"
        onClick={() => setUtility(utility === 'search' ? null : 'search')}
      >
        <PrototypeIcon name="search" />
        <span>Sök</span>
      </button>
      <button
        type="button"
        aria-label="Lista"
        onClick={() => setUtility(utility === 'list' ? null : 'list')}
      >
        <PrototypeIcon name="list" />
        <span>Lista</span>
      </button>
      <button
        type="button"
        aria-label="Skriv"
        onClick={() => setUtility(utility === 'text' ? null : 'text')}
      >
        <PrototypeIcon name="text" />
        <span>Skriv</span>
      </button>
    </div>
  );
  return (
    <div className={`vp-root vp-variant-${variant}`} data-theme={theme}>
      <div className="vp-study-note">
        VISUELL PROTOTYP <span>Påhittat hushåll · Tal och sparande är simulerade</span>
      </div>
      {variant === 'D' ? (
        <VisualPrototypeD
          scene={scene}
          setScene={setScene}
          detail={detail}
          setDetail={setDetail}
          theme={theme}
          setTheme={setTheme}
          sound={sound}
          setSound={setSound}
        />
      ) : (
        <div className={`vp-app ${detail ? 'vp-with-detail' : ''}`}>
          <header className="vp-header">
            <Brand large={variant === 'B'} />
            <div className="vp-household">
              <span>Hushållet Lind</span>
              <span className="vp-household-sub">Er gemensamma karta</span>
            </div>
            <button
              className="vp-profile"
              type="button"
              onClick={() => setUtility(utility === 'profile' ? null : 'profile')}
              aria-label="Visa exempel på användarmeny"
            >
              AL
            </button>
          </header>
          {variant === 'B' && (
            <div className="vp-editorial">
              <span className="vp-eyebrow">DITT HUSHÅLL, SAMMANHÄNGANDE</span>
              <h1>
                {'Det hänger '}
                <br />
                ihop.
              </h1>
              <p>
                {'Människorna, tjänsterna '}
                <br />
                och allt däremellan.
              </p>
              <div className="vp-editorial-rule" />
              <span className="vp-editorial-index">01 / HUSHÅLLSKARTAN</span>
            </div>
          )}
          <main className="vp-workspace">
            <div className="vp-map-heading">
              <div>
                <span className="vp-eyebrow">HUSHÅLLET LIND</span>
                <h1>Din hushållskarta</h1>
              </div>
              {toolbar}
            </div>
            <div className="vp-map-area">
              <VisualPrototypeMap variant={variant} onSelect={() => setDetail(true)} />
              <div className="vp-map-caption">
                <span className="vp-map-caption-dot" />
                Gemensam karta<span className="vp-caption-secondary">Illustrerad rymdvy</span>
              </div>
            </div>
            <div className="vp-bottom">
              <Status scene={scene} onSave={() => setScene('saving')} />
              <Voice scene={scene} setScene={setScene} />
            </div>
          </main>
          {detail && <Detail onClose={() => setDetail(false)} onChange={() => setScene('draft')} />}
          {utility && (
            <section className="vp-utility" aria-label="Kompletterande exempelvy">
              <div className="vp-detail-top">
                <h2>
                  {utility === 'text'
                    ? 'Skriv till Skyttel'
                    : utility === 'search'
                      ? 'Sök i kartan'
                      : utility === 'list'
                        ? 'Objekt i kartan'
                        : 'Alex Lind'}
                </h2>
                <button
                  type="button"
                  className="vp-icon-button"
                  onClick={() => setUtility(null)}
                  aria-label="Stäng exempelvy"
                >
                  <PrototypeIcon name="close" />
                </button>
              </div>
              {utility === 'text' ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setScene('draft');
                    setUtility(null);
                  }}
                >
                  <label htmlFor="vp-message">Ditt meddelande</label>
                  <textarea
                    id="vp-message"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Berätta om ett samband…"
                  />
                  <button type="submit" className="vp-primary">
                    Visa exempelutkast
                  </button>
                </form>
              ) : utility === 'profile' ? (
                <p>
                  Skyttel-användare · Administratör
                  <br />
                  <span className="vp-muted">Menyns innehåll prövas i ett senare beslut.</span>
                </p>
              ) : (
                <>
                  <label htmlFor="vp-search">Hitta ett objekt</label>
                  <input
                    id="vp-search"
                    placeholder="Sök namn…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <div className="vp-example-list">
                    {['Familjeabonnemang', 'Musikgläntan', 'Alex', 'Lo', 'Gemensamt bankkonto']
                      .filter((name) =>
                        name.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
                      )
                      .map((name) => (
                        <button
                          type="button"
                          key={name}
                          disabled={name !== 'Familjeabonnemang'}
                          onClick={() => {
                            setDetail(true);
                            setUtility(null);
                          }}
                        >
                          {name}
                          {name === 'Familjeabonnemang' && <PrototypeIcon name="arrow" />}
                        </button>
                      ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
      {import.meta.env.DEV && (
        <section className="vp-switcher" aria-label="Prototypens visningskontroller">
          <div className="vp-switcher-main">
            <button type="button" onClick={() => cycle(-1)} aria-label="Föregående riktning">
              <PrototypeIcon name="back" />
            </button>
            <div aria-live="polite">
              <strong>
                {variant} · {variants[variant].name}
              </strong>
              <span>{variants[variant].description}</span>
            </div>
            <button type="button" onClick={() => cycle(1)} aria-label="Nästa riktning">
              <PrototypeIcon name="arrow" />
            </button>
          </div>
          <div className="vp-switcher-options">
            <button type="button" onClick={() => setDetail(!detail)} aria-pressed={detail}>
              {detail ? 'Visa bara kartan' : variant === 'D' ? 'Visa detaljer' : 'Visa formulär'}
            </button>
            <label>
              Tillstånd{' '}
              <select value={scene} onChange={(event) => setScene(event.target.value as Scene)}>
                <option value="ready">Grundläge</option>
                <option value="listening">Lyssnar</option>
                <option value="draft">Privat utkast</option>
                <option value="saving">Sparar</option>
                <option value="saved">Verifierat sparbesked (exempel)</option>
                <option value="error">Sparfel</option>
              </select>
            </label>
            {variant === 'D' && (
              <button
                type="button"
                disabled={scene !== 'listening'}
                aria-pressed={sound}
                onClick={() => setSound(!sound)}
              >
                {sound ? 'Simulera tystnad' : 'Simulera hörbart tal'}
              </button>
            )}
          </div>
          {variant === 'D' && (
            <p className="vp-simulation-note">
              Visuell prototyp · {theme === 'dark' ? 'Mörkt' : 'Ljust'} tema · Ingen riktig mikrofon
            </p>
          )}
        </section>
      )}
    </div>
  );
}
