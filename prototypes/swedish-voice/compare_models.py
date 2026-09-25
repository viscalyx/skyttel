#!/usr/bin/env python3
"""THROWAWAY: paired backend comparison using newly generated MCP scratch maps.

Run --dry-run first. Paid runs require --ledger-runtime pointing at the stopped
voice trial's existing budget directory. Results and maps stay under /tmp.
No voice session, existing household map, transcript, or API credential is read.
The API credential is used only by the inherited Trial.api transport when paid.
"""

import argparse
import copy
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import re
import tempfile
import time

import server
from backend_models import BACKEND_MODELS


ROOT = Path(__file__).resolve().parent
MODEL_ORDER = ("gpt-5-mini-2025-08-07", "gpt-5.6-sol")
ALLOCATION_USD = 2.0
FORBIDDEN = ("Johan", "Sonja", "Spotify", "Azure", "Asher", "Lo Lind",
             "Lo Berg", "Tonrum", "Alex", "Kim", "account-tonrum", "replika")
DENY_PATTERN = re.compile(r"(?<!\w)(?:" + "|".join(map(re.escape, FORBIDDEN))
                          + r")(?!\w)", re.IGNORECASE)


def clone(value):
    return copy.deepcopy(value)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(",", ":")).encode()).hexdigest()


def audit_payload(value):
    """Check all text, including tool definitions and serialized tool results."""
    if DENY_PATTERN.search(json.dumps(value, ensure_ascii=False)):
        # Do not print the matched token or submitted data on a failed audit.
        raise RuntimeError("Outgoing generated-data isolation check failed")


def neutral_instructions():
    text = server.BACKEND_INSTRUCTIONS
    text = text.replace("Två personer heter Lo; be om efternamn vid tvetydighet. Två Alex-kort finns.\n", "")
    text = text.replace("Återanvänd account-tonrum när användaren menar samma Tonrum-konto.\n", "")
    replacements = {"Lo Lind": "Testperson E", "Lo Berg": "Testperson F",
                    "Tonrum": "Exempeltjänst", "Alex": "Exempelperson A",
                    "Kim": "Exempelperson B", "Asher": "Skogsproov", "Azure": "Skogprov"}
    for old, new in replacements.items():
        text = re.sub(r"(?<!\w)" + re.escape(old) + r"(?!\w)", new, text)
    audit_payload(text)
    return text


def generated_graph():
    objects = {
        "bench-person-a": {"kind": "person", "name": "Testperson A"},
        "bench-person-b": {"kind": "person", "name": "Testperson B"},
        "bench-person-c": {"kind": "person", "name": "Testperson C"},
        "bench-cloud": {"kind": "service", "name": "Molnprov"},
        "bench-cloud-sub": {"kind": "subscription", "name": "Molnprov familj",
                            "price": 89, "currency": "SEK", "interval": "month"},
        "bench-books": {"kind": "service", "name": "Bokprov"},
        "bench-books-sub": {"kind": "subscription", "name": "Bokprov familj",
                            "price": 149, "currency": "SEK", "interval": "month"},
        "bench-company": {"kind": "company", "name": "Provbolaget"},
        "bench-card": {"kind": "card", "name": "Testkort 1111", "last_four": "1111"},
    }
    for record in objects.values():
        record["synthetic"] = True
    triples = {
        "bench-cloud-service": ("bench-cloud-sub", "for_service", "bench-cloud"),
        "bench-cloud-card": ("bench-cloud-sub", "paid_with", "bench-card"),
        "bench-cloud-payer": ("bench-person-a", "pays", "bench-cloud-sub"),
        "bench-cloud-user": ("bench-person-a", "uses", "bench-cloud"),
        "bench-card-owner": ("bench-person-a", "owns", "bench-card"),
        "bench-books-service": ("bench-books-sub", "for_service", "bench-books"),
        "bench-books-provider": ("bench-company", "provides", "bench-books"),
        "bench-books-user": ("bench-person-c", "uses", "bench-books"),
    }
    return {"objects": objects, "relations": {
        rid: {"from": a, "type": kind, "to": b}
        for rid, (a, kind, b) in triples.items()}}


