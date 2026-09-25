import { type FinancialFact, financialFields } from '../shared/financial-facts.js';
import type { MapDraft, RelationshipValue, SaveReceipt } from '../shared/map.js';
import type { TextAssistantResult } from '../shared/text-assistant.js';

function fact(value: FinancialFact | undefined) {
  if (!value) return 'ej angivet';
  const text =
    value.knowledge === 'none'
      ? 'uttryckligen inget'
      : value.knowledge === 'unknown'
        ? 'okänt'
        : `${value.knowledge === 'uncertain' ? 'osäkert uppgivet: ' : ''}${value.value}`;
  return `${text}${value.reportedOn ? ` (${value.reportedOn})` : ''}`;
}

function lifecycle(value: RelationshipValue['lifecycle']) {
  return value === 'ended' ? 'upphört' : value === 'active' ? 'aktuellt' : 'ej angivet';
}

/** These words describe actual tool records. Provider prose never enters here. */
function details(value: MapDraft | SaveReceipt, saved: boolean) {
  const verb = (before: unknown, after: unknown) =>
    !before
      ? saved
        ? 'Lade till'
        : 'Lägg till'
      : !after
        ? saved
          ? 'Tog bort'
          : 'Ta bort'
        : saved
          ? 'Ändrade'
          : 'Ändra';
  const lines: string[] = [];
  for (const change of value.changes) {
    const name = change.after?.name ?? change.before?.name;
    const fields: string[] = [];
    if (change.before && change.after) {
      if (change.before.typeId !== change.after.typeId)
        fields.push(
          `objekttyp: ${change.beforeType?.name ?? change.before.typeId} → ${change.type.name}`,
        );
      if (change.before.name !== change.after.name)
        fields.push(`namn: ${change.before.name} → ${change.after.name}`);
      if (change.before.description !== change.after.description)
        fields.push(
          `beskrivning: ${change.before.description || 'tom'} → ${change.after.description || 'tom'}`,
        );
    }
    for (const { key, label } of financialFields) {
      const before = change.before?.financialFacts?.[key];
      const after = change.after?.financialFacts?.[key];
      if (JSON.stringify(before) !== JSON.stringify(after))
        fields.push(`${label}: ${fact(before)} → ${fact(after)}`);
    }
    for (const id of new Set([
      ...Object.keys(change.before?.customValues ?? {}),
      ...Object.keys(change.after?.customValues ?? {}),
    ])) {
      const before = change.before?.customValues?.[id];
      const after = change.after?.customValues?.[id];
      if (before !== after)
        fields.push(
          `${change.type.fields?.find((field) => field.id === id)?.name ?? change.beforeType?.fields?.find((field) => field.id === id)?.name ?? id}: ${before ?? 'ej angivet'} → ${after ?? 'ej angivet'}`,
        );
    }
    lines.push(
      `${verb(change.before, change.after)} ${name}${fields.length ? ` (${fields.join('; ')})` : ''}`,
    );
  }
  for (const change of value.relationships ?? []) {
    const edge = change.after ?? change.before;
    if (!edge) continue;
    const describe = (relationship: RelationshipValue) => {
      const source = change.objectNames?.[relationship.sourceId] ?? relationship.sourceId;
      const target = relationship.targetId
        ? (change.objectNames?.[relationship.targetId] ?? relationship.targetId)
        : relationship.knowledge === 'none'
          ? 'uttryckligen ingen'
          : 'okänt';
      return `${source} ${change.type.forwardLabel ?? change.type.name} ${target}${relationship.knowledge === 'uncertain' ? ' (osäkert uppgivet)' : ''}`;
    };
    const beforeDescription = change.before ? describe(change.before) : '';
    const afterDescription = describe(edge);
    const description =
      beforeDescription && beforeDescription !== afterDescription
        ? `${beforeDescription} → ${afterDescription}`
        : afterDescription;
    const fields: string[] = [];
    if (change.before?.lifecycle !== change.after?.lifecycle)
      fields.push(
        `Gäller: ${lifecycle(change.before?.lifecycle)} → ${lifecycle(change.after?.lifecycle)}`,
      );
    if (JSON.stringify(change.before?.endDate) !== JSON.stringify(change.after?.endDate))
      fields.push(`Slutdatum: ${fact(change.before?.endDate)} → ${fact(change.after?.endDate)}`);
    lines.push(
      `${verb(change.before, change.after)} sambandet ${description}${fields.length ? ` (${fields.join('; ')})` : ''}`,
    );
  }
  for (const [kind, changes] of [
    ['objekttypen', value.objectTypes],
    ['sambandstypen', value.relationshipTypes],
  ] as const)
    for (const change of changes ?? [])
      lines.push(
        `${verb(change.before, change.after)} ${kind} ${change.after?.name ?? change.before?.name}`,
      );
  return lines.join('. ');
}

export function draftResult(draft: MapDraft): TextAssistantResult {
  return {
    kind: 'draft',
    message: details(draft, false) ? `Utkast: ${details(draft, false)}.` : 'Utkastet är tomt.',
  };
}

export function historyResult(receipt: SaveReceipt | undefined): TextAssistantResult {
  return {
    kind: 'history',
    message: receipt
      ? `Sparandet: ${details(receipt, true)}.`
      : 'Det finns inget tidigare sparande i hushållets historik.',
  };
}
