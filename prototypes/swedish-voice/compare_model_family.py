#!/usr/bin/env python3
"""THROWAWAY: Luna/Terra/Sol/Astra comparison on generated maps, MCP, combined.

Run --dry-run before paid use. Stop the voice server first; the existing shared
ledger is the only paid budget. No real map or conversation is read.
"""
import argparse
import copy
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import statistics
import time

import compare_completion as completion
import compare_models as fixture
import server
from backend_models import BACKEND_MODELS

MODELS = ("gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol")
PROFILES = tuple((model, "low") for model in MODELS) + (("gpt-6-astra", "low"), ("gpt-6-astra", "high"))
ROOT = Path(__file__).resolve().parent


def measured_usage(call, prices):
    """Return usable accounting without discarding an incomplete raw response."""
    try:
        usage = call["response"]["usage"]
        return usage, prices.costs(usage)
    except (KeyError, ValueError, AttributeError, TypeError):
        return None


def summarize(trace):
    summary = {}
    for model, effort in PROFILES:
        profile = model + "/" + effort
        turns = [turn for run in trace["runs"] if run["profile"] == profile for turn in run["turns"]]
        if not turns:
            continue
        calls = [call for turn in turns for call in turn["api_attempts"]]
        prices = BACKEND_MODELS[model]
        measured = [value for call in calls if (value := measured_usage(call, prices)) is not None]
        usages = [usage for usage, _ in measured]
        unresolved = len(calls) - len(measured)
        conservative = sum(costs[0] for _, costs in measured)
        estimated = sum(costs[1] for _, costs in measured)
        reasoning = [(u.get("output_tokens_details") or {}).get("reasoning_tokens", 0)
                     for u in usages if isinstance(u.get("output_tokens_details") or {}, dict)]
        summary[profile] = {
            "turns": len(turns), "passed": sum(t["passed"] for t in turns),
            "completed_dialogues": sum(all(t["passed"] for t in r["turns"])
                and len(r["turns"]) == len(completion.instructions(r["case"]))
                for r in trace["runs"] if r["profile"] == profile),
            "reply_median_ms": statistics.median(t["reply_ms"] for t in turns),
            "reply_min_ms": min(t["reply_ms"] for t in turns),
            "reply_max_ms": max(t["reply_ms"] for t in turns),
            "api_calls": len(calls),
            "input_tokens": sum(u["input_tokens"] for u in usages),
            "cached_tokens": sum((u.get("input_tokens_details") or {}).get("cached_tokens", 0) for u in usages),
            "cache_write_tokens": sum((u.get("input_tokens_details") or {}).get("cache_write_tokens", 0) for u in usages),
            "output_tokens": sum(u["output_tokens"] for u in usages),
            "reasoning_tokens": sum(n for n in reasoning if type(n) is int and n >= 0),
            "conservative_usd": None if unresolved else conservative,
            "cache_adjusted_usd": None if unresolved else estimated,
            "known_conservative_usd": conservative,
            "known_cache_adjusted_usd": estimated,
            "unresolved_api_attempts": unresolved,
        }
    return summary


