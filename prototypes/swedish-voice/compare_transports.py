#!/usr/bin/env python3
"""THROWAWAY: compare local MCP and direct calls with generated scratch data.

No models, network calls or existing runtime data are used. Both modes execute
the same tool sequence against fresh copies of the same generated state.
Save timestamps are the sole excluded fields when comparing returned results.
"""

import argparse
import copy
import json
from pathlib import Path
import platform
import statistics
import tempfile
import time

from mcp_bridge import Bridge, FIXTURE_ID


def generated_state():
    graph = {"objects": {
        "generated-person": {"kind": "person", "name": "Provperson A", "synthetic": True},
        "generated-card": {"kind": "card", "name": "Provkort 3141", "last_four": "3141", "synthetic": True},
        "generated-subscription": {"kind": "subscription", "name": "Provabonnemang", "price": 149,
                                   "currency": "SEK", "interval": "month", "synthetic": True},
    }, "relations": {
        "generated-ownership": {"from": "generated-person", "type": "owns", "to": "generated-card"},
    }}
    return {"PROTOTYPE": "GENERATED TRANSPORT COMPARISON ONLY; WIPE ME",
            "voice_fixture": FIXTURE_ID, "household": "generated-transport-comparison",
            "map_version": 1, "map": graph,
            "drafts": {actor: {"version": 1, "base_map_version": 1,
                                "base": copy.deepcopy(graph), "target": copy.deepcopy(graph)}
                       for actor in ("alex", "kim")},
            "history": [], "requests": {}, "receipts": {}, "lose_next_receipt": False}


def comparable(value):
    """Preserve every returned field except each generated save's wall time."""
    if isinstance(value, dict):
        return {key: "<generated save time>" if key == "saved_at" else comparable(item)
                for key, item in value.items()}
    if isinstance(value, list):
        return [comparable(item) for item in value]
    return value


def workflow(bridge):
    measurements, transcript = [], []

    def call(label, name, arguments):
        call_started = time.perf_counter_ns()
        result = bridge.call(name, arguments)
        elapsed_ms = (time.perf_counter_ns() - call_started) / 1e6
        if result.get("error"):
            raise RuntimeError(f"Generated comparison failed at {label}: {result['error']}")
        measurements.append({"label": label, "tool": name, "elapsed_ms": elapsed_ms})
        transcript.append({"label": label, "tool": name, "arguments": arguments, "result": result})
        return result

    workflow_started = time.perf_counter_ns()
    initial = call("read_map", "read_map", {})
    proposed = call("propose_card_and_price", "propose_changes", {
        "request_id": "generated-card-and-price", "expected_draft_version": initial["draft_version"],
        "operations": [
            {"collection": "objects", "id": "generated-card", "op": "upsert",
             "fields": {"name": "Provkort 2718", "last_four": "2718"}},
            {"collection": "objects", "id": "generated-subscription", "op": "upsert", "fields": {"price": 179}},
        ],
    })
    saved = call("save_draft", "save_draft", {
        "request_id": "generated-save", "draft_version": proposed["draft_version"],
        "reviewed_map_version": proposed["map_version"],
    })
    receipt = call("get_save_receipt", "get_save_receipt", {"save_request_id": "generated-save"})
    deletion = call("propose_deletion_and_price", "propose_changes", {
        "request_id": "generated-deletion-and-price", "expected_draft_version": saved["draft_version"],
        "operations": [
            {"collection": "relations", "id": "generated-ownership", "op": "delete"},
            {"collection": "objects", "id": "generated-person", "op": "delete"},
            {"collection": "objects", "id": "generated-subscription", "op": "upsert", "fields": {"price": 199}},
        ],
    })
    restored = call("restore_draft_deletions", "restore_draft_deletions", {
        "request_id": "generated-restore", "expected_draft_version": deletion["draft_version"],
        "object_ids": ["generated-person"],
    })
    final = call("read_final_map", "read_map", {})
    workflow_ms = (time.perf_counter_ns() - workflow_started) / 1e6
    if (receipt["receipt"] != saved["receipt"] or restored.get("restoration_status") != "restored_in_draft"
            or final["map_version"] != 2 or final["draft_version"] != 5
            or final["full_diff"] != [{"collection": "objects", "id": "generated-subscription",
                                       "field": "price", "before": 179, "after": 199}]):
        raise RuntimeError("Generated comparison produced an unexpected save or restoration result")
    return {"workflow_ms": workflow_ms, "calls": measurements}, comparable(transcript)


