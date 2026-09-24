import { useCallback, useEffect, useRef, useState } from 'react';
import { type DraftConflict, draftConflicts } from '../shared/draft-conflicts.js';
import type {
  MapDraft,
  MapObject,
  MapRelationship,
  MapState,
  ObjectType,
  ObjectValue,
  RelationshipValue,
  SaveOperation,
  SaveReceipt,
} from '../shared/map.js';
import { proposedObjectTypes, proposedRelationships } from '../shared/map.js';
import { FinancialFactsDetails, FinancialFactsEditor } from './FinancialFacts.js';
import { MapRequestError, request } from './map-request.js';
import {
  CustomFieldsDetails,
  CustomFieldsEditor,
  ObjectTypeDetails,
  ObjectTypeEditor,
} from './ObjectTypes.js';
import { RelationshipEditor, relationshipLabel } from './RelationshipEditor.js';
import {
  checkOperation,
  checkSaveIdentity,
  receiptMessage,
  rejectionMessage,
  type SaveAttempt,
  SaveOperations,
} from './SaveOperations.js';

type Editor = {
  id: string;
  version: number;
  baseRevision: number | null;
  typeRevision: number;
  value: ObjectValue;
};

function checkOperations(operations: SaveOperation[], householdId: string, current: MapState) {
  for (const operation of operations)
    checkOperation(operation, {
      operationId: operation.operationId,
      version: operation.draftVersion,
      contentVersion: current.contentVersion,
      householdId,
      userId: current.userId,
    });
}

async function readOperations(path: string, householdId: string, current: MapState) {
  const result = await request<{ operations: SaveOperation[] }>(`${path}/operations`);
  checkOperations(result.operations, householdId, current);
  return result.operations;
}

