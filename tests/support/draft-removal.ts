import type { APIRequestContext } from '@playwright/test';
import { prepareDraftReview } from './draft-review.js';

export async function prepareDraftRemovalFocus(client: APIRequestContext, origin: string) {
  const fixture = await prepareDraftReview(client, origin);
  const state = await fixture.read();
  await fixture.post('discard', {});
  const bike = state.draft.changes.find(({ id }) => id === 'draft-bike');
  const edge = state.draft.relationships?.find(({ id }) => id === 'draft-edge-unknown');
  if (!bike?.after || !edge?.after) throw new Error('Missing two focus proposals');
  await fixture.post('draft', {
    id: bike.id,
    baseRevision: bike.before?.revision ?? null,
    value: bike.after,
  });
  await fixture.post('relationship', { id: edge.id, baseRevision: null, value: edge.after });
  return fixture;
}

/** The new field belongs to the proposed type; discarding it must retain the value. */
export async function prepareDraftRemovalMeaning(
  client: APIRequestContext,
  origin: string,
  kind: 'objectType' | 'relationshipType',
) {
  const fixture = await prepareDraftReview(client, origin);
  const state = await fixture.read();
  const type = (kind === 'objectType' ? state.types : state.relationshipTypes).find(
    ({ id }) => id === (kind === 'objectType' ? 'draft-vehicle' : 'draft-uses'),
  );
  if (!type) throw new Error('Missing saved removal type');
  await fixture.post(kind === 'objectType' ? 'object-type' : 'relationship-type', {
    id: type.id,
    baseRevision: type.revision,
    value: {
      name: type.name,
      description: type.description,
      ...(kind === 'relationshipType'
        ? { forwardLabel: 'granskar', reverseLabel: 'granskas av' }
        : {}),
      fields: [
        ...(type.fields ?? []),
        { id: 'new-field', name: 'Ny uppgift', description: '', kind: 'text' },
      ],
    },
  });
  const proposal =
    kind === 'objectType'
      ? state.draft.changes.find(({ id }) => id === 'draft-bike')
      : state.draft.relationships?.find(({ id }) => id === 'draft-edge-unknown');
  if (!proposal?.after) throw new Error('Missing dependent proposal');
  await fixture.post(kind === 'objectType' ? 'draft' : 'relationship', {
    id: proposal.id,
    baseRevision: proposal.before?.revision ?? null,
    value: {
      ...proposal.after,
      customValues: { ...proposal.after.customValues, 'new-field': 'Behåll hela mitt värde' },
    },
  });
  return { ...fixture, type, proposalId: proposal.id };
}
