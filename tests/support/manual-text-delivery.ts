/** Persistent, development-only browser delivery control; the server is unchanged. */
export const manualTextDeliverySource = `(() => {
  const original = window.fetch.bind(window);
  let armed;
  let result = { phase: 'idle' };
  window.skyttelTextDelivery = {
    arm() {
      if (armed || result.phase === 'waiting') throw Error('Finish the previous delivery first');
      armed = true;
      result = { phase: 'armed' };
    },
    status: () => ({ ...result }),
    clear() {
      if (result.phase === 'waiting') throw Error('Wait for a completed transaction first');
      armed = undefined;
      result = { phase: 'idle' };
    },
  };
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const selected = armed && request.method === 'POST' &&
      /^\\/api\\/households\\/[^/]+\\/text-assistant\\/[^/]+\\/messages$/.test(url.pathname);
    if (!selected) return original(input, init);
    armed = undefined;
    result = { phase: 'waiting' };
    const path = url.pathname.replace(/\\/text-assistant\\/[^/]+\\/messages$/, '/map/operations');
    const baseline = await original(path);
    if (!baseline.ok) throw Error('Unable to read the initial save operations');
    const previous = new Set((await baseline.json()).operations.map(item => item.operationId));
    const response = await original(input, init);
    if (response.status !== 202) {
      result = { phase: 'not-accepted', status: response.status };
      return response;
    }
    for (let check = 0; check < 600; check++) {
      const read = await original(path);
      if (!read.ok) throw Error('Unable to read the actual save outcome');
      const operations = (await read.json()).operations;
      const added = operations.filter(item => !previous.has(item.operationId));
      if (added.length > 1) throw Error('Ambiguous native save operations: keep the test isolated');
      const operation = added[0];
      const operationId = operation?.operationId;
      if (operation?.status === 'succeeded') {
        result = { phase: 'dropped-after-commit', operationId, status: response.status };
        throw new TypeError('Controlled lost text reply after committed save');
      }
      if (operation?.status === 'rejected') {
        result = { phase: 'rejected', operationId };
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    result = { phase: 'not-completed' };
    throw Error('No completed save: do not report an applied lost reply');
  };
})();`;
