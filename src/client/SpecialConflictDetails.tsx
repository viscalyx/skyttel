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
  onApply,
}: {
  state: MapState;
  conflict: DraftConflict;
  special: SpecialConflict;
  disabled: boolean;
  onApply: () => void;
}) {
  const change = conflictChange(state, conflict);
  const proposal = change?.after ?? change?.before;
  const type = change && 'type' in change ? change.type : undefined;
  const fields = !proposal
    ? new Map<string, { label: string; value: string }>()
    : conflict.kind === 'object'
      ? objectPropertyValues(proposal as ObjectValue, type as ObjectType)
      : relationshipPropertyValues(
          proposal as RelationshipValue,
          type as RelationshipType,
          new Map(state.objects.map((object) => [object.id, object])),
        );
  return (
    <>
      <div className="cp-warning">
        <p>{special.warning}</p>
      </div>
      <p>
        {conflict.kind === 'object' ? 'Objektet' : 'Sambandet'} förblir borttaget. Det är förvalt.
        När du accepterar kastas ditt ändringsförslag för denna post.
      </p>
      <div className="cp-comparison">
        <section aria-label="Sparat i kartan nu">
          <h3>Sparat i kartan nu</h3>
          <div className="cp-pick-fields">
            <div className="cp-field-choice">
              <span className="cp-field-name">
                {conflict.kind === 'object' ? 'Objekt' : 'Samband'}{' '}
                <span className="cp-picked">✓ Förvalt</span>
              </span>
              <span className="cp-field-value">Borttaget</span>
            </div>
          </div>
        </section>
        <section aria-label="Ditt förslag">
          <h3>Ditt förslag</h3>
          <div className="cp-pick-fields">
            {[...fields].map(([key, field]) => (
              <div key={key} className="cp-field-choice">
                <span className="cp-field-name">{field.label}</span>
                <span className="cp-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="cp-preview" aria-label="Resultat av valen">
        <h3>Efter bekräftelsen</h3>
        <p>
          Borttaget <span className="cp-picked">✓ Förvalt</span>
        </p>
        <p>Ditt ändringsförslag för denna post kastas.</p>
        <p>Övriga förslag i utkastet finns kvar.</p>
      </section>
      <footer className="cp-actions">
        <button className="cp-primary" type="button" disabled={disabled} onClick={onApply}>
          {special.action}
        </button>
      </footer>
    </>
  );
}
