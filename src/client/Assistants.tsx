import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { request } from './map-request.js';

type AssistantContext = {
  user: { id: string; name: string };
  households: { id: string; name: string; role: string }[];
  client: { clientId: string; name: string } | null;
  connections: {
    id: string;
    householdId: string;
    userId: string;
    clientName: string;
    userName: string;
  }[];
};

export function Assistants({ consent = false }: { consent?: boolean }) {
  const [data, setData] = useState<AssistantContext | null>(null);
  const [householdId, setHouseholdId] = useState('');
  const [externalAi, setExternalAi] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const clientId = new URLSearchParams(window.location.search).get('client_id') ?? '';
  useEffect(() => {
    const controller = new AbortController();
    void request<AssistantContext>(
      `/api/assistants/context?client_id=${encodeURIComponent(clientId)}&revision=${revision}`,
      undefined,
      controller.signal,
    )
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [clientId, revision]);

  async function decide(accept: boolean) {
    setPending(true);
    setError(false);
    try {
      const result = await request<{ url: string }>('/api/assistants/consent', {
        accept,
        externalAi,
        householdId,
        oauth_query: window.location.search.slice(1),
      });
      const url = new URL(result.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid_redirect');
      window.location.assign(url.href);
    } catch {
      setError(true);
      setPending(false);
    }
  }

  async function revoke(id: string) {
    setPending(true);
    setError(false);
    try {
      await request(`/api/assistants/${encodeURIComponent(id)}/revoke`, {});
      setRevision((value) => value + 1);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel">
      <h1>{consent ? 'Anslut extern assistent' : 'Assistentanslutningar'}</h1>
      <p>
        En extern assistent kan läsa valt hushålls gemensamma karta och ditt eget privata utkast.
        Den kan inte ändra eller spara något genom denna anslutning.
      </p>
      <p>
        Uppgifter som assistenten hämtar behandlas av den externa AI-tjänsten enligt ditt avtal och
        dina inställningar där. Databasen i EU garanterar inte att extern AI-behandling sker enbart
        i EU. Undvik lösenord och andra hemligheter i kartan.
      </p>
      <p>
        Valet gäller AI-behandling och är skilt från cookies och annan lagring. Ett nej lämnar
        formulär och manuellt kartarbete tillgängliga. Återkallelse stoppar nya hämtningar; den
        raderar inte uppgifter som klienten redan har fått.
      </p>
      {!data && !error && <p role="status">Hämtar anslutningar…</p>}
      {data && (
        <>
          <p>
            Inloggad som {data.user.name} ({data.user.id}).
          </p>
          {consent && (
            <>
              <p>
                Klient: {data.client?.name ?? 'Okänd klient'} ({clientId}). Namnet är klientens egen
                uppgift.
              </p>
              <p>
                Begärd åtkomst: läsa karta och eget utkast
                {new URLSearchParams(window.location.search)
                  .get('scope')
                  ?.includes('offline_access')
                  ? ', även när denna webbsida är stängd'
                  : ''}
                .
              </p>
              <label htmlFor="assistant-household">Välj hushåll</label>
              <select
                id="assistant-household"
                value={householdId}
                onChange={(event) => setHouseholdId(event.target.value)}
              >
                <option value="">Välj hushåll</option>
                {data.households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.name}
                  </option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={externalAi}
                  onChange={(event) => setExternalAi(event.target.checked)}
                />
                Jag tillåter extern AI-behandling av uppgifterna som denna anslutning hämtar.
              </label>
              <div className="access-actions">
                <button
                  type="button"
                  disabled={pending || !externalAi || !householdId || !data.client}
                  onClick={() => void decide(true)}
                >
                  Godkänn läsåtkomst
                </button>
                <button type="button" disabled={pending} onClick={() => void decide(false)}>
                  Nej, anslut inte
                </button>
              </div>
            </>
          )}
          {!consent && (
            <>
              <p>
                MCP-adress: <code>{window.location.origin}/mcp</code>. Lägg till adressen med OAuth
                i din textklient och godkänn anslutningen här i Skyttel.
              </p>
              <h2>Aktiva anslutningar</h2>
              {data.connections.length === 0 && <p>Inga aktiva assistentanslutningar.</p>}
              <ul>
                {data.connections.map((connection) => (
                  <li key={connection.id}>
                    <p>
                      {connection.clientName} – {connection.userName} –{' '}
                      {
                        data.households.find((household) => household.id === connection.householdId)
                          ?.name
                      }
                    </p>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void revoke(connection.id)}
                    >
                      Återkalla anslutning för {connection.clientName}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p>
            Användarhantering, fullständig export, återimport och permanent radering görs i Skyttels
            inloggade administrationssidor, även när assistenten ansluts av en administratör.
          </p>
          {data.households
            .filter((household) => household.role === 'administrator')
            .map((household) => (
              <p key={household.id}>
                <Link to={`/households/${household.id}/administration`}>
                  Administrera {household.name}
                </Link>
              </p>
            ))}
        </>
      )}
      {error && (
        <p role="alert">
          Anslutningen kunde inte hanteras. Kontrollera din tillgång och starta anslutningen igen
          från klienten.
        </p>
      )}
      <p>
        <Link to="/">Till kartan</Link>
      </p>
    </section>
  );
}
