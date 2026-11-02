# Fleet free use and data handling

This evidence is for Skyttel developers and installation operators deciding
whether to plan a fictional-data Fleet trial. It establishes the published
free-use boundary and identifies checks that need a later authorized
account session. It does not establish compatibility or authorize a trial.

Access date for every external source below: **2026-11-02**. Sources are
LangChain's live documentation, pricing, product information, and terms.
No account creation, authenticated provider requests, household data,
credentials, or paid operations are necessary for this investigation.

**Assessment:** the documentation supports a limited, one-person trial on
the Developer plan without a payment method or model-provider key. Keep
Fleet's monthly allowance and trace ingestion within their separate
limits. Do not promise a fixed number of useful conversations or complete
erasure after 14 days. Those conclusions go beyond the published facts.

## Account and model boundary

**Documented:** the Developer plan costs $0 per seat, permits one seat, and
includes 5,000 base traces monthly. Plus costs $39 per seat monthly and has
usage charges. Invited users count as seats. Fleet includes underlying
model costs; third-party tool charges remain the third party's charges.
Every Fleet run produces LangSmith traces that count toward tracing usage.
[Plans and pricing][pricing]

First login creates a personal organization and default workspace. Shared
organizations require a credit card before use. Manually creating another
organization requires Plus. Adding a card to the personal organization
removes its 5,000-trace restriction and enables excess-trace charges.
[Organization setup][hierarchy], [Billing setup][billing]

Personal organizations have one workspace and cannot invite users. Their
plan is Developer. Enterprise workspace RBAC is unavailable on other
plans, where users default to Admin. A free trial therefore cannot validate
team collaboration or Enterprise permission separation.
[Administration overview][administration]

The current pricing page specifies **7 Fleet LSUs per organization per
month**, resetting monthly; Plus includes 37 and bills additional usage.
An LSU is a LangChain Standard Unit worth $1. After Developer's allowance,
Fleet pauses new runs until reset or upgrade. Pricing is based on work,
model tier, and content volume, with no guaranteed conversation count.
[Plans and pricing][pricing]

The Essentials documentation dates the LSU/model-tier change to
**October 1, 2026**. Older indexed descriptions using LCUs or fixed run
counts are unsuitable for the current plan. Fast, Pro, and Max are managed
tiers with changing underlying models. Custom models are an Enterprise
matter rather than an alternative in the managed picker.
[Fleet essentials][essentials]

The quickstart explicitly requires no model API key. Thus a new managed
Fleet trial should not need a separate OpenAI or Anthropic billing account.
Do not confuse a keyless managed model with unlimited model usage.
[Fleet quickstart][quickstart]

**Inference for Skyttel:** start with one named tester, one private agent,
and manual chat. Multi-user findings will necessarily be limited. A model
tier comparison also cannot establish behavior for a permanently fixed
underlying model version.

## Quotas, exhaustion, and cost visibility

The following trace limits apply to Developer with **no payment on file**:

| Meter | Limit | Reset |
| --- | --- | --- |
| Unique ingested traces | 5,000 | Calendar month, UTC |
| Trace events | 50,000 | Each clock hour, UTC |
| Trace data ingestion | 500 MB | Each clock hour, UTC |

An event is a run creation or update; both consume quota. Inputs, outputs,
and metadata contribute to ingestion, including data resent on updates.
Exhaustion returns HTTP 429 for trace ingestion. Configured tracing limits
are approximate and may briefly overshoot; settings can take minutes to
apply. These facts concern ingestion, not a documented guarantee that a
Fleet conversation stops when tracing fails.
[Administration overview][administration]

Fleet's Usage page shows total spend, threads, and runs, with agent/user
breakdowns. Weekly per-agent and per-user spend limits reset Mondays.
They are checked at run start: a permitted run can finish above its limit.
Propagation takes minutes. Calculations depend on traces, so deleting
traces affects reported usage and enforcement. Access requires Fleet admin
permissions; the page does not explicitly guarantee availability on every
free account. [Fleet workspace administration][workspace]

**Unknown:** the exact Fleet allowance reset instant, per-tier conversion
rates, token limits, run concurrency, and handling of an already-running
task at allowance exhaustion are not specified in these sources. Neither
is Fleet's end-user behavior if trace ingestion reaches its own limit.
The documentation establishes a pause for new Fleet runs, not an exact
dollar ceiling for every possible platform feature.

**Trial implication:** record starting allowance and trace usage, keep
tasks short, and stop at any request for a card, upgrade, credits, or
provider key. Spend settings supplement this boundary; a small weekly
setting is not a substitute for staying on the no-card plan.

