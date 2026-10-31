import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecoveryReview } from '../shared/installation-recovery.js';
import { MapRequestError, request } from './map-request.js';

export function InstallationRecovery({
  canReview,
  onComplete,
}: {
  canReview: boolean;
  onComplete: () => void;
}) {
  const [review, setReview] = useState<RecoveryReview>();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [appointedControl, setAppointedControl] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (appointedControl) {
      document.getElementById(appointedControl)?.focus();
      setAppointedControl(undefined);
    }
  }, [appointedControl]);
  const load = useCallback(async () => {
    setError('');
    try {
      setReview(await request<RecoveryReview>('/api/recovery'));
      setRoles({});
    } catch {
      setError('Granskningen kunde inte hämtas. Åtkomsten är fortfarande spärrad.');
    }
  }, []);
  useEffect(() => {
    if (canReview) void load();
  }, [canReview, load]);
  async function complete() {
    if (!review) return;
    setBusy(true);
    setError('');
    try {
      await request('/api/recovery/complete', {
        ...review,
        confirmed: true,
        households: review.households.map((household) => ({
          id: household.id,
          members: household.members
            .map((member) => ({
              userId: member.userId,
              role: roles[`${household.id}:${member.userId}`] ?? member.role,
            }))
            .filter((member) => member.role !== 'revoked'),
        })),
      });
      onComplete();
    } catch (failure) {
      setError(
        failure instanceof MapRequestError && failure.code === 'last_administrator'
          ? 'Varje hushåll måste ha minst en administratör. Åtkomsten är fortfarande spärrad.'
          : 'Granskningen kunde inte bekräftas. Kontrollera åtkomsten igen innan du försöker på nytt.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1 ref={heading} tabIndex={-1}>
        Bekräfta åtkomst efter återställning
      </h1>
      <p>
        Installationen har återställts. Hushållens information är spärrad tills aktuella medlemskap
        och roller har bekräftats.
      </p>
      {!canReview ? (
        <p>
          Kontakta installationsansvarig. Endast den utsedda återställningsadministratören kan
          granska åtkomsten. Logga in med det utsedda inloggningssättet om det är du.
        </p>
      ) : (
        <>
          <p>
            Jämför hela listan med aktuella uppgifter, även ändringar efter säkerhetskopian. Om du
            inte kan fastställa rätt åtkomst ska du lämna den spärrad. Ditt tillfälliga uppdrag ger
            dig inget vanligt medlemskap.
          </p>
          {!review && !error && <p role="status">Hämtar medlemskap…</p>}
          {review && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void complete();
              }}
            >
              {review.households.map((household) => (
                <fieldset key={household.id} disabled={busy}>
                  <legend>{household.name}</legend>
                  {household.members.map((member) => {
                    const key = `${household.id}:${member.userId}`;
                    return (
                      <div key={member.userId}>
                        <label htmlFor={key}>{member.name} – roll</label>
                        <p className="recovery-identity">Användar-ID: {member.userId}</p>
                        <select
                          id={key}
                          value={roles[key] ?? member.role}
                          onChange={(event) => setRoles({ ...roles, [key]: event.target.value })}
                        >
                          <option value="administrator">Administratör</option>
                          <option value="member">Medlem</option>
                          <option value="revoked">Ingen åtkomst</option>
                        </select>
                      </div>
                    );
                  })}
                  {!household.members.some((member) => member.userId === review.actor.userId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppointedControl(`${household.id}:${review.actor.userId}`);
                        setReview({
                          ...review,
                          households: review.households.map((item) =>
                            item.id === household.id
                              ? {
                                  ...item,
                                  members: [
                                    ...item.members,
                                    { ...review.actor, role: 'administrator' },
                                  ],
                                }
                              : item,
                          ),
                        });
                      }}
                    >
                      Utse mig till administratör i {household.name}
                    </button>
                  )}
                </fieldset>
              ))}
              <p>
                Genom att bekräfta intygar du att hela den kvarvarande listan och rollerna är
                aktuella. Åtkomsten öppnas och ditt tillfälliga uppdrag avslutas. Gamla inbjudningar
                förblir ogiltiga.
              </p>
              <button type="submit" disabled={busy}>
                {busy ? 'Bekräftar…' : 'Bekräfta hela listan och öppna åtkomsten'}
              </button>
            </form>
          )}
          <p role="alert">{error}</p>
          {error && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onComplete();
                void load();
              }}
            >
              Kontrollera åtkomsten igen
            </button>
          )}
        </>
      )}
    </section>
  );
}
