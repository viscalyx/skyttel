// Engångsprov för en ändring av utkastet och en följdfråga.
import { AsyncResource } from 'node:async_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import { Agent, MemorySession, OpenAIResponsesModel, Runner, tool } from '@openai/agents';
import OpenAI from 'openai';
import { z } from 'zod';

const model = 'gpt-6.1-terra';
const baseURL = 'https://api.openai.com/v1';
const name = 'lagg_till_objekt';
const description =
  'Lägg till namngivna objekt av angiven typ i utkastet i ett enda anrop. Verktyget returnerar verifierade namn, id och version efter ändringen.';
const instructions =
  'Du hjälper användaren med hushållets karta på svenska. Använd verktyget för en begärd ändring. Bekräfta bara det verktyget verifierar. Besvara följdfrågor från resultatet i samtalet. Ändra bara utkastet när användaren uttryckligen ber om det.';
const schema = z
  .object({ names: z.array(z.string().min(1)).min(1).max(8), typeId: z.string().min(1) })
  .strict();
type Submit = (args: z.infer<typeof schema>) => Promise<string>;
type Prototype = {
  ask: (text: string, signal: AbortSignal) => Promise<string>;
  close: () => Promise<void>;
};
type Kind = 'openai' | 'copilot';

async function create(
  kind: Kind,
  apiKey: string,
  execute: (args: unknown) => Promise<string>,
): Promise<Prototype> {
  if (kind === 'openai') {
    const client = new OpenAI({
      apiKey,
      baseURL,
      maxRetries: 0,
      timeout: 90_000,
      fetch: async (input, init) => {
        const request = new Request(input, init);
        if (request.url !== baseURL + '/responses') throw new Error('Oväntad modelladress');
        const body = await request.clone().json();
        const response = await fetch(request);
        const result = await response.clone().json();
        console.info(
          'OPENAI-SVAR',
          JSON.stringify({
            model: result.model,
            effort: body.reasoning.effort,
            responseId: result.id,
            requestId: response.headers.get('x-request-id'),
            status: response.status,
          }),
        );
        return response;
      },
    });
    const runner = new Runner({ tracingDisabled: true });
    const session = new MemorySession();
    const agent = new Agent({
      name: 'Skyttel',
      instructions,
      model: new OpenAIResponsesModel(client, model),
      modelSettings: { reasoning: { effort: 'high' }, parallelToolCalls: false, store: false },
      tools: [tool({ name, description, parameters: schema, execute, errorFunction: null })],
    });
    return {
      async ask(text, signal) {
        const run = await runner.run(agent, text, { session, signal, maxTurns: 5 });
        for (const response of run.rawResponses)
          console.info(
            'SDK-ANROP',
            JSON.stringify({ responseId: response.responseId, usage: response.usage.outputTokens }),
          );
        return String(run.finalOutput);
      },
      close: async () => {},
    };
  }

  const directory = await mkdtemp(join(tmpdir(), 'skyttel-hela-kartuppdraget-'));
  const client = new CopilotClient({
    mode: 'empty',
    runtime: RuntimeConnection.forInProcess({ baseDirectory: directory }),
    github: { useLoggedInUser: false },
    observability: { logLevel: 'none' },
  });
  const session = await client.createSession({
    model,
    github: { capi: { enabled: false }, telemetryEnabled: false },
    systemMessage: { mode: 'replace', content: instructions },
    inference: {
      reasoningEffort: 'high',
      allowMultipleToolCalls: false,
      defaultProvider: 'openai',
      providers: [
        { name: 'openai', type: 'openai', baseUrl: baseURL, apiKey, wireApi: 'responses' },
      ],
    },
    state: { infiniteSessions: { enabled: false } },
    permissions: {
      onRequest: (p) =>
        p.kind === 'custom-tool' && p.toolName === name
          ? { kind: 'approved' }
          : { kind: 'denied-by-rules', rules: [] },
    },
    tools: {
      availableTools: [`custom:${name}`],
      definitions: [
        defineTool(name, { description, parameters: z.toJSONSchema(schema), handler: execute }),
      ],
    },
  });
  session.on('tool.execution_start', ({ data }) =>
    console.info('COPILOT-VERKTYG', data.toolName, JSON.stringify(data.arguments)),
  );
  session.on('tool.execution_complete', ({ data }) =>
    console.info('COPILOT-VERKTYGSSLUT', data.success, JSON.stringify(data.error)),
  );
  session.on('assistant.usage', ({ data }) => {
    const { model, responseModel, reasoningEffort, apiEndpoint, providerCallId, outputTokens } =
      data;
    console.info(
      'SDK-ANROP',
      JSON.stringify({
        model,
        responseModel,
        reasoningEffort,
        apiEndpoint,
        providerCallId,
        outputTokens,
      }),
    );
  });
  return {
    async ask(text, signal) {
      const abort = () => {
        void session.abort().catch(() => undefined);
      };
      signal.throwIfAborted();
      signal.addEventListener('abort', abort, { once: true });
      try {
        const reply = await session.sendAndWait(text, 100_000);
        if (!reply?.data.content) throw new Error('Copilot gav inget svar');
        return reply.data.content;
      } finally {
        signal.removeEventListener('abort', abort);
      }
    },
    async close() {
      try {
        await session.disconnect();
      } finally {
        await client.stop();
        await rm(directory, { recursive: true, force: true });
      }
    },
  };
}

// Varje verktygsanrop ska använda behörigheten och granskningen för just det aktiva meddelandet.
type Entry = { turn?: Submit; sdk?: Prototype };
const sessions = new Map<string, Entry>();
export async function askPrototype(
  id: string,
  kind: Kind,
  apiKey: string,
  text: string,
  signal: AbortSignal,
  submit: Submit,
) {
  const entry = sessions.get(id) ?? {};
  if (entry.turn) throw new Error('Samtalet har redan ett aktivt meddelande');
  sessions.set(id, entry);
  entry.turn = AsyncResource.bind(submit);
  try {
    entry.sdk ??= await create(kind, apiKey, async (raw) => {
      if (!entry.turn) throw new Error('Meddelandet är avslutat');
      return entry.turn(schema.parse(raw));
    });
    return await entry.sdk.ask(text, signal);
  } finally {
    entry.turn = undefined;
  }
}
export async function closePrototype(id: string) {
  const entry = sessions.get(id);
  sessions.delete(id);
  await entry?.sdk?.close();
}
