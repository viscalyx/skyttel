// Kastbar administrationsstudie: tre strukturer inom godkända fria paneler.
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { NavPage } from './NavigationPrototypePages.js';
import './admin-study.css';

export type AdminVariant = 'A' | 'B' | 'C';
type Phase = 'pending' | 'unknown' | 'failed' | 'stale' | 'cleanup' | 'done';
type Outcome = 'done' | 'unknown' | 'failed' | 'stale' | 'cleanup';
type Operation = { page: string; label: string; phase: Phase; attempt: number };
export const adminNames = { A: 'Grupperade avsnitt', B: 'Sidomeny', C: 'Vad vill du göra?' };
export const adminPages: NavPage[] = [
  'settings',
  'administration',
  'members',
  'invitations',
  'login-methods',
  'assistants',
  'consent',
  'export',
  'import',
  'owners',
  'erasure',
  'costs',
];
export const wideAdminPages: NavPage[] = [
  'members',
  'export',
  'import',
  'owners',
  'erasure',
  'costs',
];

export function useAdminStudy() {
  const [values, setValues] = useState<Record<string, string>>({
    household: 'Hushållet Lind',
    inviteId: '',
    month: '2026-09',
    rate: '10',
    hosting: '7',
    disk: '1',
    workspace: '0',
    memberRole: 'Medlem',
    owner: 'Lo · sky-lo-204',
  });
  const [steps, setSteps] = useState<Record<string, number>>({});
  const [operation, setOperation] = useState<Operation | null>(null);
  const [outcome, setOutcome] = useState<Outcome>('done');
  const [notice, setNotice] = useState('');
  const [linked, setLinked] = useState(false);
  const [invitation, setInvitation] = useState('Väntar på svar');
  const [member, setMember] = useState(true);
  const [connection, setConnection] = useState('Läsåtkomst');
  const [otherConnection, setOtherConnection] = useState(true);
  const [exportReady, setExportReady] = useState(false);
  const [linkedOwner, setLinkedOwner] = useState('Ingen aktuell ägare');
  const [costVersion, setCostVersion] = useState(1);
  const [costs, setCosts] = useState({ rate: '10', hosting: '7', disk: '1', workspace: '0' });
  const monthlyCosts = useRef<Record<string, { costs: typeof costs; version: number }>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finish = useRef<(() => void) | null>(null);
  const serial = useRef(0);
  const busy = ['pending', 'unknown', 'cleanup'].includes(operation?.phase ?? '');
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function value(key: string, text: string) {
    if (key === 'month') {
      monthlyCosts.current[values.month] = { costs, version: costVersion };
      const next = monthlyCosts.current[text] ?? {
        costs: { rate: '10', hosting: '7', disk: '1', workspace: '0' },
        version: 1,
      };
      setCosts(next.costs);
      setCostVersion(next.version);
      setValues((previous) => ({ ...previous, ...next.costs, month: text }));
      setOperation(null);
      setNotice('Månaden byttes. Oskickad redigering av föregående månad stängdes.');
      return;
    }
    setValues((previous) => ({ ...previous, [key]: text }));
  }
  function step(key: string, next: number) {
    setSteps((previous) => ({ ...previous, [key]: next }));
  }
  function complete() {
    finish.current?.();
    finish.current = null;
    setOperation((previous) => (previous ? { ...previous, phase: 'done' } : null));
  }
  function run(page: string, label: string, success: () => void) {
    if (busy) return;
    setNotice('');
    finish.current = success;
    setOperation({ page, label, phase: 'pending', attempt: ++serial.current });
    timer.current = setTimeout(() => {
      if (outcome === 'done') complete();
      else {
        const phase =
          outcome === 'cleanup' && !/^(Ersätter|Raderar)/.test(label) ? 'done' : outcome;
        if (phase === 'done') {
          complete();
          return;
        }
        if (phase !== 'unknown' && phase !== 'cleanup') finish.current = null;
        setOperation((previous) => (previous ? { ...previous, phase } : null));
        if (outcome === 'stale') {
          step(page, 0);
          value(`${page}Confirm`, '');
          value('eraseText', '');
        }
      }
    }, 700);
  }
  function cancelExport() {
    if (timer.current) clearTimeout(timer.current);
    finish.current = null;
    setOperation(null);
    setExportReady(false);
    setNotice('Exporten avbröts. Hushållets information är oförändrad.');
  }
  function clearSession() {
    if (timer.current) clearTimeout(timer.current);
    finish.current = null;
    setOperation(null);
    setNotice('');
    setExportReady(false);
    setSteps({});
    setValues((previous) => ({
      ...previous,
      inviteId: '',
      invitationCode: '',
      code: '',
      eraseText: '',
      consentAI: '',
      consentWork: '',
    }));
  }
  return {
    values,
    value,
    steps,
    step,
    operation,
    run,
    busy,
    outcome,
    setOutcome,
    complete,
    notice,
    setNotice,
    linked,
    setLinked,
    invitation,
    setInvitation,
    member,
    setMember,
    connection,
    setConnection,
    otherConnection,
    setOtherConnection,
    exportReady,
    setExportReady,
    cancelExport,
    linkedOwner,
    setLinkedOwner,
    costVersion,
    setCostVersion,
    costs,
    setCosts,
    clearSession,
  };
}
export type AdminModel = ReturnType<typeof useAdminStudy>;