## Data is stored in several distinct artifacts

### Conversations and execution state

Fleet threads contain messages, agent responses, and actions. Thread-scoped
memory carries current-conversation context. All Fleet runs are stored as
LangSmith traces, with 14-day default retention on Cloud. The Fleet docs
also state that LLM providers do not retain this data.
[Fleet essentials][essentials]

Fleet's settings guide says threads remain user-scoped even for shared
agents. Private and shared agents both use workspace-scoped secrets.
Deleting an agent permanently deletes it and all linked threads and
unlinks attached channels. The guide does not give a purge deadline or
enumerate all state, memory, file, credential, or trace consequences.
[Agent settings][settings]

Generic Agent Server documentation describes persisted checkpoints,
application state, thread metadata, assistants, and long-term memories.
Its configurable TTLs and API deletion facilities describe Agent Server
deployments; they do not establish that a free Fleet customer can configure
Fleet's managed deployment TTLs.
[Data storage and privacy][storage]

**Unknown:** Fleet's default thread/checkpoint retention, per-thread
deletion controls available on free accounts, and deletion timing for all
historical state versions. Do not apply trace expiry to conversation state.

### Long-term memory, instructions, skills, and other files

Fleet uses persistent agent files for instructions, tool configuration,
subagents, and skills. Agents can write remembered information into a
memories folder, with approval required by default.
[Fleet essentials][essentials]

LangChain's memory architecture article explains that these apparent files
are stored in PostgreSQL through a virtual filesystem. They can include
arbitrary knowledge derived from earlier interactions. This describes the
architecture, not a contractual retention period.
[Memory system architecture][memory]

Private skills live in an agent's long-term memory; deleting one removes
it permanently. Shared skills have separate workspace scope, and only
their creator can edit or delete them. Deleting a shared skill removes it
from the workspace and agents using it.
[Fleet skills][skills]

Agent settings offer a ZIP download of configuration, plus memory-update
approval controls. The export is not documented as an export of every
thread, trace, attachment, or historical copy.
[Agent settings][settings]

**Unknown:** general memory/file retention, uploaded attachment handling,
file-version retention, and whether agent deletion purges all associated
memory or uploaded files. No universal free-plan file deletion SLA appears
in the examined docs. Avoid uploading files for the initial trial and keep
memory approval enabled; separately inspect and clean memory during any
later authorized teardown.

### Tool requests and results

Remote MCP tools execute outside LangSmith; Fleet forwards requests and
returns results to the agent. The server owns authentication and
authorization. Configured headers accompany discovery and execution.
OAuth with automatic registration or manual provider registration is
documented, without an explicit free-plan eligibility statement.
[Remote MCP servers][remote]

**Inference:** fictional household results become external-AI input and may
be represented in conversation state, tool execution traces, and memory
if the agent saves them. Treat each copy separately. Permission revocation
can prevent future requests without establishing deletion of prior copies.
The sources do not promise complete tool-payload redaction or configurable
Fleet tracing suppression on the free plan.

### Traces, monitoring metadata, and datasets

Current trace retention is 14 days for base and 180 days for extended.
After expiry traces disappear from UI/API; user data is deleted afterward,
but analytics/billing metadata may persist indefinitely. The dedicated
usage guide says deletion follows shortly after expiry; the administration
overview says within a day. Avoid promising a uniform stronger deadline.
[Usage and billing][usage], [Administration overview][administration]

Trace deletion is available through the API and removes related feedback,
aggregations, and statistics. It is asynchronous; most deletions harden
within six hours or sooner. Customizing extended retention duration is
Enterprise-only. Project defaults allow choosing base or extended.
[Data purging][purging]

Datasets retain copied inputs and outputs indefinitely, even after the
original trace expires. Dataset operations create versions, including when
examples are deleted. Ordinary deletion therefore does not establish
erasure from historical versions.
[Billing guidance][billing], [Dataset management][datasets]

The self-service example API distinguishes soft deletion from hard deletion.
Hard deletion permanently removes inputs, outputs, and metadata from all
versions of the specified example. Dataset copies need their own cleanup;
trace cleanup alone is insufficient. The examined docs do not guarantee
that example hard deletion purges every attachment or backup.
[Data purging][purging]

## Paid-feature and retention pitfalls

Current retention behavior differs from older blanket auto-upgrade advice:

- API/SDK feedback extends retention when explicitly requested.
- Online evaluators and automation rules can extend retention; new ones
  enable extension by default, with opt-out controls.
