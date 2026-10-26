import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { TraceSending } from '../../src/client/TraceSending.js';
import { measureContrast } from '../support/accessibility.js';
import '../../src/client/styles.css';
import '../../src/client/settings.css';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

for (const theme of ['light', 'dark']) {
  test(`tracing controls retain contrast, focus and reflow in ${theme} settings`, {
    tags: ['technical'],
  }, async () => {
    await page.viewport(320, 844);
    vi.stubGlobal('fetch', async () =>
      Response.json({
        connected: true,
        enabled: true,
        state: 'suspended',
        suspension: 'quota',
        lastSuccessfulDelivery: null,
        droppedEvents: 2,
        lastError: 'oversized',
      }),
    );
    render(
      <div className="app-shell has-settings" data-theme={theme}>
        <main>
          <section className="settings-screen">
            <div className="settings-content">
              <TraceSending />
            </div>
          </section>
        </main>
      </div>,
    );
    await expect.element(page.getByRole('button', { name: 'Stäng av sändning' })).toBeVisible();
    const panel = page.getByRole('heading', { name: 'Diagnostik med LangSmith' }).element()
      .parentElement;
    if (!panel) throw new Error('Missing diagnostic panel');
    for (const element of panel.querySelectorAll('p, dt, dd, button')) {
      if (!element.textContent?.trim()) continue;
      expect(measureContrast(element), element.textContent).toBeGreaterThanOrEqual(4.5);
      const rectangle = element.getBoundingClientRect();
      expect(rectangle.right, element.textContent).toBeLessThanOrEqual(321);
      expect(rectangle.left, element.textContent).toBeGreaterThanOrEqual(0);
    }
    await userEvent.keyboard('{Tab}');
    const active = document.activeElement;
    if (!active) throw new Error('Missing focused control');
    expect(active.tagName).toBe('BUTTON');
    expect(getComputedStyle(active).outlineStyle).not.toBe('none');
    expect(measureContrast(active, 'outlineColor')).toBeGreaterThanOrEqual(3);
    await page.viewport(1280, 900);
    await expect
      .element(page.getByRole('button', { name: 'Starta om sändning efter kontroll' }))
      .toBeVisible();
  });
}
