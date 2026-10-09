import { cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { cdp, type Locator, page } from 'vitest/browser';
import { measureContrast } from '../support/accessibility.js';
import { textViewButtonAccessibleName } from '../support/conversation.js';
import {
  closeConversationText,
  openConversationText,
  startConversationWithText,
} from '../support/conversation-browser.js';
import { openHouseholdConversation } from '../support/household-conversation-browser.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const bounds = (control: Locator) => {
  const { x, y, width, height, right, bottom } = control.element().getBoundingClientRect();
  return { x, y, width, height, right, bottom };
};

for (const { caseId, width, theme } of [
  { caseId: 'TEXTBRICKA-06', width: 390, theme: 'dark' },
  { caseId: 'TEXTBRICKA-07', width: 1280, theme: 'light' },
] as const) {
  test(`${caseId}: minskad rörelse och fasta knappmått vid ${width}px i ${theme} tema`, async ({
    onTestFinished,
  }) => {
    const session = cdp();
    const media = async (motion: 'reduce' | 'no-preference') => {
      await session.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-reduced-motion', value: motion },
          { name: 'prefers-color-scheme', value: theme },
        ],
      });
    };
    onTestFinished(async () => {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    });
    await media('reduce');
    const home = await openHouseholdConversation(width, 844);
    await expect
      .element(page.getByRole('region', { name: 'Hushållskarta', exact: true }))
      .toHaveAttribute('data-theme', theme);
    await startConversationWithText();
    await page.getByLabelText('Meddelande till Skyttel').fill('Beskriv mitt utkast.');
    await page.getByRole('button', { name: 'Skicka', exact: true }).click();
    await expect.poll(() => home.messages.length).toBe(1);
    await closeConversationText();
    const tools = page.getByRole('navigation', { name: 'Kartans verktyg' });
    await tools.getByRole('button', { name: 'Visa verktygens namn', exact: true }).click();
    const button = tools.getByRole('button', { name: textViewButtonAccessibleName });
    const label = button.getByText('Skriv till Skyttel', { exact: true });
    await expect.element(label).toHaveTextContent('Skriv till Skyttel');
    await expect.element(label).toBeVisible();
    await expect.element(button).toHaveAccessibleName('Skriv till Skyttel. Skyttel arbetar.');
    const before = bounds(tools);
    const target = bounds(button);
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
    const marker = () => {
      const element = button.element().querySelector('.text-button-marker');
      if (!element) throw new Error('The text button has no status marker');
      return element;
    };
    expect(marker().getAttribute('data-status')).toBe('working');
    expect(getComputedStyle(marker()).animationName).toBe('none');
    await media('no-preference');
    await expect.poll(() => getComputedStyle(marker()).animationName).toBe('text-button-work');
    await media('reduce');
    await expect.poll(() => getComputedStyle(marker()).animationName).toBe('none');
    home.completeReply('Ett nytt svar.');
    await expect.element(button).toHaveAccessibleName('Skriv till Skyttel. Skyttel har svarat.');
    expect(marker().textContent).toBe('•••');
    expect(measureContrast(marker())).toBeGreaterThanOrEqual(4.5);
    const overlay = marker().getBoundingClientRect();
    expect(overlay.right).toBeGreaterThan(target.right - 3);
    expect(overlay.y).toBeLessThan(target.y + 3);
    expect(bounds(button)).toEqual(target);
    expect(bounds(tools)).toEqual(before);
    // The completed controlled reply goes through the real transcript and unread wiring.
    await openConversationText();
    const transcript = page.getByRole('log', { name: 'Samtalstext' });
    await expect.element(transcript).toBeVisible();
    await expect.element(transcript).toMatchTextContent('Ett nytt svar.');
    await expect.element(button).toHaveAccessibleName('Skriv till Skyttel');
    expect(button.element().querySelector('.text-button-marker')).toBeNull();
  });
}
