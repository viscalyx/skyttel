import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { MapState, SaveReceipt } from '../../src/shared/map.js';
import { createHousehold, openWorkspace, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

for (const typeName of [
  'Person',
  'Tjänst',
  'Tjänstekonto',
  'Abonnemang',
  'E-postadress',
  'Bankkonto',
  'Kort',
  'Företag',
  'Förening',
  'Bostad',
  'Garage',
  'Fordon',
  'Avtal',
  'Hyresavtal',
  'Låneavtal',
  'Kreditavtal',
  'Avbetalningsavtal',
  'Försäkringsavtal',
  'Egen bildtyp',
]) {
  test(`BILD-06: ${typeName} shares text, icon and image in one proposal and removes the latest image`, async ({
    page,
  }) => {
    const installation = await createInstallation();
    try {
      await signIn(page.request, installation.origin);
      const { household } = await (await createHousehold(page.request, installation.origin)).json();
      const path = `${installation.origin}/api/households/${household.id}/map`;
      const read = async (): Promise<MapState> => (await page.request.get(path)).json();
      if (typeName === 'Egen bildtyp') {
        expect(
          (
            await page.request.post(`${path}/object-type`, {
              headers: { origin: installation.origin },
              data: {
                id: 'own-image-type',
                version: 0,
                baseRevision: null,
                value: { name: typeName, description: 'Egen typ med profilbild', fields: [] },
              },
            })
          ).status(),
        ).toBe(200);
      }
      await page.goto(installation.origin);
      await openWorkspace(page);
      await page
        .getByRole('region', { name: 'Lista och utkast', exact: true })
        .getByRole('button', { name: 'Nytt objekt', exact: true })
        .click();
      const name = `Bild för ${typeName}`;
      const newForm = page.getByRole('dialog', { name: 'Nytt objekt', exact: true });
      const form = page.locator('dialog.object-dialog');
      const stage = () =>
        form.getByRole('button', { name: 'Lägg i utkastet och stäng', exact: true }).click();
      const appearance = () =>
        form.getByRole('button', { name: 'Livscykel och utseende', exact: true }).click();
      await newForm.getByLabel('Namn', { exact: true }).fill(name);
      await newForm.getByLabel('Objekttyp', { exact: true }).selectOption({ label: typeName });
      await newForm.getByLabel('Beskrivning', { exact: true }).fill('Text i samma förslag');
      await appearance();
      const picker = form.getByRole('region', { name: 'Ikon', exact: true });
      await picker.getByRole('searchbox', { name: 'Sök ikon' }).fill('cykel');
      await picker.getByRole('button', { name: 'Välj Cykel', exact: true }).click();
      const imageInput = form.getByLabel('Profilbild', { exact: true });
      const source = await sharp({
        create: { width: 600, height: 400, channels: 3, background: '#0088ff' },
      })
        .png()
        .toBuffer();
      await imageInput.setInputFiles({ name: 'bild.png', mimeType: 'image/png', buffer: source });
      await expect(form.getByAltText(`Profilbild för ${name}`)).toBeVisible();
      expect((await read()).draft.changes).toEqual([]);
      await stage();
      const proposed = await read();
      expect(proposed.objects).toEqual([]);
      expect(proposed.draft.changes).toHaveLength(1);
      const first = proposed.draft.changes[0];
      expect(first.after).toMatchObject({
        name,
        description: 'Text i samma förslag',
        iconId: 'bike',
        profileImageId: expect.any(String),
      });
      expect(first.type.name).toBe(typeName);
      const edit = async () => {
        await openWorkspace(page);
        await page.getByRole('button', { name: `Uppgifter för ${name}`, exact: true }).click();
        await page
          .getByRole('region', { name, exact: true })
          .getByRole('button', { name: 'Redigera valt objekt', exact: true })
          .click();
      };
      const save = async (): Promise<SaveReceipt> => {
        await openWorkspace(page);
        const response = page.waitForResponse(
          (response) => response.url() === `${path}/save` && response.request().method() === 'POST',
        );
        await page.getByRole('button', { name: 'Spara hela utkastet', exact: true }).click();
        const saved = await response;
        expect(saved.status()).toBe(200);
        await expect(
          page.getByRole('status', { name: 'Hushållsarbetets status', exact: true }),
        ).toContainText('Sparat:');
        return (await saved.json()).receipt;
      };
      const initialReceipt = await save();
      expect(initialReceipt.changes).toHaveLength(1);
      expect(initialReceipt.changes[0]).toMatchObject({ before: null, after: first.after });
      const shared = await read();
      expect(shared.objects).toHaveLength(1);
      expect(shared.objects[0]).toMatchObject({ ...first.after });
      expect(shared.draft.changes).toEqual([]);
      await edit();
      await form.getByLabel('Beskrivning', { exact: true }).fill('Ny text före bildbytet');
      await appearance();
      await imageInput.setInputFiles({
        name: 'ny.webp',
        mimeType: 'image/webp',
        buffer: await sharp(source).negate().webp().toBuffer(),
      });
      expect(await read()).toEqual(shared);
      await stage();
      const replacement = await read();
      expect(replacement.draft.changes).toHaveLength(1);
      const latest = replacement.draft.changes[0].after?.profileImageId;
      expect(latest).toBeTruthy();
      expect(latest).not.toBe(first.after?.profileImageId);
      expect(replacement.objects).toEqual(shared.objects);
      expect(replacement.draft.changes[0].after).toMatchObject({
        name,
        typeId: first.after?.typeId,
        description: 'Ny text före bildbytet',
        iconId: 'bike',
      });
      await edit();
      await appearance();
      await imageInput.setInputFiles([]);
      expect(await read()).toEqual(replacement);
      await imageInput.setInputFiles({
        name: 'fel.png',
        mimeType: 'image/png',
        buffer: Buffer.from('synthetic invalid pixels'),
      });
      await stage();
      await expect(form.getByRole('alert')).toContainText(
        'Profilbilden kunde inte läggas i utkastet',
      );
      expect(await read()).toEqual(replacement);
      await form
        .getByRole('button', { name: 'Ta bort profilbilden ur formuläret', exact: true })
        .click();
      await expect(form.getByAltText(`Profilbild för ${name}`)).toHaveCount(0);
      await picker.getByRole('searchbox', { name: 'Sök ikon' }).fill('cykel');
      await expect(picker.getByRole('button', { name: 'Välj Cykel', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(await read()).toEqual(replacement);
      await stage();
      const removed = await read();
      expect(removed.objects).toEqual(shared.objects);
      expect(removed.draft.changes).toHaveLength(1);
      expect(removed.draft.changes[0].id).toBe(first.id);
      expect(removed.draft.changes[0].after).toMatchObject({
        name,
        typeId: first.after?.typeId,
        description: 'Ny text före bildbytet',
        iconId: 'bike',
      });
      expect(removed.draft.changes[0].after).not.toHaveProperty('profileImageId');
      const removedReceipt = await save();
      expect(removedReceipt.operationId).not.toBe(initialReceipt.operationId);
      expect(removedReceipt.changes).toHaveLength(1);
      expect(removedReceipt.changes[0].before).toMatchObject({
        profileImageId: first.after?.profileImageId,
        iconId: 'bike',
        description: 'Text i samma förslag',
      });
      expect(removedReceipt.changes[0].after).toMatchObject({
        id: first.id,
        name,
        typeId: first.after?.typeId,
        iconId: 'bike',
        description: 'Ny text före bildbytet',
      });
      expect(removedReceipt.changes[0].after).not.toHaveProperty('profileImageId');
      const final = await read();
      expect(final.draft.changes).toEqual([]);
      expect(final.objects).toHaveLength(1);
      expect(final.objects[0]).toEqual(removedReceipt.changes[0].after);
      expect(final.objects[0]).not.toHaveProperty('profileImageId');
      expect((await (await page.request.get(`${path}/history`)).json()).history).toEqual([
        removedReceipt,
        initialReceipt,
      ]);
    } finally {
      await installation.close();
    }
  });
}
