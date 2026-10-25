import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePersonalView } from '../../../src/client/use-personal-view.js';
import { defaultViewSettings, type PersonalView } from '../../../src/shared/personal-view.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function openView() {
  vi.useFakeTimers();
  let view: PersonalView = {
    contentVersion: 1,
    positions: [],
    settings: { ...defaultViewSettings, version: 0 },
  };
  let write: ((body: Record<string, unknown>) => Promise<Response>) | undefined;
  let read: (() => Promise<Response>) | undefined;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (url.endsWith('/view')) return read ? read() : Response.json(view);
    const body = JSON.parse(init?.body as string);
    if (write) return write(body);
    if (url.endsWith('/position')) {
      const position = { ...body.position, id: body.id, version: body.version + 1 };
      view = { ...view, positions: [position] };
      return Response.json(position);
    }
    view = { ...view, settings: { ...body.settings, version: body.version + 1 } };
    return Response.json(view.settings);
  });
  const onAccessLost = vi.fn();
  const hook = renderHook(({ path }) => usePersonalView(path, onAccessLost), {
    initialProps: { path: '/map' },
  });
  await act(async () => {});
  expect(hook.result.current.view).not.toBeNull();
  return {
    ...hook,
    write(response: (body: Record<string, unknown>) => Promise<Response>) {
      write = response;
    },
    saved(next: PersonalView) {
      view = next;
    },
    read(response: () => Promise<Response>) {
      read = response;
    },
    onAccessLost,
  };
}

test('successive moves stay local while older confirmations cannot report the newer position saved', async () => {
  const hook = await openView();
  const replies: ((response: Response) => void)[] = [];
  const bodies: Record<string, unknown>[] = [];
  hook.write((body) => {
    bodies.push(body);
    return new Promise<Response>((resolve) => replies.push(resolve));
  });
  let saving: Promise<void> | undefined;
  act(() => {
    saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
    void hook.result.current.move('lamp', { x: 4, y: 5, z: 6 });
  });
  expect(hook.result.current.view?.positions).toEqual([
    { id: 'lamp', x: 4, y: 5, z: 6, version: 0 },
  ]);
  await act(async () => {
    replies[0](Response.json({ id: 'lamp', x: 1, y: 2, z: 3, version: 1 }));
  });
  expect(hook.result.current.view?.positions).toEqual([
    { id: 'lamp', x: 4, y: 5, z: 6, version: 1 },
  ]);
  expect(hook.result.current.message).toBe('Din personliga vy sparas…');
  expect(hook.result.current.toast).toBeUndefined();
  expect(bodies[1]).toEqual({
    id: 'lamp',
    position: { x: 4, y: 5, z: 6 },
    version: 1,
    contentVersion: 1,
  });
  await act(async () => {
    replies[1](Response.json({ id: 'lamp', x: 4, y: 5, z: 6, version: 2 }));
    await saving;
  });
  expect(hook.result.current.view?.positions).toEqual([
    { id: 'lamp', x: 4, y: 5, z: 6, version: 2 },
  ]);
  expect(hook.result.current.message).toBe('Din personliga vy är sparad.');
});

test('a same-object conflict saves the latest whole local position without changing unrelated positions', async () => {
  const hook = await openView();
  hook.saved({
    contentVersion: 1,
    positions: [
      { id: 'lamp', x: 90, y: 80, z: 70, version: 4 },
      { id: 'bike', x: 20, y: 30, z: 40, version: 2 },
    ],
    settings: { ...defaultViewSettings, version: 0 },
  });
  let release!: (response: Response) => void;
  let conflict = true;
  const bodies: Record<string, unknown>[] = [];
  hook.write(async (body) => {
    bodies.push(body);
    if (conflict) {
      conflict = false;
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    }
    return Response.json({ id: body.id, ...(body.position as object), version: 5 });
  });
  let saving: Promise<void> | undefined;
  act(() => {
    saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
    void hook.result.current.move('lamp', { x: 7, y: 8, z: 9 });
  });
  await act(async () => {
    release(Response.json({ error: 'position_conflict' }, { status: 409 }));
    await saving;
  });
  expect(bodies[1]).toEqual({
    id: 'lamp',
    position: { x: 7, y: 8, z: 9 },
    version: 4,
    contentVersion: 1,
  });
  expect(hook.result.current.view?.positions).toEqual(
    expect.arrayContaining([
      { id: 'lamp', x: 7, y: 8, z: 9, version: 5 },
      { id: 'bike', x: 20, y: 30, z: 40, version: 2 },
    ]),
  );
  expect(hook.result.current.message).toBe('Din personliga vy är sparad.');
});

