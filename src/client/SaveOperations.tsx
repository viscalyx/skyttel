import type { SaveOperation, SaveReceipt } from '../shared/map.js';

export interface SaveAttempt {
  operationId: string;
  version: number;
  contentVersion: number;
  householdId: string;
  userId: string;
}

export function checkSaveIdentity(
  receipt: Pick<
    SaveReceipt,
    'operationId' | 'draftVersion' | 'contentVersion' | 'householdId' | 'userId'
  >,
  attempt: SaveAttempt,
) {
  if (
    receipt.operationId !== attempt.operationId ||
    receipt.draftVersion !== attempt.version ||
    receipt.contentVersion !== attempt.contentVersion ||
    receipt.householdId !== attempt.householdId ||
    receipt.userId !== attempt.userId
  )
    throw new Error('invalid_receipt');
}

export function checkOperation(operation: SaveOperation, attempt: SaveAttempt) {
  checkSaveIdentity(operation, attempt);
  if (!['pending', 'succeeded', 'rejected'].includes(operation.status))
    throw new Error('invalid_operation');
  if (operation.status === 'succeeded') checkSaveIdentity(operation.receipt, attempt);
}

export function receiptMessage(receipt: SaveReceipt) {
  const changes = [
    ...(receipt.objectTypes ?? []).map((change) => `${change.after.name} (objekttyp)`),
    ...(receipt.relationshipTypes ?? []).map((change) => `${change.after.name} (sambandstyp)`),
    ...receipt.changes.map((change) => change.after?.name ?? change.before?.name),
    ...(receipt.relationships ?? []).map(
      (change) => `${change.type.name} (${change.after ? 'samband' : 'borttaget samband'})`,
    ),
  ];
  return `Sparat: ${changes.join(', ')}. Kvitto: ${receipt.operationId}.`;
}

export function rejectionMessage(code: string) {
  if (code === 'invalid_relationship_type')
    return 'Ange sambandstypens namn, beskrivning och benämningar från båda hållen. Sambandstyper har inga egna fält.';
  if (code === 'duplicate_relationship')
    return 'Samma samband finns redan. Inget sparades. Hämta aktuellt underlag och använd det befintliga sambandet eller ändra ditt förslag.';
  if (code === 'invalid_custom_value')
    return 'Kontrollera de egna fälten: ange text, ett giltigt tal, datum eller ja/nej enligt fältets värdeslag.';
  if (code === 'invalid_type_definition')
    return 'Ange namn, beskrivning och giltiga fält för objekttypen.';
  if (code === 'field_kind_in_use')
    return 'Fältets värdeslag används redan. Skapa ett nytt fält med rätt värdeslag; tidigare fält och värden finns kvar.';
  if (code === 'field_removal_unsupported')
    return 'Behåll tidigare fält. Borttagning av fält hanteras separat från rättelse av definitionen.';
  if (code === 'client_outdated')
    return 'Skyttel har uppdaterats. Kopiera osänd text och ladda om sidan. Kontrollera tidigare sparförsök efter omladdning.';
  if (code === 'operation_conflict')
    return 'Avvisat: samma sparförsök gäller ett annat innehåll. Kontrollera det ursprungliga försöket innan du fortsätter.';
  if (code === 'content_conflict')
    return 'Avvisat: hushållets innehåll har ersatts. Det gamla försöket kan inte bekräfta eller spara det nya innehållet.';
  if (code === 'operation_pending')
    return 'Ett tidigare sparförsök är väntande. Kontrollera och återförsök det innan du ändrar utkastet.';
  return 'Avvisat: Förslaget eller kartan har ändrats. Inget sparades av detta försök. Hämta aktuellt underlag och granska hela utkastet. Välj hur varje konflikt ska lösas.';
}

export function SaveOperations({
  operations,
  disabled,
  onRetry,
}: {
  operations: SaveOperation[];
  disabled: boolean;
  onRetry: (operation: SaveOperation) => void;
}) {
  return (
    <section aria-labelledby="save-operations-title" className="draft-review">
      <h2 id="save-operations-title">Mina sparförsök</h2>
      <p>Dina väntande och senaste sparförsök i hushållet, även från andra enheter.</p>
      {!operations.length && <p>Inga registrerade sparförsök.</p>}
      {operations.map((operation) => (
        <article key={operation.operationId}>
          <h3>
            {operation.status === 'succeeded'
              ? 'Genomfört'
              : operation.status === 'rejected'
                ? 'Avvisat'
                : 'Väntande'}
            {' — utkastversion '}
            {operation.draftVersion}
          </h3>
          <p>
            Sparförsök: {operation.operationId}. Registrerat: {operation.createdAt}.
          </p>
          {operation.status === 'succeeded' && <p>{receiptMessage(operation.receipt)}</p>}
          {operation.status === 'rejected' && <p>{rejectionMessage(operation.error)}</p>}
          {operation.status === 'pending' && (
            <>
              <p>
                Inget slutligt kvitto finns ännu. Kontrollera och återförsök samma sparande innan du
                ändrar utkastet.
              </p>
              <button type="button" disabled={disabled} onClick={() => onRetry(operation)}>
                Återförsök sparandet
              </button>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
