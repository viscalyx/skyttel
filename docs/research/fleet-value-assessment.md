# Fleet value candidates for Skyttel

This assessment is for household users, developers, and installation
operators deciding which outcomes could justify a free-only Fleet trial.
Sources are accessed on 2026-11-02. The Skyttel baseline is commit
`a3e60a0b99513999611dcb1ccba00672ae27aa2b`. No account, connection, model
call, or live trial supplies evidence here.

**Documented** means a first-party capability or repository contract.
**Plausible value** means an inference to test. **Unverified** means no
observed Fleet/Skyttel result. Documented features are not automatically
available in the intended free account. This assessment does not choose
the user's priorities or decide whether to proceed.

Household scenarios below describe potential product value, not established
service eligibility. LangChain's terms, dated 2026-06-02, describe internal
business use in section 2.1(A) and restrict disclosure of benchmark,
performance, and comparative information in section 2.4(c) [F12]. Its
privacy policy describes the service as business-oriented and excludes
intended personal/family/household use [F13]. Applicability to fictional
development testing, eventual household use, and publication of trial
results needs explicit consideration in planning. No legal conclusion or
authorization follows from this documentation review.

## Existing Skyttel options

The [external assistant guide][S1] describes household selection, separate
external-AI consent, read access, optional proposal/save permission, and
revocation. It names ChatGPT web and Codex as target text clients; this is
not evidence that every client/version is qualified. External assistants
share the user's durable draft with the browser. They can read relevant
objects, relationships, types, history, and their own draft; proposals
require write permission and saving requires an explicit request. They
cannot administer users, export or import households, or permanently erase
information.

The [built-in conversation][S2] combines text and voice, map feedback,
draft review, save receipts, and conversation context in the application.
Forms remain usable without a conversation. Its requested-action scope
protection does not verify an external assistant's interpretation
([operator contract][S3]). Fleet would therefore add another assistant
experience and another interoperability target, not a new household data
model or stronger server authority.

The [MCP implementation][S4] checks audience, scopes, the live grant and
membership, then selects the granted household and user. Read-only grants
do not register write tools. Its bounded object reads deliberately expose
only names, IDs, and types for other relationship endpoints. These are
useful boundaries for testing truthful answers and identity handling.

## Household work

### Read and explain a household relationship

**Documented:** Fleet offers no-code agents and ordinary chat [F1]. Its
remote MCP integration discovers tools and forwards calls to the server,
which retains authentication and authorization. OAuth automatic dynamic
client registration and manual authorization-code/PKCE modes are documented
[F2]. Compatibility with Skyttel remains unverified.

**Plausible value:** a person who prefers Fleet could ask, in Swedish,
“Which service account uses this email address, who uses the service, and
which agreement pays for it?” Fleet might reduce navigation and combine
several relevant reads into an explanation. Skyttel's existing assistants
already support map questions; the incremental benefit must be measured
as client preference, clearer answers, fewer corrections, or easier access.

**Evidence needed:** use known fictional objects, including two with the
same name and an incomplete relationship. Compare the answer with the
saved map. Check endpoint details are read when needed, unknown facts stay
unknown, IDs are not conflated, and an empty result is reported honestly.
Record correction count, elapsed time, and allowance consumed. A fluent
answer or successful tool call alone establishes no correctness benefit.

**Prerequisites and effort:** an approved reachable development origin,
working login and read-only consent, plus a configured Fleet agent. This
adds another account, instructions, conversation surface, and external
copy of returned information. Skyttel's external connection is text; it
does not provide the built-in voice/map experience [S1], [S2].

### Review a draft and optionally propose corrections

**Documented:** Fleet supports editable agent instructions and per-tool
Auto/Ask approval [F3]. Skyttel already supplies draft review, conflict
handling, explicit saving, and durable receipt/recovery semantics [S1].

**Plausible value:** Fleet could explain a draft created in the browser,
identify an ambiguous subscription owner, and ask a useful clarification.
Optional write work could test whether another assistant respects the
same draft across clients. This is behavioral evidence beyond merely
proving authentication.

**Evidence needed:** first demonstrate faithful read-only review. A later
optional stage must show that requested corrections enter only the draft,
“do not save” leaves it unsaved, and an explicit save handles the whole
current draft and reports its receipt. An interrupted response must lead
to checking the original save attempt before repeating work. Compare
conflicts and clarification against the guide, not against Fleet's
confidence. No write stage is necessary merely to validate read access.

**Limitations:** Fleet approval is an additional client gate; it does not
grant Skyttel write scope, establish the user's complete save intent, or
replace server version checks. Ask mode can also add interruptions that
the built-in requested-edit workflow avoids. Free-account availability of
the relevant controls and correct approval behavior remain unverified.

