import { conflictChange } from '../shared/conflict-properties.js';
import type { SpecialConflict } from '../shared/conflict-special.js';
import type { DraftConflict } from '../shared/draft-conflicts.js';
import type {
  MapState,
  ObjectType,
  ObjectValue,
  RelationshipType,
  RelationshipValue,
} from '../shared/map.js';
import { objectPropertyValues } from './ObjectReadDetails.js';
import { relationshipPropertyValues } from './RelationshipReadDetails.js';

export function SpecialConflictDetails({
  state,
  conflict,
  special,
  disabled,
  pending,
  onApply,
  onClose,
}: {
  state: MapState;
  conflict: DraftConflict;
  special: SpecialConflict;
  disabled: boolean;
  pending: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const change = conflictChange(state, conflict);
  const proposal = change?.after ?? change?.before;
  const type = change && 'type' in change ? change.type : undefined;
  const objectNames = change && 'objectNames' in change ? change.objectNames : undefined;
  function readFields(value: typeof proposal, definition = type) {
    return !value
      ? new Map<string, { label: string; value: string }>()
      : conflict.kind === 'object'
        ? objectPropertyValues(value as ObjectValue, definition as ObjectType)
        : relationshipPropertyValues(
            value as RelationshipValue,
            definition as RelationshipType,
            new Map(state.objects.map((object) => [object.id, object])),
            objectNames,
          );
  }
  const fields = readFields(proposal);
  const before = readFields(
    change?.before,
    change && 'beforeType' in change ? (change.beforeType ?? type) : type,
  );
  const current = conflict.current ?? conflict.duplicates?.[0];
  const savedType =
    current && 'typeId' in current
      ? (conflict.kind === 'object' ? state.types : state.relationshipTypes).find(
          (type) => type.id === current.typeId,
        )
      : undefined;
  const saved =
    special.kind === 'missing-object-type'
      ? new Map([['type', { label: 'Objekttyp', value: 'Saknas' }]])
      : readFields(current, savedType ?? type);
  const removed = special.kind === 'removed';
  function provenanceClass(key: string, side: 'saved' | 'proposed') {
    const previous = before.get(key)?.value;
    const current = saved.get(key)?.value;
    const proposed = fields.get(key)?.value;
    const overlap = current !== previous && proposed !== previous && current !== proposed;
    return overlap
      ? ' cp-overlap'
      : (side === 'saved' ? current : proposed) !== previous
        ? ' cp-change'
        : '';
  }
  const removedClass = [...fields].some(([key, field]) => field.value !== before.get(key)?.value)
    ? 'cp-overlap'
    : 'cp-change';
  return (
    <>
      <div className="cp-warning">
        {!special.action && <strong>Behöver rättas</strong>}
        <p>
          {special.action && <span aria-hidden="true">⚠ </span>}
          <span>{special.warning}</span>
        </p>
        {special.additionalBlockers?.map((blocker) => (
          <p key={blocker.reason}>
            {blocker.reason} {blocker.warning}
          </p>
        ))}
      </div>
      <p>
        {special.instruction ??
          (removed
            ? `${conflict.kind === 'object' ? 'Objektet' : 'Sambandet'} förblir borttaget. Det är förvalt. När du accepterar kastas ditt ändringsförslag för denna post.`
            : 'Det är förvalt att ta bort sambandet ur ditt utkast. Bekräfta nedan.')}
      </p>
      {special.additionalBlockers?.map(
        (blocker) => blocker.instruction && <p key={blocker.reason}>{blocker.instruction}</p>,
      )}
      <div className="cp-comparison">
        <section aria-label="Sparat i kartan nu">
          <h3>Sparat i kartan nu</h3>
          <div className="cp-pick-fields">
            {removed ? (
              <div className={`cp-field-choice ${removedClass} cp-default`}>
                <span className="cp-field-name">
                  {conflict.kind === 'object' ? 'Objekt' : 'Samband'}{' '}
                  <span className="cp-picked">
                    <span aria-hidden="true">✓</span> Förvalt
                  </span>
                </span>
                <span className="cp-field-value">Borttaget</span>
              </div>
            ) : saved.size ? (
              [...saved].map(([key, field]) => (
                <div key={key} className={`cp-field-choice${provenanceClass(key, 'saved')}`}>
                  <span className="cp-field-name">{field.label}</span>
                  <span className="cp-field-value">{field.value}</span>
                </div>
              ))
            ) : (
              <div className="cp-field-choice">
                <span className="cp-field-value">
                  {conflict.kind === 'object' ? 'Objektet' : 'Sambandet'} finns inte i den
                  gemensamma kartan.
                </span>
              </div>
            )}
          </div>
        </section>
        <section aria-label="Ditt förslag">
          <h3>Ditt förslag</h3>
          <div className="cp-pick-fields">
            {[...fields].map(([key, field]) => (
              <div key={key} className={`cp-field-choice${provenanceClass(key, 'proposed')}`}>
                <span className="cp-field-name">{field.label}</span>
                {removed && field.value !== before.get(key)?.value && (
                  <span className="cp-tag">Ditt föreslagna värde</span>
                )}
                <span className="cp-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {special.action && (
        <>
          <p>Du behöver inte välja några egenskaper.</p>
          <section className="cp-preview" aria-label="Resultat av valen">
            <h3>Efter bekräftelsen</h3>
            <p>
              {removed ? 'Borttaget' : 'Borttaget ur utkast'}{' '}
              <span className="cp-picked">
                <span aria-hidden="true">✓</span> Förvalt
              </span>
            </p>
            {removed && <p>Ditt ändringsförslag för denna post kastas.</p>}
            <p>Övriga förslag i utkastet finns kvar.</p>
          </section>
        </>
      )}
      <footer className="cp-actions">
        {special.action ? (
          <button className="cp-primary" type="button" disabled={disabled} onClick={onApply}>
            {special.action}
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={onClose}>
            Stäng konfliktfönstret
          </button>
        )}
      </footer>
    </>
  );
}
