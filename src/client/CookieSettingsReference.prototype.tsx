// THROWAWAY. Viscalyx.se CookieSettings layout at 72d6554a, adapted to Skyttel.
// Copyright (c) 2025 Viscalyx. MIT notice: prototypes/cookie-flows/REFERENCE-LICENSE.
import type { RefObject } from 'react';
import './CookieSettingsReference.prototype.css';

function Icon({ kind }: { kind: 'settings' | 'shield' | 'clock' | 'trash' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'settings' && (
        <>
          <path d="m9 3 1-1h4l1 1 .5 2 2 1 2-.5 2 3-.5 2-1.5 1v2l1.5 1 .5 2-2 3-2-.5-2 1-.5 2-1 1h-4l-1-1-.5-2-2-1-2 .5-2-3 .5-2 1.5-1v-2l-1.5-1-.5-2 2-3 2 .5 2-1Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {kind === 'shield' && <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" />}
      {kind === 'clock' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {kind === 'trash' && <path d="M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3M10 10v7m4-7v7" />}
    </svg>
  );
}

type Entry = { name: string; kind: string; purpose: string; time: string };
export function CookieSettingsReference({
  heading,
  entries,
  signedIn,
  remembered,
  rememberDraft,
  dirty,
  notice,
  error,
  savedAt,
  recovery,
  change,
  undo,
  save,
  reset,
  login,
}: {
  heading: RefObject<HTMLHeadingElement | null>;
  entries: Entry[];
  signedIn: boolean;
  remembered: boolean;
  rememberDraft: boolean;
  dirty: boolean;
  notice: string;
  error: string;
  savedAt: string;
  recovery: boolean;
  change: (value: boolean) => void;
  undo: () => void;
  save: () => void;
  reset: () => void;
  login: () => void;
}) {
  return (
    <div className="cookie-reference">
      <header className="reference-form-header">
        <div className="reference-title">
          <Icon kind="settings" />
          <h1 ref={heading} tabIndex={-1}>
            Kakor och lagring
          </h1>
        </div>
        <p>
          Hantera ihågkommen inloggning och läs om den lagring Skyttel behöver för funktioner du
          begär. Dina val här gäller den här webbläsaren.
        </p>
        {signedIn && <p className="reference-last-saved">Senast uppdaterad: {savedAt}</p>}
        <p className="reference-success" role="status" aria-atomic="true">
          {notice}
        </p>
        <p className="reference-error" role="alert" aria-atomic="true">
          {error}
        </p>
      </header>

      <section className="reference-quick" aria-labelledby="reference-quick-title">
        <h2 id="reference-quick-title">Snabbåtgärder</h2>
        <div className="reference-actions">
          <button
            type="button"
            className="reference-primary"
            disabled={!signedIn || !remembered || !rememberDraft}
            onClick={() => change(false)}
          >
            Stäng av ihågkommen inloggning
          </button>
          <button type="button" className="reference-secondary" disabled={!dirty} onClick={undo}>
            Ångra ändring
          </button>
          <button
            type="button"
            className="reference-danger"
            disabled={!signedIn || !remembered}
            onClick={reset}
          >
            <Icon kind="trash" />
            Återställ valfri lagring
          </button>
        </div>
        <p className="reference-quick-note">
          Snabbvalet ändrar formuläret. Spara längst ned för att ändra din inloggning.
        </p>
      </section>

      <section className="reference-categories" aria-labelledby="reference-categories-title">
        <h2 id="reference-categories-title">Lagringskategorier</h2>
        <section className="reference-card" aria-labelledby="reference-necessary-title">
          <div className="reference-card-header">
            <div className="reference-category-name">
              <span className="reference-shield">
                <Icon kind="shield" />
              </span>
              <h3 id="reference-necessary-title">
                Nödvändig lagring <span className="reference-required">Vid begärd funktion</span>
              </h3>
            </div>
            <span className="reference-fixed-track" aria-hidden="true" />
          </div>
          <p>
            Kakor behövs för säker inloggning. Fliklagring hjälper dig att följa samma import eller
            permanenta radering som du har begärt. Den här gruppen går inte att slå av i formuläret.
          </p>
          <details className="reference-details">
            <summary>Visa lagring ({entries.length})</summary>
            <div className="reference-entry-list">
              {entries.map((entry) => (
                <article key={entry.name} className="reference-entry">
                  <h4>{entry.name}</h4>
                  <p>{entry.purpose}</p>
                  <dl>
                    <div>
                      <dt>Lagringssätt:</dt>
                      <dd>{entry.kind}</dd>
                    </div>
                    <div>
                      <dt>Varaktighet:</dt>
                      <dd>{entry.time}</dd>
                    </div>
                    <div>
                      <dt>Leverantör:</dt>
                      <dd>Skyttel</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <p className="reference-detail-note">
              Vid HTTPS börjar cookienamnen med <code>__Secure-</code>. Sessionscookie beskriver
              cookiens lagring; webbläsaren kan återställa sessionen när den öppnas igen. Logga ut
              på en delad dator.
            </p>
          </details>
        </section>

        <section className="reference-card" aria-labelledby="reference-remember-title">
          <div className="reference-card-header">
            <div className="reference-category-name">
              <span className="reference-clock">
                <Icon kind="clock" />
              </span>
              <h3 id="reference-remember-title">Ihågkommen inloggning</h3>
            </div>
            {signedIn && (
              <label className="reference-toggle">
                <input
                  type="checkbox"
                  checked={rememberDraft}
                  disabled={!remembered}
                  aria-label="Behåll inloggningen mellan webbläsarsessioner"
                  aria-describedby="reference-remember-description reference-session-status"
                  onChange={(event) => change(event.target.checked)}
                />
                <span aria-hidden="true" />
              </label>
            )}
          </div>
          <p id="reference-remember-description">
            Ett valfritt val som låter den här inloggningen bestå mellan webbläsarsessioner i högst
            sju dygn från inloggningen. Valet följer inte med till andra enheter.
          </p>
          {signedIn ? (
            <p id="reference-session-status" className="reference-session-status">
              {remembered
                ? 'Nuvarande val: på. Gäller längst till 21 oktober 2026 kl. 10.00. Stäng av och spara för att fortsätta med en vanlig session.'
                : 'Nuvarande val: av. Välj Kom ihåg mig nästa gång du loggar in om du vill aktivera det.'}
            </p>
          ) : (
            <p>
              Valet görs vid inloggning.{' '}
              <button type="button" className="reference-link" onClick={login}>
                Till inloggningen
              </button>
            </p>
          )}
          <details className="reference-details">
            <summary>Visa lagring (1)</summary>
            <div className="reference-entry-list">
              <article className="reference-entry">
                <h4>better-auth.session_token</h4>
                <p>
                  Samma inloggningscookie får beständig lagring endast när du aktivt väljer Kom ihåg
                  mig. Den identifierar din session hos Skyttel.
                </p>
                <dl>
                  <div>
                    <dt>Varaktighet:</dt>
                    <dd>Högst sju dygn från inloggningen, utan förlängning.</dd>
                  </div>
                  <div>
                    <dt>Leverantör:</dt>
                    <dd>Skyttel</dd>
                  </div>
                </dl>
              </article>
            </div>
          </details>
        </section>
      </section>

      <p className="reference-scope-note">
        Återställning stänger av ihågkommen inloggning i den här webbläsaren. Du fortsätter vara
        inloggad. Återhämtningsuppgifter, kontots tema, hushållets information och samtalsmedgivande
        påverkas inte. Valen styr inte lagring hos Google och Microsoft.
      </p>
      {recovery && (
        <p className="reference-recovery">
          En import har osäkert utfall. Återhämtningsuppgifterna bevaras så att du kan följa samma
          försök.
        </p>
      )}
      {(!signedIn || !remembered) && (
        <p className="reference-scope-note">
          Det finns ingen aktiv ihågkommen inloggning att återställa.
        </p>
      )}
      <p className="reference-dirty" role="status">
        {dirty ? 'Osparad ändring. Ihågkommen inloggning stängs av först när du sparar.' : ''}
      </p>
      <div className="reference-save-row">
        <button
          type="button"
          className="reference-primary reference-save"
          disabled={!dirty}
          onClick={save}
        >
          Spara ändring
        </button>
      </div>
    </div>
  );
}
