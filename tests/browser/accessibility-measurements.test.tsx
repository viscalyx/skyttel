import { afterEach, beforeEach, expect, test } from 'vitest';
import { measureContrast } from '../support/accessibility.js';

let fixture: HTMLIFrameElement;
beforeEach(() => {
  // Match page.setContent's fresh document, including transparent body/html ancestors.
  fixture = document.createElement('iframe');
  document.body.append(fixture);
});
afterEach(() => fixture.remove());

function measuredText(markup: string, selector = 'p') {
  const body = fixture.contentDocument?.body;
  if (!body) throw new Error('The measurement fixture needs a document');
  body.innerHTML = markup;
  const text = body.querySelector(selector);
  if (!text) throw new Error('The measurement fixture needs text');
  return text;
}

// Test infrastructure: these checks exercise the measurement, not an application workflow.
for (const color of ['rgb(0, 0, 0)', 'color(srgb 0 0 0)', 'oklch(0% 0 0)']) {
  test(`contrast measures black on white expressed as ${color}`, { tags: ['technical'] }, () => {
    const text = measuredText(`<p style="color:${color};background:white">Measured text</p>`);
    expect(measureContrast(text)).toBeCloseTo(21, 5);
  });
}

test('contrast measures an opaque color mix through a transparent descendant', {
  tags: ['technical'],
}, () => {
  const text = measuredText(
    '<p style="color:black;background:color-mix(in srgb, black 50%, white)">' +
      '<span style="background:color(srgb 1 0 0 / 0)">Measured text</span></p>',
    'span',
  );
  expect(measureContrast(text)).toBeCloseTo(5.317, 2);
});

test('contrast rejects translucent colors instead of reporting an opaque contrast', {
  tags: ['technical'],
}, () => {
  const text = measuredText('<p style="color:black;background:rgb(255 255 255 / 50%)">Text</p>');
  expect(() => measureContrast(text)).toThrow('Expected an opaque color');
});

test('contrast rejects text without an opaque surface', { tags: ['technical'] }, () => {
  const text = measuredText('<p>Text</p>');
  expect(() => measureContrast(text)).toThrow('The text has no surface behind it');
});
