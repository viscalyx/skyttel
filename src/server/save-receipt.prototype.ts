// Engångsprov. Båda SDK:erna pratar endast med provets lokala modellserver.
import { AsyncResource } from 'node:async_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import { Agent, MemorySession, OpenAIChatCompletionsModel, Runner, tool } from '@openai/agents';
import OpenAI from 'openai';
import { z } from 'zod';

const descriptions = {
  spara_utkast: 'Spara hela utkastet på användarens uttryckliga begäran.',
  kontrollera_sparandet: 'Läs det registrerade utfallet för sparförsöket i den här begäran.',
};
type Name = keyof typeof descriptions;
const names = Object.keys(descriptions) as Name[];
const parameters = z.object({}).strict();
const instructions =
  'Bekräfta bara ett verifierat sparkvitto. Om ett sparsvar saknas, anropa kontrollera_sparandet. Skicka aldrig om en skrivning för att kontrollera utfallet.';
const model = 'gpt-6.1-terra';
type Execute = (name: Name) => Promise<string>;

async function connect(kind: string, execute: Execute) {
  const onFailure = process.env.SKYTTEL_RECEIPT_HOOK === 'true';
  const port = Number(process.env.SKYTTEL_RECEIPT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Lokal modellport saknas');
  const baseURL = 'http://127.0.0.1:' + port + '/v1';
  const apiKey = 'local-prototype';
  if (kind === 'openai') {
    const runner = new Runner({ tracingDisabled: true });
    const session = new MemorySession();
    const agent = new Agent({
      name: 'Skyttel',
      instructions,
      model: new OpenAIChatCompletionsModel(new OpenAI({ apiKey, baseURL, maxRetries: 0 }), model),
      tools: names.map((name) =>
        tool({
          name,
          description: descriptions[name],
          parameters,
          execute: () => execute(name),
          ...(onFailure && name === 'spara_utkast'
            ? { errorFunction: () => execute('kontrollera_sparandet') }
            : {}),
        }),
      ),
    });
    return {
      ask: async (text: string, signal: AbortSignal) =>
        String((await runner.run(agent, text, { session, signal, maxTurns: 4 })).finalOutput),
      close: async () => {},
    };
  }
  const directory = await mkdtemp(join(tmpdir(), 'skyttel-sparkvitto-'));
  const client = new CopilotClient({
    mode: 'empty',
    runtime: RuntimeConnection.forInProcess({ baseDirectory: directory }),
    github: { useLoggedInUser: false },
    observability: { logLevel: 'none' },
  });
  const session = await client.createSession({
    model,
    github: { capi: { enabled: false }, telemetryEnabled: false },
    hooks: onFailure
      ? {
          handlers: {
            onPostToolUseFailure: async (event) => {
              if (event.toolName === 'spara_utkast')
                return { additionalContext: await execute('kontrollera_sparandet') };
            },
          },
        }
      : undefined,
    systemMessage: { mode: 'replace', content: instructions },
    inference: {
      defaultProvider: 'local',
      providers: [
        { name: 'local', type: 'openai', baseUrl: baseURL, apiKey, wireApi: 'completions' },
      ],
    },
    state: { infiniteSessions: { enabled: false } },
    permissions: {
      onRequest: (p) =>
        p.kind === 'custom-tool' && names.some((name) => name === p.toolName)
          ? { kind: 'approved' }
          : { kind: 'denied-by-rules', rules: [] },
    },
    tools: {
      availableTools: names.map((name) => 'custom:' + name),
      definitions: names.map((name) =>
        defineTool(name, {
          description: descriptions[name],
          parameters: z.toJSONSchema(parameters),
          handler: () => execute(name),
        }),
      ),
    },
  });
  return {
    async ask(text: string, signal: AbortSignal) {
      const abort = () => {
        void session.abort().catch(() => {});
      };
      signal.throwIfAborted();
      signal.addEventListener('abort', abort, { once: true });
      try {
        return (await session.sendAndWait(text, 15000))?.data.content ?? '';
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

type Entry = { turn?: Execute; sdk?: Awaited<ReturnType<typeof connect>> };
const sessions = new Map<string, Entry>();
export async function askReceipt(
  id: string,
  kind: string,
  text: string,
  signal: AbortSignal,
  execute: Execute,
) {
  const entry = sessions.get(id) ?? {};
  if (entry.turn) throw Error('En begäran pågår redan');
  sessions.set(id, entry);
  entry.turn = AsyncResource.bind(execute);
  try {
    entry.sdk ??= await connect(kind, (name) => {
      if (!entry.turn) throw Error('Begäran är avslutad');
      return entry.turn(name);
    });
    return await entry.sdk.ask(text, signal);
  } finally {
    entry.turn = undefined;
  }
}

export async function closeReceiptSessions() {
  for (const entry of sessions.values()) await entry.sdk?.close();
  sessions.clear();
}
