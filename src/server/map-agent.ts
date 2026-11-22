import {
  Agent,
  type FunctionTool,
  type Model,
  Runner,
  setSensitiveDataLoggingEnabled,
  ToolCallError,
  Usage,
} from '@openai/agents';
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseUsage,
} from 'openai/resources/responses/responses';
import type { mapAgentTools } from './map-agent-tools.js';
import { MapError } from './map-error.js';

export type MapAgentCall = Pick<ResponseFunctionToolCall, 'name' | 'call_id' | 'arguments'>;

interface ToolRound {
  calls: MapAgentCall[];
  independentReads: boolean;
  usage?: ResponseUsage;
  execute: (action: MapAgentCall) => Promise<unknown>;
  finish: () => boolean;
}

setSensitiveDataLoggingEnabled(false);
const runner = new Runner({ tracingDisabled: true, traceIncludeSensitiveData: false });

/** The conversation supplies the refreshed, capacity-limited context for each
 * request to its observed model client. The Runner owns tool invocation,
 * result association, continuation and the turn limit for this assignment. */
export async function runMapAgent(
  catalog: ReturnType<typeof mapAgentTools>['tools'],
  signal: AbortSignal,
  recordResults: (items: ResponseInputItem[]) => void,
  next: () => Promise<ToolRound | { text: string; usage?: ResponseUsage } | undefined>,
) {
  const toolExecution = { maxFunctionToolConcurrency: 1 };
  let execute: ToolRound['execute'];
  let finish: ToolRound['finish'];
  const model: Model = {
    async getResponse() {
      const round = await next();
      const usage = new Usage(round?.usage);
      if (!round || 'text' in round)
        return {
          usage,
          output: [
            {
              type: 'message',
              role: 'assistant',
              status: 'completed',
              content: [{ type: 'output_text', text: round?.text ?? '' }],
            },
          ],
        };
      finish = round.finish;
      execute = round.execute;
      if (new Set(round.calls.map((call) => call.call_id)).size !== round.calls.length)
        throw new MapError('invalid_request', 400);
      // Only server-declared independent reads may share a snapshot in parallel.
      // Reports follow their companion reads and map selections in order.
      toolExecution.maxFunctionToolConcurrency = round.independentReads ? round.calls.length : 1;
      return {
        usage,
        output: round.calls.map(({ name, arguments: args, call_id }) => ({
          type: 'function_call',
          name,
          arguments: args,
          callId: call_id,
        })),
      };
    },
    getStreamedResponse() {
      throw new Error('Map assignments use complete responses');
    },
  };
  const tools: FunctionTool[] = catalog.map((definition) => ({
    type: 'function',
    name: definition.name,
    description: definition.description ?? '',
    parameters: {
      ...definition.parameters,
      properties: definition.parameters.properties ?? {},
      required: definition.parameters.required ?? [],
      additionalProperties: definition.parameters.additionalProperties !== false,
    },
    strict: false,
    needsApproval: async () => false,
    isEnabled: async () => true,
    invoke: async (_context, args, details) => {
      const callId = details?.toolCall?.callId;
      if (!callId) throw new MapError('invalid_request', 400);
      return JSON.stringify(
        await execute({ name: definition.name, arguments: args, call_id: callId }),
      );
    },
  }));
  const agent = new Agent({
    name: 'Skyttel',
    model,
    tools,
    toolUseBehavior: (_context, results) => {
      recordResults(
        results.map((result) => {
          if (result.type !== 'function_output') throw new MapError('invalid_request', 400);
          const item = result.runItem.rawItem;
          if (
            item.type !== 'function_call_result' ||
            typeof item.output === 'string' ||
            Array.isArray(item.output) ||
            item.output.type !== 'text'
          )
            throw new MapError('invalid_request', 400);
          return { type: 'function_call_output', call_id: item.callId, output: item.output.text };
        }),
      );
      return finish()
        ? { isFinalOutput: true, isInterrupted: undefined, finalOutput: '' }
        : { isFinalOutput: false, isInterrupted: undefined };
    },
  });
  try {
    await runner.run(agent, [], { signal, maxTurns: 48, toolExecution });
  } catch (error) {
    // Domain errors carry the checked recovery or clarification for this turn.
    if (error instanceof ToolCallError) throw error.error;
    throw error;
  }
}
