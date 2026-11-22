import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { request } from '@playwright/test';
import { expect, test, vi } from 'vitest';
import { langSmithDelivery } from '../../../src/server/langsmith-delivery.js';
import { createHousehold, signIn } from '../../support/client.js';
import { approvedForVisit } from '../../support/conversation.js';
import { createInstallation } from '../../support/installation.js';
import { isVoiceAnswerRelease, liveProvider } from '../../support/live-provider.js';
import { modelMessage, modelTool, textModel } from '../../support/text-model.js';

const cloud = process.env.SKYTTEL_PROTOTYPE_DESTINATION === 'development';
const env = cloud
  ? parseEnv(readFileSync(process.env.SKYTTEL_PROTOTYPE_ENV ?? '.devcontainer/.env', 'utf8'))
  : {};
function setting(key: string) {
  const value = env['SKYTTEL_LANGSMITH_' + key];
  if (!value) throw new Error('Utvecklingsmiljön saknar SKYTTEL_LANGSMITH_' + key);
  return value;
}
const options = cloud
  ? {
      endpoint: setting('ENDPOINT'),
      project: setting('PROJECT'),
      apiKey: setting('API_KEY'),
      workspaceId: setting('WORKSPACE_ID'),
    }
  : { endpoint: 'http://127.0.0.1', project: 'lokalt-prov', apiKey: 'synthetic-trace-secret' };