def expected_graph(case, turn):
    graph = generated_graph()
    graph["objects"]["bench-books-sub"]["price"] = 179
    if case == "clear_batch":
        graph["objects"].update({
            "new-music": {"kind": "service", "name": "Musikprov"},
            "new-card": {"kind": "card", "name": "Moln-konto"},
        })
        graph["objects"]["bench-card"].update(name="Testkort 2222", last_four="2222")
        triples = [("bench-person-a", "uses", "new-music"),
                   ("bench-person-b", "uses", "new-music"),
                   ("bench-person-b", "uses", "bench-cloud-sub"),
                   ("bench-cloud-sub", "paid_with", "new-card")]
    else:
        for oid in ("bench-person-c", "bench-company"):
            del graph["objects"][oid]
        for rid in ("bench-books-user", "bench-books-provider"):
            del graph["relations"][rid]
        graph["objects"]["new-person-d"] = {"kind": "person", "name": "Testperson D"}
        triples = []
        if turn == 1:
            graph["objects"]["bench-card"]["last_four"] = "2222"
            triples = [("new-person-d", "uses", "bench-cloud")]
    for index, (a, kind, b) in enumerate(triples):
        graph["relations"][f"new-relation-{index}"] = {"from": a, "type": kind, "to": b}
    return graph


PROMPTS = {
    "clear_batch": [
        "Lägg till den nya påhittade tjänsten Musikprov. Testperson A och Testperson B "
        "använder Musikprov. Lägg dessutom till att Testperson B använder abonnemanget "
        "Molnprov familj, alltså själva abonnemanget. Ändra både namnet på Testkort 1111 "
        "till Testkort 2222 och kortets sista fyra siffror till 2222. Lägg till ett nytt "
        "betalningskort med namnet Moln-konto och lägg det som ytterligare betalningsmedel "
        "för abonnemanget Molnprov familj. Behåll det befintliga kortet som betalningsmedel. "
        "Behåll alla tidigare utkastförslag. Spara inte."
    ],
    "scoped_questions": [
        "Ta bort Testperson C och alla samband till den personen. Lägg till den nya "
        "personen Testperson D, som använder Molnproov; jag är osäker på om tjänstenamnet "
        "Molnproov är rätt. Ta också bort företaget Provbolaget och alla dess samband, "
        "men behåll tjänsten Bokprov. Och byt namn på Testkort 1111, nu är det 2222. "
        "Genomför de tydliga delarna och fråga om de oklara delarna. Behåll alla tidigare "
        "utkastförslag. Spara inte.",
        "Ja, tjänsten är Molnprov. För kortet menar jag bara sista fyra siffrorna: 2222; "
        "behåll namnet Testkort 1111. Behåll de redan utförda delarna och tidigare "
        "utkastförslag. Spara inte.",
    ],
}


def normalized(graph):
    """Keep existing IDs; compare arbitrary new IDs by exact object semantics.

    Lists preserve duplicates. Only the synthetic fixture marker is immaterial.
    """
    baseline = generated_graph()
    identifiers = {}
    objects = []
    for oid, record in graph["objects"].items():
        identity = oid if oid in baseline["objects"] else "new:" + json.dumps(
            [record.get("kind"), record.get("name")], ensure_ascii=False)
        identifiers[oid] = identity
        fields = {k: v for k, v in record.items() if k != "synthetic"}
        objects.append([identity, fields])
    relations = []
    for rid, record in graph["relations"].items():
        fields = {k: v for k, v in record.items() if k != "synthetic"}
        for endpoint in ("from", "to"):
            fields[endpoint] = identifiers.get(fields.get(endpoint), "missing:" + str(fields.get(endpoint)))
        relations.append([rid if rid in baseline["relations"] else "new", fields])
    order = lambda item: json.dumps(item, sort_keys=True, ensure_ascii=False)
    return {"objects": sorted(objects, key=order), "relations": sorted(relations, key=order)}


def map_correct(actual, expected):
    return normalized(actual) == normalized(expected)


