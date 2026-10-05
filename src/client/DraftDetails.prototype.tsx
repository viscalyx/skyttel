// Throwaway read views: all proposal values, including hidden fields, without editors.
import { type FinancialFact, financialFields } from '../shared/financial-facts.js';
import type {
  CustomValues,
  MapDraft,
  ObjectType,
  ObjectValue,
  RelationshipType,
  RelationshipValue,
} from '../shared/map.js';
import { objectIconLabel } from '../shared/object-icons.js';
import { objectProperties } from '../shared/object-properties.js';
import { relationshipDetails } from './relationship-description.js';

type Values = Record<string, string>;
export type DraftReadProposal = {
  key: string;
  name: string;
  kind: string;
  before: Values;
  after: Values;
  hasBefore: boolean;
  hasAfter: boolean;
};
function text(value: string | number | boolean | undefined) {
  return value === undefined || value === ''
    ? 'Ej uppgivet'
    : value === true
      ? 'Ja'
      : value === false
        ? 'Nej'
        : String(value);
}
function fact(value?: FinancialFact) {
  if (!value) return 'Ej uppgivet';
  return `${
    value.knowledge === 'unknown'
      ? 'Okänt'
      : value.knowledge === 'none'
        ? 'Uttryckligen inget'
        : `${value.value}${value.knowledge === 'uncertain' ? ' (osäkert uppgivet)' : ''}`
  }${value.reportedOn ? ` · uppgivet ${value.reportedOn}` : ''}`;
}
function custom(type: ObjectType | RelationshipType, values?: CustomValues): Values {
  return Object.fromEntries([
    ...(type.fields ?? []).map((field) => [field.name, text(values?.[field.id])]),
    ...Object.entries(values ?? {})
      .filter(([id]) => !type.fields?.some((field) => field.id === id))
      .map(([id, value]) => [`Eget fält (${id})`, text(value)]),
  ]);
}
function object(value: ObjectValue | null, type: ObjectType): Values {
  if (!value) return {};
  return {
    Namn: value.name,
    Objekttyp: type.name,
    Ikon: objectIconLabel(value.iconId, type.name),
    Beskrivning: text(value.description),
    Identitet:
      value.identity === 'unspecified'
        ? 'Ospecificerat objekt'
        : value.identity === 'unresolved'
          ? 'Olöst identitet'
          : 'Identifierat',
    Gäller: value.lifecycle === 'ended' ? 'Upphört' : 'Aktuellt',
    Profilbild: value.profileImageId ? 'Bild finns' : 'Ingen bild',
    ...Object.fromEntries(
      financialFields
        .filter((field) => value.financialFacts?.[field.key])
        .map((field) => [field.label, fact(value.financialFacts?.[field.key])]),
    ),
    ...custom(type, value.customValues),
  };
}
function relationship(
  value: RelationshipValue | null,
  type: RelationshipType,
  names: Record<string, string>,
): Values {
  if (!value) return {};
  return {
    Från: names[value.sourceId] ?? value.sourceId,
    Sambandstyp: type.name,
    Till: value.targetId
      ? (names[value.targetId] ?? value.targetId)
      : value.knowledge === 'none'
        ? 'Uttryckligen inget'
        : 'Okänt',
    'Uppgiftens säkerhet': {
      known: 'Bekräftat',
      unknown: 'Okänt',
      none: 'Uttryckligen inget',
      uncertain: 'Osäkert uppgivet',
      unresolved: 'Obesvarad fråga',
    }[value.knowledge],
    Gäller: value.lifecycle === 'ended' ? 'Upphört' : 'Aktuellt',
    ...(value.endDate ? { Slutdatum: fact(value.endDate) } : {}),
    ...custom(type, value.customValues),
  };
}
function definition(value: (ObjectType & RelationshipType) | null): Values {
  if (!value) return {};
  const kinds = { text: 'Text', number: 'Tal', date: 'Datum', boolean: 'Ja/nej' };
  const section = (id?: string) =>
    id === ''
      ? 'Dold'
      : (value.sections?.find((item) => item.id === id)?.name ??
        (id === undefined ? 'Egna fält' : 'Utanför avsnitt'));
  return {
    Namn: value.name,
    Beskrivning: text(value.description),
    ...(value.forwardLabel !== undefined ? { Framåtriktning: text(value.forwardLabel) } : {}),
    ...(value.reverseLabel !== undefined ? { 'Omvänd riktning': text(value.reverseLabel) } : {}),
    Avsnitt: value.sections?.map((item) => item.name).join(', ') ?? 'Egna fält',
    ...Object.fromEntries(
      (value.fields ?? []).map((field) => [
        `Eget fält: ${field.name}`,
        `${kinds[field.kind]} · ${section(field.sectionId)}${field.description ? ` · ${field.description}` : ''}`,
      ]),
    ),
    ...Object.fromEntries(
      (value.builtins ?? []).map((field) => [
        `Gemensam egenskap: ${field.name}`,
        section(field.sectionId),
      ]),
    ),
    ...(value.propertyOrder
      ? {
          'Egenskapernas ordning': objectProperties(value)
            .map((item) => item.name)
            .join(', '),
        }
      : {}),
  };
}
export function draftReadProposals(draft: MapDraft): DraftReadProposal[] {
  return [
    ...draft.changes.map((change) => ({
      key: `object-${change.id}`,
      kind: 'Objekt',
      name: change.after?.name ?? change.before?.name ?? 'Objekt',
      before: object(change.before, change.beforeType ?? change.type),
      after: object(change.after, change.type),
      hasBefore: !!change.before,
      hasAfter: !!change.after,
    })),
    ...(draft.relationships ?? []).map((change) => ({
      key: `relationship-${change.id}`,
      kind: 'Samband',
      name: relationshipDetails(
        (change.after ?? change.before) as RelationshipValue,
        change.type.forwardLabel ?? change.type.name,
        change.objectNames,
      ),
      before: relationship(
        change.before,
        change.beforeType ?? change.type,
        change.objectNames ?? {},
      ),
      after: relationship(change.after, change.type, change.objectNames ?? {}),
      hasBefore: !!change.before,
      hasAfter: !!change.after,
    })),
    ...(
      [
        ['Objekttyp', draft.objectTypes],
        ['Sambandstyp', draft.relationshipTypes],
      ] as const
    ).flatMap(([kind, changes]) =>
      (changes ?? []).map((change) => ({
        key: `${kind}-${change.id}`,
        kind,
        name: change.after?.name ?? change.before?.name ?? kind,
        before: definition(change.before),
        after: definition(change.after),
        hasBefore: !!change.before,
        hasAfter: !!change.after,
      })),
    ),
  ];
}
export function DraftReadDetails({ proposal }: { proposal: DraftReadProposal }) {
  return (
    <>
      <p className="dr-main-read-note">
        {proposal.kind} ·{' '}
        {proposal.hasAfter ? (proposal.hasBefore ? 'Ändras' : 'Läggs till') : 'Tas bort'}. Här läser
        du förslaget. Rättningar görs i det ordinarie flödet.
      </p>
      <div
        className={`dr-main-values${proposal.hasBefore && proposal.hasAfter ? ' dr-main-values-pair' : ''}`}
      >
        {(
          [
            ['Sparade värden', proposal.before, proposal.hasBefore],
            ['Föreslagna värden', proposal.after, proposal.hasAfter],
          ] as const
        )
          .filter(([, , visible]) => visible)
          .map(([title, values]) => (
            <section key={title}>
              <h3>{title}</h3>
              <dl>
                {Object.entries(values).map(([name, value]) => {
                  const changed =
                    proposal.hasBefore &&
                    proposal.hasAfter &&
                    proposal.before[name] !== proposal.after[name];
                  return (
                    <div key={name} className={changed ? 'dr-main-value-changed' : undefined}>
                      <dt>
                        {name}
                        {changed && <span className="dr-main-value-marker"> · ändrat</span>}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
      </div>
    </>
  );
}
