// Engångsprov. Båda SDK:erna pratar endast med provets lokala modellserver.
import { AsyncResource } from 'node:async_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import { Agent, MemorySession, OpenAIChatCompletionsModel, Runner, tool } from '@openai/agents';
import OpenAI from 'openai';
import { z } from 'zod';

const name = 'spara_utkast';
const description = 'Spara hela utkastet på användarens uttryckliga begäran.';
const parameters = z.object({}).strict();
const instructions = 'Bekräfta bara det som Skyttel har verifierat.';
const model = 'gpt-6.1-terra';
type Execute = () => Promise<string>;

async function connect(kind: string, execute: Execute) {
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
      tools: [tool({ name, description, parameters, execute, errorFunction: null })],
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
        p.kind === 'custom-tool' && p.toolName === name
          ? { kind: 'approved' }
          : { kind: 'denied-by-rules', rules: [] },
    },
    tools: {
      availableTools: ['custom:' + name],
      definitions: [
        defineTool(name, { description, parameters: z.toJSONSchema(parameters), handler: execute }),
      ],
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
  save: Execute,
) {
  const entry = sessions.get(id) ?? {};
  if (entry.turn) throw Error('En begäran pågår redan');
  sessions.set(id, entry);
  entry.turn = AsyncResource.bind(save);
  try {
    entry.sdk ??= await connect(kind, () => {
      if (!entry.turn) throw Error('Begäran är avslutad');
      return entry.turn();
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
