import json
from pathlib import Path

ROOT = Path("/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel")
RUN = ROOT / "run-1"
SKILL = Path("/Users/johlju/source/skyttel/.agents/skills/security-audit")
ledger = json.loads((RUN / "coverage-ledger.json").read_text())
schema = json.loads((SKILL / "report-schema.json").read_text())
validation = (SKILL / "VALIDATION-AND-REPORTING.md").read_text()
candidate_rules = validation[validation.index("#### Candidate-verifier prompt"):validation.index("A verifier can promote")]
assignments = {
    "verifier_ai": ROOT / "candidate-ai.json",
    "verifier_restore": ROOT / "candidate-restore.json",
    "verifier_spend": ROOT / "candidate-spend.json",
    "verifier_attempt_volume": ROOT / "candidate-attempt-volume.json",
    "verifier_history_volume": ROOT / "candidate-history-volume.json",
    "verifier_definition_oracle": ROOT / "candidate-definition-oracle.json",
}

def section(text, heading):
    lines = text.splitlines(keepends=True)
    start = next(i for i, line in enumerate(lines) if line.startswith("## ") and line[3:].split(" (", 1)[0].strip() == heading)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    return "".join(lines[start:end]).rstrip()

for agent_id, candidate_path in assignments.items():
    candidate = json.loads(candidate_path.read_text())
    linked = [u for u in ledger if candidate["fingerprint"] in u["result_fingerprints"]]
    assert linked, agent_id
    agent_root = RUN / "agents" / agent_id
    (agent_root / "scratch").mkdir(parents=True, exist_ok=False)
    (agent_root / "artifacts").mkdir(parents=True, exist_ok=False)
    validation_blocks = []
    for block in sorted({b for u in linked for b in u["selected_companion_blocks"] if b.endswith("#Validation rules")}):
        file_name, heading = block.split("#", 1)
        validation_blocks.append(section((SKILL / file_name).read_text(), heading))
    parts = [
        "You are a fresh candidate verifier. You did not hunt this candidate. Try to refute it independently from current source. Review source only; the parent has not verified all required sandbox and promotion controls, so do not execute target code or write files. Return exactly one JSON object with decision confirmed, needs_validation, or rejected and a matching final schema-shaped record, with no prose.",
        "## Candidate\n\n" + json.dumps(candidate, ensure_ascii=False, indent=2),
        "## Linked coverage units and checks\n\n" + json.dumps(linked, ensure_ascii=False, indent=2),
        "## Architecture\n\n" + (RUN / "architecture.md").read_text(),
        "## Exact relevant companion validation rules\n\n" + "\n\n".join(validation_blocks),
        "## Candidate verifier method and promotion procedure (verbatim)\n\n" + candidate_rules,
        "## Schema branches (verbatim)\n\n" + json.dumps(schema["items"]["oneOf"], ensure_ascii=False, indent=2),
        f"## Isolation\n\nAgent ID: {agent_id}. Scratch: {agent_root / 'scratch'}. Parent-owned artifacts: {agent_root / 'artifacts'}. Promotion allowlist is empty, with per-file and cumulative bound 0 bytes. Do not execute target code. Prior run records: none. Do not read or rely on another verifier's conclusion."
    ]
    (agent_root / "assignment.md").write_text("\n\n".join(parts) + "\n")
