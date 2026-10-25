import { expect, test } from 'vitest';
import { zeroReference } from '../../../src/client/zero-reference.js';
import { defaultViewSettings } from '../../../src/shared/personal-view.js';

test('reference sizing starts fixed on activation and follows subsequent zoom distance', () => {
  const reference = zeroReference(defaultViewSettings, 'dark');
  try {
    reference.updateSize(false, 30);
    expect(reference.group.scale.x).toBe(1);
    reference.updateSize(true, 60);
    expect(reference.group.scale.x).toBe(1);
    reference.updateSize(true, 120);
    expect(reference.group.scale.x).toBe(2);
    reference.updateSize(true, 30);
    expect(reference.group.scale.x).toBe(0.5);
  } finally {
    reference.dispose();
  }
});

test('changing reference choices preserves the current visit sizing baseline', () => {
  const reference = zeroReference(defaultViewSettings, 'dark');
  try {
    reference.updateSize(true, 30);
    reference.updateSize(true, 60);
    for (const zeroReferenceVariant of ['square', 'oval', 'circle', 'lines'] as const)
      for (const zeroReferenceWeight of ['subtle', 'original', 'prominent'] as const) {
        reference.configure({ zeroReferenceVariant, zeroReferenceWeight }, 'light');
        reference.updateSize(true, 60);
        expect(reference.group.scale.x).toBe(2);
        expect(reference.group.scale.y).toBe(2);
        expect(reference.group.scale.z).toBe(2);
      }
    reference.updateSize(true, 90);
    expect(reference.group.scale.x).toBe(3);
  } finally {
    reference.dispose();
  }
});

test('unchanged zoom distance preserves sizing and disabling restores the fixed extents', () => {
  const reference = zeroReference(defaultViewSettings, 'dark');
  try {
    reference.updateSize(true, 40);
    reference.updateSize(true, 100);
    expect(reference.group.scale.x).toBe(2.5);
    expect(reference.updateSize(true, 100)).toBe(false);
    expect(reference.group.scale.x).toBe(2.5);
    reference.updateSize(false, 100);
    expect(reference.group.scale.x).toBe(1);
    reference.updateSize(false, 200);
    expect(reference.group.scale.x).toBe(1);
    reference.updateSize(true, 200);
    expect(reference.group.scale.x).toBe(1);
    reference.updateSize(true, 100);
    expect(reference.group.scale.x).toBe(0.5);
  } finally {
    reference.dispose();
  }
});

test('retained and new visits begin at approved extents rather than carrying an earlier scale', () => {
  const first = zeroReference(defaultViewSettings, 'dark');
  first.updateSize(true, 30);
  first.updateSize(true, 120);
  expect(first.group.scale.x).toBe(4);
  first.updateSize(false, 120);
  first.updateSize(true, 120);
  expect(first.group.scale.x).toBe(1);
  first.dispose();
  const reopened = zeroReference(defaultViewSettings, 'dark');
  try {
    reopened.updateSize(true, 120);
    expect(reopened.group.scale.x).toBe(1);
    reopened.updateSize(true, 60);
    expect(reopened.group.scale.x).toBe(0.5);
  } finally {
    reopened.dispose();
  }
});
