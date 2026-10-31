import type { Page } from '@playwright/test';
import { installation } from '../support/conversation-draft-steps.js';
import { prepareConversationReview } from '../support/conversation-review-preparation.js';
import { propertyValues } from '../support/property-controls.js';
import { expect, test } from '../support/test.js';

const view = (page: Page) => page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });

const draft = (page: Page) => view(page).getByRole('region', { name: 'Utkastet', exact: true });

for (const seeded of [false, true])
  test(`conversation review preparation accepts a ${seeded ? 'seeded' : 'empty'} public household`, {
    tag: '@technical',
  }, async ({ page }) => {
    const { app, path, read } = await installation(page, seeded);
    try {
      await page.evaluate(
        `window.prepareConversationReview = (${prepareConversationReview.toString()})`,
      );
      await page.evaluate(async (path) => {
        const read = async () => (await fetch(path)).json();
        const post = async (route: string, data: object) => {
          const state = await read();
          const response = await fetch(`${path}/${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version: state.draft.version,
              contentVersion: state.contentVersion,
              ...data,
            }),
          });
          if (!response.ok) throw Error(await response.text());
        };
        await (
          window as unknown as {
            prepareConversationReview: typeof prepareConversationReview;
          }
        ).prepareConversationReview({ read, post });
      }, path);
      const state = await read();
      expect(propertyValues(state.objects.find((object) => object.id === 'card'))).toEqual({
        'last-four': '1111',
      });
      expect(
        propertyValues(state.draft.changes.find((change) => change.id === 'card')?.after),
      ).toEqual({ 'last-four': '2222' });
      expect(state.draft.changes).toHaveLength(4);
      expect(state.draft.relationships).toHaveLength(2);
      expect(state.draft.objectTypes).toHaveLength(1);
      expect(state.draft.relationshipTypes).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
