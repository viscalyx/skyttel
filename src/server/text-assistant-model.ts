import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { ResponseInputItem, Tool } from 'openai/resources/responses/responses';
import { textConversationModel } from './conversation-capacity.js';

export interface TextModelProfile {
  provider: 'openai';
  model: string;
  effort: 'low' | 'medium' | 'high';
  tokens: number;
  maxOutputTokens: number;
}

export interface TextModelAttempt {
  attemptId: string;
  startedAt: string;
  endedAt: string | null;
  model: string;
  resolvedModel?: string | null;
  serviceTier?: string | null;
  requestId: string | null;
  responseId: string | null;
  outcome: 'started' | 'completed' | 'failed' | 'aborted' | 'incomplete';
  completeness: 'unknown' | 'partial' | 'complete';
  usage: {
    input: number | null;
    cached: number | null;
    cacheWrite: number | null;
    output: number | null;
    reasoning: number | null;
  };
}
export type TextModelUsage = (attempt: TextModelAttempt) => void;
const count = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const identifier = (value: unknown) =>
  typeof value === 'string' && /^[\w-]{1,200}$/.test(value) ? value : null;

export function textModel(
  apiKey: string,
  modelFetch?: typeof fetch,
  record?: TextModelUsage,
  profile?: TextModelProfile,
) {
  if (
    profile &&
    (profile.provider !== 'openai' ||
      !/^[a-z0-9.-]+$/.test(profile.model) ||
      !['low', 'medium', 'high'].includes(profile.effort) ||
      !Number.isSafeInteger(profile.tokens) ||
      profile.tokens <= 8192 ||
      profile.maxOutputTokens !== 8192)
  )
    throw new Error('invalid_model_profile');
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.openai.com/v1',
    fetch: modelFetch,
    maxRetries: 0,
    timeout: 120_000,
    logLevel: 'off',
  });
  return async (
    instructions: string,
    input: ResponseInputItem[],
    tools: Tool[],
    signal: AbortSignal,
    maxOutputTokens?: number,
  ) => {
    const attempt: TextModelAttempt = {
      attemptId: randomUUID(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      model: profile?.model ?? textConversationModel.model,
      requestId: null,
      responseId: null,
      outcome: 'started',
      completeness: 'unknown',
      usage: { input: null, cached: null, cacheWrite: null, output: null, reasoning: null },
    };
    record?.({ ...attempt });
    try {
      const response = await client.responses.create(
        {
          model: attempt.model,
          reasoning: { effort: profile?.effort ?? 'low' },
          ...(profile ? { service_tier: 'default' as const } : {}),
          store: false,
          parallel_tool_calls: false,
          instructions,
          input,
          tools,
          max_output_tokens: maxOutputTokens ?? 8192,
        },
        { signal },
      );
      attempt.requestId = identifier(response._request_id);
      attempt.responseId = identifier(response.id);
      attempt.resolvedModel =
        response.model == null
          ? null
          : response.model === attempt.model
            ? attempt.model
            : 'unsupported';
      attempt.serviceTier =
        response.service_tier == null
          ? null
          : response.service_tier === 'default'
            ? 'default'
            : 'unsupported';
      const usage = response.usage;
      attempt.usage = {
        input: count(usage?.input_tokens),
        cached: count(usage?.input_tokens_details?.cached_tokens),
        cacheWrite: count(usage?.input_tokens_details?.cache_write_tokens),
        output: count(usage?.output_tokens),
        reasoning: count(usage?.output_tokens_details?.reasoning_tokens),
      };
      attempt.completeness = Object.values(attempt.usage).every((value) => value !== null)
        ? 'complete'
        : Object.values(attempt.usage).some((value) => value !== null)
          ? 'partial'
          : 'unknown';
      attempt.outcome = response.status === 'completed' ? 'completed' : 'incomplete';
      if (profile && (response.model !== profile.model || response.service_tier !== 'default'))
        throw new Error('model_profile_mismatch');
      return response;
    } catch (error) {
      attempt.outcome = signal.aborted ? 'aborted' : 'failed';
      if (error instanceof OpenAI.APIError) attempt.requestId = identifier(error.requestID);
      throw error;
    } finally {
      attempt.endedAt = new Date().toISOString();
      // A usage sink cannot turn an already completed map operation into a
      // failure. Its consumer records its own operational health separately.
      try {
        record?.({ ...attempt });
      } catch {
        console.error(JSON.stringify({ event: 'model_usage_unavailable' }));
      }
    }
  };
}
