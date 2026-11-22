// Engångsprov med lokal modellserver eller uttryckligen aktiverade API-anrop.
import { AsyncResource } from 'node:async_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import {
  Agent,
  MemorySession,
  OpenAIChatCompletionsModel,
  OpenAIResponsesModel,
  Runner,
  tool,
} from '@openai/agents';
import OpenAI from 'openai';
import { z } from 'zod';

const descriptions = {
  spara_utkast: 'Spara hela utkastet på användarens uttryckliga begäran.',
  kontrollera_sparandet: 'Läs det registrerade utfallet för sparförsöket i den här begäran.',
};
type Name = keyof typeof descriptions;
const names = Object.keys(descriptions) as Name[];
const parameters = z.object({}).strict();
const receiptInstructions =
  'Bekräfta bara ett verifierat sparkvitto. Om ett sparsvar saknas, anropa kontrollera_sparandet. Skicka aldrig om en skrivning för att kontrollera utfallet.';
const model = 'gpt-6.1-terra';
export const liveSaveEvents: string[] = [];
type Execute = (name: Name) => Promise<string>;

type SavePolicy = {
  needsSave: () => boolean;
  finishInHook: boolean;
};
async function connect(kind: string, execute: Execute, policy: () => SavePolicy | undefined) {
  const onFailure = process.env.SKYTTEL_RECEIPT_HOOK === 'true';
  const port = Number(process.env.SKYTTEL_RECEIPT_PORT);
  const live =
    process.env.SKYTTEL_SAVE_LIVE === '1' && process.env.SKYTTEL_REAL_MODEL_TESTS === '1';
  if (!live && (!Number.isInteger(port) || port < 1 || port > 65535))
    throw Error('Lokal modellport saknas');
  const baseURL = live ? 'https://api.openai.com/v1' : 'http://127.0.0.1:' + port + '/v1';
  const apiKey = live ? process.env.OPENAI_API_KEY : 'local-prototype';
  if (!apiKey) throw Error('Modellnyckel saknas');
  const instructions = [
    receiptInstructions,
    live && 'Svara på svenska. Du får aktuellt granskat utkast tillsammans med frågan.',
    live &&
      process.env.SKYTTEL_SAVE_TEXT_FIRST === '1' &&
      'Test av avslut. Din första uppgift är enbart att svara med exakt texten ”Begäran mottagen.” och sedan avsluta. Använd inga verktyg i det första svaret. Skyttel ansvarar för sparbegäran vid avslut. Om du sedan får en NY uppmaning att använda ett verktyg ska du följa den.',
  ]
    .filter(Boolean)
    .join(' ');
  function record(event: string) {
    if (live) liveSaveEvents.push(event);
  }
  if (kind === 'openai') {
    const runner = new Runner({ tracingDisabled: true });
    const session = new MemorySession();
    const client = new OpenAI({ apiKey, baseURL, maxRetries: 0, timeout: 90_000 });
    const agent = new Agent({
      name: 'Skyttel',
      instructions,
      model: live
        ? new OpenAIResponsesModel(client, model)
        : new OpenAIChatCompletionsModel(client, model),
      modelSettings: live
        ? { store: false, reasoning: { effort: 'low' }, parallelToolCalls: false }
        : {},
      tools: names.map((name) =>
        tool({
          name,
          description: descriptions[name],
          parameters,
          execute: () => {
            record('modell:' + name);
            return execute(name);
          },
          ...(onFailure && name === 'spara_utkast'
            ? { errorFunction: () => execute('kontrollera_sparandet') }
            : {}),
        }),
      ),
    });
    const savingAgent = agent.clone({
      modelSettings: {
        ...agent.modelSettings,
        toolChoice: live && process.env.SKYTTEL_SAVE_FREE_CHOICE === '1' ? 'auto' : 'spara_utkast',
      },
      outputGuardrails: [
        {
          name: 'Fullfölj den aktuella sparbegäran',
          execute: async () => {
            const current = policy();
            if (current?.finishInHook && current.needsSave()) {
              record('avslut:spara_utkast');
              await execute('spara_utkast');
            }
            return { tripwireTriggered: false, outputInfo: null };
          },
        },
      ],
    });
    return {
      ask: async (text: string, signal: AbortSignal) => {
        const active = policy()?.needsSave() ? savingAgent : agent;
        const result = await runner.run(active, text, { session, signal, maxTurns: 4 });
        for (const _ of result.rawResponses) record('modellsvar');
        return String(result.finalOutput);
      },
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
    hooks: {
      handlers: {
        onAgentStop: async (event) => {
          const current = policy();
          if (!current?.needsSave()) return;
          if (current.finishInHook) {
            record('avslut:spara_utkast');
            await execute('spara_utkast');
          } else if (!event.stopHookActive) {
            record('avslut:påminnelse');
            return {
              decision: 'block',
              reason: 'Anropa spara_utkast för den aktuella sparbegäran.',
            };
          }
        },
        onPostToolUseFailure: async (event) => {
          if (onFailure && event.toolName === 'spara_utkast')
            return { additionalContext: await execute('kontrollera_sparandet') };
        },
      },
    },
    systemMessage: { mode: 'replace', content: instructions },
    inference: {
      defaultProvider: 'local',
      providers: [
        {
          name: 'local',
          type: 'openai',
          baseUrl: baseURL,
          apiKey,
          wireApi: live ? 'responses' : 'completions',
        },
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
          handler: () => {
            record('modell:' + name);
            return execute(name);
          },
        }),
      ),
    },
  });
  if (live) session.on('assistant.usage', () => record('modellsvar'));
  return {
    async ask(text: string, signal: AbortSignal) {
      const abort = () => {
        void session.abort().catch(() => {});
      };
      signal.throwIfAborted();
      signal.addEventListener('abort', abort, { once: true });
      try {
        return (await session.sendAndWait(text, live ? 90000 : 15000))?.data.content ?? '';
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

type Entry = { policy?: SavePolicy; turn?: Execute; sdk?: Awaited<ReturnType<typeof connect>> };
const sessions = new Map<string, Entry>();
export async function askReceipt(
  id: string,
  kind: string,
  text: string,
  signal: AbortSignal,
  execute: Execute,
  policy?: SavePolicy,
) {
  const entry = sessions.get(id) ?? {};
  if (entry.turn) throw Error('En begäran pågår redan');
  sessions.set(id, entry);
  entry.turn = AsyncResource.bind(execute);
  entry.policy = policy;
  try {
    entry.sdk ??= await connect(
      kind,
      (name) => {
        if (!entry.turn) throw Error('Begäran är avslutad');
        return entry.turn(name);
      },
      () => entry.policy,
    );
    return await entry.sdk.ask(text, signal);
  } finally {
    entry.turn = undefined;
    entry.policy = undefined;
  }
}

export async function closeReceiptSessions() {
  for (const entry of sessions.values()) await entry.sdk?.close();
  sessions.clear();
}