def setup_fixture(bridge):
    """Replace only a newly allocated scratch map through real MCP operations."""
    current = bridge.view()
    operations = [{"collection": collection, "id": oid, "op": "delete"}
                  for collection in ("relations", "objects")
                  for oid in current["draft_map"][collection]]
    graph = generated_graph()
    operations.extend({"collection": collection, "id": oid, "op": "upsert",
                       "create": True, "fields": fields}
                      for collection in ("objects", "relations")
                      for oid, fields in graph[collection].items())
    proposal = bridge.call("propose_changes", {"request_id": "bench-fixture-replace",
        "expected_draft_version": current["draft_version"], "operations": operations})
    if proposal.get("error"):
        raise RuntimeError("Generated fixture proposal failed")
    saved = bridge.call("save_draft", {"request_id": "bench-fixture-save",
        "draft_version": proposal["draft_version"], "reviewed_map_version": proposal["map_version"]})
    if saved.get("error") or not saved.get("receipt"):
        raise RuntimeError("Generated fixture save failed")
    proposal = bridge.call("propose_changes", {"request_id": "bench-fixture-price",
        "expected_draft_version": saved["draft_version"], "operations": [{
            "collection": "objects", "id": "bench-books-sub", "op": "upsert", "fields": {"price": 179}}]})
    if proposal.get("error"):
        raise RuntimeError("Generated fixture draft failed")
    current = bridge.view()
    if current["saved_map"] != graph or current["blockers"]:
        raise RuntimeError("Generated fixture verification failed")
    return saved["receipt"]["group_id"]


def alias_metadata(value):
    if isinstance(value, list):
        return [alias_metadata(item) for item in value]
    if isinstance(value, dict):
        return {key: ("test-operator" if key in ("user", "actor") else
                      "generated-comparison-household" if key == "household" else alias_metadata(item))
                for key, item in value.items()}
    return value


class ObservedBridge:
    @property
    def transport(self):
        return self.base.transport

    @property
    def runtime_path(self):
        return self.base.runtime_path

    def __init__(self, bridge, fixture_group):
        self.base = bridge
        self.fixture_group = fixture_group
        self.turn = None
        self.requested = []
        self.tools = clone(bridge.tools)
        for tool in self.tools:
            tool["description"] = tool["description"].replace("'Lo'", "'Testperson'")
        audit_payload(self.tools)

    def safe(self, value):
        value = alias_metadata(value)
        if isinstance(value, dict):
            # Fixture setup history contains the discarded inherited records.
            if "groups" in value:
                value["groups"] = [g for g in value["groups"] if g["group_id"] != self.fixture_group]
            if (value.get("receipt") or {}).get("group_id") == self.fixture_group:
                value["receipt"], value["status"] = None, "not_found"
        audit_payload(value)
        return value

    def call(self, name, arguments):
        started = time.monotonic()
        explicit = bool(self.requested and self.requested[0] == name)
        if explicit:
            self.requested.pop(0)
        if name == "undo_as_draft" and arguments.get("group_id") == self.fixture_group:
            result = {**self.base.view(), "error": "unknown_history_group"}
        else:
            result = self.base.call(name, arguments)
        result = self.safe(result)
        if self.turn is not None:
            view = result if "draft_map" in result else self.safe(self.base.view())
            self.turn["measurement_read_calls"] += int("draft_map" not in result)
            entry = {"name": name, "arguments": clone(arguments), "result": clone(result),
                     "requested_by_model": explicit,
                     "elapsed_ms": round((time.monotonic() - started) * 1000),
                     "at_ms": round((time.monotonic() - self.turn["_start"]) * 1000)}
            self.turn["mcp_calls"].append(entry)
            if (self.turn["first_correct_map_ms"] is None
                    and map_correct(view["draft_map"], self.turn["_expected"])):
                self.turn["first_correct_map_ms"] = entry["at_ms"]
        return result

    def view(self):
        return self.call("read_map", {})

    def close(self):
        self.base.close()


class AllocationExceeded(server.TrialError):
    pass


class GlobalBudgetExceeded(server.TrialError):
    pass