def run_once(transport):
    with tempfile.TemporaryDirectory(prefix="skyttel-transport-sample-", dir="/private/tmp") as temporary:
        runtime = Path(temporary)
        fixture = json.dumps(generated_state(), ensure_ascii=False)
        state_path = runtime / "PROTOTYPE-voice-state.json"
        state_path.write_text(fixture, encoding="utf-8")
        started = time.perf_counter_ns()
        bridge = Bridge(runtime, transport=transport)
        startup_ms = (time.perf_counter_ns() - started) / 1e6
        try:
            # Exercise every tool once on this live bridge before timing it.
            # Only this generated scratch state and restore ledger are reset.
            _, warmup_transcript = workflow(bridge)
            state_path.write_text(fixture, encoding="utf-8")
            (runtime / "PROTOTYPE-restore-requests.json").unlink()
            measurement, transcript = workflow(bridge)
            if transcript != warmup_transcript:
                raise RuntimeError("Warm-up and measured workflow results differ")
            return {"transport": transport, "startup_ms": startup_ms, **measurement}, transcript, copy.deepcopy(bridge.tools)
        finally:
            bridge.close()


def timing_summary(values):
    ordered = sorted(values)
    position = (len(ordered) - 1) * .95
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    p95 = ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)
    return {"median": statistics.median(values), "p95": p95, "min": min(values), "max": max(values)}


def compare(*, repetitions=20, warmups=2):
    samples, mode_order, expected, expected_tools = [], [], None, None
    for index in range(warmups + repetitions):
        order = ("mcp", "direct") if index % 2 == 0 else ("direct", "mcp")
        pair = []
        for transport in order:
            measurement, transcript, tools = run_once(transport)
            if expected is None:
                expected, expected_tools = transcript, tools
            elif transcript != expected or tools != expected_tools:
                raise RuntimeError("Transport inputs, returned results or tool definitions differ")
            pair.append(measurement)
        if index >= warmups:
            samples.extend(pair)
            mode_order.append(list(order))
    summary = {}
    for transport in ("mcp", "direct"):
        selected = [sample for sample in samples if sample["transport"] == transport]
        labels = [call["label"] for call in selected[0]["calls"]]
        summary[transport] = {
            "startup_ms": timing_summary([sample["startup_ms"] for sample in selected]),
            "workflow_ms": timing_summary([sample["workflow_ms"] for sample in selected]),
            "calls_ms": {label: timing_summary([call["elapsed_ms"] for sample in selected
                                                for call in sample["calls"] if call["label"] == label])
                         for label in labels},
        }
    return {
        "prototype": True, "measurement": "local transport and persistence only; no model or network",
        "repetitions_per_transport": repetitions, "discarded_warmups_per_transport": warmups,
        "discarded_warmup_workflows_per_bridge": 1,
        "measured_mode_order": mode_order,
        "environment": {"python": platform.python_version(), "system": platform.system(),
                        "release": platform.release(), "machine": platform.machine()},
        "equivalence": {"passed": True, "identical_tool_definitions": True,
                        "identical_arguments_and_results_except": ["saved_at"],
                        "reference_transcript": expected},
        "summary": summary, "samples": samples,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repetitions", type=int, default=20)
    parser.add_argument("--warmups", type=int, default=2)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.repetitions < 2 or args.warmups < 1:
        parser.error("Use at least two measured repetitions and one discarded warm-up per transport")
    result = compare(repetitions=args.repetitions, warmups=args.warmups)
    output = args.output
    if output is None:
        with tempfile.NamedTemporaryFile(prefix="skyttel-transport-comparison-", suffix=".json",
                                         dir="/private/tmp", delete=False) as file:
            output = Path(file.name)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output.resolve()), "summary": result["summary"]},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