async function query(body: unknown, readKey: string) {
  const response = await fetch(options.endpoint + '/runs/query', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
    headers: {
      'x-api-key': readKey,
      'x-tenant-id': setting('WORKSPACE_ID'),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('LangSmith svarade med HTTP ' + response.status);
  return response.json();
}
if (cloud) {
  if (
    new URL(options.endpoint).protocol !== 'https:' ||
    !['api.smith.langchain.com', 'eu.api.smith.langchain.com'].includes(
      new URL(options.endpoint).hostname,
    ) ||
    !options.project.includes('dev')
  )
    throw new Error('Provet kräver utvecklingsprojektet i LangSmith.');
}

type Run = {
  id: string;
  name: string;
  parent_run_id?: string;
  end_time?: string;
  session_id?: string;
  inputs: { input?: unknown[]; providerCallId?: string; disposition?: string };
  outputs?: { output?: { name?: string }[] };
  extra: {
    metadata: {
      links?: { traceId: string; spanId: string }[];
      request_id?: string;
      task_id?: string;
      status?: string;
      completeness?: string;
      response_id?: string;
      tool_execution_id?: string;
    };
  };
};
function inspect(rows: Run[], taskId: string, voiceId: string, sdk: string, cancel: boolean) {
  const task = rows.find((r) => r.id === taskId);
  const delegation = rows.find(
    (r) => r.name === 'Skyttel voice delegation' && r.parent_run_id === voiceId,
  );
  if (!task || !delegation) throw new Error('Uppdraget eller röstdelegeringen saknas');
  expect(delegation.extra.metadata.links).toContainEqual({
    traceId: taskId,
    spanId: taskId,
  });
  expect(delegation.extra.metadata.request_id).toBe(task.extra.metadata.request_id);
  expect(task.extra.metadata.status).toBe(cancel ? 'canceled' : 'completed');
  const children = rows.filter((r) => r.parent_run_id === taskId);
  const models = children.filter((r) => r.name === 'Skyttel model attempt');
  const action = models.find((r) =>
    r.outputs?.output?.some((o: { name?: string }) => o.name === 'submit_changes'),
  );
  if (!action) throw new Error('Modellens anrop till submit_changes saknas');
  expect(action.end_time).toBeTruthy();
  if (sdk === 'copilot') {
    expect(action.inputs.input).toBeUndefined();
    expect(action.extra.metadata.completeness).toBe('partial');
  } else {
    expect(action.inputs.input?.length).toBeGreaterThan(0);
    expect(action.extra.metadata.response_id).toMatch(/^resp_/);
  }
  const mcp = children.find((r) => r.name === 'apply_draft_batch');
  if (!mcp) throw new Error('Kartverktygets anrop saknas');
  expect(mcp.extra.metadata.tool_execution_id).toBe(mcp.id);
  expect(mcp.extra.metadata.task_id).toBe(task.extra.metadata.task_id);
  expect(mcp.extra.metadata.status).toBe(cancel ? 'canceled' : 'completed');
  if (!cancel) expect(JSON.stringify(mcp.outputs)).toContain('Provcykeln');
  if (!cancel && sdk === 'copilot')
    expect(models.some((r) => JSON.stringify(r.outputs).includes('Den lokala modellen'))).toBe(
      true,
    );
  const result = children.find(
    (r) => r.name === 'Skyttel work result' && r.inputs.providerCallId === action.id,
  );
  expect(result?.inputs.disposition).toBe(cancel ? 'unknown' : 'used');
  return {
    modellomgångar: models.length,
    verktyg: mcp.name,
    status: mcp.extra.metadata.status,
    utfall: result?.inputs.disposition,
  };
}

for (const sdk of ['dagens', 'openai', 'copilot']) {
  for (const cancel of [false, true]) {
    test(sdk + (cancel ? ' avbrutet' : ' bekräftat'), async () => {
      const saved = process.env.SKYTTEL_PROTOTYPE_RUNS;
      if (saved) {
        const key = process.env.SKYTTEL_PROTOTYPE_READ_KEY;
        if (!cloud || !key)
          throw new Error('Kontrollen kräver utvecklingsprojektet och läsåtkomst');
        const entries = JSON.parse(readFileSync(saved, 'utf8')) as {
          sdk: string;
          cancel: boolean;
          task: string;
          voice: string;
        }[];
        const pair = entries.find((row) => row.sdk === sdk && row.cancel === cancel);
        if (!pair) throw new Error('Referensen till körningen saknas');
        const project = setting('PROJECT_ID');
        const rows: Run[] = [];
        for (const trace of [pair.task, pair.voice]) {
          const page = await query({ session: [project], trace, limit: 100 }, key);
          rows.push(...page.runs);
        }
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.session_id === project)).toBe(true);
        console.info(inspect(rows, pair.task, pair.voice, sdk, cancel));
        return;
      }
      vi.stubEnv('SKYTTEL_CART_TOOL_PROTOTYPE', sdk);
      vi.stubEnv('SKYTTEL_LIVE_SDK_PROTOTYPE', '');
      let entered = false;
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      const live = liveProvider();
      let typeId = '';
      const toolCall = () =>
        modelTool('submit_changes', {
          version: 0,
          contentVersion: 1,
          completion: 'draft',
          continueResponse: false,
          operations: [
            {
              name: 'propose_object',
              arguments: { id: 'bike', baseRevision: null, value: { typeId, name: 'Provcykeln' } },
            },
          ],
        });
      const model = textModel(
        () => [toolCall()],
        (request) => [
          modelMessage(
            JSON.stringify(
              request.instructions.startsWith('SKYTTEL_TURN_SCOPE')
                ? {
                    mode: 'work',
                    request: 'Lägg till Provcykeln i mitt utkast.',
                    responseRequired: false,
                  }
                : { decision: 'allow', complete: true, fulfillsRequest: true },
            ),
          ),
        ],
      );
      const runs = new Map<string, Run>();
      const app = await createInstallation(undefined, {
        modelFetch: model.provider,
        liveFetch: live.provider,
        liveSideband: live.attach,
        assistantDispatch: async (req, dispatch) => {
          const rpc = await req
            .clone()
            .json()
            .catch(() => undefined);
          if (cancel && rpc?.params?.name === 'apply_draft_batch') {
            entered = true;
            await wait;
            return new Response(null, { status: 503 });
          }
          return dispatch(req);
        },
        langSmith: options,
        traceDelivery: langSmithDelivery({
          ...options,
          fetch: async (url, init) => {
            const body = JSON.parse(new TextDecoder().decode(init?.body as Uint8Array));
            if (
              /synthetic-model-key|synthetic-trace-secret|Bearer |synthetic-offer/.test(
                JSON.stringify(body),
              )
            )
              throw new Error('Provet fann uteslutna transportuppgifter i spåret.');
            const id = body.id ?? new URL(String(url)).pathname.split('/').at(-1);
            const response = cloud ? await fetch(url, init) : new Response(null, { status: 204 });
            if (response.ok) runs.set(id, { ...runs.get(id), ...body });
            return response;
          },
        }),
      });
      const browser = await request.newContext();
      try {
        await signIn(browser, app.origin);
        const { household } = await (await createHousehold(browser, app.origin)).json();
        const home = app.origin + '/api/households/' + household.id;
        const map = async () => (await browser.get(home + '/map')).json();
        typeId = (await map()).types[0].id;
        vi.stubEnv(
          'SKYTTEL_TRACE_FIXTURE',
          JSON.stringify({ status: 'completed', output: [toolCall()], output_text: '' }),
        );
        const post = (path: string, data: unknown) =>
          browser.post(home + path, { headers: { origin: app.origin }, data });
        const opened = await post('/text-assistant', approvedForVisit);
        expect(opened.status()).toBe(201);
        const session = await opened.json();
        const path = '/text-assistant/' + session.id;
        const started = await post(path + '/voice', {
          sdp: 'synthetic-offer',
          revision: session.revision,
          draftVersion: session.review.version,
          contentVersion: session.review.contentVersion,
        });
        expect(started.status()).toBe(201);
        const { voice } = await started.json();
        const channel = [...live.channels.keys()][0];
        const delegationId = 'provcykel-' + sdk + (cancel ? '-avbrott' : '-utkast');
        live.emit(channel, {
          type: 'session.input_transcript.delta',
          event_id: 'tal',
          delta: 'Lägg till Provcykeln i mitt utkast.',
          start_ms: 0,
          end_ms: 1,
        });
        live.emit(channel, {
          type: 'session.delegation.created',
          event_id: 'uppdrag',
          offset_ms: 1,
          delegation: { id: delegationId, type: 'delegation', target: 'client' },
        });
        if (cancel) {
          await expect.poll(() => entered, { timeout: 20000 }).toBe(true);
          expect((await post(path + '/cancel', { all: true })).status()).toBe(200);
          release();
        } else {
          await expect
            .poll(() => live.sent.some(({ event }) => isVoiceAnswerRelease(event)), {
              timeout: 20000,
            })
            .toBe(true);
        }
        const root = () => [...runs.values()].find((r) => r.name === 'Skyttel backend task');
        await expect.poll(() => Boolean(root()?.end_time), { timeout: 45000 }).toBe(true);
        await post(path + '/voice/' + voice.id + '/stop', {});
        await expect
          .poll(() => Boolean(runs.get(voice.id)?.end_time), { timeout: 45000 })
          .toBe(true);
        const state = await map();
        expect(state.draft.changes.map((c: { id: string }) => c.id)).toEqual(
          cancel ? [] : ['bike'],
        );
        expect(state.objects).toHaveLength(0);
        const taskId = root()?.id;
        if (!taskId) throw new Error('Uppdragets id saknas');
        const evidence = inspect([...runs.values()], taskId, voice.id, sdk, cancel);
        console.info({
          sdk,
          destination: options.project,
          uppdrag: taskId,
          röst: voice.id,
          ...evidence,
        });
      } finally {
        release();
        await browser.dispose();
        await app.close();
        vi.unstubAllEnvs();
      }
    }, 150000);
  }
}
