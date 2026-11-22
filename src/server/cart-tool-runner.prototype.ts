// Lokalt engångsprov för ett verifierat utkast. Körs bara med styrda modellsvar.
import { Agent, type Model, Runner, tool, Usage } from '@openai/agents';
import { functionCall } from '@openai/agents/testing';
import type { Tool } from 'openai/resources/responses/responses';
import type { textModel } from './text-assistant-model.js';

export type WorkResponse = Awaited<ReturnType<ReturnType<typeof textModel>>>;
export type WorkRequest = {
  tools: Tool[];
  respond: () => Promise<WorkResponse | undefined>;
};

export async function runCartToolPrototype(
  first: WorkRequest,
  acceptResponse: (response: WorkResponse) => Promise<IteratorResult<WorkRequest, void>>,
  readVerifiedOutput: (callId: string) => string | undefined,
  signal: AbortSignal,
) {
  const submission = first.tools.find(
    (item) => item.type === 'function' && item.name === 'submit_changes',
  );
  if (submission?.type !== 'function' || !submission.parameters)
    throw new Error('Provet kräver submit_changes');

  let response: WorkResponse;
  let callId = '';
  let modelRounds = 0;
  const model: Model = {
    async getResponse() {
      if (++modelRounds !== 1) throw new Error('Provet behöver en extra arbetsmodellomgång');
      const reply = await first.respond();
      if (!reply) throw new Error('Servern avbröt arbetsomgången');
      response = reply;
      const [call] = response.output;
      if (
        response.status !== 'completed' ||
        response.output.length !== 1 ||
        call?.type !== 'function_call' ||
        call.name !== submission.name
      )
        throw new Error('Det styrda svaret ska innehålla ett enda förslag till ändringar');

      callId = call.call_id;
      return {
        usage: new Usage(),
        output: [functionCall(call.name, JSON.parse(call.arguments), { callId })],
      };
    },
    getStreamedResponse() {
      throw new Error('Provet använder fullständiga svar');
    },
  };

  let serverFinished = false;
  const agent = new Agent({
    name: 'Prov av kartverktyg',
    model,
    tools: [
      tool({
        name: submission.name,
        description: submission.description ?? '',
        parameters: {
          ...submission.parameters,
          type: 'object',
          properties: submission.parameters.properties as Record<string, Record<string, unknown>>,
          required: submission.parameters.required as string[],
          additionalProperties: true,
        },
        strict: false,
        errorFunction: null,
        async execute() {
          // Samma kontroll och verkställighet som i dagens samtal.
          serverFinished = Boolean((await acceptResponse(response)).done);
          const output = readVerifiedOutput(callId);
          if (output === undefined)
            throw new Error('Servern lämnade inget verifierat verktygsresultat');
          return output;
        },
      }),
    ],
    toolUseBehavior: (_context, [result]) =>
      serverFinished && result?.type === 'function_output' && typeof result.output === 'string'
        ? { isFinalOutput: true, isInterrupted: undefined, finalOutput: result.output }
        : { isFinalOutput: false, isInterrupted: undefined },
  });

  const runner = new Runner({ tracingDisabled: true });
  const run = await runner.run(agent, 'Föreslå en ändring i utkastet', { signal });
  if (!callId || run.finalOutput !== readVerifiedOutput(callId))
    throw new Error('SDK:t lämnade inte serverns verifierade resultat');
  return modelRounds;
}