class GuardBudget:
    """Check local allocation before creating any persistent reservation."""
    def __init__(self, budget, allocation):
        self.base = budget
        self.initial = budget.snapshot()
        self.allocation = allocation
        self.data = budget.data
        self.initial_accounted = sum(entry["usd"] for entry in self.data["entries"].values())
        self.last_reservation = None
        if self.initial["reserved_usd"]:
            raise RuntimeError("Existing unresolved reservations block the comparison")

    def snapshot(self):
        return self.base.snapshot()

    def reserve(self, kind, amount, *, headroom=0):
        if any(not entry["confirmed"] for entry in self.data["entries"].values()):
            raise server.TrialError("Unresolved response cost blocks the next comparison API call")
        spent = sum(entry["usd"] for entry in self.data["entries"].values()) - self.initial_accounted
        if spent + amount + headroom > self.allocation + 1e-9:
            raise AllocationExceeded("Comparison allocation cannot cover the next conservative reservation")
        if self.snapshot()["remaining_usd"] < amount + headroom:
            raise GlobalBudgetExceeded("Shared trial budget cannot cover the next conservative reservation")
        self.last_reservation = self.base.reserve(kind, amount, headroom=headroom)
        return self.last_reservation

    def settle(self, key, amount):
        self.base.settle(key, amount)


class OfflineBudget:
    """No ledger, reservation, or settlement exists during offline validation."""
    data = {"entries": {}}

    def snapshot(self):
        return {"limit_usd": 10, "accounted_usd": 0, "remaining_usd": 10,
                "confirmed_usd": 0, "reserved_usd": 0, "offline": True}

    def reserve(self, *_args, **_kwargs):
        return None

    def settle(self, *_args):
        pass


def object_ref(oid):
    return {"collection": "objects", "id": oid}


def expected_report(case, turn):
    questions = []
    if case == "scoped_questions" and turn == 0:
        questions = [{"kind": "identity", "operation": "add_relation",
            "subject": object_ref("new-person-d"), "candidates": [object_ref("bench-cloud")],
            "candidate_side": "to", "fields": [], "relation_type": "uses",
            "source_phrase": "Testperson D, som använder Molnproov"},
            {"kind": "field_choice", "operation": "change_field", "subject": object_ref("bench-card"),
             "candidates": [], "candidate_side": None, "fields": ["name", "last_four"],
             "relation_type": None, "source_phrase": "byt namn på Testkort 1111, nu är det 2222"}]
    return {"kind": "draft_changed", "references": [], "answer_scope": "selected_records",
            "clarification_kind": "none", "questions": questions}


def report_correct(report, case, turn, view):
    if not report or report["kind"] != "draft_changed":
        return False
    if case != "scoped_questions" or turn == 1:
        return report["questions"] == []
    questions = report["questions"]
    if len(questions) != 2:
        return False
    identity = next((q for q in questions if q["kind"] == "identity"), {})
    card = next((q for q in questions if q["kind"] == "field_choice"), {})
    subject = identity.get("subject") or {}
    person = view["draft_map"]["objects"].get(subject.get("id"), {})
    return (identity.get("operation") == "add_relation"
            and subject.get("collection") == "objects"
            and person.get("kind") == "person" and person.get("name") == "Testperson D"
            and identity.get("candidates") == [object_ref("bench-cloud")]
            and identity.get("candidate_side") == "to" and identity.get("relation_type") == "uses"
            and identity.get("fields") == [] and "Molnproov" in identity.get("source_phrase", "")
            and card.get("operation") == "change_field" and card.get("subject") == object_ref("bench-card")
            and card.get("candidates") == [] and set(card.get("fields", [])) == {"name", "last_four"}
            and card.get("relation_type") is None and card.get("candidate_side") is None)


def offline_proposal(before, after, version):
    operations = []
    for collection in ("relations", "objects"):
        operations.extend({"collection": collection, "id": oid, "op": "delete"}
                          for oid in before[collection] if oid not in after[collection])
    for collection in ("objects", "relations"):
        for oid, fields in after[collection].items():
            old = before[collection].get(oid)
            if old != fields:
                operation = {"collection": collection, "id": oid, "op": "upsert", "fields": fields}
                if old is None:
                    operation["create"] = True
                operations.append(operation)
    return {"expected_draft_version": version, "operations": operations}


