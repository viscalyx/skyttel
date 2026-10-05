import { type FinancialFact, financialFields } from '../shared/financial-facts.js';
import type { ObjectType, ObjectValue } from '../shared/map.js';
import { objectIconLabel } from '../shared/object-icons.js';
import { objectProperties } from '../shared/object-properties.js';
import type { HouseholdTableRow } from './HouseholdTable.js';
import { ProfileImage } from './ProfileImage.js';

const knowledge = {
  known: 'Känt',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
  uncertain: 'Osäkert uppgivet',
};
export function factText(fact?: FinancialFact) {
  if (!fact) return 'Ej uppgivet';
  return `${fact.value ?? knowledge[fact.knowledge]}${fact.knowledge === 'uncertain' ? ' (Osäkert uppgivet)' : ''}${fact.reportedOn ? ` · datum för uppgiften: ${fact.reportedOn}` : ''}`;
}
export function objectPropertyValues(value: ObjectValue, type?: ObjectType) {
  const properties = objectProperties(type ?? {});
  const fields = new Map<string, { label: string; value: string }>();
  fields.set('name', { label: 'Namn', value: value.name });
  fields.set('type', { label: 'Typ', value: type?.name ?? 'Borttagen typ' });
  fields.set('description', {
    label:
      properties.find((property) => property.ref === 'builtin:description')?.name ?? 'Beskrivning',
    value: value.description || 'Ej uppgivet',
  });
  fields.set('lifecycle', {
    label: 'Status',
    value:
      value.lifecycle === 'ended'
        ? 'Manuellt upphört'
        : value.lifecycle === 'active'
          ? 'Gäller fortfarande'
          : 'Följ slutdatum',
  });
  fields.set('icon', {
    label: 'Ikon',
    value: value.iconId ? objectIconLabel(value.iconId, type?.name) : 'Typens ikon',
  });
  fields.set('profileImage', {
    label: 'Profilbild',
    value: value.profileImageId ? 'Profilbild finns' : 'Ej uppgivet',
  });
  if (value.identity)
    fields.set('identity', {
      label: 'Identitet',
      value:
        value.identity === 'unspecified' ? 'Ospecificerat objekt' : 'Identiteten behöver redas ut',
    });
  for (const field of type?.fields ?? []) {
    const answer = value.customValues?.[field.id];
    fields.set(`field:${field.id}`, {
      label: field.name,
      value:
        answer === undefined
          ? 'Ej uppgivet'
          : answer === true
            ? 'Ja'
            : answer === false
              ? 'Nej'
              : String(answer),
    });
  }
  for (const [id, answer] of Object.entries(value.customValues ?? {}))
    if (!fields.has(`field:${id}`)) fields.set(`field:${id}`, { label: id, value: String(answer) });
  for (const field of financialFields) {
    const property = properties.find((property) => property.ref === `builtin:${field.key}`);
    if (value.financialFacts?.[field.key] || property)
      fields.set(`builtin:${field.key}`, {
        label: property?.name ?? field.label,
        value: factText(value.financialFacts?.[field.key]),
      });
  }
  return fields;
}

export function ObjectReadDetails({
  row,
  full = false,
}: {
  row: HouseholdTableRow;
  full?: boolean;
}) {
  const proposed = objectPropertyValues(row.object, row.type);
  const saved = row.before
    ? objectPropertyValues(row.before, row.beforeType)
    : new Map<string, { label: string; value: string }>();
  const keys = [...new Set([...proposed.keys(), ...saved.keys()])];
  const descriptionChanged =
    row.proposal === 'Ändrat' && row.object.description !== row.before?.description;
  return (
    <div className="household-table-details">
      <h3>{row.object.name} · alla uppgifter</h3>
      <p className="household-table-description">
        {descriptionChanged && (
          <span className="household-table-before">
            Sparat: {row.before?.description || 'Ej uppgivet'}
          </span>
        )}
        {(descriptionChanged || row.proposal === 'Nytt') && (
          <span className="household-table-proposed">◇ Ditt förslag: </span>
        )}
        {row.object.description || 'Ej uppgivet'}
      </p>
      <dl>
        {keys
          .filter(
            (key) =>
              key !== 'description' &&
              (full ||
                !(key === 'name' || key === 'type') ||
                (proposed.get(key)?.value !== saved.get(key)?.value && row.proposal === 'Ändrat')),
          )
          .map((key) => {
            const after = proposed.get(key);
            const before = saved.get(key);
            const changed =
              row.proposal === 'Ändrat' &&
              (after?.value !== before?.value ||
                after?.label !== before?.label ||
                (key === 'profileImage' &&
                  row.object.profileImageId !== row.before?.profileImageId));
            return (
              <div key={key}>
                <dt>{after?.label ?? before?.label}</dt>
                <dd>
                  {changed && (
                    <div className="household-table-before">
                      Sparat{before?.label !== after?.label ? ` (${before?.label})` : ''}:{' '}
                      {before?.value ?? 'Ej uppgivet'}
                      {key === 'profileImage' && row.before?.profileImageId && (
                        <ProfileImage
                          householdId={row.object.householdId}
                          value={row.before}
                          typeName={row.beforeType?.name}
                        />
                      )}
                    </div>
                  )}
                  {(changed || row.proposal === 'Nytt') && (
                    <span className="household-table-proposed">◇ Ditt förslag: </span>
                  )}
                  {after?.value ?? 'Ej uppgivet'}
                  {key === 'profileImage' && row.object.profileImageId && (
                    <ProfileImage
                      householdId={row.object.householdId}
                      value={row.object}
                      typeName={row.type?.name}
                    />
                  )}
                </dd>
              </div>
            );
          })}
      </dl>
    </div>
  );
}