export function HouseholdMap({ householdId }: { householdId: string }) {
  const path = `/api/households/${encodeURIComponent(householdId)}/map`;
  const [state, setState] = useState<MapState | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [edgeEditor, setEdgeEditor] = useState<{
    id: string;
    version: number;
    baseRevision: number | null;
    value: RelationshipValue;
  } | null>(null);
  const [typeEditor, setTypeEditor] = useState<{
    type: ObjectType;
    version: number;
    baseRevision: number | null;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const saveAttempt = useRef<SaveAttempt | null>(null);
  const [operations, setOperations] = useState<SaveOperation[]>([]);
  const nameInput = useRef<HTMLInputElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const focusAfterClose = useRef(false);
  const [load, setLoad] = useState(0);

  const loseAccess = useCallback(() => {
    setState(null);
    setOperations([]);
    setEditor(null);
    setEdgeEditor(null);
    setTypeEditor(null);
    setDirty(false);
    saveAttempt.current = null;
    setStatus('');
    setError('Du har inte längre tillgång. Logga in och kontrollera din tillgång till hushållet.');
  }, []);

  useEffect(() => {
    let active = true;
    setPending(true);
    void (async () => {
      const result = await request<{ operations: SaveOperation[] }>(`${path}/operations`);
      const attempt = saveAttempt.current;
      const operation = attempt
        ? (
            await request<{ operation: SaveOperation | null }>(
              `${path}/operations/${encodeURIComponent(attempt.operationId)}`,
            )
          ).operation
        : null;
      // Read the map after the results: another client may have completed a
      // pending save while this client was discovering its durable receipt.
      const value = await request<MapState>(`${path}?reload=${load}`);
      if (!active) return;
      checkOperations(result.operations, householdId, value);
      let recent = result.operations;
      let message = '';
      if (attempt) {
        if (
          attempt.contentVersion !== value.contentVersion ||
          attempt.userId !== value.userId ||
          attempt.householdId !== householdId
        ) {
          saveAttempt.current = null;
          setStatus('');
          message = rejectionMessage('content_conflict');
        } else if (operation) {
          checkOperation(operation, attempt);
          recent = [
            operation,
            ...recent.filter((item) => item.operationId !== operation.operationId),
          ];
          if (operation.status === 'succeeded') {
            setStatus(receiptMessage(operation.receipt));
            saveAttempt.current = null;
          } else if (operation.status === 'rejected') {
            message = rejectionMessage(operation.error);
            saveAttempt.current = null;
          }
        } else {
          message =
            'Utfallet är okänt. Inget registrerat resultat hittades. Återförsök samma sparande.';
        }
      }
      const waiting = recent.some((item) => item.status === 'pending');
      setState(value);
      setOperations(recent);
      setBlocked(waiting || Boolean(saveAttempt.current));
      setError(message || (waiting ? rejectionMessage('operation_pending') : ''));
    })()
      .catch((failure) => {
        if (!active) return;
        setBlocked(true);
        if (failure instanceof MapRequestError && [401, 403].includes(failure.status)) loseAccess();
        else setError('Kartan och sparförsöken kunde inte hämtas. Försök igen.');
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [path, load, householdId, loseAccess]);

  useEffect(() => {
    if (editor?.id) nameInput.current?.focus();
    else if (focusAfterClose.current) {
      focusAfterClose.current = false;
      newButton.current?.focus();
    }
  }, [editor?.id]);

  async function save(attempt: SaveAttempt, recover = false) {
    if (!state || pending) return;
    saveAttempt.current = attempt;
    setPending(true);
    setError('');
    setStatus('');
    let confirmed = false;
    try {
      const body = {
        operationId: attempt.operationId,
        version: attempt.version,
        contentVersion: attempt.contentVersion,
      };
      let operation: SaveOperation | null = null;
      if (recover) {
        const result = await request<{ operation: SaveOperation | null }>(
          `${path}/operations/${encodeURIComponent(attempt.operationId)}`,
        );
        operation = result.operation;
      }
      if (!operation) {
        const result = await request<{ operation: SaveOperation }>(`${path}/operations`, body);
        operation = result.operation;
      }
      checkOperation(operation, attempt);
      setOperations((previous) => [
        operation,
        ...previous.filter((item) => item.operationId !== attempt.operationId),
      ]);
      if (operation.status === 'rejected') throw new MapRequestError(409, operation.error);
      const receipt =
        operation.status === 'succeeded'
          ? operation.receipt
          : (await request<{ receipt: SaveReceipt }>(`${path}/save`, body)).receipt;
      checkSaveIdentity(receipt, attempt);
      setStatus(receiptMessage(receipt));
      setOperations((previous) =>
        previous.map((item) =>
          item.operationId === attempt.operationId
            ? { ...item, status: 'succeeded', receipt }
            : item,
        ),
      );
      saveAttempt.current = null;
      confirmed = true;
      // Recovery can happen while an older form has unsent text. Keep that text
      // and let its draft-version check prevent it from overwriting newer work.
      if (!dirty) {
        setEditor(null);
        setEdgeEditor(null);
        setTypeEditor(null);
      }
      const { operations: recent } = await request<{ operations: SaveOperation[] }>(
        `${path}/operations`,
      );
      const latest = await request<MapState>(path);
      checkOperations(recent, householdId, latest);
      setState(latest);
      setOperations(recent);
      setBlocked(recent.some((item) => item.status === 'pending'));
      if (!dirty) newButton.current?.focus();
    } catch (failure) {
      setBlocked(true);
      if (failure instanceof MapRequestError && [401, 403].includes(failure.status)) {
        loseAccess();
      } else if (confirmed) {
        setError(
          'Ändringarna är sparade enligt kvittot, men kartan kunde inte hämtas. Hämta aktuellt underlag.',
        );
      } else if (failure instanceof MapRequestError && failure.status === 409) {
        // An ID mismatch does not disprove an earlier successful save.
        if (!['operation_conflict', 'client_outdated'].includes(failure.code))
          saveAttempt.current = null;
        setError(rejectionMessage(failure.code));
        try {
          setOperations(await readOperations(path, householdId, state));
        } catch {
          // Keep the received rejection visible when the follow-up read fails.
        }
      } else {
        setError(
          'Sparandet kunde inte bekräftas. Utfallet är okänt. Försök hämta samma kvitto igen.',
        );
      }
    } finally {
      setPending(false);
    }
  }

  async function action(
    kind: 'draft' | 'relationship' | 'object-type' | 'discard' | 'resolve',
    body: unknown,
  ) {
    if (!state || pending || blocked) return;
    setPending(true);
    setError('');
    setStatus('');
    try {
      const draft = await request<MapDraft & { existingId?: string }>(`${path}/${kind}`, body);
      if (draft.existingId) {
        const latest = await request<MapState>(path);
        setState(latest);
        const edge = proposedRelationships(latest.relationships, latest.draft.relationships).get(
          draft.existingId,
        );
        const objects = new Map(latest.objects.map((object) => [object.id, object]));
        for (const change of latest.draft.changes) {
          if (change.after)
            objects.set(change.id, {
              ...change.after,
              id: change.id,
              householdId,
              revision: change.before?.revision ?? 0,
            });
        }
        setStatus(
          edge
            ? `Sambandet finns redan: ${relationshipLabel(edge, latest, objects)}. Ingen dubblett skapades.`
            : 'Det befintliga sambandet har ändrats. Granska aktuellt underlag.',
        );
      } else {
        setState({ ...state, draft });
        setStatus(
          kind === 'resolve'
            ? 'Konfliktvalet finns i ditt privata utkast. Granska hela utkastet och ge ett nytt sparbesked.'
            : kind === 'discard'
              ? 'Utkastet är kastat. Kartan är inte ändrad.'
              : 'Förslaget finns i ditt privata utkast. Kartan är inte ändrad.',
        );
      }
      setEditor(null);
      setEdgeEditor(null);
      setTypeEditor(null);
      setDirty(false);
      setBlocked(false);
      newButton.current?.focus();
    } catch (failure) {
      if (
        failure instanceof MapRequestError &&
        [
          'invalid_custom_value',
          'invalid_type_definition',
          'field_kind_in_use',
          'field_removal_unsupported',
        ].includes(failure.code)
      ) {
        setError(rejectionMessage(failure.code));
        return;
      }
      setBlocked(true);
      if (
        failure instanceof MapRequestError &&
        (failure.status === 401 || failure.status === 403)
      ) {
        loseAccess();
      } else if (failure instanceof MapRequestError && failure.status === 409) {
        saveAttempt.current = null;
        setError(rejectionMessage(failure.code));
      } else {
        setError('Ändringen kunde inte bekräftas. Hämta aktuellt underlag innan du fortsätter.');
      }
    } finally {
      setPending(false);
    }
  }

  const effectiveTypes = proposedObjectTypes(state?.types ?? [], state?.draft.objectTypes);
  const conflicts = state ? draftConflicts(state) : [];
  function conflictReview(conflict: DraftConflict) {
    if (conflict.kind === 'objectType') return null;
    const proposal = (
      conflict.kind === 'object' ? state?.draft.changes : state?.draft.relationships
    )?.find((change) => change.id === conflict.id);
    const deleted = Boolean(proposal?.before && !conflict.current);
    return (
      <div className="conflict-review">
        <h4>Konflikt: sparat i kartan nu</h4>
        {conflict.kind === 'object' ? (
          details(conflict.current)
        ) : (
          <p>
            {conflict.current && state
              ? relationshipLabel(conflict.current, state, savedObjects)
              : 'Finns inte i kartan'}
          </p>
        )}
        <p>Välj vilket värde du vill behålla. Valet ändrar bara ditt utkast.</p>
        {conflict.type !== undefined && (
          <p>
            Typdefinitionen har ändrats:{' '}
            {conflict.type
              ? `${conflict.type.name}. ${conflict.type.description}`
              : 'Typen finns inte längre.'}
          </p>
        )}
        {conflict.missingEndpoints && (
          <p>
            Sambandet hänvisar till ett borttaget objekt. Ta bort förslaget eller öppna sambandet
            och välj ett annat objekt.
          </p>
        )}
        {conflict.duplicates && state && (
          <>
            <p>
              Samma samband finns redan. Använd sparat värde för att ta bort ditt överlappande
              förslag.
            </p>
            <ul>
              {conflict.duplicates.map((edge) => (
                <li key={edge.id}>{relationshipLabel(edge, state, displayed)}</li>
              ))}
            </ul>
          </>
        )}
        {conflict.connections && state && (
          <>
            <p>
              Borttagningen berör också dessa samband. Behåll förslaget för att lägga deras
              borttagningar i utkastet.
            </p>
            <ul>
              {conflict.connections.map((edge) => (
                <li key={edge.id}>{relationshipLabel(edge, state, savedObjects)}</li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          disabled={pending || blocked || dirty}
          onClick={() =>
            void action('resolve', { version: state?.draft.version, conflict, choice: 'saved' })
          }
        >
          Använd sparat värde
        </button>
        {conflict.type !== null &&
          !conflict.duplicates &&
          !conflict.missingEndpoints &&
          !deleted && (
            <button
              type="button"
              disabled={pending || blocked || dirty}
              onClick={() =>
                void action('resolve', {
                  version: state?.draft.version,
                  conflict,
                  choice: 'proposed',
                })
              }
            >
              Behåll mitt förslag
            </button>
          )}
        {deleted && (
          <p>
            Objektet eller sambandet är borttaget. Skapa ett nytt förslag om det fortfarande behövs.
          </p>
        )}
      </div>
    );
  }

  function edit(object?: MapObject) {
    if (!state) return;
    const proposal = state.draft.changes.find((change) => change.id === object?.id);
    setTypeEditor(null);
    setEdgeEditor(null);
    setEditor({
      typeRevision:
        effectiveTypes.find(
          (type) =>
            type.id === (proposal?.after?.typeId ?? object?.typeId ?? effectiveTypes[0]?.id),
        )?.revision ?? 0,
      id: object?.id ?? crypto.randomUUID(),
      version: state.draft.version,
      baseRevision: proposal ? (proposal.before?.revision ?? null) : (object?.revision ?? null),
      value: proposal?.after ??
        object ?? { typeId: effectiveTypes[0]?.id ?? '', name: '', description: '' },
    });
    setDirty(false);
  }
  const displayed = state
    ? new Map(state.objects.map((object) => [object.id, object]))
    : new Map<string, MapObject>();
  for (const change of state?.draft.changes ?? []) {
    if (change.after)
      displayed.set(change.id, {
        ...change.after,
        id: change.id,
        householdId,
        revision: change.before?.revision ?? 0,
      });
  }
  const displayedEdges = proposedRelationships(
    state?.relationships ?? [],
    state?.draft.relationships,
  );
  const savedObjects = new Map((state?.objects ?? []).map((object) => [object.id, object]));
  const hasChanges = Boolean(
    state &&
      (state.draft.changes.length ||
        state.draft.relationships?.length ||
        state.draft.objectTypes?.length),
  );
  const unresolved =
    state?.draft.changes.some((change) => change.after?.identity === 'unresolved') ||
    state?.draft.relationships?.some((change) => change.after?.knowledge === 'unresolved');
  function editRelationship(edge?: MapRelationship) {
    if (!state) return;
    const proposal = state.draft.relationships?.find((change) => change.id === edge?.id);
    setEditor(null);
    setTypeEditor(null);
    setEdgeEditor({
      id: edge?.id ?? crypto.randomUUID(),
      version: state.draft.version,
      baseRevision: proposal ? (proposal.before?.revision ?? null) : (edge?.revision ?? null),
      value: proposal?.after ??
        edge ?? { typeId: '', sourceId: '', targetId: '', knowledge: 'known' },
    });
    setDirty(true);
  }
  function typeName(id: string) {
    return effectiveTypes.find((type) => type.id === id)?.name ?? id;
  }
  function details(value: ObjectValue | null, definition?: ObjectType) {
    return value ? (
      <>
        <p>Namn: {value.name}</p>
        <p>Objekttyp: {typeName(value.typeId)}</p>
        <p>Beskrivning: {value.description || 'Ingen beskrivning'}</p>
        <FinancialFactsDetails facts={value.financialFacts} />
        <CustomFieldsDetails
          type={definition ?? effectiveTypes.find((type) => type.id === value.typeId)}
          values={value.customValues}
        />
        {value.identity && (
          <p>
            {value.identity === 'unspecified'
              ? 'Ospecificerat objekt'
              : 'Obesvarad identitetsfråga'}
          </p>
        )}
      </>
    ) : (
      <p>Finns inte i kartan</p>
    );
  }

  return (
    <div className="household-map">
      <h2>Objekt i hushållet</h2>
      <p>Förslag ligger i ditt privata, beständiga utkast tills du sparar hela utkastet.</p>
      <p className="muted">
        Skriv inte fullständiga konto- eller kortnummer, lösenord, pinkoder, säkerhetskoder eller
        återställningskoder.
      </p>
      <p role="status">
        {pending
          ? saveAttempt.current
            ? 'Väntande: kontrollerar sparandet…'
            : 'Arbetar…'
          : status}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {(error || blocked) && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setLoad((value) => value + 1);
          }}
        >
          Hämta aktuellt underlag
        </button>
      )}
      {saveAttempt.current && blocked && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (saveAttempt.current) void save(saveAttempt.current, true);
          }}
        >
          Hämta samma kvitto igen
        </button>
      )}
      {state && (
        <>
          <SaveOperations
            operations={operations}
            disabled={pending}
            onRetry={(operation) =>
              void save(
                {
                  operationId: operation.operationId,
                  version: operation.draftVersion,
                  contentVersion: operation.contentVersion,
                  householdId: operation.householdId,
                  userId: operation.userId,
                },
                true,
              )
            }
          />
          <details>
            <summary>Objekttyper och egna fält</summary>
            <p>
              Alla medlemmar kan föreslå ändringar, även i förifyllda typer. Egna fält är inte till
              för hemliga uppgifter.
            </p>
            <ul aria-label="Objekttyper">
              {effectiveTypes.map((type) => (
                <li key={type.id}>
                  <button
                    type="button"
                    disabled={pending || dirty || blocked}
                    onClick={() => {
                      const proposal = state.draft.objectTypes?.find((item) => item.id === type.id);
                      setEditor(null);
                      setEdgeEditor(null);
                      setDirty(false);
                      setTypeEditor({
                        type,
                        version: state.draft.version,
                        baseRevision: proposal
                          ? (proposal.before?.revision ?? null)
                          : type.revision,
                      });
                    }}
                  >
                    Ändra typ: {type.name}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <button
            type="button"
            disabled={pending || dirty || blocked}
            onClick={() => {
              setEditor(null);
              setEdgeEditor(null);
              setDirty(true);
              setTypeEditor({
                type: {
                  id: crypto.randomUUID(),
                  householdId,
                  revision: 0,
                  name: '',
                  description: '',
                },
                version: state.draft.version,
                baseRevision: null,
              });
            }}
          >
            Ny objekttyp
          </button>
          {typeEditor && (
            <ObjectTypeEditor
              key={typeEditor.type.id}
              initial={typeEditor.type}
              disabled={pending || blocked}
              stale={typeEditor.version !== state.draft.version}
              onDirty={() => setDirty(true)}
              onSubmit={(value) =>
                void action('object-type', {
                  version: typeEditor.version,
                  id: typeEditor.type.id,
                  baseRevision: typeEditor.baseRevision,
                  value,
                })
              }
              onClose={() => {
                setTypeEditor(null);
                setDirty(false);
              }}
            />
          )}
          <label htmlFor="object-search">Sök objekt</label>
          <input
            id="object-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul aria-label="Objekt" className="access-list">
            {[...displayed.values()]
              .filter((object) =>
                object.name.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')),
              )
              .map((object) => (
                <li key={object.id}>
                  <button
                    type="button"
                    disabled={pending || dirty || blocked}
                    onClick={() => edit(object)}
                  >
                    {object.name}
                  </button>
                  <span>
                    {' '}
                    {typeName(object.typeId)}
                    {state.draft.changes.some((change) => change.id === object.id)
                      ? ' — förslag i ditt utkast'
                      : ''}
                  </span>
                </li>
              ))}
          </ul>
          <button
            ref={newButton}
            type="button"
            disabled={pending || dirty || blocked}
            onClick={() => edit()}
          >
            Nytt objekt
          </button>
          {editor && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void action('draft', editor);
              }}
            >
              <fieldset disabled={pending || blocked}>
                <legend>Objektets detaljer</legend>
                <label htmlFor="object-name">Objektets namn</label>
                <input
                  ref={nameInput}
                  id="object-name"
                  required
                  maxLength={200}
                  value={editor.value.name}
                  onChange={(event) => {
                    setDirty(true);
                    setEditor({ ...editor, value: { ...editor.value, name: event.target.value } });
                  }}
                />
                <label htmlFor="object-type">Objekttyp</label>
                <select
                  id="object-type"
                  required
                  value={editor.value.typeId}
                  onChange={(event) => {
                    setDirty(true);
                    setEditor({
                      ...editor,
                      typeRevision:
                        effectiveTypes.find((type) => type.id === event.target.value)?.revision ??
                        0,
                      value: { ...editor.value, typeId: event.target.value },
                    });
                  }}
                >
                  {effectiveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="object-identity">Objektets identitet</label>
                <select
                  id="object-identity"
                  value={editor.value.identity ?? 'identified'}
                  onChange={(event) => {
                    setDirty(true);
                    const value = { ...editor.value };
                    if (event.target.value === 'identified') delete value.identity;
                    else value.identity = event.target.value as 'unspecified' | 'unresolved';
                    setEditor({ ...editor, value });
                  }}
                >
                  <option value="identified">Identifierat objekt</option>
                  <option value="unspecified">Ospecificerat objekt</option>
                  <option value="unresolved">Obesvarad identitetsfråga</option>
                </select>
                <label htmlFor="object-description">Beskrivning</label>
                <textarea
                  id="object-description"
                  maxLength={2000}
                  value={editor.value.description}
                  onChange={(event) => {
                    setDirty(true);
                    setEditor({
                      ...editor,
                      value: { ...editor.value, description: event.target.value },
                    });
                  }}
                />
                <CustomFieldsEditor
                  type={effectiveTypes.find((type) => type.id === editor.value.typeId)}
                  values={editor.value.customValues}
                  onChange={(customValues) => {
                    setDirty(true);
                    setEditor({ ...editor, value: { ...editor.value, customValues } });
                  }}
                />
                <p>Texten i formuläret skickas först när du lägger den i utkastet.</p>
                <FinancialFactsEditor
                  key={editor.id}
                  facts={editor.value.financialFacts}
                  onChange={(financialFacts) => {
                    setDirty(true);
                    const value = { ...editor.value };
                    if (Object.keys(financialFacts).length) value.financialFacts = financialFacts;
                    else delete value.financialFacts;
                    setEditor({ ...editor, value });
                  }}
                />
                {editor.version !== state.draft.version && (
                  <p role="alert">
                    Formuläret bygger på ett äldre utkast. Kopiera eventuell text du vill behålla,
                    stäng formuläret och öppna objektets aktuella förslag innan du fortsätter.
                  </p>
                )}
                <div className="access-actions">
                  <button type="submit" disabled={editor.version !== state.draft.version}>
                    Lägg i mitt utkast
                  </button>
                  {(editor.baseRevision !== null ||
                    state.draft.changes.some((change) => change.id === editor.id)) && (
                    <button
                      type="button"
                      disabled={dirty || editor.version !== state.draft.version}
                      onClick={() =>
                        void action('draft', {
                          version: editor.version,
                          id: editor.id,
                          baseRevision: editor.baseRevision,
                          value: null,
                        })
                      }
                    >
                      Föreslå borttagning
                    </button>
                  )}
                </div>
              </fieldset>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  focusAfterClose.current = true;
                  setEditor(null);
                  setDirty(false);
                }}
              >
                Stäng utan att skicka texten
              </button>
            </form>
          )}
          <h2>Samband</h2>
          <ul aria-label="Samband">
            {[...displayedEdges.values()].map((edge) => (
              <li key={edge.id}>
                <button
                  type="button"
                  disabled={pending || dirty || blocked}
                  onClick={() => editRelationship(edge)}
                >
                  {relationshipLabel(edge, state, displayed)}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={pending || dirty || blocked}
            onClick={() => editRelationship()}
          >
            Nytt samband
          </button>
          {edgeEditor && (
            <RelationshipEditor
              key={edgeEditor.id}
              state={state}
              objects={displayed}
              initial={edgeEditor}
              disabled={pending || blocked}
              onSubmit={(body) => void action('relationship', body)}
              onClose={() => {
                setEdgeEditor(null);
                setDirty(false);
              }}
            />
          )}
          <section aria-labelledby="draft-title" className="draft-review">
            <h2 id="draft-title">Hela mitt utkast</h2>
            {!hasChanges && <p>Inga förslag i utkastet.</p>}
            {state.draft.objectTypes?.map((change) => (
              <article key={change.id}>
                <h3>
                  {change.before ? 'Ändrad objekttyp' : 'Ny objekttyp'}: {change.after.name}
                </h3>
                <h4>Sparat underlag</h4>
                <ObjectTypeDetails type={change.before} />
                <h4>Förslag</h4>
                <ObjectTypeDetails type={change.after} />
                {conflicts
                  .filter((conflict) => conflict.kind === 'objectType' && conflict.id === change.id)
                  .map((conflict) => (
                    <div key={conflict.id}>
                      <h4>Konflikt: sparad typdefinition</h4>
                      <ObjectTypeDetails
                        type={conflict.kind === 'objectType' ? conflict.current : null}
                      />
                      <p>
                        Välj definition för utkastet och granska hela utkastet före ett nytt
                        sparbesked.
                      </p>
                      <button
                        type="button"
                        disabled={pending || blocked || dirty}
                        onClick={() =>
                          void action('resolve', {
                            version: state.draft.version,
                            conflict,
                            choice: 'saved',
                          })
                        }
                      >
                        Använd sparad typdefinition
                      </button>
                      <button
                        type="button"
                        disabled={pending || blocked || dirty}
                        onClick={() =>
                          void action('resolve', {
                            version: state.draft.version,
                            conflict,
                            choice: 'proposed',
                          })
                        }
                      >
                        Behåll min typdefinition
                      </button>
                    </div>
                  ))}
              </article>
            ))}
            {state.draft.changes.map((change) => (
              <article key={change.id}>
                <h3>
                  {!change.after ? 'Borttagning' : !change.before ? 'Nytt objekt' : 'Ändring'}:{' '}
                  {change.after?.name ?? change.before?.name}
                </h3>
                <h4>Sparat underlag</h4>
                {details(
                  change.before,
                  state.types.find((type) => type.id === change.before?.typeId) ?? change.type,
                )}
                <h4>Förslag</h4>
                {details(change.after, change.type)}
                {conflicts
                  .filter((conflict) => conflict.kind === 'object' && conflict.id === change.id)
                  .map((conflict) => (
                    <div key={conflict.id}>{conflictReview(conflict)}</div>
                  ))}
              </article>
            ))}
            {(state.draft.relationships ?? []).map((change) => (
              <article key={change.id}>
                <h3>{change.after ? 'Samband' : 'Borttagning av samband'}</h3>
                <h4>Sparat underlag</h4>
                <p>
                  {change.before
                    ? relationshipLabel(
                        change.before,
                        state,
                        new Map([
                          ...savedObjects,
                          ...Object.entries(change.objectNames ?? {}).map(
                            ([id, name]) => [id, { name }] as const,
                          ),
                        ]),
                      )
                    : 'Finns inte i kartan'}
                </p>
                <h4>Förslag</h4>
                <p>
                  {change.after
                    ? relationshipLabel(
                        change.after,
                        state,
                        new Map([
                          ...Object.entries(change.objectNames ?? {}).map(
                            ([id, name]) => [id, { name }] as const,
                          ),
                          ...displayed,
                        ]),
                      )
                    : 'Borttaget'}
                </p>
                {conflicts
                  .filter(
                    (conflict) => conflict.kind === 'relationship' && conflict.id === change.id,
                  )
                  .map((conflict) => (
                    <div key={conflict.id}>{conflictReview(conflict)}</div>
                  ))}
              </article>
            ))}
            {unresolved && (
              <p role="alert">
                Obesvarad identitetsfråga: välj rätt objekt eller uttryckligen ett ospecificerat
                objekt före sparande.
              </p>
            )}
            {dirty && (
              <p>
                Lägg formulärets text i utkastet eller stäng formuläret innan du sparar eller kastar
                utkastet.
              </p>
            )}
            <div className="access-actions">
              <button
                type="button"
                className="primary"
                disabled={
                  pending || blocked || dirty || !hasChanges || unresolved || conflicts.length > 0
                }
                onClick={() => {
                  saveAttempt.current = {
                    version: state.draft.version,
                    operationId: crypto.randomUUID(),
                    contentVersion: state.contentVersion,
                    userId: state.userId,
                    householdId,
                  };
                  void save(saveAttempt.current);
                }}
              >
                Spara hela utkastet
              </button>
              <button
                type="button"
                disabled={pending || blocked || dirty || !hasChanges}
                onClick={() => void action('discard', { version: state.draft.version })}
              >
                Kasta hela utkastet
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