class ComparisonTrial(server.Trial):
    def api(self, endpoint, body):
        try:
            if endpoint != "responses":
                raise RuntimeError("The comparison only permits Responses requests")
            audit_payload(body)
        except Exception:
            # Trial reserves immediately before this method. A local preflight
            # rejection makes no network request and has a known zero cost.
            if not self.offline and self.budget.last_reservation is not None:
                self.budget.settle(self.budget.last_reservation, 0)
            raise
        record = self.active_turn
        call = {"request": clone(body), "started_ms": round((time.monotonic() - record["_start"]) * 1000)}
        record["api_calls"].append(call)
        started = time.monotonic()
        if self.offline:
            scripted = self.offline_script.pop(0)
            response = {"id": "offline-response", "output": [{"type": "function_call",
                "call_id": "offline-" + str(len(record["api_calls"])), "name": scripted[0],
                "arguments": json.dumps(scripted[1], ensure_ascii=False)}],
                "usage": {"input_tokens": 0, "output_tokens": 0,
                          "input_tokens_details": {"cached_tokens": 0}}}
        else:
            try:
                response = super().api(endpoint, body)
            except Exception as error:
                call["error"] = str(error)
                call["elapsed_ms"] = round((time.monotonic() - started) * 1000)
                raise
        call.update(response=clone(response), elapsed_ms=round((time.monotonic() - started) * 1000))
        usage = response.get("usage", {})
        try:
            conservative, estimated = self.model.costs(usage)
            call.update(conservative_usd=conservative, cache_adjusted_usd=estimated)
        except ValueError:
            call["usage_unsettled"] = True
        self.bridge.requested.extend(item["name"] for item in response.get("output", [])
                                     if item.get("type") == "function_call" and item["name"] != "report_result")
        return response


def public(value):
    if isinstance(value, dict):
        return {key: public(item) for key, item in value.items() if not key.startswith("_")}
    if isinstance(value, list):
        return [public(item) for item in value]
    return value


