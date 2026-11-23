import type { TextAssistantView } from '../../src/shared/text-assistant.js';
import { createHousehold, signIn } from '../support/client.js';
import {
  openConversationText,
  startConversationWithText,
  turnMicrophoneOff,
  turnMicrophoneOn,
} from '../support/conversation-page.js';
import { createInstallation } from '../support/installation.js';
import { liveBrowserFixtureSource } from '../support/live-browser.js';
import { liveProvider } from '../support/live-provider.js';
import { expect, test } from '../support/test.js';
import { modelMessage, textModel } from '../support/text-model.js';

test('speech fragments form complete bubbles during voice and after restoring the conversation', async ({
  page,
}) => {
  const live = liveProvider();
  const model = textModel(() => [modelMessage('Lampan finns i garaget.')]);
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
  });
  try {
    await signIn(page.request, app.origin);
    await createHousehold(page.request, app.origin, 'Samtalstextprov');
    await page.addInitScript({ content: liveBrowserFixtureSource });
    await page.goto(app.origin);
    await startConversationWithText(page);
    const text = page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
    const rows = text.getByRole('log', { name: 'Samtalstext' }).getByRole('listitem');
    await text.getByRole('textbox', { name: 'Meddelande till Skyttel' }).fill('Var finns lampan?');
    await text.getByRole('button', { name: 'Skicka', exact: true }).click();
    const typed = ['Du: Var finns lampan?', 'Skyttel: Lampan finns i garaget.'];
    await expect(rows).toHaveText(typed);
    await turnMicrophoneOn(page);
    const providerId = [...live.channels.keys()][0];
    const emit = async (role: 'input' | 'output', firstMs: number, parts: string[]) => {
      const events = parts.map((delta, index) => ({
        type: `session.${role}_transcript.delta`,
        event_id: crypto.randomUUID(),
        delta,
        start_ms: firstMs + index * 100,
        end_ms: firstMs + (index + 1) * 100,
      }));
      for (const event of events) live.emit(providerId, event);
      await page.evaluate((fragments) => {
        for (const fragment of fragments) window.skyttelVoiceFixture.emit(fragment);
      }, events);
    };
    await emit('output', 0, ['Berätta ', 'gärna.']);
    await emit('input', 200, ['Jag vill kop', 'pla', ' ', 'lampan.']);
    await emit('output', 800, ['Vil', 'ken ', 'lampa?']);
    await emit('output', 3200, ['Den i ', 'hallen.']);
    await emit('output', 5700, [' ']);
    const active = [
      ...typed,
      'Skyttel: Berätta gärna.',
      'Du: Jag vill koppla lampan.',
      'Skyttel: Vilken lampa?',
      'Skyttel: Den i hallen.',
    ];
    await expect(rows).toHaveText(active);
    await turnMicrophoneOff(page);
    await expect(rows).toHaveText(active);
    await app.restart();
    // Older saved user fragments have the same text without a turn marker.
    await page.route('**/text-assistant/restore', async (route) => {
      const response = await route.fetch();
      const body: { conversation?: TextAssistantView } = await response.json();
      for (const row of body.conversation?.conversation ?? [])
        if (row.role === 'user') delete row.utteranceStart;
      await route.fulfill({ response, json: body });
    });
    await page.reload();
    await openConversationText(page);
    await expect(text).toContainText('Samtalet är pausat');
    await expect(rows).toHaveText(active);
  } finally {
    await app.close();
  }
});