test('a newer local move survives an older failure and independent unsaved objects remain intact', async () => {
  const hook = await openView();
  const replies = new Map<string, ((response: Response) => void)[]>();
  hook.write(
    (body) =>
      new Promise<Response>((resolve) => {
        const id = body.id as string;
        replies.set(id, [...(replies.get(id) ?? []), resolve]);
      }),
  );
  let lamp: Promise<void> | undefined;
  let bike: Promise<void> | undefined;
  act(() => {
    lamp = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
    bike = hook.result.current.move('bike', { x: 20, y: 30, z: 40 });
    void hook.result.current.move('lamp', { x: 7, y: 8, z: 9 });
  });
  await act(async () => {
    replies.get('lamp')?.[0](Response.json({ error: 'internal_error' }, { status: 500 }));
    replies.get('bike')?.[0](Response.json({ error: 'internal_error' }, { status: 500 }));
    await bike;
  });
  expect(hook.result.current.view?.positions).toEqual(
    expect.arrayContaining([
      { id: 'lamp', x: 7, y: 8, z: 9, version: 0 },
      { id: 'bike', x: 20, y: 30, z: 40, version: 0 },
    ]),
  );
  expect(hook.result.current.toast).toBeUndefined();
  expect(hook.result.current.pending).toBe(true);
  await act(async () => {
    replies.get('lamp')?.[1](Response.json({ id: 'lamp', x: 7, y: 8, z: 9, version: 1 }));
    await lamp;
  });
  expect(hook.result.current.message).toBe('Positionen är inte sparad');
  expect(hook.result.current.pending).toBe(false);
  expect(hook.result.current.view?.positions.find(({ id }) => id === 'bike')).toEqual({
    id: 'bike',
    x: 20,
    y: 30,
    z: 40,
    version: 0,
  });
});

