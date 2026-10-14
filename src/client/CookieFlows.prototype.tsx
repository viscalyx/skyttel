// THROWAWAY. Four cookie-flow frames on /cookies?variant=A|B|C|D.
// Existing Skyttel CSS + viscalyx.se's category/disclosure patterns; memory only.
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import logo from '../../docs/images/shuttle-logo-transparent-small.png';
import { CookieSettingsReference } from './CookieSettingsReference.prototype.js';
import { useFormLeave } from './FormLeave.js';
import { trapDialogTab, usableFocusTarget } from './modal-focus.js';
import { type ThemeMode, useWorkspaceTheme, WorkspaceTheme } from './WorkspaceTheme.js';
import './settings.css';
import './CookieFlows.prototype.css';

type View = 'home' | 'cookies' | 'profile';
type Variant = 'A' | 'B' | 'C' | 'D';
const variants: Variant[] = ['A', 'B', 'C', 'D'];
const names = {
  A: 'Fristående sida',
  B: 'Skyttels inställningsram',
  C: 'Gemensam sidram',
  D: 'Viscalyx-formulär i B:s sidram',
};
const entries = [
  {
    name: 'better-auth.session_token',
    kind: 'Kaka',
    purpose:
      'Identifierar din inloggning hos Skyttel. Innehåller en signerad sessionsidentifierare.',
    time: 'Sessionscookie som standard. Med Kom ihåg mig: högst sju dygn från inloggningen, utan förlängning. Logga ut avslutar sessionen tidigare.',
  },
  {
    name: 'better-auth.state',
    kind: 'Kaka',
    purpose:
      'Skyddar inloggning och koppling av ett inloggningssätt. Innehåller en identifierare för inloggningsförsöket.',
    time: 'Högst fem minuter; tas bort när inloggningsförsöket godkänns.',
  },
  {
    name: 'skyttel-import:<hushåll>',
    kind: 'Fliklagring',
    purpose:
      'Håller reda på samma importförsök efter en omladdning. Innehåller försökets ID och innehållsversion, inte filen.',
    time: 'Till dess att importflödet rensar posten eller fliksessionen avslutas. Ingen egen tidsgräns.',
  },
  {
    name: 'skyttel-erasure:<hushåll>',
    kind: 'Fliklagring',
    purpose: 'Håller reda på samma försök till permanent radering. Innehåller operationens ID.',
    time: 'Till dess att raderingsflödet rensar posten eller fliksessionen avslutas. Ingen egen tidsgräns.',
  },
];

function Modal({
  title,
  children,
  close,
  reference = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  reference?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (usableFocusTarget(origin)) origin.focus();
    };
  }, []);
  return (
    <dialog
      className={`cookie-modal${reference ? ' reference-modal' : ''}`}
      ref={dialog}
      aria-labelledby="cookie-modal-title"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        } else trapDialogTab(event);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
    >
      <h2 id="cookie-modal-title">{title}</h2>
      {children}
    </dialog>
  );
}

function Avatar({ style }: { style: 'initials' | 'symbol' }) {
  return (
    <span className="cookie-avatar" aria-hidden="true">
      {style === 'initials' ? (
        'AL'
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
        </svg>
      )}
    </span>
  );
}