### Bring other service context or produce a recurring summary

**Documented:** Fleet lists email, calendar, document, and other tool
integrations [F4]. It supports event channels [F5] and UTC schedules [F6].

**Plausible value:** a future assistant could compare a fictional renewal
notice with the corresponding saved agreement, or prepare a recurring
read-only subscription summary. That could save switching between apps;
the exact integrations available in another existing client determine
whether it is incremental value.

**Limitations and evidence needed:** this extends setup, permissions, data
flows, and potentially service costs. It is not necessary for a Skyttel-only
read trial. Before considering it, determine whether the user wants that
workflow, whether each service is free under the intended account, and
whether source disagreements are explained without invented facts.
An unattended schedule must never become inferred permission to save.
Skyttel's free property labels do not themselves implement renewal-date
or financial logic [S1]. No automatic monitoring benefit is established.

## Developer interoperability and diagnosis

**Documented:** Fleet is another MCP client implementation [F2]. Its runs
are traced, with agent and individual-thread trace entry points [F3].
LangSmith describes traces as records for inspecting agent execution
[F9]. Skyttel's built-in client uses the actual HTTP/MCP entrance rather
than reading household content directly from SQLite ([code][S5]).

**Plausible value:** Fleet may expose interoperability assumptions hidden
by testing only the built-in client or the existing target clients. Its
trace could distinguish no tool call, a wrong search, a rejected request,
and a correct result followed by an incorrect explanation. This can make
a reproducible compatibility report more actionable than a screenshot of
the final answer.

**Evidence needed:** keep separate verdicts for connection, useful task
completion, assistant correctness, and authorization. Establish whether
tool discovery, argument schemas, JSON results, refresh/reconnect, and
revocation work. After revocation, a new read must fail even from an
already open thread; re-reading remembered text is not a fresh authorized
read. Include permission denial and name ambiguity as expected outcomes.
If a problem appears, preserve a sanitized reproduction and verify its
cause against code or an invented-data check. Do not turn a plausible
trace interpretation into a confirmed server defect.

**Comparative limits:** one independent client expands coverage but does
not certify general MCP compatibility. Fleet-managed tiers can change
their underlying model [F3]; record tier, date, agent instructions, and
application revision rather than asserting a fixed model identity.
Configuration iteration and trace inspection consume time and allowance.
The existing [model evaluation workflow][S6] remains the qualification and
comparison workflow; a Fleet demonstration does not replace it or
authorize billable real-model/voice evaluation.

## Installation-operator value and boundaries

### Setup and maintenance

**Documented:** Fleet's quickstart uses managed models without a separate
model-provider key [F7]. Integration settings support reconnecting tools
and exporting agent configuration [F8]. Changing a custom MCP URL requires
removing and re-adding its agent tools [F2].

**Plausible value:** an operator helping a household test another client
could avoid deploying another assistant runtime and another model-key
configuration. The [installation guide][S7] says external MCP access can
remain available when Skyttel's built-in provider key is absent. This
offers a candidate alternate text route, not a demonstrated outage
fallback: login, hosting, and the same MCP server must still work.

**Evidence needed:** measure initial setup and a normal reconnect. Identify
who owns the agent, who handles expiry, and how a changed development URL
affects recovery. Compare the support effort with the built-in route and
an existing external client. An extra account, model changes, consent, and
connection maintenance may outweigh saved runtime administration.

### Troubleshooting

**Plausible value:** an operator with permitted Fleet trace access could
help isolate a client-side failure or construct a precise support report.
Record whether a trace actually changes the diagnosis or next action,
and the investigation time, rather than counting trace existence as value.

**Boundary:** Fleet traces describe Fleet's execution. They do not reveal
Skyttel process health, SQLite behavior, deployment state, or built-in
voice/text execution automatically. Skyttel already has separate bounded
[runtime trace delivery][S8], [diagnostic assessment][S9], and restricted
[security events][S10]. The MCP route does not create the built-in
assistant's observation tree [S4], [S5]. Compare the client tool call and
server-side evidence where independently available; do not assume joined
traces, shared identities, or complete delivery merely because both
products use LangSmith. Map outcomes and receipts remain authoritative.

### Access control

**Documented:** Fleet agent visibility can be private or shared; private
agents still use workspace-scoped secrets [F8]. The dedicated identity
documentation distinguishes user credentials from fixed credentials,
says the identity cannot subsequently change, and requires fixed
credentials for channels and schedules [F10].

**Plausible value:** a private, appropriately scoped agent could reduce
accidental configuration sharing during a one-person trial. Fleet controls
could help manage its own agents, not installation authority.