def run_turn(trial, case, index, history, offline):
    expected = expected_graph(case, index)
    before = trial.bridge.view()
    record = {"index": index + 1, "prompt": PROMPTS[case][index], "api_calls": [], "mcp_calls": [],
              "reports": [], "measurement_read_calls": 0, "first_correct_map_ms": None,
              "complete_correct_reply_ms": None, "_expected": expected, "_start": time.monotonic()}
    trial.active_turn = record
    trial.bridge.turn = record
    trial.bridge.requested = []
    if offline:
        trial.offline_script = [("propose_changes", offline_proposal(before["draft_map"], expected,
                                                                    before["draft_version"])),
                                ("report_result", expected_report(case, index))]
    trial.latest += 1
    utterance = {"role": "user", "id": f"bench-turn-{index + 1}", "text": PROMPTS[case][index]}
    history.append(utterance)
    original_report = server.checked_report

    def observed_report(*args, **kwargs):
        text, result = original_report(*args, **kwargs)
        record["reports"].append({"arguments": clone(args[0]), "accepted": text is not None,
            "error": clone(result), "at_ms": round((time.monotonic() - record["_start"]) * 1000)})
        return text, result

    server.checked_report = observed_report
    result = None
    try:
        result = trial.delegate({"revision": trial.latest, "history": clone(history),
                                 "current_utterance": {"id": utterance["id"], "text": utterance["text"]}})
        record["result"] = result
        record["reply_ms"] = round((time.monotonic() - record["_start"]) * 1000)
        history.append({"role": "backend", "text": result["text"]})
    except Exception as error:
        record["error"] = type(error).__name__ + ": " + str(error)
        record["allocation_blocked"] = isinstance(error, AllocationExceeded)
        record["global_budget_blocked"] = isinstance(error, GlobalBudgetExceeded)
        record["reply_ms"] = round((time.monotonic() - record["_start"]) * 1000)
    finally:
        server.checked_report = original_report
        trial.bridge.turn = None
    try:
        after = trial.bridge.view()
        final_view_verified = True
    except Exception as error:
        # Preserve all recorded API responses even if the MCP transport dies.
        after = clone(trial.known_view)
        final_view_verified = False
        record["final_view_error"] = type(error).__name__ + ": " + str(error)
    accepted = [entry for entry in record["reports"] if entry["accepted"]]
    report = accepted[-1]["arguments"] if accepted else None
    record["final_view"] = after
    attempted_saves = sum(item.get("name") == "save_draft"
                          for call in record["api_calls"]
                          for item in call.get("response", {}).get("output", [])
                          if item.get("type") == "function_call")
    record["assertions"] = {
        "final_view_verified": final_view_verified,
        "expected_graph": map_correct(after["draft_map"], expected),
        "saved_map_unchanged": after["saved_map"] == generated_graph(),
        "map_version_unchanged": after["map_version"] == before["map_version"],
        "no_save_calls": attempted_saves == 0 and not any(c["name"] == "save_draft" for c in record["mcp_calls"]),
        "no_save_receipt": not result or not result.get("task_receipt"),
        "no_blockers": not after["blockers"],
        "complete_reply": bool(result and not result.get("incomplete") and not result.get("stale")),
        "correct_report_and_questions": report_correct(report, case, index, after),
    }
    record["passed"] = all(record["assertions"].values()) and "error" not in record
    if record["passed"]:
        record["complete_correct_reply_ms"] = record["reply_ms"]
    record["counts"] = {"model_calls": len(record["api_calls"]),
        "requested_mcp_calls": sum(c["requested_by_model"] for c in record["mcp_calls"]),
        "automatic_mcp_reads": sum(not c["requested_by_model"] for c in record["mcp_calls"]),
        "measurement_mcp_reads": record["measurement_read_calls"],
        "mcp_errors": sum(bool(c["result"].get("error")) for c in record["mcp_calls"]),
        "report_rejections": sum(not r["accepted"] for r in record["reports"])}
    record["cost"] = {key: sum(call.get(key, 0) for call in record["api_calls"])
                      for key in ("conservative_usd", "cache_adjusted_usd")}
    usages = [call.get("response", {}).get("usage", {}) for call in record["api_calls"]]
    record["usage"] = {
        "input_tokens": sum(u.get("input_tokens", 0) or 0 for u in usages),
        "output_tokens": sum(u.get("output_tokens", 0) or 0 for u in usages),
        "cached_tokens": sum((u.get("input_tokens_details") or {}).get("cached_tokens", 0) or 0 for u in usages),
        "cache_write_tokens": sum((u.get("input_tokens_details") or {}).get("cache_write_tokens", 0) or 0 for u in usages),
        "reasoning_tokens": sum((u.get("output_tokens_details") or {}).get("reasoning_tokens", 0) or 0 for u in usages),
        "unsettled_calls": sum(bool(c.get("usage_unsettled") or c.get("error")) for c in record["api_calls"]),
    }
    return record


def manifest(instructions, repetitions):
    files = ["compare_models.py", "server.py", "backend_models.py", "mcp_bridge.py",
             "result_reporting.py", "relation-labels.json", "work_status.py", "../external-mcp/server.py",
             "../external-mcp/client.py"]
    hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in files}
    config = {"models": [asdict(BACKEND_MODELS[name]) for name in MODEL_ORDER],
              "reasoning_effort": "low", "max_output_tokens": 4096, "max_steps": 8,
              "service_tier": "default", "parallel_tool_calls": False, "store": False,
              "repetitions": repetitions, "allocation_usd": ALLOCATION_USD}
    return {"code_files_sha256": hashes, "code_sha256": digest(hashes), "config": config,
            "config_sha256": digest(config), "instructions_sha256": digest(instructions),
            "prompts_sha256": digest(PROMPTS), "fixture_sha256": digest(generated_graph()),
            "instructions": instructions, "prompts": PROMPTS, "generated_saved_graph": generated_graph()}


