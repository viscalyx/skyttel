import { useCallback, useEffect, useRef, useState } from 'react';
import type { ObjectType, ObjectValue, RelationshipValue } from '../shared/map.js';
import type { TextAssistantView } from '../shared/text-assistant.js';
import { FinancialFactsDetails } from './FinancialFacts.js';
import { LifecycleDetails } from './Lifecycle.js';
import { MapRequestError, request } from './map-request.js';
import { MergeSourceDetails } from './ObjectMerge.js';
import { CustomFieldsDetails, ObjectTypeDetails } from './ObjectTypes.js';
import { ProfileImage } from './ProfileImage.js';
import { RelationshipTypeDetails } from './RelationshipTypes.js';
import { receiptMessage, rejectionMessage } from './SaveOperations.js';
import { VoiceAssistant } from './VoiceAssistant.js';

function relationshipDetails(
  value: RelationshipValue,
  forwardLabel = 'Samband',
  objectNames: Record<string, string> = {},
) {
  const source = objectNames[value.sourceId] ?? value.sourceId;
  const target = value.targetId
    ? (objectNames[value.targetId] ?? value.targetId)
    : value.knowledge === 'none'
      ? 'Uttryckligen inget'
      : value.knowledge === 'unresolved'
        ? 'Olöst identitet'
        : 'Okänt';
  return `${source} → ${forwardLabel} → ${target}${value.knowledge === 'uncertain' ? ' (osäkert uppgivet)' : ''}`;
}

function ObjectDetails({ value, type }: { value: ObjectValue | null; type: ObjectType }) {
  return value ? (
    <>
      <p>
        {value.name} · {type.name}
      </p>
      <p>{value.description}</p>
      <ProfileImage householdId={type.householdId} value={value} />
      <FinancialFactsDetails facts={value.financialFacts} />
      <CustomFieldsDetails type={type} values={value.customValues} />
      <LifecycleDetails value={value} />
      {value.identity && (
        <p>
          {value.identity === 'unresolved'
            ? 'Identiteten behöver redas ut.'
            : 'Uttryckligen ospecificerat objekt.'}
        </p>
      )}
    </>
  ) : (
    <p>Borttaget</p>
  );
}
function errorMessage(code: string) {
  if (code === 'assistant_save_not_requested')
    return 'Inget sparades. Skriv ett tydligt aktuellt sparbesked, till exempel ”Spara hela utkastet nu”, när du vill spara.';
  if (code === 'assistant_draft_changed' || code === 'assistant_conflict')
    return 'Utkastet eller kartan har ändrats. Hämta aktuellt underlag, red ut eventuella konflikter och ge ett nytt besked.';
  if (code === 'operation_pending' || code === 'assistant_save_unknown')
    return 'Sparresultatet behöver kontrolleras innan nytt arbete kan börja.';
  return 'Assistenten kunde inte slutföra uppdraget. Kontrollera utkastet och tidigare sparförsök. Du kan fortsätta i kartans formulär.';
}

