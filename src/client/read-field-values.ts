import type { Lifecycle } from '../shared/lifecycle.js';
import type { CustomValues } from '../shared/map.js';

export function lifecycleText(lifecycle?: Lifecycle) {
  if (lifecycle === 'ended') return 'Manuellt upphört';
  if (lifecycle === 'active') return 'Gäller fortfarande';
  return 'Följ slutdatum';
}

function answerText(answer: string | number | boolean | undefined) {
  if (answer === undefined) return 'Ej uppgivet';
  if (answer === true) return 'Ja';
  if (answer === false) return 'Nej';
  return String(answer);
}

export function customReadFields(
  definitions: readonly { id: string; name: string }[] = [],
  values?: CustomValues,
) {
  const fields = new Map<string, { label: string; value: string }>();
  for (const field of definitions)
    fields.set(`field:${field.id}`, { label: field.name, value: answerText(values?.[field.id]) });
  for (const [id, answer] of Object.entries(values ?? {}))
    if (!fields.has(`field:${id}`))
      fields.set(`field:${id}`, { label: id, value: answerText(answer) });
  return fields;
}
