import type { APIRequestContext } from '@playwright/test';
import { prepareHouseholdTable } from './household-table.js';

/** Public request preparation for the same full-detail browser scenario. */
export async function prepareTableDetailProposals(client: APIRequestContext, origin: string) {
  const app = await prepareHouseholdTable(client, origin);
  const prepared = await app.read();
  const type = prepared.types.find((value) => value.id === 'table-type-2');
  const proposal = prepared.draft.changes.find((change) => change.id === 'table-0');
  if (!type || !proposal?.after) throw new Error('Missing prepared type or object proposal');
  await app.post('object-type', {
    id: type.id,
    baseRevision: type.revision,
    value: {
      ...type,
      fields: [
        { ...type.fields?.[0], name: 'Föreslagen anteckning' },
        { id: 'frame', name: 'Ramnummer', description: '', kind: 'text', sectionId: '' },
        { id: 'count', name: 'Antal', description: '', kind: 'number', sectionId: '' },
        { id: 'reserve', name: 'Reserv', description: '', kind: 'boolean', sectionId: '' },
      ],
    },
  });
  await app.post('draft', {
    id: proposal.id,
    baseRevision: proposal.before?.revision ?? null,
    value: {
      ...proposal.after,
      customValues: {
        ...proposal.after.customValues,
        frame: 'RAM-2026-42',
        count: 0,
        reserve: false,
      },
    },
  });
  return app;
}
