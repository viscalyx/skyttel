# Model selection and reasoning support

For developers and product owners defining model selection in text and voice
conversations. Checked against official OpenAI documentation on 2026-11-02
and repository commit
[`8fd3c0c`](https://github.com/viscalyx/skyttel/tree/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625).
This is documentary verification; no account access, credentials, or billable
provider calls form part of the evidence. Documentation retrieval date is
not a model release date.

## Verified identities and capabilities

The requested UX offers low, medium, and high effort, with high as the
application default. All five verified backend models below document those
three API values. The requested **GPT 6.1 Luna** remains a distinct,
unverified candidate; GPT-6 Luna does not establish its identity.

<!-- markdownlint-disable MD013 -->
| Candidate / current profile | Exact documented API ID | Documented effort values | Source |
| --- | --- | --- | --- |
| GPT-6.1 Sol, production backend | `gpt-6.1-sol` | `low`, `medium`, `high`, `xhigh`, `max` | [Sol model](https://developers.openai.com/api/docs/models/gpt-6.1-sol) |
| GPT 6.1 Terra, requested candidate | `gpt-6.1-terra` | `none`, `low`, `medium`, `high`, `xhigh`, `max` | [Terra model](https://developers.openai.com/api/docs/models/gpt-6.1-terra) |
| GPT 6.1 Luna, requested candidate | Unverified | Unverified | [Official catalog](https://developers.openai.com/api/docs/models) |
| GPT-5.6 Terra, evaluation backend | `gpt-5.6-terra` | `none`, `low`, `medium`, `high`, `xhigh`, `max` | [Earlier Terra model](https://developers.openai.com/api/docs/models/gpt-5.6-terra) |
| GPT-6 Luna, evaluation backend | `gpt-6-luna` | `none`, `low`, `medium`, `high`, `xhigh`, `max` | [Luna model](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| GPT-6 Astra, evaluation backend | `gpt-6-astra` | `low`, `medium`, `high`, `xhigh`, `max` | [Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra) |
| GPT-Live 1, production voice frontend | `gpt-live-1` | No documented frontend effort selector | [Live model](https://developers.openai.com/api/docs/models/gpt-live-1) |
<!-- markdownlint-enable MD013 -->

The five backend model pages document function calling, Structured Outputs,
text input/output, image input, and no native audio/video support. They list
Responses tools including web/file search, computer use, and MCP. Use
Responses for Skyttel's tool calls: Sol and GPT-6.1 Terra explicitly require
it; GPT-6 Luna permits Chat Completions function calling only at `none`.
These are model capabilities, not evidence Skyttel exposes every tool or
input modality. Sources: the individual model pages in the table.

The verified backends have a 1,050,000-token context window and a
128,000-token maximum output. Sol, both Terra versions, and GPT-6 Luna
document `medium` as the provider default. Skyttel must send `high`
explicitly to meet the requested application default. Sources: the same
model pages.

GPT-Live 1 accepts text and audio input/output, supports function calling,
and does not support Structured Outputs or image/video input. It delegates
reasoning and tool work to a backend; its effort is not the backend's
`reasoning.effort`. See the
[Live model](https://developers.openai.com/api/docs/models/gpt-live-1).

Exact-name searches for `GPT 6.1 Luna` and `gpt-6.1-luna` on the official
documentation domains return no results on the verification date. The
[catalog](https://developers.openai.com/api/docs/models) names GPT-6 Luna
and GPT-6.1 Terra. This cannot prove GPT 6.1 Luna does not exist or establish
an API ID, account access, or capabilities for it. Do not substitute
`gpt-6-luna` silently.

## Actual Skyttel request routing

[Production profiles](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/conversation-capacity.ts#L1)
select `gpt-6.1-sol` / `high` for backend work and `gpt-live-1` for voice.
The voice profile has no effort field. The
[evaluation profiles](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/scripts/model-evaluation/profiles.json)
also contain GPT-5.6 Terra, GPT-6 Luna, and GPT-6 Astra; their source checks
are dated 2026-10-10 or 2026-10-11. They contain neither requested 6.1
candidate. Profile entries are local configuration, not successful API
availability checks.

One
[`respond` instance](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L228)
captures the application-injected model profile. It serves all these calls:

- [Work and function selection](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L1454).
- [User-request interpretation and proposed-operation comparison](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L1205).
- [Conversation summarization](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant.ts#L613).

The
[request wrapper](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/text-assistant-model.ts#L96)
sends `model` and `reasoning.effort` on every Responses request, with
`store: false` and `parallel_tool_calls: false`. Scope interpretation and
comparison use no tools, request JSON in their prompts, and parse it with
[local schemas](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/assistant-turn-scope.ts#L62).
The wrapper does not request the provider's Structured Outputs format.
[Summarization](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/conversation-summary.ts#L8)
also uses no tools and produces plain text.

The
[voice setup](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/voice-assistant.ts#L540)
uses Live/WebRTC, voice `marin`, and `delegation: { type: 'client' }`.
[Voice work](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/voice-assistant.ts#L723)
dispatches to the existing text-backend routes. Thus backend model/effort
selection can affect voice work without replacing the model that listens
and speaks. This follows the documented
[client delegation architecture](https://developers.openai.com/api/docs/guides/live-delegation).

## Changes during a conversation

The API accepts a backend model and effort on each Responses request.
With client delegation the application owns that configuration. Inference:
Skyttel can select a different backend for a later request while retaining
its Live connection; this requires implementation because the current
profile is captured at application creation. It does not alter a request
already running. See the request wrapper above and
[client delegation](https://developers.openai.com/api/docs/guides/live-delegation#configure-client-delegation).

With provider-managed Responses delegation, `session.update` can change
the backend model and supported reasoning settings. Skyttel uses client
delegation, so that update mechanism does not configure its backend.
See [Responses delegation](https://developers.openai.com/api/docs/guides/live-delegation#configure-responses-delegation).

The Live model, audio settings, and delegation mode are startup settings;
changing them requires a replacement Live session. Live supports separate
append events for instructions, factual context, and spoken commentary.
See [session updates](https://developers.openai.com/api/docs/guides/live-conversations#update-a-live-session).
Backend switching therefore differs from changing the Live frontend.

## Remaining evidence and decisions

- Resolve the exact identity and official documentation for GPT 6.1 Luna
  before enabling it. Keep that candidate explicitly unverified meanwhile.
- Project access and limits need an authorized account check. The model
  pages publish usage-tier limits and exclude the free tier; public docs
  do not establish this installation's access. No such check is included.
- Swedish task accuracy, latency, cost, voice quality, and continuity when
  switching profiles need representative, explicitly authorized billable
  trials. Documented support does not establish their quality.
- A focused follow-up should decide whether user-selected effort also
  governs request interpretation, operation comparison, and summaries.
  Today those calls share the worker's profile. Keeping independent
  profiles would be a new product and implementation decision.
- A switching contract must decide when changes take effect and how to
  preserve pending work and context. Cross-model replay of existing
  provider output items and model-specific state is not verified here;
  do not infer it from equal context-window sizes. The current
  [context accounting](https://github.com/viscalyx/skyttel/blob/8fd3c0cbecb89c15ffb239d54e97e3d7fe10e625/src/server/conversation-capacity.ts#L35)
  also captures profile capacities and needs to follow any future switch.