def summarize(trace):
    rows = []
    for run in trace["runs"]:
        for turn in run["turns"]:
            rows.append({"model": run["model"], "case": run["case"], "repetition": run["repetition"],
                "turn": turn["index"], "passed": turn["passed"],
                "first_correct_map_ms": turn["first_correct_map_ms"],
                "complete_correct_reply_ms": turn["complete_correct_reply_ms"], "reply_ms": turn["reply_ms"],
                "counts": turn["counts"], "cost": turn["cost"], "usage": turn["usage"], "assertions": turn["assertions"],
                "error": turn.get("error")})
    return {"offline": trace["offline"], "stopped_reason": trace.get("stopped_reason"),
            "budget_initial": trace.get("budget_initial"), "budget_final": trace.get("budget_final"),
            "run_failures": sum(bool(run.get("setup_or_runner_error")) for run in trace["runs"]),
            "manifest_hashes": {k: v for k, v in trace["manifest"].items() if k.endswith("sha256")},
            "runs": [{"model": run["model"], "case": run["case"], "repetition": run["repetition"],
                      "completed_turns": len(run["turns"]), "runner_error": run.get("setup_or_runner_error")}
                     for run in trace["runs"]],
            "rows": rows, "note": "Small paired exploratory comparison; retain every failure. Offline timings are not model results."}


def write_results(directory, trace):
    for name, value in (("trace.json", public(trace)), ("summary.json", summarize(trace))):
        pending = directory / (name + ".tmp")
        pending.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        pending.replace(directory / name)