**Evidence needed:** explicitly select whose credentials act, verify the
Skyttel account and household, and demonstrate revocation. Do not infer
per-user isolation from “workspace agent”: the sharing page's general
OAuth table and the identity page need reconciliation for the actual
agent type. A shared or scheduled agent using its owner's grant presents
a different access question from a personal chat. Multi-user sharing is
not established as free-eligible.

Household administrator and installation operator remain separate roles.
Even an operator's MCP connection receives household tools, not deployment,
user-management, security-log, cost, recovery, or diagnostic-setting tools
[S1], [S4]. Operator investigation must use separately permitted interfaces.

### Cost visibility

**Documented:** Fleet's workspace Usage page requires its read-admin
permission; editing limits requires write-admin permission. It describes
per-agent/user breakdowns and weekly limits. Limits apply at run start,
can be exceeded by a completing run, propagate with delay, and depend on
traces, so deleting traces affects usage/enforcement [F11].

**Plausible value:** the account holder might attribute Fleet consumption
to a trial agent and understand how many useful tasks fit the allowance.
The meaningful result is consumption per correct completed workflow,
including failed attempts and corrections.

**Boundary and evidence needed:** verify which Usage controls exist in the
actual free personal account and whether its display reconciles with the
remaining LSU allowance. Do not treat a USD weekly limit as proof of a
hard free-quota boundary. Reconcile pricing and trace limits separately
before planning task volume; LSU is not a fixed number of successful tasks.

Skyttel's [installation cost ledger][S11] estimates hosting and its own
built-in model/voice usage, with separate operator authorization enforced
by [cost routes][S12]. Fleet's account usage is a different ledger. Neither
documents combined billing, and Fleet receives no access to `/costs`
through MCP. Separate external service charges remain outside a free-only
trial even if Fleet itself has allowance remaining.

## Decisions a later trial plan must make

All claimed outcomes above remain **unverified**. The evidence makes these
planning questions precise without answering them for the user:

1. Which household question, interoperability finding, or support task
   matters enough to measure, and which existing option is its baseline?
2. What observable improvement would count: correctness, fewer corrections,
   simpler access, an actionable diagnosis, or lower maintenance effort?
3. Which documented controls and model tier are actually available without
   a payment method, paid feature, or separately billable integration?
4. Is a personal user-credentials chat sufficient, or is fixed-credential
   automation essential enough to require a separate access decision?
5. Does optional write work demonstrate value beyond read-only discovery,
   consent, permissions, and revocation?

Before any execution, confirm data handling for conversations, memory,
agent files, and traces separately; revocation stops new Skyttel access but
does not delete received information [S1]. Preserve the development
household's DB-console seed recovery option. Define setup/investigation
time, quota observations, and inconclusive outcomes in the plan. No reset,
connection, or trial is part of this assessment.

## Sources

Fleet references are official LangChain documentation, accessed 2026-11-02.
Skyttel links pin the inspected revision so later changes cannot silently
alter this baseline.

[F1]: https://docs.langchain.com/langsmith/fleet
[F2]: https://docs.langchain.com/langsmith/fleet/remote-mcp-servers
[F3]: https://docs.langchain.com/langsmith/fleet/essentials
[F4]: https://docs.langchain.com/langsmith/fleet/tools
[F5]: https://docs.langchain.com/langsmith/fleet/channels
[F6]: https://docs.langchain.com/langsmith/fleet/schedules
[F7]: https://docs.langchain.com/langsmith/fleet/quickstart
[F8]: https://docs.langchain.com/langsmith/fleet/manage-agent-settings
[F9]: https://docs.langchain.com/langsmith/observability
[F10]: https://docs.langchain.com/langsmith/fleet/agent-identity
[F11]: https://docs.langchain.com/langsmith/fleet/workspace-admin
[F12]: https://www.langchain.com/terms-of-service
[F13]: https://www.langchain.com/privacy-policy
[S1]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/user-guide/assistants.md
[S2]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/user-guide/text-assistant.md
[S3]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/assistant-security-events.md
[S4]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/assistant-routes.ts#L212-L357
[S5]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/text-assistant-mcp.ts#L13-L123
[S6]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/development/testing.md#model-evaluation-history
[S7]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/installation.md#recover-assistant-access
[S8]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/langsmith-delivery.md
[S9]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/langsmith-assessment.md
[S10]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/privileged-security-events.md
[S11]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/docs/operations/costs.md
[S12]: https://github.com/viscalyx/skyttel/blob/a3e60a0b99513999611dcb1ccba00672ae27aa2b/src/server/cost-routes.ts#L15-L40
