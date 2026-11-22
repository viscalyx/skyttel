// Kastbart prov. Den lokala modellen får bara samtalets meddelanden och resultatet
// från Skyttels riktiga kartverktyg. Inga utkastuppgifter läggs in i frågorna.
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import type { WorkResponse } from './cart-tool-copilot.prototype.js';

type Turn = {
  conversationId: string;
  prompt: string;
  signal: AbortSignal;
  readDraft: (callId: string) => Promise<string>;
  reply: (text: string) => Promise<void>;
};

const draftTool = 'read_my_draft';
const model = 'gpt-6.1-terra';
const openAIEndpoint = 'https://api.openai.com/v1/responses';
type ModelInput = { role: string; content?: unknown; tool_call_id?: string };
type DraftResult = { changes: { after?: { name: string } | null }[] };

export let runVoiceTextPrototype: ((turn: Turn) => Promise<void>) | undefined;

export function prototypeResponse(output: WorkResponse['output']): WorkResponse {
  return {
    id: randomUUID(),
    created_at: 1,
    object: 'response',
    model,
    status: 'completed',
    output,
    output_text: output
      .flatMap((item) =>
        item.type === 'message'
          ? item.content.flatMap((part) => (part.type === 'output_text' ? [part.text] : []))
          : [],
      )
      .join(''),
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    access_programs: null,
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: 'auto',
    tools: [],
    top_p: null,
  };
}

