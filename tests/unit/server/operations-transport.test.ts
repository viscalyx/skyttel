import { once } from 'node:events';
import { connect } from 'node:net';
import { expect, test } from '../../support/http-test.js';
import { createInstallation } from '../../support/installation.js';

for (const action of ['restart', 'close'] as const) {
  test(`installation ${action} releases a browser preconnection without an HTTP request`, async ({
    request,
  }) => {
    const installation = await createInstallation();
    const socket = connect(Number(new URL(installation.origin).port), '127.0.0.1');
    await once(socket, 'connect');
    const stopped = installation[action]();
    try {
      await expect.poll(() => socket.destroyed).toBe(true);
      await stopped;
      if (action === 'restart')
        expect((await request.get(`${installation.origin}/healthz`)).status()).toBe(200);
    } finally {
      socket.destroy();
      await stopped;
      if (action === 'restart') await installation.close();
    }
  });
}

test('installation restart drains an admitted HTTP response before closing its connections', async ({
  request,
}) => {
  let entered!: () => void;
  const admitted = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let release!: () => void;
  const delivery = new Promise<void>((resolve) => {
    release = resolve;
  });
  const installation = await createInstallation(undefined, {
    deliverResponse: async (request, response) => {
      if (new URL(request.url).pathname === '/healthz') {
        entered();
        await delivery;
      }
      return response;
    },
  });
  const socket = connect(Number(new URL(installation.origin).port), '127.0.0.1');
  let stopped: Promise<void> | undefined;
  try {
    await once(socket, 'connect');
    const preconnectionClosed = once(socket, 'close');
    const response = request.get(`${installation.origin}/healthz`).then(
      (response) => ({ response }),
      (error: unknown) => ({ error }),
    );
    await admitted;
    stopped = installation.restart();
    // Closing the unused connection proves shutdown has started while the
    // admitted response is still deliberately held at the delivery boundary.
    await preconnectionClosed;
    release();
    const result = await response;
    if ('error' in result) throw result.error;
    expect(result.response.status()).toBe(200);
    await stopped;
  } finally {
    release();
    socket.destroy();
    await stopped;
    await installation.close();
  }
});
