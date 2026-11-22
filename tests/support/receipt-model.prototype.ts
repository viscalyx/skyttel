// Lokal Chat Completions-server. Följdsvaret läser enbart verktygsmeddelandet.
import { createServer } from 'node:http';
import type { SaveReceipt } from '../../src/shared/map.js';

export async function localReceiptModel() {
  const receipts: (SaveReceipt | undefined)[] = [];
  const callId = 'call_spara_utkast';
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end();
      return;
    }
    let input = '';
    for await (const chunk of request) input += chunk;
    const body = JSON.parse(input);
    const output = body.messages.find(
      (item: { role: string; tool_call_id?: string }) =>
        item.role === 'tool' && item.tool_call_id === callId,
    )?.content;
    // Copilot kan lägga egen text före eller efter verktygets JSON.
    let receipt: SaveReceipt | undefined;
    if (typeof output === 'string') {
      const start = output.indexOf('{"receipt":');
      const end = output.lastIndexOf('}');
      if (start >= 0 && end >= start) receipt = JSON.parse(output.slice(start, end + 1)).receipt;
    }
    receipts.push(receipt);
    const round = receipts.length;
    const message =
      round === 1
        ? {
            tool_calls: [
              {
                index: 0,
                id: callId,
                type: 'function',
                function: { name: 'spara_utkast', arguments: '{}' },
              },
            ],
          }
        : {
            content: !receipt
              ? 'Underlag saknas.'
              : round === 2
                ? 'Sparandet är bekräftat.'
                : receipt.operationId +
                  ' ' +
                  receipt.changes.map((change) => change.after?.name).join(', '),
          };
    const finish = round === 1 ? 'tool_calls' : 'stop';
    const completion = { id: 'chatcmpl-prov-' + round, model: body.model, created: 1 };
    if (!body.stream) {
      response.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          ...completion,
          object: 'chat.completion',
          choices: [
            { index: 0, message: { role: 'assistant', ...message }, finish_reason: finish },
          ],
        }),
      );
      return;
    }
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    for (const [delta, finish_reason] of [
      [{ role: 'assistant' }, null],
      [message, null],
      [{}, finish],
    ]) {
      response.write(
        'data: ' +
          JSON.stringify({
            ...completion,
            object: 'chat.completion.chunk',
            choices: [{ index: 0, delta, finish_reason }],
          }) +
          '\n\n',
      );
    }
    response.end('data: [DONE]\n\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Den lokala modellservern saknar port');
  return {
    port: String(address.port),
    receipts,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
