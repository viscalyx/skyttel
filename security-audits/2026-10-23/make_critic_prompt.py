import json
import sys
from pathlib import Path

RUN = Path("/Users/johlju/.codex/visualizations/2026/10/23/01a169a6-d373-7272-b9d4-a64c4fa18740/security-audit-skill/skyttel/run-1")
SKILL = Path("/Users/johlju/source/skyttel/.agents/skills/security-audit")
agent_id = sys.argv[1]
agent_root = RUN / "agents" / agent_id
(agent_root / "scratch").mkdir(parents=True, exist_ok=False)
(agent_root / "artifacts").mkdir(parents=True, exist_ok=False)
ledger = json.loads((RUN / "coverage-ledger.json").read_text())
fingerprints = sorted({fingerprint for unit in ledger for fingerprint in unit["result_fingerprints"]})
hunting = (SKILL / "HUNTING.md").read_text()
critical = hunting[hunting.index("## Coverage-critic waves"):]
prompt = "\n\n".join([
    "You are a fresh source-only research coverage critic for a full standard Skyttel security audit. Read source but do not run target code, use network, or write files. Return exactly one JSON object using the contract below, without prose. Propose coverage gaps, not findings.",
    "## Architecture (verbatim)\n\n" + (RUN / "architecture.md").read_text(),
    "## Current full coverage ledger\n\n" + json.dumps(ledger, ensure_ascii=False, indent=2),
    "## Current candidate fingerprints and prior coverage\n\n" + "\n".join(fingerprints) + "\nNo compatible prior ledger exists.",
    "## Critic contract and workflow (verbatim)\n\n" + critical,
    f"Explicitly inspect unmapped entry points, parallel paths, lifecycle states, selected companion classes, exclusions, checks and reviewed paths, and source paths not represented by the {len(ledger)} units. Keep your returned missing_units source-backed with exact starting paths. A source-only check is sufficient to assess coverage. Do not duplicate a unit merely by renaming it."
])
(agent_root / "assignment.md").write_text(prompt + "\n")
