import type { BuiltinProperty, ObjectType, ObjectValue } from '../shared/map.js';
import { objectTypePresentation } from '../shared/map.js';
import { builtinProperties, objectProperties } from '../shared/object-properties.js';
import { FinancialFactDetails, FinancialFactsDetails } from './FinancialFacts.js';
import { CustomFieldsDetails, CustomFieldValueDetails } from './ObjectTypes.js';

const outsideLabel = 'Uppgifter utanför typens avsnitt';
const retainedExplanation =
  'Gemensamma uppgifter finns kvar även när de döljs i typens avsnitt eller objektet byter typ.';

export function ObjectPropertiesDetails({
  type = {},
  value,
  showHidden = false,
}: {
  type?: Pick<ObjectType, 'fields' | 'sections' | 'builtins' | 'propertyOrder'>;
  value: ObjectValue;
  showHidden?: boolean;
}) {
  if (type.builtins === undefined && type.propertyOrder === undefined)
    return (
      <>
        <p>Beskrivning: {value.description || 'Ingen beskrivning'}</p>
        <FinancialFactsDetails facts={value.financialFacts} />
        <CustomFieldsDetails type={type} values={value.customValues} showHidden={showHidden} />
      </>
    );
  const properties = objectProperties(type);
  const visibleBuiltins = properties
    .filter((property) => property.kind === 'builtin' && property.sectionId)
    .map(({ ref }) => ref);
  const outside = builtinProperties.filter(
    ({ key }) =>
      !visibleBuiltins.includes(`builtin:${key}`) &&
      (key === 'description' ? value.description.trim() : value.financialFacts?.[key]),
  );
  function builtin(key: BuiltinProperty['key'], label: string) {
    return key === 'description' ? (
      <p>
        {label}: {value.description || 'Ingen beskrivning'}
      </p>
    ) : value.financialFacts?.[key] ? (
      <FinancialFactDetails label={label} fact={value.financialFacts[key]} />
    ) : (
      <p>{label}: Ej uppgivet</p>
    );
  }
  return (
    <>
      {objectTypePresentation(type).sections.map((section) => {
        const entries = properties.filter(({ sectionId }) => sectionId === section.id);
        return (
          entries.length > 0 && (
            <section className="custom-field-section" key={section.id} aria-label={section.name}>
              <h4>{section.name}</h4>
              {entries.map((property) => (
                <div key={property.ref}>
                  {property.kind === 'builtin' ? (
                    builtin(property.field.key, property.name)
                  ) : (
                    <CustomFieldValueDetails
                      name={property.name}
                      value={value.customValues?.[property.field.id]}
                    />
                  )}
                </div>
              ))}
            </section>
          )
        );
      })}
      {outside.length > 0 && (
        <section className="custom-field-section" aria-label={outsideLabel}>
          <h4>{outsideLabel}</h4>
          <p>{retainedExplanation}</p>
          {outside.map(({ key, label }) => (
            <div key={key}>{builtin(key, label)}</div>
          ))}
        </section>
      )}
      {showHidden && (
        <CustomFieldsDetails
          type={{ fields: objectTypePresentation(type).fields, sections: [] }}
          values={value.customValues}
          showHidden
        />
      )}
    </>
  );
}
