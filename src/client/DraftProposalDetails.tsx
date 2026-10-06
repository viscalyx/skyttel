import { hasEnded } from '../shared/lifecycle.js';
import type {
  CustomValues,
  MapDraft,
  ObjectType,
  ObjectValue,
  RelationshipType,
  RelationshipValue,
} from '../shared/map.js';
import { objectProperties } from '../shared/object-properties.js';
import {
  draftProposalDescriptors,
  proposedRelationshipNames,
} from './draft-proposal-descriptors.js';
import { factText, objectPropertyValues } from './ObjectReadDetails.js';
import { ProfileImage } from './ProfileImage.js';
import { lifecycleText } from './read-field-values.js';

type Property = { key: string; label: string; value: string };
export type DraftProposal = {
  key: string;
  name: string;
  kind: string;
  before: Property[] | null;
  after: Property[] | null;
  images?: { before?: ObjectValue; after?: ObjectValue; householdId: string };
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
function property(key: string, label: string, value: string): Property {
  return { key, label, value };
}
function custom(type: ObjectType | RelationshipType, values?: CustomValues) {
  return [
    ...(type.fields ?? []).map((field) =>
      property(`field:${field.id}`, field.name, text(values?.[field.id])),
    ),
    ...Object.entries(values ?? {})
      .filter(([id]) => !type.fields?.some((field) => field.id === id))
      .map(([id, value]) => property(`field:${id}`, `Eget fält (${id})`, text(value))),
  ];
}
function object(value: ObjectValue | null, type: ObjectType): Property[] | null {
  if (!value) return null;
  return [
    ...Array.from(objectPropertyValues(value, type)).flatMap(([key, entry]) => [
      ...(key === 'lifecycle'
        ? [property('applies', 'Gäller', hasEnded(value) ? 'Upphört' : 'Aktuellt')]
        : []),
      { key, ...entry },
    ]),
  ];
}
const knowledge = {
  known: 'Bekräftat',
  unknown: 'Okänt',
  none: 'Uttryckligen inget',
  uncertain: 'Osäkert uppgivet',
  unresolved: 'Obesvarad fråga',
};
function relationship(
  value: RelationshipValue | null,
  type: RelationshipType,
  names: Record<string, string>,
): Property[] | null {
  if (!value) return null;
  return [
    property('source', 'Från', names[value.sourceId] ?? value.sourceId),
    property('type', 'Sambandstyp', type.name),
    property(
      'target',
      'Till',
      value.targetId ? (names[value.targetId] ?? value.targetId) : knowledge[value.knowledge],
    ),
    property('knowledge', 'Uppgiftens säkerhet', knowledge[value.knowledge]),
    property('applies', 'Gäller', hasEnded(value) ? 'Upphört' : 'Aktuellt'),
    property('lifecycle', 'Status', lifecycleText(value.lifecycle)),
    ...(value.endDate ? [property('endDate', 'Slutdatum', factText(value.endDate))] : []),
    ...custom(type, value.customValues),
  ];
}
export function definitionPropertyValues(
  value: (ObjectType & RelationshipType) | null,
): Property[] | null {
  if (!value) return null;
  const kinds = { text: 'Text', number: 'Tal', date: 'Datum', boolean: 'Ja/nej' };
  const section = (id?: string) =>
    id === ''
      ? 'Dold'
      : (value.sections?.find((item) => item.id === id)?.name ??
        (id === undefined ? 'Egna fält' : 'Utanför avsnitt'));
  return [
    property('name', 'Namn', value.name),
    property('description', 'Beskrivning', text(value.description)),
    ...(value.forwardLabel !== undefined
      ? [property('forward', 'Framåtriktning', text(value.forwardLabel))]
      : []),
    ...(value.reverseLabel !== undefined
      ? [property('reverse', 'Omvänd riktning', text(value.reverseLabel))]
      : []),
    property(
      'sections',
      'Avsnitt',
      value.sections?.map((item) => item.name).join(', ') ||
        (value.sections === undefined ? 'Egna fält' : 'Inga avsnitt'),
    ),
    ...(value.fields ?? []).map((field) =>
      property(
        `field:${field.id}`,
        `Eget fält: ${field.name}`,
        `${kinds[field.kind]} · ${section(field.sectionId)}${field.description ? ` · ${field.description}` : ''}`,
      ),
    ),
    ...(value.builtins ?? []).map((field) =>
      property(
        `builtin:${field.key}`,
        `Gemensam egenskap: ${field.name}`,
        section(field.sectionId),
      ),
    ),
    ...(value.propertyOrder
      ? [
          property(
            'order',
            'Egenskapernas ordning',
            objectProperties(value)
              .map((item) => item.name)
              .join(', '),
          ),
        ]
      : []),
  ];
}
/** Uses the proposal's historical type snapshots, independently of current map filters. */
export function draftProposals(draft: MapDraft): DraftProposal[] {
  return draftProposalDescriptors(draft).map((proposal) => {
    const { key, name, kind } = proposal;
    if (proposal.kind === 'Objekt') {
      const change = proposal.change;
      return {
        key,
        name,
        kind,
        before: object(change.before, change.beforeType ?? change.type),
        after: object(change.after, change.type),
        images: {
          before: change.before ?? undefined,
          after: change.after ?? undefined,
          householdId: change.type.householdId,
        },
      };
    }
    if (proposal.kind === 'Samband') {
      const change = proposal.change;
      return {
        key,
        name,
        kind,
        before: relationship(
          change.before,
          change.beforeType ?? change.type,
          change.objectNames ?? {},
        ),
        after: relationship(change.after, change.type, proposedRelationshipNames(draft, change)),
      };
    }
    return {
      key,
      name,
      kind,
      before: definitionPropertyValues(proposal.change.before),
      after: definitionPropertyValues(proposal.change.after),
    };
  });
}
export function DraftProposalDetails({ proposal }: { proposal: DraftProposal }) {
  const paired = !!proposal.before && !!proposal.after;
  const keys = [
    ...new Set([...(proposal.before ?? []), ...(proposal.after ?? [])].map(({ key }) => key)),
  ];
  return (
    <>
      <p className="draft-read-note">
        {proposal.kind} ·{' '}
        {proposal.after ? (proposal.before ? 'Ändras' : 'Läggs till') : 'Tas bort'}. Här läser du
        förslaget. Rättningar görs i det ordinarie flödet.
      </p>
      <div className={`draft-values${paired ? ' draft-values-pair' : ''}`}>
        {(
          [
            ['Sparade värden', proposal.before],
            ['Föreslagna värden', proposal.after],
          ] as const
        ).map(
          ([title, values]) =>
            values && (
              <section key={title}>
                <h3>{title}</h3>
                <dl>
                  {keys.map((key) => {
                    const before = proposal.before?.find((item) => item.key === key);
                    const after = proposal.after?.find((item) => item.key === key);
                    const entry = values.find((item) => item.key === key);
                    const changed =
                      paired &&
                      (before?.value !== after?.value ||
                        before?.label !== after?.label ||
                        (key === 'profileImage' &&
                          proposal.images?.before?.profileImageId !==
                            proposal.images?.after?.profileImageId));
                    const image =
                      title === 'Sparade värden' ? proposal.images?.before : proposal.images?.after;
                    return (
                      <div key={key} className={changed ? 'draft-value-changed' : undefined}>
                        <dt>
                          {entry?.label ?? before?.label ?? after?.label}
                          {changed && <span> · ändrat</span>}
                        </dt>
                        <dd>
                          {entry?.value ?? 'Ej uppgivet'}
                          {key === 'profileImage' && image?.profileImageId && proposal.images && (
                            <ProfileImage householdId={proposal.images.householdId} value={image} />
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ),
        )}
      </div>
    </>
  );
}
