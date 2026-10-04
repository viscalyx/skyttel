import { page } from 'vitest/browser';

export async function closePanels() {
  if (window.innerWidth <= 700) {
    const closeText = document.querySelector<HTMLButtonElement>(
      '.text-view:not([hidden]) button[aria-label="Stäng textvyn"]',
    );
    if (closeText) await page.elementLocator(closeText).click();
  }
  for (;;) {
    const close = document.querySelector<HTMLButtonElement>(
      '.workspace-window[data-active="true"]:not([hidden]) .workspace-window-close',
    );
    if (!close) return;
    await page.elementLocator(close).click();
  }
}

export async function activatePanel(title: string) {
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  if (title !== 'Lista och utkast')
    await page.getByRole('button', { name: `Uppgifter för ${title}`, exact: true }).click();
}
