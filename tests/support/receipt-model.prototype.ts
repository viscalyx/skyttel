// Lokal Chat Completions-server. Följdsvaret läser enbart verktygsmeddelandet.
import { createServer } from 'node:http';
import type { SaveReceipt } from '../../src/shared/map.js';

export async function localReceiptModel(
  skipLookup = false,
  behavior?: 'text' | 'obey' | 'read' | 'call',
) {
  const choices: unknown[] = [];
  const receipts: (SaveReceipt | undefined)[] = [];
  const requested: string[] = [];
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end();
      return;
    }
    let input = '';
    for await (const chunk of request) input += chunk;
    const body = JSON.parse(input);
    choices.push(body.tool_choice ?? null);
    const messages = body.messages as { role: string; tool_call_id?: string; content?: string }[];
    const toolOutputs = messages.filter((message) => message.role === 'tool');
    const results = messages
      .filter((item) => item.role !== 'assistant')
      .flatMap((item) =>
        Array.isArray(item.content)
          ? item.content.map((block: { text?: string }) => block.text)
          : [item.content],
      );
    // Copilot kan lägga egen text före eller efter verktygets JSON.
    let receipt: SaveReceipt | undefined;
    for (const output of results) {
      if (typeof output !== 'string') continue;
      const start = output.indexOf('{"receipt":');
      const end = output.lastIndexOf('}');
      if (start >= 0 && end >= start) receipt = JSON.parse(output.slice(start, end + 1)).receipt;
    }
    receipts.push(receipt);
    const round = receipts.length;
    const missing =
      toolOutputs.some((item) => item.tool_call_id === 'call_spara_utkast') && !receipt;
    const receiptTool =
      round === 1
        ? 'spara_utkast'
        : missing &&
            !skipLookup &&
            !toolOutputs.some((item) => item.tool_call_id === 'call_kontrollera_sparandet')
          ? 'kontrollera_sparandet'
          : undefined;
    const forced = body.tool_choice?.function?.name === 'spara_utkast';
    const reminded = messages.some(
      (m) => m.role === 'user' && JSON.stringify(m.content).includes('Anropa spara_utkast'),
    );
    const name =
      behavior === undefined
        ? receiptTool
        : behavior === 'call' && round === 1
          ? 'spara_utkast'
          : behavior === 'obey' && !receipt && (forced || reminded)
            ? 'spara_utkast'
            : undefined;
    if (name) requested.push(name);
    const followup = messages.some(
      (item) => item.role === 'user' && JSON.stringify(item.content).includes('Vilket kvitto'),
    );
    const message = name
      ? {
          tool_calls: [
            { index: 0, id: 'call_' + name, type: 'function', function: { name, arguments: '{}' } },
          ],
        }
      : {
          content:
            behavior === 'read'
              ? 'Cykeln finns i utkastet.'
              : !receipt
                ? 'Modellen påstår att cykeln är sparad utan kvitto.'
                : !followup
                  ? 'Sparandet är bekräftat.'
                  : receipt.operationId +
                    ' ' +
                    receipt.changes.map((change) => change.after?.name).join(', '),
        };
    const finish = name ? 'tool_calls' : 'stop';
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
    requested,
    choices,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