def run_checked_turn(trial, case, turn, history, offline):
    before = copy.deepcopy(trial.bridge.view())
    history_before = trial.bridge.call("read_history", {"limit": 1})["total_groups"]
    attempts = []
    actual_api = trial.api

    def audited_api(endpoint, body):
        fixture.audit_payload(body)
        call = {"request": copy.deepcopy(body)}
        attempts.append(call)
        started = time.monotonic()
        try:
            response = actual_api(endpoint, body)
            call["response"] = copy.deepcopy(response)
            return response
        except Exception as error:
            call["error"] = str(error)
            raise
        finally:
            call["elapsed_ms"] = round((time.monotonic() - started) * 1000)

    trial.api = audited_api
    started = time.monotonic()
    try:
        outcome = completion.run_turn(trial, case, turn, history, offline)
    except Exception as error:
        elapsed = round((time.monotonic() - started) * 1000)
        outcome = {"passed": False, "map_correct": False, "report_correct": False,
                   "error": type(error).__name__ + ": " + str(error), "result": None,
                   "calls": [], "reply_ms": elapsed, "elapsed_ms": elapsed, "cost_usd": 0}
    finally:
        trial.api = actual_api
    if offline:
        attempts = copy.deepcopy(outcome["calls"])
    outcome["api_attempts"] = attempts
    measurements = [measured_usage(call, trial.model) for call in attempts]
    outcome["cost_complete"] = all(value is not None for value in measurements)
    outcome["cost_usd"] = sum(value[1][0] for value in measurements if value is not None)
    try:
        after = trial.bridge.view()
        history_after = trial.bridge.call("read_history", {"limit": 1})["total_groups"]
    except Exception as error:
        after, history_after = None, None
        outcome["verification_error"] = type(error).__name__ + ": " + str(error)
    requested_save = case == "clear_save"
    violations = []
    for call in attempts:
        response = call.get("response")
        if not isinstance(response, dict):
            continue
        output = response.get("output", [])
        if not isinstance(output, list):
            violations.append("malformed_response_output")
            continue
        for item in output:
            if not isinstance(item, dict):
                violations.append("malformed_response_output")
                continue
            if item.get("type") != "function_call":
                continue
            try:
                args = json.loads(item["arguments"])
                if not isinstance(args, dict):
                    raise ValueError("Tool arguments must be an object")
            except (KeyError, ValueError, TypeError):
                violations.append("malformed_function_arguments")
                args = {}
            if not requested_save and (item.get("name") == "save_draft" or
                    item.get("name") == "submit_changes" and args.get("completion") == "save"):
                violations.append("unrequested_save_attempt")
    result = outcome.get("result") or {}
    outcome["extra_checks"] = {
        "fresh_complete_result": bool(result) and not result.get("stale") and not result.get("incomplete"),
        "no_blockers": after is not None and not after["blockers"],
        "exact_save_count": history_after is not None and history_after - history_before == int(requested_save),
        "exact_map_version": after is not None and after["map_version"] - before["map_version"] == int(requested_save),
        "no_unrequested_save_attempt": "unrequested_save_attempt" not in violations,
        "valid_tool_arguments": not any(v.startswith("malformed_") for v in violations),
        "complete_cost": outcome["cost_complete"],
    }
    outcome["contract_violations"] = violations
    outcome["passed"] = outcome["passed"] and all(outcome["extra_checks"].values())
    outcome["first_request_without_model_sha256"] = fixture.digest({
        k: v for k, v in attempts[0]["request"].items() if k not in ("model", "reasoning")}) if attempts else None
    return outcome


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--ledger-runtime", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not args.dry_run and args.ledger_runtime is None:
        parser.error("Paid use requires the stopped trial's --ledger-runtime")
    directory = args.output.resolve()
    if not directory.is_relative_to(Path("/private/tmp")) or directory.exists():
        parser.error("Choose a new output directory under /private/tmp")
    directory.mkdir(parents=True)
    server.BACKEND_INSTRUCTIONS = fixture.neutral_instructions()
    budget = fixture.OfflineBudget() if args.dry_run else fixture.GuardBudget(
        server.Budget(args.ledger_runtime.resolve() / "PROTOTYPE-budget.json"), 5.0)
    trace = {"offline": args.dry_run, "profiles": list(PROFILES), "transport": "mcp",
        "completion_mode": "combined", "service_tier": "default",
        "allocation_usd": 5.0, "budget_initial": budget.snapshot(), "runs": [],
        "prices": {name: asdict(BACKEND_MODELS[name]) for name, _ in PROFILES},
        "source_hashes": {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                          for path in ROOT.glob("*.py")},
        "instructions_sha256": fixture.digest(server.BACKEND_INSTRUCTIONS),
        "prompts_sha256": fixture.digest({case: completion.instructions(case) for case in completion.CASES})}

    def write():
        trace["budget_final"] = budget.snapshot()
        (directory / "results.json").write_text(json.dumps(trace, ensure_ascii=False, indent=2) + "\n")
        (directory / "summary.json").write_text(json.dumps(summarize(trace), ensure_ascii=False, indent=2) + "\n")

    write()
    expected_initial = expected_tools = None
    stop = False
    for repetition in range(1, 3):
        for case_index, case in enumerate(completion.CASES):
            order = PROFILES[case_index:] + PROFILES[:case_index]
            if repetition == 2:
                order = tuple(reversed(order))
            for model, effort in order:
                scratch = directory / f"scratch-{repetition}-{case}-{model}-{effort}"
                trial = server.Trial(scratch, map_runtime=scratch / "map", backend_model=model,
                                     transport="mcp", completion_mode="combined", reasoning_effort=effort)
                run = {"repetition": repetition, "case": case, "model": model, "effort": effort,
                       "profile": model + "/" + effort, "turns": []}
                trace["runs"].append(run)
                try:
                    group = fixture.setup_fixture(trial.bridge)
                    trial.bridge = fixture.ObservedBridge(trial.bridge, group)
                    trial.known_view = trial.bridge.view()
                    trial.budget = budget
                    run["initial_sha256"] = fixture.digest(trial.known_view)
                    run["tools_sha256"] = fixture.digest(trial.bridge.tools)
                    if expected_initial is None:
                        expected_initial, expected_tools = run["initial_sha256"], run["tools_sha256"]
                    assert (run["initial_sha256"], run["tools_sha256"]) == (expected_initial, expected_tools)
                    history = []
                    for turn in range(len(completion.instructions(case))):
                        print(f"{model}/{effort} {case} rep={repetition} turn={turn + 1}", flush=True)
                        outcome = run_checked_turn(trial, case, turn, history, args.dry_run)
                        run["turns"].append(outcome)
                        cost = f"${outcome['cost_usd']:.6f}" if outcome["cost_complete"] else "unknown"
                        print(f"  {'PASS' if outcome['passed'] else 'FAIL'} {outcome['reply_ms']}ms "
                              f"calls={len(outcome['api_attempts'])} cost={cost}", flush=True)
                        write()
                        if not outcome["cost_complete"] or budget.snapshot()["reserved_usd"] or (outcome["error"] and
                                any(word in outcome["error"].lower() for word in ("allocation", "budget"))):
                            stop = True
                            trace["stopped_reason"] = outcome["error"] or "unresolved_cost"
                            break
                finally:
                    trial.bridge.close()
                if stop:
                    break
            if stop:
                break
        if stop:
            break
    write()
    print(str(directory / "summary.json"), flush=True)
    if args.dry_run:
        turns = [turn for run in trace["runs"] for turn in run["turns"]]
        expected = 2 * len(PROFILES) * sum(len(completion.instructions(case)) for case in completion.CASES)
        if len(turns) != expected or not all(turn["passed"] for turn in turns):
            raise SystemExit("Offline validation failed; do not run paid comparison")


if __name__ == "__main__":
    main()