def offline_checks():
    graph = expected_graph("clear_batch", 0)
    renamed = clone(graph)
    renamed["objects"]["arbitrary-id"] = renamed["objects"].pop("new-music")
    for relation in renamed["relations"].values():
        if relation["to"] == "new-music":
            relation["to"] = "arbitrary-id"
    assert map_correct(renamed, graph)
    duplicate = clone(graph)
    duplicate["relations"]["duplicate"] = clone(duplicate["relations"]["new-relation-0"])
    assert not map_correct(duplicate, graph)
    reversed_relation = clone(graph)
    relation = reversed_relation["relations"]["new-relation-3"]
    relation["from"], relation["to"] = relation["to"], relation["from"]
    assert not map_correct(reversed_relation, graph)
    missing = clone(graph)
    del missing["relations"]["new-relation-1"]
    assert not map_correct(missing, graph)
    changed = clone(graph)
    changed["objects"]["bench-books-sub"]["price"] = 149
    assert not map_correct(changed, graph)
    for word in FORBIDDEN:
        try:
            audit_payload({"input": "generated " + word + " text"})
        except RuntimeError:
            pass
        else:
            raise AssertionError("Denylist check failed")
    # A rejected local cap check must not create an orphan persistent reservation.
    class FakeBudget(OfflineBudget):
        calls = 0

        def reserve(self, *_args, **_kwargs):
            self.calls += 1
    fake = FakeBudget()
    guarded = GuardBudget(fake, .01)
    try:
        guarded.reserve("offline guard test", .40)
    except AllocationExceeded:
        pass
    else:
        raise AssertionError("Allocation check failed")
    assert fake.calls == 0
    guarded.data = {"entries": {"unknown": {"usd": .01, "confirmed": False}}}
    try:
        guarded.reserve("offline unresolved-cost test", .001)
    except server.TrialError:
        pass
    else:
        raise AssertionError("Unknown cost did not block the next call")
    assert fake.calls == 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Scripted offline responses; zero paid API calls")
    parser.add_argument("--repetitions", type=int, choices=(1, 2), default=2)
    parser.add_argument("--ledger-runtime", type=Path, help="Existing stopped trial runtime; only its budget is accessed")
    parser.add_argument("--output", type=Path, help="New output directory under /tmp (default: fresh temporary directory)")
    args = parser.parse_args()
    if not args.dry_run and args.ledger_runtime is None:
        parser.error("Paid comparison requires --ledger-runtime")
    directory = args.output.resolve() if args.output else Path(tempfile.mkdtemp(
        prefix="skyttel-model-comparison-", dir="/private/tmp"))
    if not directory.is_relative_to(Path("/tmp").resolve()):
        parser.error("Comparison output must be under /tmp")
    if args.output and directory.exists():
        parser.error("Choose a new output directory to preserve prior results")
    directory.mkdir(parents=True, exist_ok=True)
    offline_checks()
    server.BACKEND_INSTRUCTIONS = neutral_instructions()
    audit_payload(PROMPTS)
    trace = {"offline": args.dry_run, "manifest": manifest(server.BACKEND_INSTRUCTIONS, args.repetitions), "runs": []}
    if args.dry_run:
        budget = OfflineBudget()
    else:
        path = args.ledger_runtime.resolve() / "PROTOTYPE-budget.json"
        if not path.is_file():
            parser.error("The shared trial budget must already exist")
        budget = GuardBudget(server.Budget(path), ALLOCATION_USD)
    trace["budget_initial"] = budget.snapshot()
    write_results(directory, trace)
    stop = False
    for repetition in range(1, args.repetitions + 1):
        for case in PROMPTS:
            models = MODEL_ORDER if repetition % 2 else tuple(reversed(MODEL_ORDER))
            for model in models:
                run = {"model": model, "case": case, "repetition": repetition, "turns": []}
                trace["runs"].append(run)
                scratch = directory / f"scratch-{repetition}-{case}-{model}"
                trial = ComparisonTrial(scratch, map_runtime=scratch / "map", backend_model=model)
                try:
                    fixture_group = setup_fixture(trial.bridge)
                    trial.bridge = ObservedBridge(trial.bridge, fixture_group)
                    trial.known_view = trial.bridge.view()
                    trial.budget, trial.offline = budget, args.dry_run
                    initial = clone(trial.known_view)
                    audit_payload(initial)
                    # Exercise inherited-history isolation before any external payload.
                    assert trial.bridge.call("read_history", {})["groups"] == []
                    assert trial.bridge.call("get_save_receipt", {"save_request_id": "bench-fixture-save"})["receipt"] is None
                    assert trial.bridge.call("get_save_receipt", {"save_request_id": "bench-absent-save"})["receipt"] is None
                    assert trial.bridge.call("undo_as_draft", {"request_id": "bench-reject-fixture-undo",
                        "expected_draft_version": initial["draft_version"], "group_id": fixture_group}).get("error")
                    assert trial.bridge.view() == initial
                    run["initial_view_sha256"] = digest(initial)
                    run["tools_sha256"] = digest(trial.bridge.tools)
                    history = []
                    for index in range(len(PROMPTS[case])):
                        print(f"{'OFFLINE' if args.dry_run else 'RUN'} {model} {case} rep={repetition} turn={index + 1}", flush=True)
                        turn = run_turn(trial, case, index, history, args.dry_run)
                        run["turns"].append(turn)
                        print(f"  {'PASS' if turn['passed'] else 'FAIL'} map={turn['first_correct_map_ms']}ms "
                              f"reply={turn['reply_ms']}ms calls={turn['counts']['model_calls']} "
                              f"report_errors={turn['counts']['report_rejections']} "
                              f"ledger=${turn['cost']['conservative_usd']:.6f}", flush=True)
                        trace["budget_final"] = budget.snapshot()
                        if (turn.get("allocation_blocked") or turn.get("global_budget_blocked")
                                or budget.snapshot()["reserved_usd"]):
                            trace["stopped_reason"] = ("comparison_allocation" if turn.get("allocation_blocked")
                                                       else "shared_trial_budget" if turn.get("global_budget_blocked")
                                                       else "unresolved_cost_reservation")
                            stop = True
                        write_results(directory, trace)
                        if stop:
                            break
                except Exception as error:
                    run["setup_or_runner_error"] = type(error).__name__ + ": " + str(error)
                    trace["budget_final"] = budget.snapshot()
                    if budget.snapshot()["reserved_usd"]:
                        trace["stopped_reason"], stop = "unresolved_cost_reservation", True
                    write_results(directory, trace)
                    print("  FAIL " + run["setup_or_runner_error"], flush=True)
                finally:
                    trial.bridge.close()
                if stop:
                    break
            if stop:
                break
        if stop:
            break
    trace["budget_final"] = budget.snapshot()
    write_results(directory, trace)
    print("Results: " + str(directory / "summary.json"), flush=True)
    if args.dry_run:
        turns = [turn for run in trace["runs"] for turn in run["turns"]]
        if len(turns) != args.repetitions * len(MODEL_ORDER) * 3 or not all(t["passed"] for t in turns):
            raise SystemExit("Offline validation failed; do not run paid comparison")


if __name__ == "__main__":
    main()