- A thread-level rule can upgrade every trace in its thread.
- UI feedback, notes, and manual annotation-queue additions leave the tier
  unchanged by default.
- Experiment runs default to extended retention.

Extension increases cost as well as retention. Existing upgraded traces
keep their tier. The documented side effects of an extended-trace cap
include disabling rules, feedback, and annotation actions; the exact free
account behavior needs confirmation.
[Usage and billing][usage]

Do not enable evaluators, experiments, automation, or dataset collection
merely to observe the initial trial. LLM evaluator spend is separately
tracked, and in-flight evaluations can exceed configured caps before
pausing. [Evaluator spend][evaluators]

Gateway Credits are a separate paid-inference product purchased by card.
They are not needed for managed Fleet model access.
[LLM Gateway][gateway], [Fleet quickstart][quickstart]

The live pricing table's information tooltip lists 0.005 LSU per base trace
and 0.0025 LSU per extended-retention upgrade. The Developer table excludes
Deployment and Engine. Plus allowances require its paid subscription.
[Plans and pricing][pricing]

Self-hosted Fleet requires Enterprise; it cannot preserve this trial's
free boundary. [Fleet product information][product]

Optional search-tool integrations require their own keys; they are not
prerequisites for managed Fleet inference.
[Fleet workspace administration][workspace]

**Cost separation (inference):** Fleet's allowance covers its managed
inference. It does not pay for Skyttel's hosting, Skyttel-initiated provider
calls, third-party tools, or another assistant's subscription. Any proposed
scenario that invokes those must independently satisfy the no-billable-call
constraint; a free Fleet plan does not establish that fact.

## Contract and later decision checks

The June 2, 2026 terms state that Customer Data is not used to train,
develop, or improve LangChain products/models. They separately permit
operational metadata use. No-charge access carries no data retention
rights or support/performance commitments. Return/destruction obligations
allow exceptions for routine backups, legal requirements, and internal
retention policies. No backup purge timetable is specified.
[Terms of service][terms]

The same terms limit platform use to internal business purposes and
restrict publishing/disclosing benchmarks, performance results, or
comparative information. The privacy policy describes a business service
not intended for personal, family, or household use, and distinguishes
customer data governed by customer agreements. Applicability to a
fictional-data development trial and its intended publication needs a
separate scope decision; this report makes no legal determination.
[Terms of service][terms], [Privacy policy][privacy]

Before any separately authorized trial, confirm in the actual account:

1. Personal Developer organization, one seat/workspace, no payment method,
   current allowance, and no inherited billable configurations.
2. Custom MCP/OAuth, private agent, traces, and Usage controls work without
   upgrade prompts; do not infer free eligibility solely from general docs.
3. Base trace defaults and no retention-extending automations/evaluators;
   clarify any charge exposure for extended traces without a payment method.
4. Acceptable memory/file retention and a teardown that accounts for agents,
   threads, memories/files/skills, traces, datasets, credentials, and copies.
5. Whether limited one-user evidence and uncertain run capacity can answer
   the value question, and whether the intended evaluation/publication fits
   the service terms. Stop or narrow the trial if these conditions fail.

[pricing]: https://www.langchain.com/pricing
[hierarchy]: https://docs.langchain.com/langsmith/set-up-hierarchy
[billing]: https://docs.langchain.com/langsmith/billing
[administration]: https://docs.langchain.com/langsmith/administration-overview
[essentials]: https://docs.langchain.com/langsmith/fleet/essentials
[quickstart]: https://docs.langchain.com/langsmith/fleet/quickstart
[workspace]: https://docs.langchain.com/langsmith/fleet/workspace-admin
[settings]: https://docs.langchain.com/langsmith/fleet/manage-agent-settings
[storage]: https://docs.langchain.com/langsmith/data-storage-and-privacy
[memory]: https://www.langchain.com/blog/how-we-built-agent-builders-memory
[skills]: https://docs.langchain.com/langsmith/fleet/skills
[remote]: https://docs.langchain.com/langsmith/fleet/remote-mcp-servers
[usage]: https://docs.langchain.com/langsmith/usage-and-billing
[purging]: https://docs.langchain.com/langsmith/data-purging-compliance
[datasets]: https://docs.langchain.com/langsmith/manage-datasets
[evaluators]: https://docs.langchain.com/langsmith/evaluator-spend
[gateway]: https://www.langchain.com/langsmith/llm-gateway
[product]: https://www.langchain.com/langsmith/fleet
[terms]: https://www.langchain.com/terms-of-service
[privacy]: https://www.langchain.com/privacy-policy
