// Kastbar D: inställningar använder hela viewporten, kartarbetet ligger kvar i minnet.
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { adminItems } from './AdminStudy.js';
import { type NavPage, pageTitles } from './NavigationPrototypePages.js';
import { Brand, PrototypeIcon } from './VisualPrototype.js';
import './admin-study-screen.css';

export function AdminStudyScreen({
  page,
  children,
  go,
  onReturn,
  administrator,
  operator,
  member,
  household,
  status,
  micLabel,
  micActive,
  onMic,
  locked,
  theme,
}: {
  page: NavPage;
  children: ReactNode;
  go: (page: NavPage) => void;
  onReturn: () => void;
  administrator: boolean;
  operator: boolean;
  member: boolean;
  household: string;
  status: string;
  micLabel: string;
  micActive: boolean;
  onMic: () => void;
  locked: boolean;
  theme: ReactNode;
}) {
  const [navigationOpen, setNavigationOpen] = useState(() => window.innerWidth > 800);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 801px)');
    const change = () => setNavigationOpen(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const title = useRef<HTMLHeadingElement>(null);
  const personal = ['login-methods', 'invitations', 'assistants', 'consent'].includes(page);
  const entries = adminItems.filter(
    (item) =>
      (personal ? item.group === 'Ditt Skyttel' : item.group !== 'Ditt Skyttel') &&
      (item.group !== 'Administration' || (administrator && member)) &&
      (item.group !== 'Hushållets karta' || member) &&
      (item.group !== 'Drift' || operator),
  );
  useEffect(() => {
    if (page) {
      title.current?.focus({ preventScroll: true });
      title.current?.closest('.ad-host')?.scrollTo(0, 0);
      if (window.innerWidth <= 800) setNavigationOpen(false);
    }
  }, [page]);
  return (
    <div className="ad-screen">
      <header className="ad-screen-header">
        <div className="ad-screen-brand">
          <Brand />
          <span>
            Skyttel<small>{personal ? 'Ditt konto' : 'Inställningar'}</small>
          </span>
        </div>
        <div className="ad-screen-actions">
          {theme}
          <button type="button" className="ad-screen-return" disabled={locked} onClick={onReturn}>
            <PrototypeIcon name="back" />
            {member ? 'Tillbaka till kartan' : 'Tillbaka'}
          </button>
        </div>
      </header>
      {member && (
        <footer className="ad-screen-status">
          <button type="button" disabled={locked} aria-pressed={micActive} onClick={onMic}>
            <PrototypeIcon name="mic" />
            {micLabel}
          </button>
          <p role="status">{status}</p>
        </footer>
      )}
      <div className="ad-screen-layout">
        <nav
          className="ad-screen-nav"
          aria-label={personal ? 'Dina kontosidor' : 'Inställningarnas sidor'}
        >
          <details
            className="ad-screen-nav-details"
            open={navigationOpen}
            onToggle={(event) => setNavigationOpen(event.currentTarget.open)}
          >
            <summary>
              Välj inställning<span>{pageTitles[page]}</span>
            </summary>
            <p className="ad-screen-household">
              {personal ? 'Alex Lind' : member ? household : 'Installationen'}
              <small>
                {personal
                  ? 'Din Skyttel-användare'
                  : member
                    ? 'Hushållets inställningar'
                    : 'Driftens inställningar'}
              </small>
            </p>
            {!personal && member && (
              <button
                type="button"
                disabled={locked}
                aria-current={page === 'settings' ? 'page' : undefined}
                onClick={() => go('settings')}
              >
                <PrototypeIcon name="settings" />
                Översikt
              </button>
            )}
            {Array.from(new Set(entries.map((item) => item.group))).map((group) => (
              <section key={group}>
                <h2>{group}</h2>
                {entries
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <button
                      type="button"
                      key={item.page}
                      disabled={locked}
                      aria-current={item.page === page ? 'page' : undefined}
                      onClick={() => go(item.page)}
                    >
                      {item.title}
                    </button>
                  ))}
              </section>
            ))}
            {personal && member && (
              <button type="button" disabled={locked} onClick={() => go('profile')}>
                <PrototypeIcon name="profile" />
                Till din profil
              </button>
            )}
          </details>
        </nav>
        <main
          className={`ad-screen-main${page === 'settings' ? ' ad-screen-overview' : ''}`}
          id="ad-screen-content"
        >
          <p className="ad-eyebrow">
            {personal ? 'Ditt konto' : page === 'costs' ? 'Installationens drift' : household}
          </p>
          <h1 ref={title} tabIndex={-1}>
            {pageTitles[page]}
          </h1>
          {children}
        </main>
      </div>
    </div>
  );
}
