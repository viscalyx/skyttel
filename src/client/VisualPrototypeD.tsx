// Kastbar variant D: en obruten karta med flytande verktyg, i ljust och mörkt tema.
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Brand, Detail, PrototypeIcon, Status } from './VisualPrototype.js';
import { VisualPrototypeMap } from './VisualPrototypeMap.js';
import './visual-prototype-d.css';

type Scene = 'ready' | 'listening' | 'draft' | 'saving' | 'saved' | 'error';
type Theme = 'dark' | 'light';
type MapObject = { id: string; name: string; type: string };
const objectDetails: Record<
  string,
  { name: string; type: string; description: string; rows: [string, string][] }
> = {
  alex: {
    name: 'Alex',
    type: 'Person',
    description: 'En person i hushållet Lind.',
    rows: [
      ['Står på avtalet', 'Familjeabonnemang'],
      ['Använder', 'Alex musikkonto'],
    ],
  },
  lo: {
    name: 'Lo',
    type: 'Person',
    description: 'En person i hushållet Lind.',
    rows: [['Använder', 'Musikgläntan']],
  },
  music: {
    name: 'Musikgläntan',
    type: 'Musiktjänst',
    description: 'Musik för hela hushållet.',
    rows: [
      ['Tillgång genom', 'Familjeabonnemang'],
      ['Används av', 'Alex och Lo'],
      ['Tjänstekonto', 'Alex musikkonto'],
    ],
  },
  subscription: {
    name: 'Familjeabonnemang',
    type: 'Abonnemang',
    description: '189 kr / månad · Musik för hela hushållet.',
    rows: [
      ['Ger tillgång till', 'Musikgläntan'],
      ['Betalas från', 'Gemensamt bankkonto'],
    ],
  },
  account: {
    name: 'Alex musikkonto',
    type: 'Tjänstekonto',
    description: 'Alex eget konto hos musiktjänsten.',
    rows: [
      ['Hör till', 'Musikgläntan'],
      ['Används av', 'Alex'],
      ['Inloggningsadress', 'alex@example.test'],
    ],
  },
  email: {
    name: 'alex@example.test',
    type: 'E-postadress',
    description: 'En e-postadress i hushållets karta.',
    rows: [['Inloggningsadress för', 'Alex musikkonto']],
  },
  bank: {
    name: 'Gemensamt bankkonto',
    type: 'Bankkonto',
    description: 'Betalningsmedel för hushållets avtal.',
    rows: [
      ['Används för', 'Familjeabonnemang'],
      ['Kopplat kort', 'Kort ·· 4242'],
    ],
  },
  card: {
    name: 'Kort ·· 4242',
    type: 'Betalkort',
    description: 'Ett betalkort i hushållets karta.',
    rows: [
      ['Kopplat till', 'Gemensamt bankkonto'],
      ['Kortnummer', 'Slutar på 4242'],
    ],
  },
};

