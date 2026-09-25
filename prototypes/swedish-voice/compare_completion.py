#!/usr/bin/env python3
"""THROWAWAY: paired Sol completion or transport experiment; generated data only.

Run --dry-run first. Paid use shares the stopped trial's existing budget.
No voice, existing map, or real transcript is read. No automatic API retries.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import time

import server
import compare_models as fixture
from terminal_actions import completion_report, domain


CASES = ("clear_draft", "clear_save", "scoped_questions")


def instructions(case):
    if case == "scoped_questions":
        return fixture.PROMPTS[case]
    text = fixture.PROMPTS["clear_batch"][0]
    return [text.replace("Spara inte.", "Spara hela utkastet när alla ändringar är klara.")
            if case == "clear_save" else text]


def run_turn(trial, case, turn, history, offline):
    underlying = "scoped_questions" if case == "scoped_questions" else "clear_batch"
    expected = fixture.expected_graph(underlying, turn)
    before = copy.deepcopy(trial.bridge.view())
    current = {"id": f"generated-{case}-{turn}", "text": instructions(case)[turn]}
    history.append({"role": "user", **current})
    trial.latest += 1
    payload = {"revision": trial.latest, "current_utterance": current, "history": copy.deepcopy(history)}
    proposal = fixture.offline_proposal(before["draft_map"], expected, before["draft_version"])
    report = fixture.expected_report(underlying, turn)
    if trial.completion_mode == "combined":
        scripted = [("submit_changes", {**proposal, "reviewed_map_version": before["map_version"],
                     "completion": "save" if case == "clear_save" else "draft", "questions": report["questions"]})]
    else:
        scripted = [("propose_changes", proposal),
                    ("save_draft", {"draft_version": before["draft_version"] + 1,
                                    "reviewed_map_version": before["map_version"]})
                    if case == "clear_save" else ("report_result", report)]
    for _, args in scripted:
        args.pop("request_id", None)
    calls = []
    actual_api = trial.api
    def api(endpoint, body):
        assert endpoint == "responses"
        try:
            fixture.audit_payload(body)
        except Exception:
            if not offline and trial.budget.last_reservation is not None:
                trial.budget.settle(trial.budget.last_reservation, 0)
            raise
        started = time.monotonic()
        if offline:
            name, args = scripted.pop(0)
            response = {"usage": {"input_tokens": 0, "output_tokens": 0}, "output": [{
                "type": "function_call", "call_id": f"generated-call-{len(calls)}", "name": name,
                "arguments": json.dumps(args, ensure_ascii=False)}]}
        else:
            response = actual_api(endpoint, body)
        calls.append({"elapsed_ms": round((time.monotonic() - started) * 1000),
                      "request": copy.deepcopy(body), "response": copy.deepcopy(response)})
        return response
    trial.api = api
    started = time.monotonic()
    result, error = None, None
    try:
        result = trial.delegate(payload)
    except Exception as failure:
        error = str(failure)
    finally:
        reply_ms = round((time.monotonic() - started) * 1000)
        trial.api = actual_api
    after = trial.bridge.view()
    full_saved = case == "clear_save"
    correct = (fixture.map_correct(after["saved_map"] if full_saved else after["draft_map"], expected)
               and (after["full_diff"] == [] if full_saved else after["saved_map"] == before["saved_map"]))
    final_report = None
    for call in calls:
        for output in call["response"].get("output", []):
            if output.get("type") != "function_call":
                continue
            args = json.loads(output["arguments"])
            if output["name"] == "report_result":
                final_report = args
            elif output["name"] == "submit_changes":
                final_report = completion_report(args, before, after)
    semantic_report = (result and result.get("text") == "Sparat." and result.get("task_receipt")
                       and result["task_receipt"]["saved_diff"] == domain()["differences"](before["saved_map"], after["saved_map"])) \
        if full_saved else fixture.report_correct(final_report, underlying, turn, after)
    passed = bool(result and not result.get("incomplete") and correct and semantic_report
                  and (bool(result.get("task_receipt")) == full_saved))
    if result:
        history.append({"role": "backend", "text": result.get("text", "")})
    return {"passed": passed, "map_correct": correct, "report_correct": bool(semantic_report),
            "error": error, "result": result, "calls": calls,
            "reply_ms": reply_ms,
            "elapsed_ms": round((time.monotonic() - started) * 1000),
            "cost_usd": sum(trial.model.costs(c["response"].get("usage", {}))[0] for c in calls)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--comparison", choices=("completion", "transport"), default="completion",
                        help="Compare completion flows, or MCP/direct with combined completion in both")
    parser.add_argument("--ledger-runtime", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not args.dry_run and args.ledger_runtime is None:
        parser.error("Paid comparison requires the stopped trial's existing --ledger-runtime")
    directory = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix="skyttel-completion-", dir="/private/tmp"))
    if not directory.is_relative_to(Path("/private/tmp")) or (args.output and directory.exists()):
        parser.error("Choose a new output directory under /private/tmp")
    directory.mkdir(parents=True, exist_ok=True)
    server.BACKEND_INSTRUCTIONS = fixture.neutral_instructions()
    budget = fixture.OfflineBudget() if args.dry_run else fixture.GuardBudget(
        server.Budget(args.ledger_runtime.resolve() / "PROTOTYPE-budget.json"), 1.50)
    trace = {"offline": args.dry_run, "comparison": args.comparison,
             "model": "gpt-5.6-sol", "reasoning": "low",
             "allocation_usd": 1.50, "budget_initial": budget.snapshot(), "runs": [],
             "source_hashes": {name: hashlib.sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
                               for name in ("server.py", "terminal_actions.py", "compare_completion.py",
                                            "compare_models.py", "result_reporting.py", "mcp_bridge.py",
                                            "work_status.py", "backend_models.py")},
             "instructions_sha256": fixture.digest(server.BACKEND_INSTRUCTIONS),
             "prompts_sha256": fixture.digest({case: instructions(case) for case in CASES})}
    def write():
        trace["budget_final"] = budget.snapshot()
        (directory / "results.json").write_text(json.dumps(trace, ensure_ascii=False, indent=2) + "\n")
    write()
    stop = False
    profiles = (("direct", "standard"), ("direct", "combined")) if args.comparison == "completion" \
        else (("mcp", "combined"), ("direct", "combined"))
    expected_initial, expected_tools = None, None
    for repetition in range(1, 3):
        for case in CASES:
            for transport, mode in (profiles if repetition == 1 else tuple(reversed(profiles))):
                scratch = directory / f"scratch-{repetition}-{case}-{transport}-{mode}"
                trial = server.Trial(scratch, map_runtime=scratch / "map", backend_model="gpt-5.6-sol",
                                     transport=transport, completion_mode=mode)
                run = {"repetition": repetition, "case": case, "mode": mode,
                       "transport": transport, "turns": []}
                trace["runs"].append(run)
                try:
                    group = fixture.setup_fixture(trial.bridge)
                    trial.bridge = fixture.ObservedBridge(trial.bridge, group)
                    trial.known_view = trial.bridge.view()
                    trial.budget = budget
                    fixture.audit_payload(trial.known_view)
                    run["initial_sha256"] = fixture.digest(trial.known_view)
                    run["tools_sha256"] = fixture.digest(trial.bridge.tools)
                    if expected_initial is None:
                        expected_initial, expected_tools = run["initial_sha256"], run["tools_sha256"]
                    if (run["initial_sha256"], run["tools_sha256"]) != (expected_initial, expected_tools):
                        raise RuntimeError("Comparison fixtures or base tool definitions differ")
                    history = []
                    for turn in range(len(instructions(case))):
                        print(f"{transport} {mode} {case} rep={repetition} turn={turn + 1}", flush=True)
                        outcome = run_turn(trial, case, turn, history, args.dry_run)
                        run["turns"].append(outcome)
                        print(f"  {'PASS' if outcome['passed'] else 'FAIL'} {outcome['elapsed_ms']}ms "
                              f"calls={len(outcome['calls'])} cost=${outcome['cost_usd']:.6f}", flush=True)
                        write()
                        if budget.snapshot()["reserved_usd"] or (outcome["error"] and "allocation" in outcome["error"].lower()):
                            stop = True
                            break
                finally:
                    trial.bridge.close()
                if stop: break
            if stop: break
        if stop: break
    write()
    print(str(directory / "results.json"), flush=True)


if __name__ == "__main__":
    main()
