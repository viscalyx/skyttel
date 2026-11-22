// Engångsprov med verkliga modellsvar och påhittade hushållsuppgifter.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CopilotClient, defineTool, RuntimeConnection } from '@microsoft/copilot-sdk';
import { Agent, OpenAIResponsesModel, Runner, tool } from '@openai/agents';
import OpenAI from 'openai';
import type { WorkRequest, WorkResponse } from './cart-tool-copilot.prototype.js';

export type LiveSdk = 'openai' | 'copilot';

export async function runLiveCartToolPrototype({
  sdk,
  apiKey,
  request,
  prompt,
  version,
  contentVersion,
  accept,
  signal,
}: {
  sdk: LiveSdk;
  apiKey: string;
  request: WorkRequest;
  prompt: string;
  version: number;
  contentVersion: number;
  accept: (response: WorkResponse, callId: string) => Promise<string>;
  signal: AbortSignal;
}) {
  const submission = request.tools.find(
    (item) => item.type === 'function' && item.name === 'submit_changes',
  );
  if (submission?.type !== 'function' || !submission.parameters)
    throw new Error('Provet kräver submit_changes');
  const name = submission.name;
  const description = submission.description ?? '';
  const parameters = {
    ...submission.parameters,
    type: 'object' as const,
    properties: submission.parameters.properties as Record<string, Record<string, unknown>>,
    required: submission.parameters.required as string[],
    additionalProperties: true as const,
  };
  const model = 'gpt-6.1-terra';
  const modelUrl = 'https://api.openai.com/v1';
  const instructions = `Du hjälper användaren med ett påhittat utkast i Skyttel.
För en begärd ändring ska du anropa submit_changes exakt en gång med alla ändringar.
Utkastet har version ${version} och contentVersion ${contentVersion}.
För nya objekt ska varje operation ha name propose_object och arguments med id, baseRevision satt till null och value med typeId och name.
Använd completion draft. Ange continueResponse false och tomma listor för questions och resolves.
Efter verktygsresultatet ska du ge en kort bekräftelse och avsluta.`;

  let submitted = false;
  let result = '';
  async function submit(args: unknown, callId: string) {
    signal.throwIfAborted();
    if (submitted || !callId) throw new Error('Provet tillåter ett kartverktygsanrop');
    submitted = true;
    result = await accept(
      {
        status: 'completed',
        output: [
          {
            type: 'function_call',
            status: 'completed',
            name,
            call_id: callId,
            arguments: JSON.stringify(args),
          },
        ],
        output_text: '',
      },
      callId,
    );
    return result;
  }

  if (sdk === 'openai') {
    const client = new OpenAI({ apiKey, baseURL: modelUrl, maxRetries: 0, timeout: 60_000 });
    const runner = new Runner({ tracingDisabled: true });
    const agent = new Agent({
      name: 'Skyttelprov',
      instructions,
      model: new OpenAIResponsesModel(client, model),
      modelSettings: {
        toolChoice: name,
        parallelToolCalls: false,
        maxTokens: 4096,
        reasoning: { effort: 'low' },
        store: false,
      },
      tools: [
        tool({
          name,
          description,
          parameters,
          strict: false,
          errorFunction: null,
          execute: (args, _context, details) => submit(args, details?.toolCall?.callId ?? ''),
        }),
      ],
      toolUseBehavior: 'stop_on_first_tool',
    });
    const completed = await runner.run(agent, prompt, { maxTurns: 1, signal });
    if (!result || completed.finalOutput !== result || completed.rawResponses.length !== 1)
      throw new Error('OpenAI Agents SDK lämnade inte serverns verktygsresultat');
    return { sdk, model, modellomgångar: completed.rawResponses.length, verifieratUtkast: true };
  }

  const directory = await mkdtemp(join(tmpdir(), 'skyttel-copilot-live-'));
  const client = new CopilotClient({
    mode: 'empty',
    runtime: RuntimeConnection.forInProcess({ baseDirectory: directory }),
    github: { useLoggedInUser: false },
    observability: { logLevel: 'none' },
  });
  try {
    await using session = await client.createSession({
      model,
      github: { capi: { enabled: false }, telemetryEnabled: false },
      systemMessage: { mode: 'replace', content: instructions },
      inference: {
        allowMultipleToolCalls: false,
        defaultProvider: 'openai',
        providers: [
          { name: 'openai', type: 'openai', baseUrl: modelUrl, apiKey, wireApi: 'responses' },
        ],
      },
      state: { infiniteSessions: { enabled: false } },
      permissions: {
        onRequest: (permission) =>
          permission.kind === 'custom-tool' && permission.toolName === name
            ? { kind: 'approved' }
            : { kind: 'denied-by-rules', rules: [] },
      },
      tools: {
        availableTools: [`custom:${name}`],
        definitions: [
          defineTool(name, {
            description,
            parameters,
            handler: (args, invocation) => submit(args, invocation.toolCallId),
          }),
        ],
      },
    });
    const usage: { endpoint?: string; finish?: string }[] = [];
    session.on('assistant.usage', ({ data }) =>
      usage.push({ endpoint: data.apiEndpoint, finish: data.finishReason }),
    );
    session.on('session.error', ({ data }) => {
      console.error('Copilot-provet', data.errorType, data.statusCode);
    });
    let turns = 0;
    session.on('assistant.turn_start', () => {
      if (++turns > 3) void session.abort().catch(() => undefined);
    });
    const stop = () => {
      void session.abort().catch(() => undefined);
    };
    signal.addEventListener('abort', stop, { once: true });
    try {
      signal.throwIfAborted();
      const reply = await session.sendAndWait(prompt, 90_000);
      if (!result || !reply?.data.content || !usage.length || turns > 3)
        throw new Error('Copilot gav inget fullständigt verifierat provresultat');
      return { sdk, model, modellomgångar: usage.length, anrop: usage, verifieratUtkast: true };
    } finally {
      signal.removeEventListener('abort', stop);
    }
  } finally {
    await client.stop();
    await rm(directory, { recursive: true, force: true });
  }
}