export function TextAssistant({
  householdId,
  onMapChange,
  onAccessLost,
  onSelectObject,
  selectedObjectId,
}: {
  householdId: string;
  onMapChange: () => void;
  onAccessLost: () => void;
  onSelectObject: (id: string) => boolean;
  selectedObjectId: string | null;
}) {
  const path = `/api/households/${encodeURIComponent(householdId)}/text-assistant`;
  const [available, setAvailable] = useState<boolean | null>(null);
  const [externalAi, setExternalAi] = useState(false);
  const [mapWork, setMapWork] = useState(false);
  const [session, setSession] = useState<TextAssistantView | null>(null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [unknown, setUnknown] = useState(false);
  const active = useRef<TextAssistantView | null>(null);
  const callbacks = useRef({ onMapChange, onAccessLost, onSelectObject });
  callbacks.current = { onMapChange, onAccessLost, onSelectObject };
  const mounted = useRef(true);
  const requestEpoch = useRef(0);
  const update = useCallback((next: TextAssistantView) => {
    if (!mounted.current) return;
    const previous = active.current;
    if (
      previous &&
      (next.id !== previous.id ||
        next.revision < previous.revision ||
        next.review.contentVersion < previous.review.contentVersion ||
        (next.review.contentVersion === previous.review.contentVersion &&
          next.review.version < previous.review.version))
    )
      return;
    active.current = next;
    setSession(next);
    if (
      !previous ||
      next.review.version !== previous.review.version ||
      next.review.contentVersion !== previous.review.contentVersion ||
      next.receipt?.operationId !== previous.receipt?.operationId
    )
      callbacks.current.onMapChange();
  }, []);
  const fail = useCallback((failure: unknown) => {
    if (!mounted.current) return;
    if (failure instanceof MapRequestError && [401, 403, 404].includes(failure.status)) {
      active.current = null;
      setSession(null);
      setText('');
      setUnknown(false);
      setExternalAi(false);
      setMapWork(false);
      setError(
        failure.status === 404
          ? 'Samtalet har avslutats eller innehållet har ersatts. Starta en ny anslutning; ditt beständiga utkast och dina sparförsök finns kvar.'
          : 'Åtkomsten har upphört.',
      );
      if (failure.status !== 404) callbacks.current.onAccessLost();
    } else {
      setUnknown(true);
      setError(
        'Svaret saknas. Kontrollera sparresultat innan du skickar något nytt. Ett genomfört sparande är inte ångrat.',
      );
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void request<{ available: boolean }>(path, undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAvailable(result.available);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailable(false);
      });
    return () => {
      mounted.current = false;
      requestEpoch.current++;
      controller.abort();
      const current = active.current;
      active.current = null;
      if (current) void request(`${path}/${current.id}/stop`, {}).catch(() => undefined);
    };
  }, [path]);
  useEffect(() => {
    if (!session || unknown || pending) return;
    const controller = new AbortController();
    const epoch = requestEpoch.current;
    const relevant = () =>
      !controller.signal.aborted &&
      epoch === requestEpoch.current &&
      active.current?.id === session.id;
    const timer = setTimeout(
      () => {
        void request<TextAssistantView>(`${path}/${session.id}`, undefined, controller.signal)
          .then((result) => {
            if (relevant()) update(result);
          })
          .catch((failure) => {
            if (relevant()) fail(failure);
          });
      },
      session.phase === 'working' ? 250 : 5000,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [session, unknown, pending, path, update, fail]);
  async function start() {
    const epoch = ++requestEpoch.current;
    setPending(true);
    setError('');
    try {
      const result = await request<TextAssistantView>(path, { externalAi, mapWork });
      if (!mounted.current || epoch !== requestEpoch.current) {
        void request(`${path}/${result.id}/stop`, {}).catch(() => undefined);
        return;
      }
      setUnknown(false);
      update(result);
    } catch (failure) {
      if (epoch === requestEpoch.current) fail(failure);
    } finally {
      if (mounted.current && epoch === requestEpoch.current) setPending(false);
    }
  }
  const command = useCallback(
    async (name: string, body: unknown = {}) => {
      const current = active.current;
      if (!current) return;
      const epoch = ++requestEpoch.current;
      setPending(true);
      setError('');
      try {
        const result = await request<TextAssistantView>(`${path}/${current.id}/${name}`, body);
        if (epoch !== requestEpoch.current) return;
        setUnknown(false);
        update(result);
      } catch (failure) {
        if (epoch === requestEpoch.current) fail(failure);
      } finally {
        if (mounted.current && epoch === requestEpoch.current) setPending(false);
      }
    },
    [path, update, fail],
  );
  async function send() {
    const current = session;
    if (!current || !text.trim()) return;
    const epoch = ++requestEpoch.current;
    const sent = text;
    setPending(true);
    setError('');
    try {
      const result = await request<TextAssistantView>(`${path}/${current.id}/messages`, {
        revision: current.revision,
        draftVersion: current.review.version,
        contentVersion: current.review.contentVersion,
        requestId: crypto.randomUUID(),
        text: sent,
      });
      if (epoch !== requestEpoch.current) return;
      update(result);
      setText((value) => (value === sent ? '' : value));
      setUnknown(false);
    } catch (failure) {
      if (epoch === requestEpoch.current) fail(failure);
    } finally {
      if (mounted.current && epoch === requestEpoch.current) setPending(false);
    }
  }
  async function stop() {
    const current = active.current;
    if (!current) return;
    const epoch = ++requestEpoch.current;
    setPending(true);
    try {
      await request(`${path}/${current.id}/stop`, {});
      if (epoch !== requestEpoch.current) return;
      active.current = null;
      setSession(null);
      setText('');
      setExternalAi(false);
      setMapWork(false);
      setUnknown(false);
      setError('');
    } catch (failure) {
      if (epoch === requestEpoch.current) fail(failure);
    } finally {
      if (mounted.current && epoch === requestEpoch.current) setPending(false);
    }
  }
  const selectionRequested = useRef<string | null>(null);
  const selectionAcknowledged = useRef<string | null>(null);
  useEffect(() => {
    const selection = session?.selection;
    if (
      !selection ||
      pending ||
      session.phase !== 'working' ||
      selection.revision !== session.revision
    )
      return;
    const key = `${session.id}:${selection.revision}:${selection.objectId}`;
    if (selectionRequested.current === key) return;
    selectionRequested.current = key;
    if (!callbacks.current.onSelectObject(selection.objectId)) {
      selectionAcknowledged.current = key;
      void command('selection', { ...selection, displayed: false });
    }
  }, [session, pending, command]);
  useEffect(() => {
    const selection = session?.selection;
    if (
      !selection ||
      pending ||
      session.phase !== 'working' ||
      selectedObjectId !== selection.objectId ||
      selection.revision !== session.revision
    )
      return;
    const key = `${session.id}:${selection.revision}:${selection.objectId}`;
    if (selectionAcknowledged.current === key) return;
    const epoch = requestEpoch.current;
    let frame = 0;
    const first = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (epoch !== requestEpoch.current) return;
        selectionAcknowledged.current = key;
        void command('selection', {
          ...selection,
          displayed: document.visibilityState === 'visible',
        });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(frame);
    };
  }, [session, pending, selectedObjectId, command]);
  const review = session?.review;
  return (
    <section aria-label="Skyttels textassistent" className="text-assistant">
      <h3>Skyttels textassistent</h3>
      {available === false && (
        <p>Textassistenten är inte tillgänglig. Du kan använda kartan och formulären.</p>
      )}
      {!session && available && (
        <>
          <p>
            OpenAI behandlar ditt meddelande, hela ditt eget utkast och relevanta kartuppgifter. Om
            du startar röst behandlas även ditt ljud. Mikrofonen startar först när du väljer det.
            Samtalet sparas inte i Skyttels hushållsinnehåll. Skriv inga lösenord eller fullständiga
            konto- och kortnummer.
          </p>
          <label>
            <input
              type="checkbox"
              checked={externalAi}
              onChange={(event) => setExternalAi(event.target.checked)}
            />{' '}
            Jag tillåter att OpenAI behandlar uppgifterna i detta samtal.
          </label>
          <label>
            <input
              type="checkbox"
              checked={mapWork}
              onChange={(event) => setMapWork(event.target.checked)}
            />{' '}
            Jag tillåter förslag och sparande av hela mitt utkast när jag uttryckligen ber om det.
          </label>
          <button
            type="button"
            disabled={pending || !externalAi || !mapWork}
            onClick={() => void start()}
          >
            Starta textassistenten
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {session && (
        <>
          <VoiceAssistant
            householdId={householdId}
            assistant={session}
            onAssistant={update}
            onAccessLost={onAccessLost}
            onRecoveryNeeded={() => setUnknown(true)}
          />
          <p role="status">
            {session.phase === 'working'
              ? 'Assistenten arbetar… Du kan avbryta eller ge ett nytt uppdrag.'
              : session.phase === 'recovery'
                ? 'Kontrollera det tidigare sparförsöket innan du fortsätter.'
                : session.receipt
                  ? 'Sparat. Hela utkastet finns i hushållets karta.'
                  : session.displayedSelection
                    ? 'Markerat i kartan.'
                    : 'Nya förslag är osparade tills du uttryckligen ber om ett samlat sparande.'}
          </p>
          {session.reply && !session.receipt && !session.displayedSelection && (
            <div>
              <h4>Assistentens svar</h4>
              <p>{session.reply}</p>
            </div>
          )}
          {session.error && <p role="alert">{errorMessage(session.error)}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="text-assistant-message">Meddelande till textassistenten</label>
            <textarea
              id="text-assistant-message"
              maxLength={4000}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button
              type="submit"
              disabled={pending || unknown || session.phase === 'recovery' || !text.trim()}
            >
              Skicka
            </button>
          </form>
          {session.phase === 'working' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => void command('cancel', { revision: session.revision })}
            >
              Avbryt uppdrag
            </button>
          )}
          <button type="button" disabled={pending} onClick={() => void command('recover')}>
            Kontrollera sparresultat
          </button>
          <button type="button" disabled={pending} onClick={() => void stop()}>
            Avsluta textassistenten
          </button>
          {review && (
            <section aria-label="Assistentens hela utkast">
              <h4>Hela ditt utkast</h4>
              <p>
                Även tidigare förslag från formulär och andra klienter ingår. Ett sparbesked gäller
                allt som visas här.
              </p>
              {!review.changes.length &&
                !review.relationships?.length &&
                !review.objectTypes?.length &&
                !review.relationshipTypes?.length && <p>Inga förslag.</p>}
              <ul>
                {review.changes.map((change) => (
                  <li key={change.id}>
                    {change.after ? (change.before ? 'Rätta' : 'Lägg till') : 'Ta bort'}:{' '}
                    {change.after?.name ?? change.before?.name}
                  </li>
                ))}
              </ul>
              {Boolean(review.conflicts.length || review.unresolvedIdentities.length) && (
                <p>Utkastet har konflikter eller olösta identiteter. Red ut dem före sparande.</p>
              )}
              <details>
                <summary>Visa hela utkastets detaljer</summary>
                {review.changes.map((change) => (
                  <article key={change.id}>
                    <h5>{change.after?.name ?? change.before?.name}</h5>
                    {change.before && (
                      <>
                        <p>Tidigare:</p>
                        <ObjectDetails
                          value={change.before}
                          type={change.beforeType ?? change.type}
                        />
                      </>
                    )}
                    <p>Förslag:</p>
                    <ObjectDetails value={change.after} type={change.type} />
                    {change.merge && (
                      <MergeSourceDetails merge={change.merge} householdId={householdId} />
                    )}
                  </article>
                ))}
                {review.relationships?.map((change) => (
                  <article key={change.id}>
                    <h5>{change.type.name}</h5>
                    {[change.before, change.after].map((value, index) => (
                      <div key={index === 0 ? 'before' : 'after'}>
                        <p>
                          {index === 0 ? 'Tidigare' : 'Förslag'}:{' '}
                          {value
                            ? relationshipDetails(
                                value,
                                change.type.forwardLabel,
                                change.objectNames,
                              )
                            : 'Borttaget'}
                        </p>
                        {value && <LifecycleDetails value={value} />}
                      </div>
                    ))}
                  </article>
                ))}
                {review.objectTypes?.map((change) => (
                  <article key={change.id}>
                    <p>Objekttyp före:</p>
                    <ObjectTypeDetails type={change.before} />
                    <p>Objekttyp efter:</p>
                    <ObjectTypeDetails
                      type={
                        change.after
                          ? { ...change.after, id: change.id, householdId, revision: 0 }
                          : null
                      }
                    />
                  </article>
                ))}
                {review.relationshipTypes?.map((change) => (
                  <article key={change.id}>
                    <p>Sambandstyp före:</p>
                    <RelationshipTypeDetails type={change.before} />
                    <p>Sambandstyp efter:</p>
                    <RelationshipTypeDetails
                      type={
                        change.after
                          ? { ...change.after, id: change.id, householdId, revision: 0 }
                          : null
                      }
                    />
                  </article>
                ))}
                {review.conflicts.map((conflict) => {
                  const objectChange = review.changes.find((change) => change.id === conflict.id);
                  const edgeChange = review.relationships?.find(
                    (change) => change.id === conflict.id,
                  );
                  return (
                    <article key={`${conflict.kind}-${conflict.id}`}>
                      <h5>Konflikt: aktuellt sparat värde</h5>
                      {conflict.kind === 'object' && objectChange && (
                        <ObjectDetails
                          value={conflict.current}
                          type={
                            review.current?.types.find(
                              (type) => type.id === conflict.current?.typeId,
                            ) ?? objectChange.type
                          }
                        />
                      )}
                      {conflict.kind === 'objectType' && (
                        <ObjectTypeDetails type={conflict.current} />
                      )}
                      {conflict.kind === 'relationshipType' && (
                        <RelationshipTypeDetails type={conflict.current} />
                      )}
                      {conflict.kind === 'relationship' && (
                        <>
                          <p>
                            {conflict.current
                              ? relationshipDetails(
                                  conflict.current,
                                  review.current?.relationshipTypes.find(
                                    (type) => type.id === conflict.current?.typeId,
                                  )?.forwardLabel,
                                  edgeChange?.objectNames,
                                )
                              : 'Finns inte i kartan'}
                          </p>
                          {conflict.current && <LifecycleDetails value={conflict.current} />}
                        </>
                      )}
                      {conflict.type !== undefined && (
                        <p>
                          {conflict.type
                            ? `Typen har ändrats: ${conflict.type.name}. ${conflict.type.description}`
                            : 'Typen finns inte längre.'}
                        </p>
                      )}
                      {Boolean(conflict.missingEndpoints?.length) && (
                        <p>Sambandet hänvisar till borttagna objekt.</p>
                      )}
                      {Boolean(conflict.duplicates?.length) && (
                        <p>Motsvarande samband finns redan i kartan.</p>
                      )}
                      {Boolean(conflict.connections?.length) && (
                        <p>Borttagningen berör även sparade samband.</p>
                      )}
                    </article>
                  );
                })}
              </details>
            </section>
          )}
          {session.receipt && (
            <details>
              <summary>Visa kvittot</summary>
              <p>{receiptMessage(session.receipt)}</p>
              <p>Sparat: {session.receipt.savedAt}</p>
            </details>
          )}
          <details open={session.phase === 'recovery'}>
            <summary>Tidigare sparförsök</summary>
            {!session.operations.length && <p>Inga registrerade sparförsök.</p>}
            {session.operations.map((operation) => (
              <article key={operation.operationId}>
                <p>
                  {operation.status === 'succeeded'
                    ? receiptMessage(operation.receipt)
                    : operation.status === 'rejected'
                      ? rejectionMessage(operation.error)
                      : `Väntande sparförsök: ${operation.operationId}`}
                </p>
                {operation.status === 'pending' && (
                  <button
                    type="button"
                    disabled={pending || session.phase === 'working'}
                    onClick={() => void command('retry', { operationId: operation.operationId })}
                  >
                    Slutför samma sparförsök
                  </button>
                )}
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