// Actual App owns identity, navigation, SettingsScreen and WorkspaceTools.
// Only cookie states are fictional here; the production contract is undecided.
export function CookiePrototypeInApp({ signedIn }: { signedIn: boolean }) {
  const navigate = useNavigate();
  const theme = useWorkspaceTheme();
  const { register } = useFormLeave();
  const heading = useRef<HTMLHeadingElement>(null);
  const [remembered, setRemembered] = useState(signedIn);
  const [rememberDraft, setRememberDraft] = useState(signedIn);
  const [failure, setFailure] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('14 oktober 2026 kl. 10.00');
  const [modal, setModal] = useState<'reset' | 'leave' | null>(null);
  const pending = useRef<{ proceed: () => void; cancel: () => void } | null>(null);
  const dirty = remembered !== rememberDraft;
  useLayoutEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(
    () =>
      register({
        active: () => dirty,
        leave: (proceed, cancel) => {
          pending.current = { proceed, cancel };
          setModal('leave');
        },
      }),
    [register, dirty],
  );
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty]);
  function save(reset: boolean) {
    if (failure) {
      setNotice('');
      setError(
        'Ändringen kunde inte sparas. Ihågkommen inloggning är fortfarande på. Försök igen.',
      );
      return;
    }
    setRemembered(false);
    setRememberDraft(false);
    setError('');
    setModal(null);
    setSavedAt('14 oktober 2026 kl. 10.05');
    setNotice(
      reset
        ? 'Valfri lagring är återställd. Du är fortfarande inloggad i den här webbläsaren.'
        : 'Sparat. Ihågkommen inloggning är avstängd i den här webbläsaren. Du är fortfarande inloggad.',
    );
  }
  function cancelLeave() {
    pending.current?.cancel();
    pending.current = null;
    setModal(null);
  }
  return (
    <section className="cookie-prototype cookie-in-app" data-theme={theme.theme}>
      <p className="cookie-in-app-label">Prototyp D i Skyttel · lagringsvalen är simulerade</p>
      <CookieSettingsReference
        heading={heading}
        entries={entries}
        signedIn={signedIn}
        remembered={remembered}
        rememberDraft={rememberDraft}
        dirty={dirty}
        notice={notice}
        error={error}
        savedAt={savedAt}
        recovery={recovery}
        change={(value) => {
          setRememberDraft(value);
          setNotice('');
          setError('');
        }}
        undo={() => {
          setRememberDraft(remembered);
          setNotice('Ändringen är ångrad. Ditt sparade val gäller.');
          setError('');
        }}
        save={() => save(false)}
        reset={() => {
          setError('');
          setModal('reset');
        }}
        login={() => navigate('/')}
      />
      <aside className="cookie-prototype-tools" aria-label="Prototypverktyg">
        <div className="cookie-variant-switcher">
          <strong>D · Viscalyx-formulär i den faktiska appen</strong>
          <a href="/cookies?variant=B" target="_blank" rel="noreferrer">
            Jämför A–C
          </a>
        </div>
        <details>
          <summary>Simulerade lagringsval</summary>
          <div className="cookie-scenario-controls">
            <label className="cookie-checkbox">
              <input
                type="checkbox"
                checked={failure}
                onChange={(event) => setFailure(event.target.checked)}
              />
              Simulera nästa sparfel
            </label>
            <label className="cookie-checkbox">
              <input
                type="checkbox"
                checked={recovery}
                onChange={(event) => setRecovery(event.target.checked)}
              />
              Import med osäkert utfall
            </label>
            <button
              type="button"
              disabled={dirty || !signedIn}
              onClick={() => {
                setRemembered(true);
                setRememberDraft(true);
                setNotice('');
                setError('');
              }}
            >
              Starta om exemplet
            </button>
          </div>
          <pre>
            {JSON.stringify(
              { signedIn, remembered, rememberDraft, dirty, failure, recovery },
              null,
              2,
            )}
          </pre>
        </details>
      </aside>
      {modal === 'reset' && (
        <Modal
          reference
          title="Återställ valfri lagring?"
          close={() => {
            setModal(null);
            setError('');
          }}
        >
          <p>
            Ihågkommen inloggning stängs av för den här webbläsaren. Du fortsätter vara inloggad.
            Andra enheter och återhämtningsuppgifter påverkas inte.
          </p>
          <p className="cookie-error" role="alert">
            {error}
          </p>
          <div className="cookie-actions">
            <button
              type="button"
              onClick={() => {
                setModal(null);
                setError('');
              }}
            >
              Avbryt
            </button>
            <button type="button" className="primary" onClick={() => save(true)}>
              Återställ valfri lagring
            </button>
          </div>
        </Modal>
      )}
      {modal === 'leave' && (
        <Modal reference title="Lämna utan att spara?" close={cancelLeave}>
          <p>
            Din ändring är inte sparad. Ditt sparade val fortsätter att gälla om du lämnar sidan.
          </p>
          <div className="cookie-actions">
            <button type="button" onClick={cancelLeave}>
              Stanna kvar
            </button>
            <button
              type="button"
              onClick={() => {
                setRememberDraft(remembered);
                setModal(null);
                const action = pending.current;
                pending.current = null;
                action?.proceed();
              }}
            >
              Lämna utan att spara
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default function CookiePrototype() {
  const [params, setParams] = useSearchParams();
  const candidate = params.get('variant');
  const variant: Variant =
    candidate === 'B' || candidate === 'C' || candidate === 'D' ? candidate : 'A';
  const [view, setView] = useState<View>('cookies');
  const [signedIn, setSignedIn] = useState(true);
  const [remembered, setRemembered] = useState(true);
  const [rememberDraft, setRememberDraft] = useState(true);
  const [loginRemember, setLoginRemember] = useState(false);
  const [banner, setBanner] = useState(false);
  const [failure, setFailure] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('14 oktober 2026 kl. 10.00');
  const [mode, setMode] = useState<ThemeMode>('light');
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [profileMode, setProfileMode] = useState<'menu' | 'dialog'>('menu');
  const [avatar, setAvatar] = useState<'initials' | 'symbol'>('initials');
  const [profileOpen, setProfileOpen] = useState(false);
  const [modal, setModal] = useState<'reset' | 'leave' | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [tab, setTab] = useState<'choices' | 'register'>('choices');
  const pending = useRef<(() => void) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dirty = signedIn && remembered !== rememberDraft;
  const theme = !signedIn || mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const preference = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Focus belongs to each view and frame change.
  useLayoutEffect(() => {
    heading.current?.focus();
  }, [view, variant, signedIn]);
  useEffect(() => {
    if (!dirty) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  useEffect(() => {
    if (!profileOpen || profileMode !== 'menu') return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        !profileButton.current?.contains(event.target)
      )
        setProfileOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setProfileOpen(false);
        profileButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [profileOpen, profileMode]);

  function requestLeave(action: () => void) {
    if (dirty) {
      pending.current = action;
      setModal('leave');
    } else action();
  }
  function go(next: View) {
    setProfileOpen(false);
    requestLeave(() => {
      setView(next);
      setNotice('');
      setError('');
    });
  }
  function cycle(direction: number) {
    requestLeave(() => {
      const next =
        variants[(variants.indexOf(variant) + direction + variants.length) % variants.length];
      setParams({ variant: next });
      setProfileOpen(false);
    });
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        document.querySelector('dialog[open]') ||
        profileOpen ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input,textarea,select,button,a,summary,[contenteditable],[role="tab"]',
        )
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  function scenario(value: string) {
    requestLeave(() => {
      const anonymous = value === 'first' || value === 'anonymous' || value === 'blocked';
      setSignedIn(!anonymous);
      setRemembered(!anonymous && value !== 'normal');
      setRememberDraft(!anonymous && value !== 'normal');
      setLoginRemember(false);
      setView(value === 'first' || value === 'blocked' ? 'home' : 'cookies');
      setBanner(value === 'first');
      setRecovery(value === 'recovery');
      setBlocked(value === 'blocked');
      setFailure(false);
      setProfileOpen(false);
      setNotice('');
      setError('');
      setSavedAt('14 oktober 2026 kl. 10.00');
    });
  }
  function revoke(reset: boolean) {
    if (failure || blocked) {
      setError(
        'Ändringen kunde inte sparas. Ihågkommen inloggning är fortfarande på. Försök igen.',
      );
      setNotice('');
      return;
    }
    setRemembered(false);
    setRememberDraft(false);
    setError('');
    setSavedAt('14 oktober 2026 kl. 10.05');
    setNotice(
      reset
        ? 'Valfri lagring är återställd. Du är fortfarande inloggad i den här webbläsaren.'
        : 'Sparat. Ihågkommen inloggning är avstängd i den här webbläsaren. Du är fortfarande inloggad.',
    );
    setModal(null);
  }
  function login() {
    if (blocked || failure) {
      setError(
        'Du kunde inte logga in. Skyttel behöver kunna lagra kakor för inloggningen. Kontrollera webbläsarens inställningar och försök igen.',
      );
      return;
    }
    setSignedIn(true);
    setRemembered(loginRemember);
    setRememberDraft(loginRemember);
    setLoginRemember(false);
    setBanner(false);
    setView('home');
    setError('');
  }

  const profileLinks = (
    <>
      <p>
        <strong>Alex Lind</strong>
        <small>Din Skyttel-användare</small>
      </p>
      <nav aria-label="Dina inställningar">
        <button type="button" onClick={() => go('profile')}>
          Din profil
        </button>
        <button type="button" onClick={() => go('cookies')}>
          Kakor och lagring
        </button>
      </nav>
      <button
        type="button"
        onClick={() => {
          setProfileOpen(false);
          requestLeave(() => {
            setSignedIn(false);
            setRemembered(false);
            setRememberDraft(false);
            setLoginRemember(false);
            setView('home');
            setNotice('');
            setError('');
          });
        }}
      >
        Logga ut
      </button>
    </>
  );
  const profileControl = signedIn && (
    <div className="cookie-profile-control">
      <button
        ref={profileButton}
        type="button"
        className="cookie-profile-button"
        aria-label="Din profil, Alex Lind"
        aria-expanded={profileOpen}
        aria-controls={profileOpen ? 'cookie-profile-panel' : undefined}
        aria-haspopup={profileMode === 'dialog' ? 'dialog' : undefined}
        onClick={() => setProfileOpen(!profileOpen)}
      >
        <Avatar style={avatar} />
      </button>
      {profileOpen && profileMode === 'menu' && (
        <div id="cookie-profile-panel" ref={menu} className="cookie-profile-menu">
          {profileLinks}
        </div>
      )}
    </div>
  );
  const brand = (
    <button type="button" className="settings-brand cookie-brand" onClick={() => go('home')}>
      <img src={logo} alt="" />
      <span>
        Skyttel<small>{signedIn ? 'Alex och Los hushåll' : 'Ett hushåll. En gemensam bild.'}</small>
      </span>
    </button>
  );
  const header = (
    <header className="settings-header">
      {brand}
      <div className="settings-actions">
        {signedIn && (
          <WorkspaceTheme
            mode={mode}
            onChange={(next) => {
              if (failure) {
                setError('Temat kunde inte sparas. Ditt tidigare temaval gäller fortfarande.');
              } else {
                setMode(next);
                setNotice('Temavalet är sparat på ditt konto. Det gäller på alla enheter.');
                setError('');
              }
            }}
          />
        )}
        <button
          type="button"
          className="settings-return"
          onClick={() => go(view === 'cookies' ? 'home' : 'cookies')}
        >
          {view === 'cookies'
            ? signedIn
              ? 'Tillbaka till kartan'
              : 'Till startsidan'
            : 'Kakor och lagring'}
        </button>
        {profileControl}
      </div>
    </header>
  );

  const register = (
    <section className="cookie-register" aria-labelledby="cookie-register-heading">
      <h2 id="cookie-register-heading">Lagringsregister</h2>
      <p>
        Leverantör: Skyttel. Inloggning och återhämtning används när du begär respektive funktion.
      </p>
      {entries.map((entry) => (
        <details key={entry.name}>
          <summary>
            <span>{entry.name}</span>
            <small>{entry.kind}</small>
          </summary>
          <dl>
            <dt>Ändamål och innehåll</dt>
            <dd>{entry.purpose}</dd>
            <dt>Varaktighet</dt>
            <dd>{entry.time}</dd>
            <dt>Leverantör</dt>
            <dd>Skyttel</dd>
          </dl>
        </details>
      ))}
      <p className="muted">
        Vid HTTPS börjar cookienamnen med <code>__Secure-</code>. Sessionscookie beskriver hur
        cookien lagras. Webbläsaren kan återställa en session när den öppnas igen; logga ut på en
        delad dator.
      </p>
      <details>
        <summary>Tema och inloggningsleverantörer</summary>
        <p>
          Före inloggning följer Skyttel ditt systemtema. Efter inloggning hämtas temavalet från
          ditt konto. Ingen lokal temalagring används i det beslutade flödet.
        </p>
        <p>
          Google och Microsoft hanterar lagring på sina egna webbplatser. Valen här styr endast
          Skyttels lagring.
        </p>
        <p>Samtalsmedgivande hanteras separat och påverkas inte av dessa val.</p>
      </details>
    </section>
  );

  const choices = (
    <>
      <section className="cookie-card" aria-labelledby="cookie-necessary-heading">
        <div className="cookie-card-title">
          <span className="cookie-category-icon" aria-hidden="true">
            ◇
          </span>
          <h2 id="cookie-necessary-heading">Nödvändig lagring</h2>
          <span className="cookie-badge">Vid begärd funktion</span>
        </div>
        <p>
          Kakor behövs för att logga in säkert. Fliklagring hjälper dig att följa en import eller
          permanent radering som du har begärt.
        </p>
        <p className="muted">
          Den här gruppen har ingen avstängningsknapp. Detaljerna visar vad varje funktion behöver.
        </p>
        {variant !== 'C' && (
          <details>
            <summary>Visa lagringens detaljer</summary>
            {register}
          </details>
        )}
      </section>
      <section className="cookie-card" aria-labelledby="cookie-remember-heading">
        <div className="cookie-card-title">
          <span className="cookie-category-icon" aria-hidden="true">
            ◷
          </span>
          <h2 id="cookie-remember-heading">Ihågkommen inloggning</h2>
          <span className="cookie-badge">Valfri</span>
        </div>
        <p id="cookie-remember-description">
          Gäller den här inloggningen i den här webbläsaren. Högst sju dygn från inloggningen; valet
          följer inte med till andra enheter.
        </p>
        {signedIn ? (
          <>
            <label className="cookie-toggle">
              <input
                type="checkbox"
                checked={rememberDraft}
                disabled={!remembered}
                aria-describedby="cookie-remember-description cookie-session-status"
                onChange={(event) => {
                  setRememberDraft(event.target.checked);
                  setNotice('');
                  setError('');
                }}
              />
              <span className="cookie-toggle-track" aria-hidden="true" />
              Behåll inloggningen mellan webbläsarsessioner
            </label>
            <p id="cookie-session-status" className="muted">
              {remembered
                ? 'Nuvarande val: på. Gäller längst till 21 oktober 2026 kl. 10.00. Du kan stänga av det och fortsätta vara inloggad.'
                : 'Nuvarande val: av. Vill du använda Kom ihåg mig väljer du det nästa gång du loggar in.'}
            </p>
            <div className="cookie-actions">
              <button
                type="button"
                className="primary"
                disabled={!dirty}
                onClick={() => revoke(false)}
              >
                Spara ändring
              </button>
              <button
                type="button"
                disabled={!dirty}
                onClick={() => {
                  setRememberDraft(remembered);
                  setError('');
                  setNotice('Ändringen är ångrad. Ditt sparade val gäller.');
                }}
              >
                Ångra ändring
              </button>
            </div>
            <p className="cookie-dirty" role="status">
              {dirty ? 'Osparad ändring. Ihågkommen inloggning stängs av först när du sparar.' : ''}
            </p>
          </>
        ) : (
          <p>
            Valet görs vid inloggning.{' '}
            <button type="button" className="cookie-text-button" onClick={() => go('home')}>
              Till inloggningen
            </button>
          </p>
        )}
      </section>
      <section className="cookie-reset">
        <h2>Återställ valfri lagring</h2>
        <p>
          Stänger av ihågkommen inloggning i den här webbläsaren. Du fortsätter vara inloggad.
          Kontots tema, hushållets information och samtalsmedgivande påverkas inte.
        </p>
        {recovery && (
          <p className="cookie-recovery">
            En import har osäkert utfall. Dess återhämtningsuppgifter bevaras så att du kan följa
            samma försök.
          </p>
        )}
        <button
          type="button"
          disabled={!signedIn || !remembered}
          onClick={() => {
            setError('');
            setModal('reset');
          }}
        >
          Återställ valfri lagring
        </button>
        {(!signedIn || !remembered) && (
          <p className="muted">Det finns ingen aktiv ihågkommen inloggning att återställa.</p>
        )}
      </section>
    </>
  );
  const cookies = (
    <div className="cookie-document">
      <p className="eyebrow">Din webbläsare</p>
      <h1 ref={heading} tabIndex={-1}>
        Kakor och lagring
      </h1>
      <p className="settings-intro">
        Här ser du vad Skyttel lagrar och hanterar ihågkommen inloggning för den här webbläsaren.
      </p>
      {signedIn && <p className="cookie-last-saved">Senast ändrat: {savedAt}</p>}
      <p className="cookie-success" role="status" aria-atomic="true">
        {notice}
      </p>
      <p className="cookie-error" role="alert" aria-atomic="true">
        {error}
      </p>
      {variant === 'C' ? (
        <>
          <nav className="cookie-sections" aria-label="Lagringens avsnitt">
            <button
              type="button"
              aria-pressed={tab === 'choices'}
              onClick={() => setTab('choices')}
            >
              Dina val
            </button>
            <button
              type="button"
              aria-pressed={tab === 'register'}
              onClick={() => setTab('register')}
            >
              Lagringsregister
            </button>
          </nav>
          {tab === 'choices' ? (
            <div className="cookie-split">
              <aside>
                <h2>Den här webbläsaren</h2>
                <p>{signedIn ? 'Alex Lind är inloggad.' : 'Du är inte inloggad.'}</p>
                <p>Inga analys- eller marknadsföringskakor används.</p>
              </aside>
              <div>{choices}</div>
            </div>
          ) : (
            register
          )}
        </>
      ) : (
        choices
      )}
    </div>
  );

  const profile = (
    <section className="cookie-document">
      <p className="eyebrow">Ditt konto</p>
      <h1 ref={heading} tabIndex={-1}>
        Din profil
      </h1>
      <p className="intro">Alex Lind</p>
      <p>Medlem i Alex och Los hushåll</p>
      <h2>Ditt konto</h2>
      <p>Hantera hur du loggar in och vilka assistenter som får tillgång till din karta.</p>
      <div className="settings-profile-links">
        <span>Inloggningssätt</span>
        <span>Assistentanslutningar</span>
        <button type="button" onClick={() => go('cookies')}>
          Kakor och lagring
        </button>
      </div>
      <p className="muted">
        Lagringsvalet gäller den här webbläsarens session. Temavalet hör till ditt konto.
      </p>
    </section>
  );
  const home = signedIn ? (
    <section className="cookie-map-context">
      <aside className="cookie-map-toolbar" aria-label="Kartans verktyg">
        {brand}
        <span>Karta</span>
        <span>Tabell</span>
        <span>Inställningar</span>
        {profileControl}
        <button type="button" onClick={() => go('cookies')}>
          Kakor och lagring
        </button>
      </aside>
      <div>
        <p className="eyebrow">Alex och Los hushåll</p>
        <h1 ref={heading} tabIndex={-1}>
          Det som hör ihop
        </h1>
        <p className="muted">
          Påhittade uppgifter för att bedöma profilknappen i kartans verktygsfält.
        </p>
        <div className="cookie-map-nodes">
          <article>
            Alex Lind<small>Person</small>
          </article>
          <article>
            Hemmet<small>Bostad</small>
          </article>
          <article>
            Lo Lind<small>Person</small>
          </article>
          <article>
            Musiktjänsten<small>Tjänst</small>
          </article>
        </div>
      </div>
    </section>
  ) : (
    <section className="panel cookie-login">
      <p className="eyebrow">Välkommen till Skyttel</p>
      <h1 ref={heading} tabIndex={-1}>
        Det som hör ihop, samlat.
      </h1>
      <p className="intro">En gemensam bild av hushållets digitala och ekonomiska samband.</p>
      <label className="cookie-checkbox">
        <input
          type="checkbox"
          checked={loginRemember}
          onChange={(event) => setLoginRemember(event.target.checked)}
          aria-describedby="cookie-login-help"
        />
        Kom ihåg mig
      </label>
      <p id="cookie-login-help" className="muted">
        Låter inloggningen bestå i den här webbläsaren i högst sju dygn. Lämna avmarkerat på en
        delad dator.
      </p>
      <div className="sign-in-options">
        <button type="button" onClick={login}>
          Fortsätt med Google
        </button>
        <button type="button" onClick={login}>
          Fortsätt med Microsoft
        </button>
      </div>
      <p className="cookie-error" role="alert">
        {error}
      </p>
      <button type="button" className="cookie-text-button" onClick={() => go('cookies')}>
        Kakor och lagring
      </button>
    </section>
  );
  const referenceCookies = (
    <CookieSettingsReference
      heading={heading}
      entries={entries}
      signedIn={signedIn}
      remembered={remembered}
      rememberDraft={rememberDraft}
      dirty={dirty}
      notice={notice}
      error={error}
      savedAt={savedAt}
      recovery={recovery}
      change={(value) => {
        setRememberDraft(value);
        setNotice('');
        setError('');
      }}
      undo={() => {
        setRememberDraft(remembered);
        setError('');
        setNotice('Ändringen är ångrad. Ditt sparade val gäller.');
      }}
      save={() => revoke(false)}
      reset={() => {
        setError('');
        setModal('reset');
      }}
      login={() => go('home')}
    />
  );
  const content =
    view === 'cookies'
      ? variant === 'D'
        ? referenceCookies
        : cookies
      : view === 'profile'
        ? profile
        : home;

  return (
    <div
      className={`app-shell has-settings cookie-prototype cookie-variant-${variant}`}
      data-theme={theme}
    >
      <a className="skip-link" href="#cookie-main">
        Hoppa till innehållet
      </a>
      <div className="cookie-prototype-label">
        Kastbar prototyp · påhittade uppgifter · alla ändringar simuleras
      </div>
      {!(view === 'home' && signedIn) && header}
      {banner && (
        <section className="cookie-info-banner" aria-labelledby="cookie-banner-title">
          <div>
            <h2 id="cookie-banner-title">Så använder Skyttel lagring</h2>
            <p>
              Skyttel använder lagring för funktioner du begär, som inloggning. Kom ihåg mig är ett
              separat val vid inloggning. Inga analys- eller marknadsföringskakor används.
            </p>
          </div>
          <div className="cookie-actions">
            <button
              type="button"
              onClick={() => {
                setBanner(false);
                go('cookies');
              }}
            >
              Läs om kakor och lagring
            </button>
            <button
              type="button"
              onClick={() => {
                setBanner(false);
                heading.current?.focus();
              }}
            >
              Stäng informationen
            </button>
          </div>
        </section>
      )}
      <main id="cookie-main" tabIndex={-1}>
        {(variant === 'B' || variant === 'D') && view !== 'home' && signedIn ? (
          <section className="settings-screen">
            <div className="settings-layout">
              <nav className="settings-navigation" aria-label="Dina kontosidor">
                <details
                  open={navigationOpen || window.innerWidth > 800}
                  onToggle={(event) => {
                    if (window.innerWidth <= 800) setNavigationOpen(event.currentTarget.open);
                  }}
                >
                  <summary>Välj inställning</summary>
                  <p className="settings-identity">
                    Alex Lind<small>Din Skyttel-användare</small>
                  </p>
                  <section>
                    <h2>Ditt Skyttel</h2>
                    <button
                      type="button"
                      aria-current={view === 'profile' ? 'page' : undefined}
                      onClick={() => go('profile')}
                    >
                      Din profil
                    </button>
                    <p className="muted">Inloggningssätt</p>
                    <p className="muted">Assistentanslutningar</p>
                    <button
                      type="button"
                      aria-current={view === 'cookies' ? 'page' : undefined}
                      onClick={() => go('cookies')}
                    >
                      Kakor och lagring
                    </button>
                  </section>
                </details>
              </nav>
              <div className="settings-content">{content}</div>
            </div>
          </section>
        ) : (
          <div className="cookie-public-content">
            {variant === 'C' && view !== 'home' && (
              <nav className="cookie-common-nav" aria-label="Skyttels sidor">
                {signedIn && (
                  <button type="button" onClick={() => go('profile')}>
                    Din profil
                  </button>
                )}
                <button
                  type="button"
                  aria-current={view === 'cookies' ? 'page' : undefined}
                  onClick={() => go('cookies')}
                >
                  Kakor och lagring
                </button>
              </nav>
            )}
            {content}
          </div>
        )}
      </main>
      <footer>
        <button type="button" className="cookie-text-button" onClick={() => go('cookies')}>
          Kakor och lagring
        </button>
      </footer>
      {profileOpen && profileMode === 'dialog' && (
        <Modal title="Din profil" close={() => setProfileOpen(false)}>
          <div id="cookie-profile-panel">{profileLinks}</div>
          <button type="button" onClick={() => setProfileOpen(false)}>
            Stäng profilen
          </button>
        </Modal>
      )}
      {modal === 'reset' && (
        <Modal
          title="Återställ valfri lagring?"
          reference={variant === 'D'}
          close={() => {
            setModal(null);
            setError('');
          }}
        >
          <p>
            Ihågkommen inloggning stängs av för den här webbläsaren. Du fortsätter vara inloggad och
            andra enheter påverkas inte.
          </p>
          <p>
            Återhämtningsuppgifter för import och permanent radering bevaras. Kontots tema,
            hushållets information och samtalsmedgivande påverkas inte.
          </p>
          <p className="cookie-error" role="alert">
            {error}
          </p>
          <div className="cookie-actions">
            <button
              type="button"
              onClick={() => {
                setModal(null);
                setError('');
              }}
            >
              Avbryt
            </button>
            <button type="button" className="primary" onClick={() => revoke(true)}>
              Återställ valfri lagring
            </button>
          </div>
        </Modal>
      )}
      {modal === 'leave' && (
        <Modal
          title="Lämna utan att spara?"
          reference={variant === 'D'}
          close={() => setModal(null)}
        >
          <p>
            Din ändring av ihågkommen inloggning är inte sparad. Ditt sparade val fortsätter att
            gälla om du lämnar sidan.
          </p>
          <div className="cookie-actions">
            <button type="button" onClick={() => setModal(null)}>
              Stanna kvar
            </button>
            <button
              type="button"
              onClick={() => {
                setRememberDraft(remembered);
                setModal(null);
                const action = pending.current;
                pending.current = null;
                action?.();
              }}
            >
              Lämna utan att spara
            </button>
          </div>
        </Modal>
      )}
      {import.meta.env.DEV && (
        <aside className="cookie-prototype-tools" aria-label="Prototypverktyg">
          <div className="cookie-variant-switcher">
            <button type="button" aria-label="Föregående variant" onClick={() => cycle(-1)}>
              ←
            </button>
            <strong>
              {variant} · {names[variant]}
            </strong>
            <button type="button" aria-label="Nästa variant" onClick={() => cycle(1)}>
              →
            </button>
          </div>
          <details>
            <summary>Scenarier och simulerat tillstånd</summary>
            <div className="cookie-scenario-controls">
              <label>
                Scenario
                <select
                  aria-label="Scenario"
                  defaultValue="remembered"
                  onChange={(event) => scenario(event.target.value)}
                >
                  <option value="remembered">Inloggad · Kom ihåg mig</option>
                  <option value="normal">Inloggad · vanlig session</option>
                  <option value="first">Första besöket</option>
                  <option value="anonymous">Kakor och lagring utan konto</option>
                  <option value="blocked">Blockerad lagring vid inloggning</option>
                  <option value="recovery">Import med osäkert utfall</option>
                </select>
              </label>
              <label>
                Profilens ingång
                <select
                  aria-label="Profilens ingång"
                  value={profileMode}
                  onChange={(event) => {
                    setProfileOpen(false);
                    setProfileMode(event.target.value === 'dialog' ? 'dialog' : 'menu');
                  }}
                >
                  <option value="menu">Meny med vanliga knappar</option>
                  <option value="dialog">Dialog</option>
                </select>
              </label>
              <label>
                Profilknappens bild
                <select
                  aria-label="Profilknappens bild"
                  value={avatar}
                  onChange={(event) =>
                    setAvatar(event.target.value === 'symbol' ? 'symbol' : 'initials')
                  }
                >
                  <option value="initials">Initialer</option>
                  <option value="symbol">Personsymbol</option>
                </select>
              </label>
              <label>
                Systemtema
                <select
                  aria-label="Systemtema"
                  value={systemDark ? 'dark' : 'light'}
                  onChange={(event) => setSystemDark(event.target.value === 'dark')}
                >
                  <option value="light">Ljust</option>
                  <option value="dark">Mörkt</option>
                </select>
              </label>
              <label className="cookie-checkbox">
                <input
                  type="checkbox"
                  checked={failure}
                  onChange={(event) => setFailure(event.target.checked)}
                />
                Simulera nästa sparfel
              </label>
              <button type="button" onClick={() => go('home')}>
                Visa karta / inloggning
              </button>
            </div>
            <pre>
              {JSON.stringify(
                {
                  variant,
                  view,
                  signedIn,
                  remembered,
                  rememberDraft,
                  dirty,
                  loginRemember,
                  mode,
                  theme,
                  failure,
                  blocked,
                  recovery,
                  banner,
                },
                null,
                2,
              )}
            </pre>
            <p>
              Vanlig sessions serverlivslängd och exakt återkallelsekontrakt utreds separat. Ingen
              riktig autentisering, beständig lagring eller skärmläsarverifiering görs här.
            </p>
          </details>
        </aside>
      )}
    </div>
  );
}
