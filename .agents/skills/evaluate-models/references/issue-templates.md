# Model evaluation issues

Create one `model-evaluation` issue per model and effort level, recording its
modality. A model evaluated at low and high effort gets two separate issues.
For voice,
include the backend profile in the model identity. Fill the description before
payment and update its result and spending fields when execution ends. Keep
versioned evidence in comments; link it from the description.

A valid failure belongs in evaluation history. A later explicit rerun gets a
new issue linked to its predecessor; completed models keep their recorded
results. Close a finished issue while retaining its label, whether the model
passes or fails. Leave an interrupted evaluation open with its missing work.
For evaluator defects or calibration failures, follow the exclusion guidance in
[run support](run-support.md).

## Title template

`Model evaluation: <provider>/<model> | <effort> | <text or voice>`

Use `not applicable` for models without an effort setting. For voice, write
`<voice model> + <backend model>/<backend effort>` in the model field.
Keep the title stable; the description carries the current outcome.

## Description template

Copy the following structure and replace placeholders with concrete values.
Use `pending` for uncollected results and `not applicable` for unused settings.

```markdown
## Goal

Evaluate <model/profile> against Skyttel's requirements and compare the result
with the application's recorded model. Correctness comes before time and cost.

## Model and scope

- Run: <run-id>, started <UTC timestamp>
- Provider and model: <provider>, <exact model ID>
- Effort, service tier and limits: <settings>
- Modality: <text or voice; voice model and backend profile when applicable>
- Scenarios and repetitions: <catalog selection; preliminary or qualification>
- Application model: <effective profile and recorded result issue, or missing>
- Related results: <comparable issues; explicit rerun predecessor if present>

## Reproducibility

- Code: <commit>
- Catalog and fixtures: <source and hashes; audio hashes for voice>
- Scoring: <judge provider/model/effort, configuration hash and controls>
- Provider verification: <official model, limits, pricing and counting sources>
- Local verification: <commands and evidence links>

## Spending authorization

- Authorized ceiling and scope: <USD; per model run or combined campaign>
- Authorization: <user instruction and date>
- Prior spending and holds within scope: <USD and original evidence>
- Conservative reservations and completion estimate: <USD or unknown; reason>
- Actual run spending: pending
- Outstanding holds and remaining budget: pending
- Campaign spending outside this scope: <USD and evidence, or not applicable>

## Result and decision

- Status: pending
- Attempts: <pass/fail/inconclusive/error/aborted/not run counts, or pending>
- Qualification: <preliminary, qualified, failed or incomplete>
- Response time and costs: <comparable results and regressions, or unavailable>
- Recommendation: pending
- Evidence: <links to versioned records in comments>
- Limitations and remaining work: <missing evidence and specific follow-up>
```

Account for every selected attempt in the result. Link reusable model results
without scheduling them again. Preserve original evidence and publish a linked
correction when a description changes the interpretation of an earlier result.