test.each(['position_conflict', 'content_conflict'])(
  '%s cannot replay a local position into replacement household content',
  async (error) => {
    const hook = await openView();
    hook.saved({
      contentVersion: 2,
      positions: [],
      settings: { ...defaultViewSettings, version: 0 },
    });
    const write = vi.fn(async () => Response.json({ error }, { status: 409 }));
    hook.write(write);
    await act(async () => {
      await hook.result.current.move('lamp', { x: 7, y: 8, z: 9 });
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(hook.result.current.view).toBeNull();
    expect(hook.result.current.pending).toBe(false);
    expect(hook.result.current.message).toContain('innehåll');
    act(() => {
      void hook.result.current.move('lamp', { x: 10, y: 20, z: 30 });
    });
    expect(write).toHaveBeenCalledTimes(1);
  },
);

test.each([401, 403])(
  'a %s position denial clears personal content and invokes access loss',
  async (status) => {
    const hook = await openView();
    hook.write(async () => Response.json({ error: 'forbidden' }, { status }));
    await act(async () => {
      await hook.result.current.move('lamp', { x: 7, y: 8, z: 9 });
    });
    expect(hook.result.current.view).toBeNull();
    expect(hook.onAccessLost).toHaveBeenCalledOnce();
  },
);

test.each(['success', 'failure'])(
  'late %s from a previous household cannot change the newly opened view',
  async (outcome) => {
    const hook = await openView();
    let release!: (response: Response) => void;
    hook.write(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    let saving: Promise<void> | undefined;
    act(() => {
      saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
    });
    hook.saved({
      contentVersion: 4,
      positions: [{ id: 'lamp', x: 20, y: 30, z: 40, version: 8 }],
      settings: { ...defaultViewSettings, version: 2 },
    });
    await act(async () => {
      hook.rerender({ path: '/another-household/map' });
    });
    await act(async () => {
      release(
        outcome === 'success'
          ? Response.json({ id: 'lamp', x: 1, y: 2, z: 3, version: 1 })
          : Response.json({ error: 'forbidden' }, { status: 403 }),
      );
      await saving;
    });
    expect(hook.result.current.view?.positions).toEqual([
      { id: 'lamp', x: 20, y: 30, z: 40, version: 8 },
    ]);
    expect(hook.result.current.message).toBe('');
    expect(hook.result.current.pending).toBe(false);
    expect(hook.onAccessLost).not.toHaveBeenCalled();
  },
);

test('an object removed during conflict handling cannot be retried while another object stays local', async () => {
  const hook = await openView();
  hook.write(async (body) =>
    Response.json(
      { error: body.id === 'lamp' ? 'object_unavailable' : 'internal_error' },
      { status: body.id === 'lamp' ? 400 : 500 },
    ),
  );
  await act(async () => {
    await Promise.all([
      hook.result.current.move('lamp', { x: 1, y: 2, z: 3 }),
      hook.result.current.move('bike', { x: 7, y: 8, z: 9 }),
    ]);
  });
  expect(hook.result.current.view?.positions).toEqual([
    { id: 'bike', x: 7, y: 8, z: 9, version: 0 },
  ]);
  expect(hook.result.current.toast).toBeUndefined();
});

test('a delayed conflict read preserves a different object whose newer save has already completed', async () => {
  const hook = await openView();
  let releaseRead!: (response: Response) => void;
  hook.read(
    () =>
      new Promise<Response>((resolve) => {
        releaseRead = resolve;
      }),
  );
  let conflict = true;
  hook.write(async (body) => {
    if (body.id === 'lamp' && conflict) {
      conflict = false;
      return Response.json({ error: 'position_conflict' }, { status: 409 });
    }
    return Response.json({
      id: body.id,
      ...(body.position as object),
      version: body.id === 'bike' ? 1 : 5,
    });
  });
  let saving: Promise<void> | undefined;
  await act(async () => {
    saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  await act(async () => {
    await hook.result.current.move('bike', { x: 7, y: 8, z: 9 });
  });
  await act(async () => {
    releaseRead(
      Response.json({
        contentVersion: 1,
        positions: [{ id: 'lamp', x: 20, y: 30, z: 40, version: 4 }],
        settings: { ...defaultViewSettings, version: 0 },
      }),
    );
    await saving;
  });
  expect(hook.result.current.view?.positions).toEqual(
    expect.arrayContaining([
      { id: 'lamp', x: 1, y: 2, z: 3, version: 5 },
      { id: 'bike', x: 7, y: 8, z: 9, version: 1 },
    ]),
  );
});

test('refreshing replacement content invalidates a late success from the prior content', async () => {
  const hook = await openView();
  let release!: (response: Response) => void;
  hook.write(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  let saving: Promise<void> | undefined;
  act(() => {
    saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  hook.saved({
    contentVersion: 2,
    positions: [],
    settings: { ...defaultViewSettings, version: 0 },
  });
  await act(async () => {
    await hook.result.current.refresh();
  });
  await act(async () => {
    release(Response.json({ id: 'lamp', x: 1, y: 2, z: 3, version: 1 }));
    await saving;
  });
  expect(hook.result.current.view?.contentVersion).toBe(2);
  expect(hook.result.current.view?.positions).toEqual([]);
  expect(hook.result.current.message).toBe('Aktuell personlig vy är inläst.');
  expect(hook.result.current.pending).toBe(false);
});

test('personal success feedback starts after confirmation and expires after exactly three seconds', async () => {
  const hook = await openView();
  let release!: (response: Response) => void;
  hook.write(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  let saving: Promise<void> | undefined;
  act(() => {
    saving = hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  act(() => vi.advanceTimersByTime(5000));
  expect(hook.result.current.message).toBe('Din personliga vy sparas…');
  expect(hook.result.current.pending).toBe(true);
  expect(hook.result.current.toast).toBeUndefined();
  await act(async () => {
    release(Response.json({ id: 'lamp', x: 1, y: 2, z: 3, version: 1 }));
    await saving;
  });
  expect(hook.result.current.toast).toBe(true);
  expect(hook.result.current.message).toBe('Din personliga vy är sparad.');
  act(() => vi.advanceTimersByTime(2999));
  expect(hook.result.current.message).toBe('Din personliga vy är sparad.');
  act(() => vi.advanceTimersByTime(1));
  expect(hook.result.current.message).toBe('');
  expect(hook.result.current.view?.positions).toHaveLength(1);
});

test('a repeated save gets a fresh announcement and three seconds from the latest confirmation', async () => {
  const hook = await openView();
  await act(async () => {
    await hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  const first = hook.result.current.messageId;
  act(() => vi.advanceTimersByTime(2000));
  await act(async () => {
    await hook.result.current.configure({ ...defaultViewSettings, allLabels: true });
  });
  expect(hook.result.current.messageId).not.toBe(first);
  act(() => vi.advanceTimersByTime(1000));
  expect(hook.result.current.message).toBe('Din personliga vy är sparad.');
  act(() => vi.advanceTimersByTime(2000));
  expect(hook.result.current.message).toBe('');
  expect(hook.result.current.view?.settings.allLabels).toBe(true);
});

test('an old save timer cannot clear a later conflict or explicit reload feedback', async () => {
  const hook = await openView();
  await act(async () => {
    await hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  hook.write(async () => Response.json({ error: 'view_settings_conflict' }, { status: 409 }));
  await act(async () => {
    await hook.result.current.configure({ ...defaultViewSettings, allLabels: true });
  });
  expect(hook.result.current.message).toContain('Din äldre ändring sparades inte');
  expect(hook.result.current.toast).toBeUndefined();
  act(() => vi.advanceTimersByTime(6000));
  expect(hook.result.current.message).toContain('Din äldre ändring sparades inte');
  await act(async () => {
    await hook.result.current.refresh();
  });
  act(() => vi.advanceTimersByTime(6000));
  expect(hook.result.current.message).toBe('Aktuell personlig vy är inläst.');
});

test('unmount cancels the toast timer', async () => {
  const hook = await openView();
  await act(async () => {
    await hook.result.current.move('lamp', { x: 1, y: 2, z: 3 });
  });
  hook.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