export async function openVoiceTextPrototype(conversationId: string, realApiKey?: string) {
  const evidence = {
    sdkSessionIds: [] as string[],
    serverToolReads: 0,
    verifiedName: undefined as string | undefined,
    textToolName: undefined as string | undefined,
    textToolCallId: undefined as string | undefined,
    toolCallId: undefined as string | undefined,
    modelRounds: 0,
    openAIStatuses: [] as number[],
    textPreviousResponseId: undefined as string | undefined,
  };
  let active: Turn | undefined;
  let verifiedOutput: string | undefined;

  const server = createServer(async (request, reply) => {
    const path = realApiKey ? '/v1/responses' : '/v1/chat/completions';
    if (request.method !== 'POST' || request.url !== path) {
      reply.writeHead(404).end();
      return;
    }
    let input = '';
    for await (const chunk of request) input += chunk;
    const round = ++evidence.modelRounds;
    if (realApiKey) {
      if (round > 3) {
        reply.writeHead(400).end('Provet tillåter högst tre modellomgångar.');
        return;
      }
      const body = JSON.parse(input);
      if (round === 3) {
        evidence.textPreviousResponseId = body.previous_response_id;
        const result =
          Array.isArray(body.input) &&
          body.input.find(
            (item: { type?: string; call_id?: string; output?: unknown }) =>
              item.type === 'function_call_output' &&
              item.call_id === evidence.toolCallId &&
              verifiedOutput &&
              JSON.stringify(item.output).includes(JSON.stringify(verifiedOutput).slice(1, -1)),
          );
        if (result) {
          evidence.textToolName = evidence.verifiedName;
          evidence.textToolCallId = result.call_id;
        }
      }
      try {
        const response = await fetch(openAIEndpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${realApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ...body, store: false, max_output_tokens: 2048 }),
          signal: AbortSignal.timeout(60_000),
        });
        evidence.openAIStatuses.push(response.status);
        reply.writeHead(response.status, {
          'content-type': response.headers.get('content-type') ?? 'application/json',
        });
        const stream = response.body?.getReader();
        if (stream) {
          for (let part = await stream.read(); !part.done; part = await stream.read())
            reply.write(part.value);
        }
        reply.end();
      } catch {
        if (reply.headersSent) reply.destroy();
        else reply.writeHead(502).end('Anropet till OpenAI kunde inte slutföras.');
      }
      return;
    }
    const body: { model: string; stream?: boolean; messages: ModelInput[] } = JSON.parse(input);
    const toolResult = body.messages.find(
      (item) => item.role === 'tool' && item.tool_call_id === evidence.toolCallId,
    );
    const receivedVerifiedOutput = Boolean(
      toolResult && verifiedOutput && String(toolResult.content).includes(verifiedOutput),
    );
    if (round === 3 && receivedVerifiedOutput) {
      evidence.textToolName = evidence.verifiedName;
      evidence.textToolCallId = toolResult?.tool_call_id;
    }
    const voiceIntro = 'I ditt utkast finns ett förslag.';
    const name = receivedVerifiedOutput ? evidence.verifiedName : undefined;
    const message =
      round === 1
        ? {
            tool_calls: [
              {
                index: 0,
                id: 'call_skyttel_voice_draft',
                type: 'function',
                function: { name: draftTool, arguments: '{}' },
              },
            ],
          }
        : {
            content: name
              ? round === 2
                ? `${voiceIntro} Förslaget gäller ${name}.`
                : `Objektet heter ${name}.`
              : 'Jag behöver läsa utkastet igen.',
          };
    const finish = round === 1 ? 'tool_calls' : 'stop';
    const completion = { id: `chatcmpl-sketch-${round}`, model: body.model, created: 1 };
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

  const directory = await mkdtemp(join(tmpdir(), 'skyttel-voice-text-prototype-'));
  const client = new CopilotClient({
    mode: 'empty',
    runtime: RuntimeConnection.forInProcess({ baseDirectory: directory }),
    github: { useLoggedInUser: false },
    observability: { logLevel: 'none' },
  });
  async function close() {
    runVoiceTextPrototype = undefined;
    try {
      await client.stop();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  }
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Lokal modelladress saknas');
    const session = await client.createSession({
      model,
      github: { capi: { enabled: false }, telemetryEnabled: false },
      systemMessage: {
        mode: 'replace',
        content: [
          'Svara kort på svenska. Du arbetar med ett påhittat utkast i Skyttel.',
          'När användaren ber dig läsa utkastet, anropa read_my_draft exakt en gång.',
          'Börja sedan med meningen "I ditt utkast finns ett förslag."',
          'Ange objektets namn från verktygsresultatet i en separat mening.',
          'Vid uppföljningsfrågan ska du svara från det tidigare verktygsresultatet.',
          'Gör inget nytt verktygsanrop då. Gissa aldrig ett namn.',
        ].join(' '),
      },
      inference: {
        allowMultipleToolCalls: false,
        defaultProvider: 'local',
        providers: [
          {
            name: 'local',
            type: 'openai',
            baseUrl: `http://127.0.0.1:${address.port}/v1`,
            apiKey: 'synthetic-model-key',
            wireApi: realApiKey ? 'responses' : 'completions',
          },
        ],
      },
      state: { infiniteSessions: { enabled: false } },
      permissions: {
        onRequest: (request) =>
          request.kind === 'custom-tool' && request.toolName === draftTool
            ? { kind: 'approved' }
            : { kind: 'denied-by-rules', rules: [] },
      },
      tools: {
        availableTools: [`custom:${draftTool}`],
        definitions: [
          defineTool(draftTool, {
            description: 'Läs det aktuella utkastet i Skyttel.',
            parameters: { type: 'object', properties: {}, additionalProperties: false },
            async handler(_args, invocation) {
              evidence.serverToolReads++;
              if (!active || evidence.serverToolReads !== 1)
                throw new Error('Oväntad utkastläsning');
              evidence.toolCallId = invocation.toolCallId;
              verifiedOutput = await active.readDraft(invocation.toolCallId);
              const draft: DraftResult = JSON.parse(verifiedOutput);
              evidence.verifiedName = draft.changes[0]?.after?.name;
              return verifiedOutput;
            },
          }),
        ],
      },
    });
    session.on('session.error', ({ data }) => console.error(data.errorType, data.statusCode));
    runVoiceTextPrototype = async (turn) => {
      if (turn.conversationId !== conversationId || active) throw new Error('Oväntat samtal');
      turn.signal.throwIfAborted();
      active = turn;
      evidence.sdkSessionIds.push(session.sessionId);
      const abort = () => void session.abort().catch(() => undefined);
      turn.signal.addEventListener('abort', abort, { once: true });
      try {
        const reply = await session.sendAndWait(turn.prompt, realApiKey ? 90_000 : 10_000);
        turn.signal.throwIfAborted();
        if (!reply?.data.content) throw new Error('Copilot lämnade inget svar');
        await turn.reply(reply.data.content);
      } finally {
        turn.signal.removeEventListener('abort', abort);
        active = undefined;
      }
    };
    return { evidence, close };
  } catch (error) {
    await close();
    throw error;
  }
}
