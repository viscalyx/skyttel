import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useSaveToast } from '../../../src/client/use-save-toast.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test('a confirmed operation lasts three seconds and duplicate confirmation cannot replay or extend it', () => {
  vi.useFakeTimers();
  const toast = renderHook(useSaveToast);
  expect(toast.result.current.operationId).toBe('');
  act(() => toast.result.current.confirm('first-save'));
  act(() => vi.advanceTimersByTime(2999));
  expect(toast.result.current.operationId).toBe('first-save');
  act(() => toast.result.current.confirm('first-save'));
  act(() => vi.advanceTimersByTime(1));
  expect(toast.result.current.operationId).toBe('');
  act(() => toast.result.current.confirm('first-save'));
  expect(toast.result.current.operationId).toBe('');
  act(() => toast.result.current.confirm('second-save'));
  expect(toast.result.current.operationId).toBe('second-save');
  act(() => vi.advanceTimersByTime(3000));
  expect(toast.result.current.operationId).toBe('');
});

test('a later confirmed operation gets its own three seconds and unmount releases the timer', () => {
  vi.useFakeTimers();
  const toast = renderHook(useSaveToast);
  act(() => toast.result.current.confirm('first-save'));
  act(() => vi.advanceTimersByTime(2000));
  act(() => toast.result.current.confirm('second-save'));
  act(() => vi.advanceTimersByTime(1000));
  expect(toast.result.current.operationId).toBe('second-save');
  toast.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
