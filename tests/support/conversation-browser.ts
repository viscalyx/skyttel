import { expect } from 'vitest';
import { type Locator, page } from 'vitest/browser';
import { consentBoxName, conversationSteps, textViewButtonAccessibleName } from './conversation.js';

// The conversation steps for Vitest browser mode.
const consentBox = () => page.getByRole('dialog', { name: consentBoxName, exact: true });

export const { startConversationWithText, openConversationText, closeConversationText } =
  conversationSteps<Locator>({
    startText: () => page.getByRole('button', { name: 'Nytt samtal', exact: true }),
    started: async () =>
      expect
        .element(page.getByRole('region', { name: 'Arbetsyta', exact: true }))
        .toHaveAttribute('data-session-active', 'true'),
    checkbox: (name) => consentBox().getByRole('checkbox', { name, exact: true }),
    button: (name) => consentBox().getByRole('button', { name, exact: true }),
    tool: (name) =>
      page.getByRole('navigation', { name: 'Kartans verktyg' }).getByRole('button', {
        name: name === 'Skriv till Skyttel' ? textViewButtonAccessibleName : name,
        exact: true,
      }),
    expanded: (control) => control.element().getAttribute('aria-expanded') === 'true',
    tick: (control) => control.click(),
    press: (control) => control.click(),
  });
