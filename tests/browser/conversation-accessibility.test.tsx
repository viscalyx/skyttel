import { cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import { restoreDesktopPointer } from '../support/browser-touch.js';
import {
  openConversationText,
  startConversationWithVoice,
} from '../support/conversation-browser.js';
import { openHouseholdConversation } from '../support/household-conversation-browser.js';
import {
  assertBrowserVoiceDisposedAndRestore,
  installBrowserVoiceFixture,
} from '../support/live-browser-mode.js';

const notice = () => page.getByRole('region', { name: 'Samtalsnotis', exact: true });
const view = () => page.getByRole('region', { name: 'Skriv till Skyttel', exact: true });
const voiceBox = () => page.getByRole('group', { name: 'Röstruta', exact: true });
const voiceText = () => voiceBox().element().textContent?.replace(/\s+/g, ' ').trim();
const microphone = () => page.getByRole('button', { name: 'Prata med Skyttel', exact: true });
let restoreMedia: (() => void) | undefined;

afterEach(async () => {
  cleanup();
  try {
    await assertBrowserVoiceDisposedAndRestore(restoreMedia);
  } finally {
    restoreMedia = undefined;
    vi.unstubAllGlobals();
  }
});

test('HJALP-07: en blockerad mikrofon i ett pågående samtal går att aktivera med hjälpmedel på pekskärm', async ({
  onTestFinished,
}) => {
  const session = cdp();
  onTestFinished(async () => {
    await restoreDesktopPointer(session);
  });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  expect(window.matchMedia('(pointer: coarse)').matches).toBe(true);
  restoreMedia = installBrowserVoiceFixture();
  const home = await openHouseholdConversation(1280, 720);
  await startConversationWithVoice();
  await expect.poll(voiceText).toBe('Lyssnar');
  home.setAvailable(false);
  await expect
    .element(notice(), { timeout: 7000 })
    .toHaveTextContent(
      'Samtal med Skyttel är inte tillgängligt just nu. Kontakta administratören om det fortsätter.',
    );
  const button = microphone();
  await expect.element(button).toBeEnabled();
  await expect.element(button).not.toHaveAttribute('aria-disabled');
  await expect
    .element(button)
    .toHaveAccessibleDescription('Prata med Skyttel. Inte tillgängligt just nu.');
  button.element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(button).toHaveFocus();
  expect(notice().elements()).toHaveLength(1);
  await expect.element(button).toHaveAttribute('aria-pressed', 'false');
  expect(window.skyttelVoiceFixture.stats().microphoneTracks.every((track) => !track.enabled)).toBe(
    true,
  );
  home.setAvailable(true);
  await expect.element(notice(), { timeout: 7000 }).not.toBeInTheDocument();
  await expect
    .element(page.getByText('Samtal med Skyttel är tillgängligt igen.', { exact: true }))
    .toHaveTextContent('Samtal med Skyttel är tillgängligt igen.');
  const announcement = document.querySelector('.notice-announcement[aria-live="polite"]');
  expect(announcement?.textContent).toBe('Samtal med Skyttel är tillgängligt igen.');
  await expect.element(button).toHaveAttribute('aria-pressed', 'false');
}, 20_000);

for (const width of [1280, 390]) {
  test(`${width === 1280 ? 'HJALP-06' : 'HJALP-10'}: systemets minskade rörelse ger fasta former och omedelbara ytor vid ${width}px`, async ({
    onTestFinished,
  }) => {
    const session = cdp();
    const motion = async (value: 'reduce' | 'no-preference') => {
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value }],
      });
    };
    onTestFinished(async () => {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    });
    await motion('reduce');
    restoreMedia = installBrowserVoiceFixture();
    const home = await openHouseholdConversation(width, 900);
    await startConversationWithVoice();
    await expect.poll(voiceText).toBe('Lyssnar');
    const wave = () => {
      const element = voiceBox().element().querySelector('.voice-wave');
      if (!element) throw new Error('Missing voice waveform');
      return element;
    };
    const bars = () => [...wave().querySelectorAll('i')];
    const heights = () => bars().map((bar) => bar.getBoundingClientRect().height);
    expect(heights()).toEqual(Array(7).fill(4));
    expect(wave().getAttribute('aria-hidden')).toBe('true');
    window.skyttelVoiceFixture.setSound('microphone', true, 0.1);
    await expect.poll(voiceText).toBe('Du talar');
    const heard = heights();
    expect(heard).toEqual([12, 20, 12, 20, 12, 20, 12]);
    window.skyttelVoiceFixture.setSound('microphone', true, 0.9);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(heights()).toEqual(heard);
    window.skyttelVoiceFixture.setSound('remote', true, 0.2);
    await expect.poll(voiceText).toBe('Skyttel talar');
    expect(heights()).toEqual(heard);
    expect(getComputedStyle(bars()[0]).animationName).toBe('none');
    window.skyttelVoiceFixture.setSound('microphone', false, 0);
    window.skyttelVoiceFixture.setSound('remote', false, 0);
    await microphone().click();
    await openConversationText();
    await page.getByLabelText('Meddelande till Skyttel').fill('Beskriv kartan.');
    await page.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect.poll(() => home.messages.length).toBe(1);
    await view().getByRole('button', { name: 'Stäng textvyn' }).click();
    const marker = () => {
      const element = document.querySelector('.text-button-marker[data-status="working"]');
      if (!element) throw new Error('Missing working text marker');
      return element;
    };
    expect(getComputedStyle(marker()).animationName).toBe('none');
    const still = getComputedStyle(marker()).transform;
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(getComputedStyle(marker()).transform).toBe(still);
    await openConversationText();
    home.completeReply('Kartan är redo.');
    await expect.element(view().getByRole('log')).toMatchTextContent('Kartan är redo.');
    home.failNextReply();
    await page.getByLabelText('Meddelande till Skyttel').fill('Ett nytt försök.');
    await page.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect.element(notice()).toMatchTextContent('Skyttel kunde inte slutföra uppdraget.');
    const corner = document.querySelector('.conversation-corner');
    if (!corner) throw new Error('Missing conversation corner');
    for (const surface of [notice().element(), view().element(), corner]) {
      expect(getComputedStyle(surface).animationName).toBe('none');
      expect(getComputedStyle(surface).transitionDuration).toBe('0s');
    }
    expect(
      getComputedStyle(notice().getByRole('button', { name: 'Stäng notisen' }).element())
        .transitionDuration,
    ).toBe('0s');
    expect(getComputedStyle(microphone().element()).transitionDuration).toBe('0s');
    expect(page.getByRole('checkbox', { name: /rörelse/i }).elements()).toHaveLength(0);
    await motion('no-preference');
    await microphone().click();
    window.skyttelVoiceFixture.setSound('remote', true, 0.2);
    await expect.poll(() => getComputedStyle(bars()[0]).animationName).not.toBe('none');
    const stop = voiceBox().getByRole('button', { name: 'Avbryt', exact: true });
    await expect.element(stop).toBeVisible();
    stop.element().focus();
    await expect.element(stop).toHaveFocus();
  }, 20_000);
}
