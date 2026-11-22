// Lokalt engångsprov med Copilot-motorn och styrda svar från 127.0.0.1.
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import type { Tool } from 'openai/resources/responses/responses';
import type { textModel } from './text-assistant-model.js';

export type WorkResponse = Pick<
  Awaited<ReturnType<ReturnType<typeof textModel>>>,
  'status' | 'output' | 'output_text' | 'usage'
>;
export type WorkRequest = {
  linkWork: (id: string) => void;
  tools: Tool[];
  respond: () => Promise<WorkResponse | undefined>;
};

export async function runCopilotCartToolPrototype(
  first: WorkRequest,
  acceptResponse: (response: WorkResponse) => Promise<IteratorResult<WorkRequest, void>>,
  readVerifiedOutput: (callId: string) => string | undefined,
  signal: AbortSignal,
  prompt: string,
  trace?: {
    fixture: WorkResponse;
    record: (id: string, outcome: 'started' | 'completed', data: Record<string, unknown>) => void;
  },
) {
  const submission = first.tools.find(
    (item) => item.type === 'function' && item.name === 'submit_changes',
  );
  if (submission?.type !== 'function' || !submission.parameters)
    throw new Error('Provet kräver submit_changes');

  // Återanvänd den styrda instruktionen från jämförelseprovet som testdata.
  const response = trace?.fixture ?? (await first.respond());
  const call = response?.output[0];
  if (
    response?.status !== 'completed' ||
    response.output.length !== 1 ||
    call?.type !== 'function_call' ||
    call.name !== submission.name
  )
    throw new Error('Det styrda svaret ska innehålla ett enda förslag');

  const args: unknown = JSON.parse(call.arguments);
  const model = 'gpt-6.1-terra';
  const finalText = 'Den lokala modellen har tagit emot verktygsresultatet.';
  let rounds = 0;
  const requestModels: unknown[] = [];
  let offeredTools: string[] = [];
  let returnedToModel = false;
  let accepted = false;
  let verifiedOutput: string | undefined;
  const server = createServer(async (request, reply) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      reply.writeHead(404).end();
      return;
    }
    let input = '';
    for await (const chunk of request) input += chunk;
    const body = JSON.parse(input);
    requestModels.push(body.model);
    rounds++;
    if (rounds === 1)
      offeredTools =
        body.tools?.map((tool: { function: { name: string } }) => tool.function.name) ?? [];
    else
      returnedToModel = Boolean(
        verifiedOutput &&
          JSON.stringify(body.messages).includes(JSON.stringify(verifiedOutput).slice(1, -1)),
      );

    const completion = {
      id: `chatcmpl-prototype-${rounds}`,
      model: body.model,
      created: 1,
    };
    const message =
      rounds === 1
        ? {
            tool_calls: [
              {
                index: 0,
                id: call.call_id,
                type: 'function',
                function: { name: call.name, arguments: call.arguments },
              },
            ],
          }
        : { content: finalText };
    const finish = rounds === 1 ? 'tool_calls' : 'stop';
    if (!body.stream) {
      reply.writeHead(200, { 'content-type': 'application/json' }).end(
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
    reply.writeHead(200, { 'content-type': 'text/event-stream' });
    for (const [delta, finishReason] of [
      [{ role: 'assistant' }, null],
      [message, null],
      [{}, finish],
    ]) {
      reply.write(
        `data: ${JSON.stringify({
          ...completion,
          object: 'chat.completion.chunk',
          choices: [{ index: 0, delta, finish_reason: finishReason }],
        })}\n\n`,
      );
    }
    reply.end('data: [DONE]\n\n');
  });

  const directory = await mkdtemp(join(tmpdir(), 'skyttel-copilot-prototype-'));
  const client = new CopilotClient({
    mode: 'empty',
    runtime: RuntimeConnection.forInProcess({ baseDirectory: directory }),
    github: { useLoggedInUser: false },
  });
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Lokal modelladress saknas');

    await using session = await client.createSession({
      model,
      github: { capi: { enabled: false }, telemetryEnabled: false },
      inference: {
        allowMultipleToolCalls: false,
        defaultProvider: 'local',
        providers: [
          {
            name: 'local',
            type: 'openai',
            baseUrl: `http://127.0.0.1:${address.port}/v1`,
            apiKey: 'synthetic-model-key',
            wireApi: 'completions',
          },
        ],
      },
      state: { infiniteSessions: { enabled: false } },
      permissions: {
        onRequest: (request) =>
          request.kind === 'custom-tool' && request.toolName === submission.name
            ? { kind: 'approved' }
            : { kind: 'denied-by-rules', rules: [] },
      },
      tools: {
        availableTools: [`custom:${submission.name}`],
        definitions: [
          defineTool(submission.name, {
            description: submission.description ?? '',
            parameters: submission.parameters,
            async handler(toolArgs, invocation) {
              if (trace && invocation.toolCallId !== call.call_id)
                throw new Error('Fel anrops-id i verktyget');
              signal.throwIfAborted();
              if (accepted || !isDeepStrictEqual(toolArgs, args))
                throw new Error('Copilot lämnade ett oväntat verktygsanrop');
              accepted = true;
              const validated = await acceptResponse(response);
              verifiedOutput = readVerifiedOutput(call.call_id);
              if (!validated.done || !verifiedOutput)
                throw new Error('Servern lämnade inget slutligt verifierat resultat');
              return verifiedOutput;
            },
          }),
        ],
      },
    });
    if (trace) {
      const spans = new Map<string, string>();
      session.on('assistant.turn_start', ({ id, data }) => {
        spans.set(data.turnId, id);
        trace.record(id, 'started', { model: data.model ?? model, completeness: 'unknown' });
      });
      session.on('assistant.message', ({ data }) => {
        const span = data.turnId && spans.get(data.turnId);
        if (!span) return;
        const output = [
          ...(data.toolRequests ?? []).map((request) => ({
            type: 'function_call',
            call_id: request.toolCallId,
            name: request.name,
            arguments: JSON.stringify(request.arguments),
          })),
          ...(data.content ? [{ type: 'message', role: 'assistant', content: data.content }] : []),
        ];
        trace.record(span, 'completed', {
          model: data.model ?? model,
          responseId: data.apiCallId,
          completeness: 'partial',
          output: { output },
        });
      });
    }
    session.on('session.error', (event) => console.error(event.data));
    const stop = () => {
      void session.abort().catch(() => undefined);
    };
    signal.addEventListener('abort', stop, { once: true });
    try {
      signal.throwIfAborted();
      const reply = await session.sendAndWait(prompt, 10_000);
      const evidence = {
        erbjudnaVerktyg: offeredTools,
        modellomgångar: rounds,
        modellnamnIAnropen: requestModels,
        verifieratResultatIModellen: returnedToModel,
      };
      if (requestModels.some((requestModel) => requestModel !== model))
        throw new Error(`Oväntat modellnamn i Copilot-provet. ${JSON.stringify(evidence)}`);
      if (reply?.data.content !== finalText || !returnedToModel || rounds !== 2)
        throw new Error(`Oväntad följd av Copilot-anrop. ${JSON.stringify(evidence)}`);
      return evidence;
    } finally {
      signal.removeEventListener('abort', stop);
    }
  } finally {
    await client.stop();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}