function ObjectDetail({ object, onClose }: { object: MapObject; onClose: () => void }) {
  const content = objectDetails[object.id];
  return (
    <aside className="vp-detail vp-d-object-detail" aria-labelledby="vp-detail-title">
      <div className="vp-detail-top">
        <span className="vp-eyebrow">{object.type}</span>
        <button
          type="button"
          className="vp-icon-button"
          aria-label="Stäng detaljer"
          onClick={onClose}
        >
          <PrototypeIcon name="close" />
        </button>
      </div>
      <h2 id="vp-detail-title" tabIndex={-1}>
        {object.name}
      </h2>
      <p className="vp-muted">{content.description}</p>
      <dl className="vp-d-object-facts">
        {content.rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

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
  const [selected, setSelected] = useState<MapObject>({
    id: 'subscription',
    ...objectDetails.subscription,
  });
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const popupRef = useRef<HTMLDivElement | null>(null);
  const objectTrigger = useRef<HTMLElement | null>(null);
  const wasDetailOpen = useRef(false);
  const utilityTrigger = useRef<HTMLElement | null>(null);
  const listening = scene === 'listening';
  useLayoutEffect(() => {
    if (!detail || !popupRef.current) return;
    const popup = popupRef.current;
    function positionPopup() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const root = popup.closest('.vp-root');
      const clearance = root
        ? Number.parseFloat(getComputedStyle(root).getPropertyValue('--vp-switcher-clearance')) ||
          150
        : 150;
      const toolbox = document.querySelector('.vp-d-toolbox')?.getBoundingClientRect();
      const status = document.querySelector('.vp-d-status')?.getBoundingClientRect();
      const node = document.querySelector(`.vp-map-node-${selected.id}`)?.getBoundingClientRect();
      const origin = node ?? anchor ?? new DOMRect(viewportWidth / 2, viewportHeight / 2, 0, 0);
      const width = Math.min(354, viewportWidth - 24);
      const minTop =
        viewportWidth <= 600
          ? Math.max(12, (toolbox?.bottom ?? 0) + 12, (status?.bottom ?? 0) + 12)
          : 12;
      const availableBottom = viewportHeight - clearance;
      const maxHeight = Math.min(520, Math.max(100, availableBottom - minTop - 12));
      const height = Math.min(popup.scrollHeight || 400, maxHeight);
      let left = origin.right + 12;
      let top = origin.top - 12;
      if (left + width > viewportWidth - 12) left = origin.left - width - 12;
      if (left < 12) {
        left = Math.max(12, Math.min(origin.left, viewportWidth - width - 12));
        top =
          origin.bottom + 12 + height <= availableBottom
            ? origin.bottom + 12
            : origin.top - height - 12;
      }
      top = Math.max(minTop, Math.min(top, availableBottom - height));
      if (
        toolbox &&
        left < toolbox.right + 12 &&
        left + width > toolbox.left &&
        top < toolbox.bottom + 12 &&
        top + height > toolbox.top
      ) {
        if (toolbox.right + width + 24 <= viewportWidth) left = toolbox.right + 12;
        else top = Math.max(top, toolbox.bottom + 12);
      }
      setPopupStyle({ left, top, width, maxHeight, visibility: 'visible' });
    }
    positionPopup();
    const observer = new ResizeObserver(positionPopup);
    observer.observe(popup);
    for (const element of document.querySelectorAll('.vp-switcher, .vp-d-status, .vp-d-toolbox'))
      observer.observe(element);
    window.addEventListener('resize', positionPopup);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionPopup);
    };
  }, [detail, selected.id, anchor]);
  useEffect(() => {
    if (detail) {
      if (!wasDetailOpen.current && !objectTrigger.current)
        objectTrigger.current = document.activeElement as HTMLElement;
      document
        .querySelector<HTMLElement>(`.vp-d-popup[data-object-id="${selected.id}"] #vp-detail-title`)
        ?.focus({ preventScroll: true });
    } else if (wasDetailOpen.current) {
      if (objectTrigger.current?.isConnected) objectTrigger.current.focus({ preventScroll: true });
      objectTrigger.current = null;
      setSelected({ id: 'subscription', ...objectDetails.subscription });
      setAnchor(null);
    }
    wasDetailOpen.current = detail;
  }, [detail, selected.id]);
  useEffect(() => {
    if (!detail) return;
    function dismissOutside(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('.vp-d-popup, .vp-map-node, .vp-switcher')) return;
      setDetail(false);
    }
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [detail, setDetail]);
  useEffect(() => {
    const status = document.querySelector('.vp-d-status');
    const app = status?.closest('.vp-app-D') as HTMLElement | null;
    if (!status || !app) return;
    const observer = new ResizeObserver(() => {
      app.style.setProperty('--vp-d-status-height', `${status.getBoundingClientRect().height}px`);
    });
    observer.observe(status);
    return () => observer.disconnect();
  }, []);
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

  function selectObject(object: MapObject, bounds: DOMRect) {
    objectTrigger.current = (
      document.activeElement?.closest('.vp-d-utility')
        ? document.querySelector(`.vp-map-node-${object.id}`)
        : document.activeElement
    ) as HTMLElement;
    setSelected(object);
    setAnchor(bounds);
    setUtility(null);
    setDetail(true);
  }

  return (
    <div
      className={`vp-app vp-app-D${expanded ? ' vp-d-expanded' : ''}${detail ? ' vp-d-detail-open' : ''}`}
    >
      <VisualPrototypeMap
        variant="A"
        onSelectObject={selectObject}
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
              <svg
                className="vp-icon vp-d-stop-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="12" cy="12" r="10" />
                <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" stroke="none" />
              </svg>
            ) : (
              <PrototypeIcon name="mic" />
            )}
            <span className="vp-d-label">{listening ? 'Avsluta samtal' : 'Prata med Skyttel'}</span>
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
        {listening && (
          <div className="vp-d-audio-feedback" role="status">
            <span
              className={`vp-d-waveform${sound ? ' vp-d-waveform-sound' : ''}`}
              aria-hidden="true"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <i key={bar} />
              ))}
            </span>
            <p className="vp-d-sound-status">
              {sound ? 'Tal hörs' : 'Tyst just nu · Lyssnar fortfarande'}
            </p>
          </div>
        )}
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
                {Object.entries(objectDetails).map(([id, object]) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={(event) =>
                        selectObject({ id, ...object }, event.currentTarget.getBoundingClientRect())
                      }
                    >
                      <span>
                        <strong>{object.name}</strong>
                        <span>
                          {object.type} · {object.description}
                        </span>
                      </span>
                      <PrototypeIcon name="arrow" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      )}
      {detail && (
        <div
          ref={popupRef}
          className="vp-d-popup"
          data-object-id={selected.id}
          role="dialog"
          aria-labelledby="vp-detail-title"
          style={popupStyle}
        >
          {selected.id === 'subscription' ? (
            <Detail onClose={() => setDetail(false)} onChange={() => setScene('draft')} />
          ) : (
            <ObjectDetail object={selected} onClose={() => setDetail(false)} />
          )}
        </div>
      )}
    </div>
  );
}