function Button({
  children,
  onClick,
  disabled = false,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={primary ? 'np-primary' : ''}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Note({ children }: { children: ReactNode }) {
  return <div className="ad-note">{children}</div>;
}
function Field({
  label,
  name,
  model,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  model: AdminModel;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="ad-field">
      {label}
      <input
        type={type}
        value={model.values[name] ?? ''}
        placeholder={placeholder}
        onChange={(event) => model.value(name, event.target.value)}
        disabled={model.busy}
      />
    </label>
  );
}
function Check({
  name,
  model,
  children,
}: {
  name: string;
  model: AdminModel;
  children: ReactNode;
}) {
  return (
    <label className="ad-check">
      <input
        type="checkbox"
        checked={model.values[name] === 'yes'}
        disabled={model.busy}
        onChange={(event) => model.value(name, event.target.checked ? 'yes' : '')}
      />{' '}
      <span>{children}</span>
    </label>
  );
}
function Steps({ labels, current }: { labels: string[]; current: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (current > 0) ref.current?.focus();
  }, [current]);
  return (
    <div className="ad-progress">
      <p ref={ref} tabIndex={-1}>
        Steg {current + 1} av {labels.length} · <strong>{labels[current]}</strong>
      </p>
      <div aria-hidden="true">
        {labels.map((label, index) => (
          <span key={label} data-active={index <= current} />
        ))}
      </div>
    </div>
  );
}

export function AdminOperation({ model, go }: { model: AdminModel; go?: (page: NavPage) => void }) {
  const op = model.operation;
  if (!op)
    return model.notice ? (
      <p className="ad-result" role="status">
        {model.notice}
      </p>
    ) : null;
  const words = {
    pending: 'Pågår. Inväntar bekräftat resultat.',
    unknown: 'Resultatet är okänt. Kontrollera samma försök innan du gör något nytt.',
    failed: 'Åtgärden misslyckades. Inget ändrades. Dina val finns kvar.',
    stale: 'Underlaget har ändrats. Läs in och granska det aktuella underlaget på nytt.',
    cleanup:
      'Informationen är ändrad, men rensningen återstår. Kartarbetet väntar. Fortsätt samma åtgärd.',
    done: 'Klart · simulerat resultat.',
  };
  return (
    <div className="ad-result">
      <p role="status">
        <strong>{op.label}</strong>
        <br />
        {words[op.phase]}
        {op.phase === 'done' && model.notice && (
          <>
            <br />
            {model.notice}
          </>
        )}
      </p>
      {op.phase === 'unknown' && <Button onClick={model.complete}>Kontrollera samma försök</Button>}
      {op.phase === 'cleanup' && <Button onClick={model.complete}>Slutför rensningen</Button>}
      {go && adminPages.includes(op.page as NavPage) && (
        <Button onClick={() => go(op.page as NavPage)}>Öppna åtgärden</Button>
      )}
    </div>
  );
}

type Item = { page: NavPage; title: string; detail: string; group: string };
const items: Item[] = [
  {
    page: 'login-methods',
    title: 'Inloggningssätt',
    detail: 'Google och Microsoft för samma Skyttel-användare',
    group: 'Ditt Skyttel',
  },
  {
    page: 'invitations',
    title: 'Ditt användar-ID',
    detail: 'Din identitet och inbjudan till hushållet',
    group: 'Ditt Skyttel',
  },
  {
    page: 'assistants',
    title: 'Assistentanslutningar',
    detail: 'Hantera externa assistenters åtkomst',
    group: 'Ditt Skyttel',
  },
  {
    page: 'types',
    title: 'Objekt- och sambandstyper',
    detail: 'Hushållets gemensamma typer, egenskaper och avsnitt',
    group: 'Hushållets karta',
  },
  {
    page: 'members',
    title: 'Medlemmar och inbjudningar',
    detail: 'Bjud in, ändra roll och hantera tillgång',
    group: 'Administration',
  },
  {
    page: 'export',
    title: 'Fullständig export',
    detail: 'Hämta en kopia, inklusive privata uppgifter',
    group: 'Administration',
  },
  {
    page: 'import',
    title: 'Återimportera hushållet',
    detail: 'Ersätt innehållet med en tidigare export',
    group: 'Administration',
  },
  {
    page: 'owners',
    title: 'Koppla historiskt innehåll',
    detail: 'Återge rätt person tillgång till privat arbete',
    group: 'Administration',
  },
  {
    page: 'erasure',
    title: 'Permanent radering',
    detail: 'Granska och radera vald information utan ångring',
    group: 'Administration',
  },
  {
    page: 'costs',
    title: 'Driftens kostnader',
    detail: 'Installationens förbrukning och antaganden',
    group: 'Drift',
  },
];
type MenuProps = { entries: Item[]; go: (page: NavPage) => void; mapSettings?: ReactNode };
function Rows({ entries, go }: MenuProps) {
  return (
    <div className="ad-rows">
      {entries.map((item) => (
        <button type="button" key={item.page} onClick={() => go(item.page)}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      ))}
    </div>
  );
}
export function VariantA({ entries, go, mapSettings }: MenuProps) {
  return (
    <div className="ad-groups">
      {Array.from(new Set(entries.map((item) => item.group))).map((group) => (
        <section key={group}>
          <h3>{group}</h3>
          <Rows entries={entries.filter((item) => item.group === group)} go={go} />
          {group === 'Hushållets karta' && mapSettings}
        </section>
      ))}
    </div>
  );
}
export function VariantB({ entries, go, mapSettings }: MenuProps) {
  const groups = Array.from(new Set(entries.map((item) => item.group)));
  const [selected, setSelected] = useState(groups[0]);
  const group = groups.includes(selected) ? selected : groups[0];
  return (
    <div className="ad-split">
      <nav aria-label="Inställningarnas avsnitt">
        {groups.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={name === group ? 'true' : undefined}
            onClick={() => setSelected(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <section>
        <h3>{group}</h3>
        <Rows entries={entries.filter((item) => item.group === group)} go={go} />
        {group === 'Hushållets karta' && mapSettings}
      </section>
    </div>
  );
}
export function VariantC({ entries, go, mapSettings }: MenuProps) {
  const [query, setQuery] = useState('');
  const matches = entries.filter((item) =>
    `${item.title} ${item.detail}`.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
  );
  return (
    <div className="ad-task-list">
      <label className="ad-field">
        Vad vill du göra?
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök till exempel inbjudan eller export"
        />
      </label>
      <p className="ad-muted" role="status">
        {matches.length} uppgifter
      </p>
      {matches.map((item, index) => (
        <button type="button" key={item.page} onClick={() => go(item.page)}>
          <span className="ad-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>
            <small>{item.group}</small>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      ))}
      {!query && mapSettings}
    </div>
  );
}

export function AdminStudyPage({
  page,
  model: m,
  variant,
  administrator,
  operator,
  go,
  logout,
  onEnter,
  mapSettings,
}: {
  page: NavPage;
  model: AdminModel;
  variant: AdminVariant;
  administrator: boolean;
  operator: boolean;
  go: (page: NavPage) => void;
  logout: () => void;
  onEnter: () => void;
  mapSettings?: ReactNode;
}) {
  const step = m.steps[page] ?? 0;
  const next = (n: number) => m.step(page, n);
  const v = m.values;
  const op = m.operation?.page === page ? m.operation : null;
  const done = op?.phase === 'done';
  const run = (label: string, success: () => void) => m.run(page, label, success);
  let content: ReactNode;
  if (page === 'settings' || page === 'administration') {
    const entries = items.filter(
      (item) =>
        (item.group !== 'Administration' || administrator) &&
        (item.group !== 'Drift' || operator) &&
        (page !== 'administration' || item.group === 'Administration'),
    );
    const View = variant === 'B' ? VariantB : variant === 'C' ? VariantC : VariantA;
    content = (
      <>
        <div className="ad-identity">
          <span className="ad-avatar" aria-hidden="true">
            AL
          </span>
          <div>
            <strong>Alex Lind</strong>
            <p>{administrator ? 'Administratör' : 'Medlem'} · Hushållet Lind</p>
            {operator && <small>Även driftansvarig för installationen</small>}
          </div>
        </div>
        <View entries={entries} go={go} mapSettings={mapSettings} />
        <div className="ad-footer">
          <span>Alla medlemmar kan arbeta med hela kartan.</span>
          <Button onClick={logout}>Logga ut</Button>
        </div>
      </>
    );
  } else if (page === 'members') {
    content = (
      <>
        <h3>Bjud in till Hushållet Lind</h3>
        <Steps
          labels={['Be om användar-ID', 'Skapa inbjudan', 'Kopiera och dela koden']}
          current={step}
        />
        {step === 0 && (
          <>
            <p>
              Be personen logga in i er Skyttel-installation och skicka sitt Skyttel-användar-ID
              privat till dig.
            </p>
            <Note>
              Ett namn eller en e-postadress identifierar inte säkert rätt Skyttel-användare.
              Kontrollera ID:t tillsammans.
            </Note>
            <Button primary onClick={() => next(1)}>
              Jag har personens användar-ID
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <Field
              model={m}
              label="Skyttel-användar-ID att bjuda in"
              name="inviteId"
              placeholder="Exempel: sky-sam-305"
            />
            <p className="ad-muted">En ny kod ersätter personens tidigare väntande inbjudan.</p>
            <Button
              primary
              disabled={m.busy || !v.inviteId.trim()}
              onClick={() =>
                run('Skapar inbjudan', () => {
                  m.value('code', 'PROV-LIND-4826');
                  m.setInvitation('Väntar på svar');
                  next(2);
                })
              }
            >
              Skapa inbjudan
            </Button>
            <Button disabled={m.busy} onClick={() => next(0)}>
              Tillbaka
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <Note>
              Koden visas bara här, en gång. Kopiera den innan du lämnar sidan. Den gäller i sju
              dagar och kan användas en gång.
            </Note>
            <label className="ad-field">
              Inbjudningskod att dela
              <input readOnly value={v.code ?? ''} />
            </label>
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(v.code ?? '')
                  .then(() => m.setNotice('Koden är kopierad. Dela den privat med rätt person.'))
                  .catch(() => m.setNotice('Markera och kopiera koden manuellt.'))
              }
            >
              Kopiera koden
            </Button>
            <p>
              Skicka koden privat till <strong>{v.inviteId}</strong>. Skyttel skickar ingen e-post.
            </p>
            <Button
              onClick={() => {
                m.value('code', '');
                next(0);
              }}
            >
              Klar med inbjudan
            </Button>
          </>
        )}
        <section className="ad-section">
          <h3>Medlemmar</h3>
          <div className="ad-person">
            <strong>Alex Lind (du)</strong>
            <span>sky-alex-101 · Administratör</span>
            <button type="button" disabled>
              Ändra egen tillgång
            </button>
            <small>Be en annan administratör. Hushållet måste ha minst en administratör.</small>
          </div>
          {m.member ? (
            <div className="ad-person">
              <strong>Lo Lind</strong>
              <span>sky-lo-204 · {v.memberRole}</span>
              {v.memberAction ? (
                <>
                  <Note>
                    {v.memberAction === 'remove'
                      ? 'Lo förlorar tillgång till hushållet. Personobjekt och gemensamt innehåll finns kvar. Assistentanslutningarna stoppas.'
                      : `Lo får rollen ${v.memberRole === 'Medlem' ? 'Administratör' : 'Medlem'}. Insynen i kartan är densamma.`}
                  </Note>
                  <Button
                    disabled={m.busy}
                    onClick={() =>
                      run('Ändrar Los tillgång', () => {
                        if (v.memberAction === 'remove') m.setMember(false);
                        else
                          m.value(
                            'memberRole',
                            v.memberRole === 'Medlem' ? 'Administratör' : 'Medlem',
                          );
                        m.value('memberAction', '');
                      })
                    }
                  >
                    Bekräfta ändringen för Lo
                  </Button>
                  <Button disabled={m.busy} onClick={() => m.value('memberAction', '')}>
                    Avbryt
                  </Button>
                </>
              ) : (
                <div className="ad-actions">
                  <Button disabled={m.busy} onClick={() => m.value('memberAction', 'role')}>
                    Ändra roll
                  </Button>
                  <Button disabled={m.busy} onClick={() => m.value('memberAction', 'remove')}>
                    Återkalla tillgång
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p>Los tillgång är återkallad. En ny inbjudan krävs för att ansluta igen.</p>
          )}
        </section>
        <section className="ad-section">
          <h3>Inbjudningar</h3>
          <div className="ad-person">
            <strong>{v.inviteId || 'Sam · sky-sam-305'}</strong>
            <span>{m.invitation}</span>
            {m.invitation === 'Väntar på svar' && (
              <Button
                disabled={m.busy}
                onClick={() => run('Återkallar inbjudan', () => m.setInvitation('Återkallad'))}
              >
                Återkalla inbjudan
              </Button>
            )}
          </div>
        </section>
      </>
    );
  } else if (page === 'invitations') {
    content = (
      <>
        <p>
          Inloggad som <strong>Alex Lind</strong>
        </p>
        <label className="ad-field">
          Ditt Skyttel-användar-ID
          <input readOnly value="sky-alex-101" />
        </label>
        <Button
          onClick={() =>
            void navigator.clipboard
              .writeText('sky-alex-101')
              .then(() => m.setNotice('Användar-ID kopierat.'))
              .catch(() => m.setNotice('Markera och kopiera ID:t manuellt.'))
          }
        >
          Kopiera användar-ID
        </Button>
        <p>Dela ID:t privat med hushållets administratör. Fyll sedan i koden du får tillbaka.</p>
        <Field
          model={m}
          label="Inbjudningskod"
          name="invitationCode"
          placeholder="PROV-LIND-4826"
        />
        <Button
          primary
          disabled={m.busy || !v.invitationCode?.trim()}
          onClick={() => {
            if (v.invitationCode !== 'PROV-LIND-4826') {
              m.setNotice(
                'Koden är ogiltig, utgången eller hör till en annan identitet. Be administratören om en ny kod för ditt användar-ID.',
              );
              return;
            }
            run('Accepterar inbjudan', () => {
              m.setNotice('Du har anslutit till Hushållet Lind som medlem.');
              onEnter();
            });
          }}
        >
          Acceptera inbjudan
        </Button>
        <Note>
          En annan Google- eller Microsoft-inloggning kan vara en annan Skyttel-användare, även med
          samma e-postadress.
        </Note>
      </>
    );
  } else if (page === 'login-methods') {
    content = (
      <>
        <p>Samma Skyttel-användare, oavsett vilket kopplat inloggningssätt du väljer.</p>
        <div className="ad-person">
          <strong>Google</strong>
          <span>alex@example.test · Anslutet</span>
        </div>
        <div className="ad-person">
          <strong>Microsoft</strong>
          <span>{m.linked ? 'alex.lind@example.test · Anslutet' : 'Inte anslutet'}</span>
        </div>
        {!m.linked && (
          <>
            <Steps labels={['Verifiera befintlig inloggning', 'Koppla Microsoft']} current={step} />
            <p>
              {step === 0
                ? 'Du går till Google för att verifiera identiteten som redan hör till dig. Därefter kommer du tillbaka hit.'
                : 'Du går till Microsoft för att bevisa din andra inloggning. Slutför inom tio minuter efter verifieringen.'}
            </p>
            <Button
              primary
              disabled={m.busy}
              onClick={() =>
                run(step === 0 ? 'Verifierar Google' : 'Kopplar Microsoft', () => {
                  if (step === 0) next(1);
                  else {
                    m.setLinked(true);
                    m.setNotice('Båda inloggningssätten hör nu till sky-alex-101.');
                  }
                })
              }
            >
              {step === 0 ? 'Verifiera Google' : 'Koppla Microsoft'}{' '}
              <span aria-hidden="true">↗</span>
            </Button>
            <Button
              disabled={m.busy}
              onClick={() => {
                next(0);
                m.setNotice('Länkningen avbröts. Dina befintliga inloggningssätt består.');
              }}
            >
              Avbryt länkning
            </Button>
            <details>
              <summary>Om inloggningen inte går igenom</summary>
              <p>
                Nekat medgivande eller utgången verifiering ändrar inte din tillgång. Verifiera
                igen. En identitet som redan hör till en annan Skyttel-användare kan inte kopplas
                hit.
              </p>
            </details>
          </>
        )}
      </>
    );
  } else if (page === 'assistants') {
    content = (
      <>
        <p>Anslut en extern textassistent till din karta och ditt privata utkast.</p>
        <label className="ad-field">
          MCP-adress
          <input readOnly value="https://skyttel.example.test/mcp" />
        </label>
        <p className="ad-muted">
          Lägg till adressen i din textklient med OAuth. Du kommer tillbaka till Skyttel för att ge
          medgivande.
        </p>
        <Button
          onClick={() => {
            m.value('consentAI', '');
            m.value('consentWork', '');
            go('consent');
          }}
        >
          Pröva en anslutningsförfrågan
        </Button>
        <h3>Dina anslutningar</h3>
        <div className="ad-person">
          <strong>Textateljén</strong>
          <span>{m.connection || 'Återkallad'}</span>
          {m.connection && (
            <>
              <p>
                Återkallelse stoppar nya läsningar och ändringar. Uppgifter som klienten redan fått
                finns kvar hos klienten.
              </p>
              <Button
                disabled={m.busy}
                onClick={() => run('Återkallar Textateljén', () => m.setConnection(''))}
              >
                Återkalla anslutning
              </Button>
            </>
          )}
        </div>
        {administrator && (
          <>
            <h3>Hushållets övriga anslutningar</h3>
            <div className="ad-person">
              <strong>Los textklient · Lo</strong>
              <span>{m.otherConnection ? 'Kartarbete' : 'Återkallad'}</span>
              {m.otherConnection && (
                <Button
                  disabled={m.busy}
                  onClick={() =>
                    run('Återkallar Los textklient', () => m.setOtherConnection(false))
                  }
                >
                  Återkalla Los anslutning
                </Button>
              )}
            </div>
          </>
        )}
      </>
    );
  } else if (page === 'consent') {
    content = (
      <>
        <p className="ad-eyebrow">En extern assistent ber om åtkomst</p>
        <h3>Textateljén vill ansluta</h3>
        <p>
          Alex Lind · sky-alex-101
          <br />
          Hushållet Lind
        </p>
        <Note>
          Klientnamnet är klientens egen uppgift. Tillgången gäller gemensam karta och ditt privata
          utkast, aldrig andras privata utkast eller administrationsverktyg.
        </Note>
        <p>
          <strong>
            Begärd åtkomst: {v.consentRequest === 'work' ? 'Kartarbete' : 'Läsåtkomst'}
          </strong>
        </p>
        <p>
          Den externa tjänsten behandlar hämtade uppgifter enligt ditt avtal och dina inställningar
          där. Lagring i EU garanterar inte AI-behandling i EU.
        </p>
        <Check model={m} name="consentAI">
          Jag tillåter extern AI-behandling av hämtade uppgifter.
        </Check>
        {v.consentRequest === 'work' && (
          <Check model={m} name="consentWork">
            Jag tillåter förslag och sparande. Varje sparande kräver fortfarande mitt uttryckliga
            besked.
          </Check>
        )}
        <Button
          primary
          disabled={
            m.busy ||
            v.consentAI !== 'yes' ||
            (v.consentRequest === 'work' && v.consentWork !== 'yes')
          }
          onClick={() =>
            run('Godkänner anslutningen', () => {
              m.setConnection(v.consentRequest === 'work' ? 'Kartarbete' : 'Läsåtkomst');
              m.setNotice(
                'Anslutningen är godkänd. Återgå till textklienten. Inga kartuppgifter har sparats.',
              );
            })
          }
        >
          {v.consentRequest === 'work' ? 'Godkänn kartarbete' : 'Godkänn läsåtkomst'}
        </Button>
        <Button
          disabled={m.busy}
          onClick={() => {
            m.value('consentAI', '');
            m.value('consentWork', '');
            m.setNotice('Ingen ny anslutning skapades. Du kan fortsätta arbeta manuellt.');
            go('assistants');
          }}
        >
          Nej, anslut inte
        </Button>
      </>
    );
  } else if (page === 'export') {
    content = (
      <>
        <p className="ad-eyebrow">Hushållet Lind · Fullständig kopia</p>
        <h3>Ta med hela hushållets information</h3>
        <Note>
          Exporten innehåller även andra användares privata utkast och personliga vyer. Filen är
          inte lösenordsskyddad. Förvara den säkert.
        </Note>
        <ul>
          <li>Gemensam karta, typer, bilder och historik</li>
          <li>Privata utkast, placeringar, sparförsök och kvitton</li>
          <li>Inga inloggningssessioner eller serverhemligheter</li>
        </ul>
        {!m.exportReady ? (
          <Button
            primary
            disabled={m.busy}
            onClick={() =>
              run('Förbereder fullständig export', () => {
                m.setExportReady(true);
                m.setNotice(
                  'Exporten är klar att hämta. Gäller tio minuter och kan hämtas en gång.',
                );
              })
            }
          >
            Förbered fullständig export
          </Button>
        ) : (
          <>
            <p>skyttel-hushall.zip · 2,4 MB · påhittad kopia</p>
            <Button
              primary
              onClick={() => {
                m.setExportReady(false);
                m.setNotice(
                  'Provet simulerar att nedladdningen startar. Ingen fil skapas. I produkten kontrollerar du filen i webbläsarens nedladdningar.',
                );
              }}
            >
              Hämta ZIP-fil
            </Button>
          </>
        )}
        {(m.exportReady || (op && m.busy)) && (
          <Button onClick={m.cancelExport}>Avbryt export</Button>
        )}
        <p className="ad-muted">
          När du lämnar exporten avbryts förberedelsen och den tillfälliga kopian tas bort. Efter
          avbrott eller utgången tid förbereder du en ny export.
        </p>
      </>
    );
  } else if (page === 'import') {
    content = (
      <>
        <Steps labels={['Välj underlag', 'Granska ersättningen', 'Resultat']} current={step} />
        {step === 0 && (
          <>
            <p>
              Återställ från en fullständig Skyttel-export. Börja med en egen export om nuvarande
              information ska bevaras.
            </p>
            <Note>Återimport ersätter innehåll. Två kartor slås inte ihop.</Note>
            <Button disabled={m.busy} onClick={() => m.value('importFile', 'Lind-2026-09-20.zip')}>
              Välj påhittad exportfil
            </Button>
            {v.importFile && <p>{v.importFile} · 2,4 MB</p>}
            <Button
              primary
              disabled={m.busy || !v.importFile}
              onClick={() => run('Kontrollerar importfil', () => next(1))}
            >
              Kontrollera importfil
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <div className="ad-compare">
              <section>
                <h3>Ersätts</h3>
                <p>Karta, bilder, historik, alla privata utkast och personliga vyer.</p>
                <p>
                  8 objekt → 12 objekt
                  <br />
                  10 samband → 16 samband
                </p>
              </section>
              <section>
                <h3>Behålls</h3>
                <p>Nuvarande medlemmar, administratörer, inbjudningar och inloggningar.</p>
              </section>
            </div>
            <p>
              Be alla avsluta pågående ändringar. Historiska identiteter ger ingen ny tillgång.
              Inget har ersatts ännu.
            </p>
            <Check model={m} name="importConfirm">
              Jag vill ersätta allt innehåll i Hushållet Lind med den granskade exporten.
            </Check>
            <Button
              primary
              disabled={m.busy || v.importConfirm !== 'yes'}
              onClick={() =>
                run('Ersätter hushållets innehåll', () => {
                  next(2);
                  m.setNotice(
                    'Importen är slutförd. Alla användare behöver läsa in nytt underlag.',
                  );
                })
              }
            >
              Ersätt hushållets innehåll
            </Button>
            <Button
              disabled={m.busy}
              onClick={() => {
                next(0);
                m.value('importConfirm', '');
              }}
            >
              Avbryt förberedelsen
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Hushållet är återställt</h3>
            <p>Gamla formulär och sparförsök ska inte skickas igen.</p>
            <Button
              primary
              onClick={() => {
                m.setNotice(
                  'Återinläsning simulerad. I den här kastbara studien används samma påhittade karta.',
                );
                go('owners');
              }}
            >
              Läs in det återställda hushållet
            </Button>
            <p className="ad-muted">
              Nästa vy visar hur historiskt privat innehåll kopplas till rätt person.
            </p>
          </>
        )}
      </>
    );
  } else if (page === 'owners') {
    content = (
      <>
        <p>Koppla privat innehåll från en tidigare installation till en verifierad medlem.</p>
        <Note>
          Samma namn bevisar ingen koppling. Kontrollera personens aktuella användar-ID tillsammans.
        </Note>
        <dl className="ad-facts">
          <dt>Historisk identitet</dt>
          <dd>Lo · historisk-lo-702</dd>
          <dt>Aktuell koppling</dt>
          <dd>{m.linkedOwner}</dd>
          <dt>Privat innehåll</dt>
          <dd>2 utkastförslag · 6 placeringar (endast antal)</dd>
        </dl>
        <label className="ad-field">
          Aktuell verifierad medlem
          <select
            disabled={m.busy}
            value={v.owner}
            onChange={(e) => {
              m.value('owner', e.target.value);
              m.value('ownersConfirm', '');
            }}
          >
            <option>Lo · sky-lo-204</option>
            <option>Alex · sky-alex-101</option>
            <option>Ingen aktuell ägare</option>
          </select>
        </label>
        <p>
          Medlemmens tidigare privata arbete bevaras utan aktuell ägare. Inget slås ihop eller
          skrivs över. Medlemskap och inloggningssätt ändras inte.
        </p>
        <Check model={m} name="ownersConfirm">
          Jag har kontrollerat identiteten och granskat kopplingen.
        </Check>
        <Button
          primary
          disabled={m.busy || v.ownersConfirm !== 'yes'}
          onClick={() =>
            run('Uppdaterar innehållskopplingen', () => {
              m.setLinkedOwner(v.owner);
              m.value('ownersConfirm', '');
              m.setNotice(
                'Aktuell koppling är hämtad. Alla öppna klienter behöver läsa in nytt underlag.',
              );
            })
          }
        >
          Bekräfta innehållskopplingen
        </Button>
        <Button
          disabled={m.busy}
          onClick={() =>
            m.setNotice(
              `Aktuell koppling: ${m.linkedOwner}. Detta är en aktuell uppgift, inte ett kvitto på en tidigare begäran.`,
            )
          }
        >
          Hämta aktuella innehållskopplingar
        </Button>
      </>
    );
  } else if (page === 'erasure') {
    content = (
      <>
        <Steps
          labels={['Välj information', 'Granska hela omfattningen', 'Resultat']}
          current={step}
        />
        {step === 0 && (
          <>
            <Note>
              Permanent radering kan inte ångras i Skyttel. Vanlig borttagning och att markera något
              som upphört finns i kartarbetet.
            </Note>
            <Check model={m} name="eraseSelection">
              Avslutat cykelavtal · objekt-cykelavtal-18
            </Check>
            <Button
              primary
              disabled={m.busy || v.eraseSelection !== 'yes'}
              onClick={() =>
                run('Granskar raderingen', () => {
                  next(1);
                  m.value('eraseText', '');
                })
              }
            >
              Granska raderingen
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <h3>Det här försvinner permanent</h3>
            <ul>
              <li>Avslutat cykelavtal · objekt-cykelavtal-18</li>
              <li>2 samband och 4 historiska ändringar</li>
              <li>2 bildversioner</li>
              <li>3 berörda privata förslag och 2 personliga placeringar</li>
            </ul>
            <p>Andras privata innehåll visas endast som antal. Oberoende information bevaras.</p>
            <Note>
              Nedladdade exporter ändras inte. En äldre export kan återinföra informationen.
              Driftleverantörens kopior hanteras separat.
            </Note>
            <Field model={m} label="Skriv RADERA PERMANENT" name="eraseText" />
            <Button
              disabled={m.busy || v.eraseText !== 'RADERA PERMANENT'}
              onClick={() =>
                run('Raderar vald information permanent', () => {
                  next(2);
                  m.value('eraseText', '');
                  m.setNotice('Den permanenta raderingen är slutförd.');
                })
              }
            >
              Radera permanent
            </Button>
            <Button
              disabled={m.busy}
              onClick={() => {
                next(0);
                m.value('eraseText', '');
              }}
            >
              Avbryt
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <h3>Den permanenta raderingen är slutförd.</h3>
            <p>Läs in aktuellt innehåll innan du fortsätter. Skicka inte gamla ändringar igen.</p>
            <Button
              primary
              onClick={() => {
                go('settings');
                m.setNotice(
                  'Aktuellt innehåll inläst i provet. Det raderade exempelavtalet ingår inte i kartans åtta provobjekt.',
                );
              }}
            >
              Läs in kartan på nytt
            </Button>
          </>
        )}
      </>
    );
  } else if (page === 'costs') {
    const total = (
      (Number(m.costs.hosting) + Number(m.costs.disk) + Number(m.costs.workspace)) *
        Number(m.costs.rate) +
      14.6
    ).toFixed(2);
    content = (
      <>
        <p className="ad-eyebrow">Installationens drift · påhittat underlag</p>
        <p>Din driftbehörighet är fristående från hushållets medlemskap.</p>
        <Field model={m} label="Månad (UTC)" name="month" type="month" />
        <div className="ad-cost">
          <span>Delsumma för beräkningsbara delar</span>
          <strong>{total.replace('.', ',')} kr</strong>
          <span>Ofullständigt underlag · ingen slutlig faktura</span>
        </div>
        <div className="ad-cost-rows">
          <p>
            <strong>Render</strong>
            <span>
              {(
                (Number(m.costs.hosting) + Number(m.costs.disk) + Number(m.costs.workspace)) *
                Number(m.costs.rate)
              ).toFixed(2)}{' '}
              kr · antagen hel månad
            </span>
          </p>
          <p>
            <strong>Live</strong>
            <span>12,40 kr · uppmätt hittills</span>
          </p>
          <p>
            <strong>Terra</strong>
            <span>2,20 kr · uppmätt hittills</span>
          </p>
        </div>
        <Note>
          Två anrop saknar slutvärden. Beloppen är okända, inte noll. Underlaget kan kompletteras.
        </Note>
        <Button
          disabled={m.busy}
          onClick={() =>
            run('Uppdaterar kostnadsunderlaget', () =>
              m.setNotice('Underlaget är uppdaterat. Två slutvärden saknas fortfarande.'),
            )
          }
        >
          Uppdatera underlaget
        </Button>
        <details>
          <summary>Prisunderlag och avgränsningar</summary>
          <p>
            Påhittad kurs: {m.costs.rate} SEK per USD. Mätvärden och prisantaganden hålls isär.
            Extra trafik, skatt och krediter ingår inte. Cirka 200 kr är ett riktmärke, ingen spärr.
          </p>
          <p>
            Den riktiga vyn visar modellpriser, kontrolldatum, källor och valutakurs. Dessa externa
            prisuppgifter ingår inte i provet.
          </p>
        </details>
        <details className="ad-section">
          <summary>Ändra månadens antaganden</summary>
          <Field model={m} label="SEK per USD" name="rate" type="number" />
          <Field model={m} label="Tjänst (USD/månad)" name="hosting" type="number" />
          <Field model={m} label="Disk (USD/månad)" name="disk" type="number" />
          <Field model={m} label="Arbetsyta (USD/månad)" name="workspace" type="number" />
          <p>Gäller bara vald månad. Inga leverantörstjänster ändras.</p>
          <Button
            primary
            disabled={
              m.busy ||
              !['rate', 'hosting', 'disk', 'workspace'].every(
                (key) =>
                  v[key]?.trim() &&
                  Number.isFinite(Number(v[key])) &&
                  Number(v[key]) >= (key === 'rate' ? 0.01 : 0),
              )
            }
            onClick={() =>
              run('Sparar månadens antaganden', () => {
                m.setCosts({
                  rate: v.rate,
                  hosting: v.hosting,
                  disk: v.disk,
                  workspace: v.workspace,
                });
                m.setCostVersion((previous) => previous + 1);
              })
            }
          >
            Spara månadens antaganden
          </Button>
          <p>Aktuell version: {m.costVersion}. Förval är inget godkännande från driftansvarig.</p>
        </details>
      </>
    );
  }
  return (
    <div className="ad-content">
      {content}
      {op && <AdminOperation model={m} />}
      {!op && m.notice && (
        <p role="status" className="ad-result">
          {m.notice}
        </p>
      )}
      {done && page === 'consent' && (
        <Button onClick={() => go('assistants')}>Till anslutningarna</Button>
      )}
    </div>
  );
}

export function AdminGate({
  scenario,
  model: m,
  operator,
  go,
  enter,
  setup,
  logout,
}: {
  scenario: string;
  model: AdminModel;
  operator: boolean;
  go: (page: NavPage) => void;
  enter: (empty: boolean) => void;
  setup: () => void;
  logout: () => void;
}) {
  const [provider, setProvider] = useState('');
  useEffect(() => {
    if (scenario) document.getElementById('ad-gate-title')?.focus();
  }, [scenario]);
  return (
    <section className="np-gate ad-gate ad-content" aria-labelledby="ad-gate-title">
      <p className="ad-eyebrow">Skyttel · ditt hushåll, sammanbundet</p>
      <h1 id="ad-gate-title" tabIndex={-1}>
        {scenario === 'signin'
          ? 'Välkommen hem.'
          : scenario === 'setup'
            ? 'Ge er karta ett namn.'
            : 'Din inloggning fungerar.'}
      </h1>
      {scenario === 'signin' ? (
        <>
          <p>
            En gemensam plats för det som hör ihop. Logga in med ditt eget Google- eller
            Microsoft-konto.
          </p>
          {provider ? (
            <>
              <Note>
                Du går vidare till {provider}. Efter inloggningen kommer du tillbaka till Skyttel.
              </Note>
              <Button
                primary
                disabled={m.busy}
                onClick={() => m.run('signin', `Loggar in med ${provider}`, () => enter(false))}
              >
                Fortsätt till {provider} ↗
              </Button>
              <Button disabled={m.busy} onClick={() => setProvider('')}>
                Avbryt
              </Button>
            </>
          ) : (
            <>
              <Button primary onClick={() => setProvider('Google')}>
                Fortsätt med Google
              </Button>
              <Button onClick={() => setProvider('Microsoft')}>Fortsätt med Microsoft</Button>
            </>
          )}
          <p className="ad-muted">
            Bara de inloggningssätt som installationen erbjuder visas. Externa inloggningssteg är
            simulerade i provet.
          </p>
        </>
      ) : scenario === 'setup' ? (
        <>
          <p>Du är utsedd till installationens första administratör. Börja med hushållets namn.</p>
          <Field model={m} label="Hushållets namn" name="household" />
          <Button
            primary
            disabled={
              m.busy || !m.values.household.trim() || m.values.household.trim().length > 100
            }
            onClick={() => m.run('setup', 'Skapar hushållet', () => enter(true))}
          >
            Skapa hushåll
          </Button>
          <p className="ad-muted">1–100 tecken. Du kan bjuda in andra när kartan öppnas.</p>
        </>
      ) : (
        <>
          <p>
            Du har inte tillgång till hushållet. Be administratören om en inbjudan för ditt
            användar-ID. Att logga in igen återställer inte ett återkallat medlemskap.
          </p>
          <Button primary onClick={() => go('invitations')}>
            Inbjudan och användar-ID
          </Button>
          <Button onClick={() => go('login-methods')}>Inloggningssätt</Button>
          {operator && <Button onClick={() => go('costs')}>Öppna kostnadsöversikt</Button>}
          <Button onClick={logout}>Logga ut</Button>
        </>
      )}
      {m.operation && ['signin', 'setup'].includes(m.operation.page) && (
        <AdminOperation model={m} />
      )}
      {scenario === 'signin' && (
        <details className="ad-demo">
          <summary>Pröva första administratören</summary>
          <p>Det här är ett provläge, ingen möjlighet till självtilldelad behörighet.</p>
          <Button onClick={setup}>Visa första skapandet</Button>
        </details>
      )}
    </section>
  );
}
