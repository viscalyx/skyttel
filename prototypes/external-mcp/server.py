#!/usr/bin/env python3
"""THROWAWAY PROTOTYPE: synthetic household, scratch JSON, no production guarantees.

Question: can an external MCP client safely discuss the entire existing private
draft, then save the reviewed version only after the human asks it to save?
"""

import argparse
import copy
import datetime
import fcntl
import hashlib
import json
import os
import sys
from pathlib import Path


ABSENT = {"$prototype_absent": True}
COLLECTIONS = ("objects", "relations")
USERS = ("alex", "kim")
SAVE_POLICY = (
    "An explicit human save command authorizes ALL changes in the current private draft, "
    "including existing proposals and an unambiguous correction in the same message. "
    "Apply requested changes, summarize ALL full_diff, and call save_draft separately in the same turn; "
    "do not require another yes merely because the requested correction creates a new draft version. "
    "Internally check that ALL full_diff matches the human's requested changes and preserves other pending proposals. "
    "Without an explicit save command, only propose and wait. Unresolved identities or conflicts block the whole save. "
    "Use the exact current draft_version and map_version. Unexpected concurrent changes or a stale-version rejection "
    "require presenting the changed draft and a new human decision; never silently overwrite a conflict."
)


def clone(value):
    return copy.deepcopy(value)


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def fixture():
    graph = {
        "objects": {
            "person-alex": {"kind": "person", "name": "Alex", "synthetic": True},
            "person-kim": {"kind": "person", "name": "Kim", "synthetic": True},
            "person-lo-lind": {"kind": "person", "name": "Lo Lind", "synthetic": True},
            "person-lo-berg": {"kind": "person", "name": "Lo Berg", "synthetic": True},
            "company-tonrum": {"kind": "company", "name": "Tonrum AB", "synthetic": True},
            "service-tonrum": {"kind": "service", "name": "Tonrum", "synthetic": True},
            "subscription-tonrum": {"kind": "subscription", "name": "Tonrum familj",
                                    "price": 149, "currency": "SEK", "interval": "month"},
            "card-alex": {"kind": "card", "name": "Alex syntetiska kort", "last_four": "0000"},
        },
        "relations": {
            "rel-tonrum-provider": {"from": "company-tonrum", "type": "provides", "to": "service-tonrum"},
            "rel-tonrum-service": {"from": "subscription-tonrum", "type": "for_service", "to": "service-tonrum"},
            "rel-tonrum-payer": {"from": "person-alex", "type": "pays", "to": "subscription-tonrum"},
            "rel-tonrum-card": {"from": "subscription-tonrum", "type": "paid_with", "to": "card-alex"},
            "rel-alex-uses-tonrum": {"from": "person-alex", "type": "uses", "to": "service-tonrum"},
        },
    }
    drafts = {u: {"version": 1, "base_map_version": 1, "base": clone(graph),
                  "target": clone(graph)} for u in USERS}
    drafts["alex"]["target"]["objects"]["subscription-tonrum"]["price"] = 179
    drafts["kim"]["target"]["objects"]["service-tonrum"]["note"] = "Kim vill se över tjänsten"
    return {"PROTOTYPE": "SYNTHETIC DATA ONLY; WIPE ME", "household": "synthetic-household",
            "map_version": 1, "map": graph, "drafts": drafts,
            "history": [], "requests": {}, "receipts": {}, "lose_next_receipt": False}


def differences(before, after):
    changes = []
    for collection in COLLECTIONS:
        for object_id in sorted(set(before[collection]) | set(after[collection])):
            old, new = before[collection].get(object_id), after[collection].get(object_id)
            if old == new:
                continue
            if old is None or new is None:
                changes.append({"collection": collection, "id": object_id, "field": "*",
                                "before": clone(old), "after": clone(new)})
            else:
                for field in sorted(set(old) | set(new)):
                    a, b = old.get(field, ABSENT), new.get(field, ABSENT)
                    if a != b:
                        changes.append({"collection": collection, "id": object_id,
                                        "field": field, "before": clone(a), "after": clone(b)})
    return changes


def put(graph, collection, object_id, field, value):
    if field == "*":
        if value is None:
            graph[collection].pop(object_id, None)
        else:
            graph[collection][object_id] = clone(value)
    elif value == ABSENT:
        graph[collection][object_id].pop(field, None)
    else:
        graph[collection][object_id][field] = clone(value)


def merged(base, target, current):
    candidate, conflicts = clone(current), []
    missing_conflicts = set()
    for change in differences(base, target):
        c, oid, field = change["collection"], change["id"], change["field"]
        current_record = current[c].get(oid)
        if field != "*" and current_record is None:
            if (c, oid) not in missing_conflicts:
                conflicts.append({"collection": c, "id": oid, "field": "*",
                                  "base": clone(base[c][oid]), "saved": None,
                                  "draft": clone(target[c][oid])})
                missing_conflicts.add((c, oid))
            candidate[c][oid] = clone(target[c][oid])
            continue
        actual = current_record if field == "*" else current_record.get(field, ABSENT)
        if actual != change["before"] and actual != change["after"]:
            conflicts.append({"collection": c, "id": oid, "field": field,
                              "base": clone(change["before"]), "saved": clone(actual),
                              "draft": clone(change["after"])})
        put(candidate, c, oid, field, change["after"])
    return candidate, conflicts


def validation(graph):
    blockers = []
    for oid, obj in graph["objects"].items():
        if not isinstance(obj.get("kind"), str) or not obj.get("kind"):
            blockers.append({"type": "invalid_object", "id": oid, "reason": "kind is required"})
        if not isinstance(obj.get("name"), str) or not obj.get("name"):
            blockers.append({"type": "invalid_object", "id": oid, "reason": "name is required"})
    for rid, rel in graph["relations"].items():
        for endpoint in ("from", "to"):
            if rel.get(endpoint) not in graph["objects"]:
                blockers.append({"type": "dangling_relation", "id": rid,
                                 "endpoint": endpoint, "target": rel.get(endpoint)})
        if not isinstance(rel.get("type"), str) or not rel.get("type"):
            blockers.append({"type": "invalid_relation", "id": rid, "reason": "type is required"})
    return blockers


def view(state, user, include_map=False):
    draft = state["drafts"][user]
    candidate, conflicts = merged(draft["base"], draft["target"], state["map"])
    full_diff = differences(state["map"], candidate)
    blockers = [{"type": "conflict", **c} for c in conflicts] + validation(candidate)
    result = {"prototype": True, "household": state["household"], "user": user,
              "map_version": state["map_version"], "draft_version": draft["version"],
              "draft_base_map_version": draft["base_map_version"],
              "full_diff": full_diff, "conflicts": conflicts, "blockers": blockers,
              "ready_to_save": bool(full_diff) and not blockers,
              "save_policy": SAVE_POLICY}
    if include_map:
        result.update(saved_map=clone(state["map"]), draft_map=candidate)
    return result


def rebase(state, user):
    draft = state["drafts"][user]
    candidate, conflicts = merged(draft["base"], draft["target"], state["map"])
    base = clone(state["map"])
    for conflict in conflicts:
        put(base, conflict["collection"], conflict["id"], conflict["field"], conflict["base"])
    draft.update(base=base, target=candidate, base_map_version=state["map_version"])


class DomainError(Exception):
    pass


def check_version(state, user, supplied):
    if type(supplied) is not int or supplied != state["drafts"][user]["version"]:
        raise DomainError("stale_draft_version: read the entire current draft again")


def operations(graph, items):
    if not isinstance(items, list) or not items:
        raise DomainError("operations must be a nonempty array")
    for op in items:
        if not isinstance(op, dict) or set(op) - {"collection", "id", "op", "fields", "unset", "create"}:
            raise DomainError("invalid operation fields")
        c, oid, action = op.get("collection"), op.get("id"), op.get("op")
        if c not in COLLECTIONS or not isinstance(oid, str) or not oid:
            raise DomainError("explicit collection and nonempty stable id are required")
        present = oid in graph[c]
        if action == "delete":
            if not present:
                raise DomainError("unknown_id: " + oid)
            if set(op) - {"collection", "id", "op"}:
                raise DomainError("delete takes only collection, id, and op")
            del graph[c][oid]
        elif action == "upsert":
            create = op.get("create", False)
            if type(create) is not bool:
                raise DomainError("create must be boolean")
            if create and present:
                raise DomainError("id_already_exists: " + oid)
            if not create and not present:
                raise DomainError("unknown_id: use create=true for an explicitly new object or relation")
            fields, unset = op.get("fields", {}), op.get("unset", [])
            if not isinstance(fields, dict) or not isinstance(unset, list) or not all(isinstance(f, str) for f in unset):
                raise DomainError("fields must be an object and unset must be an array of field names")
            if not fields and not unset:
                raise DomainError("upsert requires fields or unset")
            if "*" in fields or "*" in unset:
                raise DomainError("reserved field name")
            graph[c].setdefault(oid, {}).update(clone(fields))
            for field in unset:
                graph[c][oid].pop(field, None)
        else:
            raise DomainError("op must be upsert or delete")


def mutate(state, user, name, args):
    draft = state["drafts"][user]
    if name == "propose_changes":
        check_version(state, user, args.get("expected_draft_version"))
        rebase(state, user)
        operations(draft["target"], args.get("operations"))
        draft["version"] += 1
        return view(state, user)
    if name == "resolve_conflicts":
        check_version(state, user, args.get("expected_draft_version"))
        rebase(state, user)
        _, conflicts = merged(draft["base"], draft["target"], state["map"])
        choices = args.get("resolutions")
        if not isinstance(choices, list) or not choices:
            raise DomainError("resolutions must be a nonempty array")
        for choice in choices:
            key = (choice.get("collection"), choice.get("id"), choice.get("field"))
            conflict = next((c for c in conflicts if (c["collection"], c["id"], c["field"]) == key), None)
            if not conflict or choice.get("choice") not in ("draft", "saved"):
                raise DomainError("unknown conflict or choice; read current conflicts and select draft or saved")
            put(draft["base"], *key, conflict["saved"])
            if choice["choice"] == "saved":
                put(draft["target"], *key, conflict["saved"])
        draft["version"] += 1
        return view(state, user)
    if name == "undo_as_draft":
        check_version(state, user, args.get("expected_draft_version"))
        group = next((g for g in state["history"] if g["group_id"] == args.get("group_id")), None)
        if not group:
            raise DomainError("unknown_history_group")
        rebase(state, user)
        pending = differences(state["map"], draft["target"])
        inverse = differences(group["after"], group["before"])
        for own in pending:
            for undo in inverse:
                if (own["collection"], own["id"]) == (undo["collection"], undo["id"]) and (
                        own["field"] == undo["field"] or "*" in (own["field"], undo["field"])):
                    raise DomainError("undo_conflicts_with_existing_draft: " + own["collection"] + "/" +
                                      own["id"] + "/" + own["field"] +
                                      "; explicitly correct or save that private proposal before requesting undo; "
                                      "the entire existing draft is preserved")
        # Reverse only this group's fields. Keep unrelated later saved and draft changes.
        candidate, inverse_conflicts = merged(group["after"], group["before"], draft["target"])
        draft["target"] = candidate
        for conflict in inverse_conflicts:
            # Preserve the historical value as the conflict's expected baseline.
            put(draft["base"], conflict["collection"], conflict["id"], conflict["field"], conflict["base"])
        draft["version"] += 1
        result = view(state, user)
        result["undo_of_group"] = group["group_id"]
        return result
    if name == "save_draft":
        check_version(state, user, args.get("draft_version"))
        if type(args.get("reviewed_map_version")) is not int or args["reviewed_map_version"] != state["map_version"]:
            raise DomainError("stale_reviewed_map_version: saved map changed; review ALL full_diff again")
        status = view(state, user)
        if status["blockers"]:
            raise DomainError("save_blocked: resolve all blockers explicitly")
        if not status["full_diff"]:
            raise DomainError("empty_draft")
        before = clone(state["map"])
        candidate, _ = merged(draft["base"], draft["target"], before)
        state["map"] = candidate
        state["map_version"] += 1
        group_id = "change-" + str(len(state["history"]) + 1).zfill(4)
        saved_at = now()
        state["history"].append({"group_id": group_id, "actor": user, "saved_at": saved_at,
                                 "map_version": state["map_version"], "full_diff": status["full_diff"],
                                 "before": before, "after": clone(candidate)})
        receipt = {"status": "saved", "request_id": args["request_id"], "group_id": group_id,
                   "actor": user, "saved_at": saved_at, "saved_draft_version": draft["version"],
                   "reviewed_map_version": args["reviewed_map_version"], "map_version": state["map_version"],
                   "saved_diff": status["full_diff"]}
        state["receipts"][user + ":" + args["request_id"]] = receipt
        draft.update(version=draft["version"] + 1, base_map_version=state["map_version"],
                     base=clone(candidate), target=clone(candidate))
        return {"receipt": receipt, **view(state, user)}
    raise DomainError("unknown mutation")


def tool_call(state, user, name, args):
    if name not in TOOL_BY_NAME:
        return {"error": "unknown_tool", **view(state, user)}, True, False
    spec = TOOL_BY_NAME[name]["inputSchema"]
    if not isinstance(args, dict) or set(args) - set(spec["properties"]) or set(spec.get("required", [])) - set(args):
        return {"error": "invalid_arguments", **view(state, user)}, True, False
    if name == "read_map":
        return view(state, user, include_map=True), False, False
    if name == "search_map":
        query = args.get("query", "").casefold()
        status = view(state, user, include_map=True)
        matches = []
        for source in ("saved_map", "draft_map"):
            for c in COLLECTIONS:
                for oid, value in status[source][c].items():
                    if query in json.dumps({"id": oid, **value}, ensure_ascii=False).casefold():
                        matches.append({"source": source, "collection": c, "id": oid, **value})
        return {"matches": matches, "disambiguation": "Names are not identifiers. Ask the human when several people match.",
                **view(state, user)}, False, False
    if name == "read_history":
        return {"groups": [{k: clone(v) for k, v in g.items() if k not in ("before", "after")}
                           for g in state["history"]], **view(state, user)}, False, False
    if name == "get_save_receipt":
        receipt = state["receipts"].get(user + ":" + args["save_request_id"])
        return {"receipt": clone(receipt), "status": "saved" if receipt else "not_found",
                **view(state, user)}, False, False
    request_id = args.get("request_id")
    if not isinstance(request_id, str) or not request_id:
        return {"error": "nonempty_request_id_required", **view(state, user)}, True, False
    key = user + ":" + request_id
    fingerprint = hashlib.sha256(json.dumps([name, args], sort_keys=True).encode()).hexdigest()
    previous = state["requests"].get(key)
    if previous:
        if previous["fingerprint"] != fingerprint:
            return {"error": "request_id_reused_with_different_arguments", **view(state, user)}, True, False
        return clone(previous["result"]), previous["is_error"], False
    working = clone(state)
    try:
        result = mutate(working, user, name, args)
        state.clear()
        state.update(working)
        is_error = False
    except DomainError as error:
        result, is_error = {"error": str(error), **view(state, user)}, True
    state["requests"][key] = {"fingerprint": fingerprint, "result": clone(result), "is_error": is_error}
    lose = name == "save_draft" and not is_error and state["lose_next_receipt"]
    if lose:
        state["lose_next_receipt"] = False
    return result, is_error, lose


def schema(properties, required=()):
    return {"type": "object", "properties": properties, "required": list(required), "additionalProperties": False}


STR = {"type": "string"}
INT = {"type": "integer", "minimum": 1}
REQUEST = {"request_id": {"type": "string", "minLength": 1}}
EXPECTED = {**REQUEST, "expected_draft_version": INT}
OPERATION = schema({"collection": {"type": "string", "enum": list(COLLECTIONS)}, "id": STR,
                    "op": {"type": "string", "enum": ["upsert", "delete"]},
                    "fields": {"type": "object", "additionalProperties": True},
                    "unset": {"type": "array", "items": STR}, "create": {"type": "boolean"}},
                   ("collection", "id", "op"))


def tool(name, description, properties, required=(), read_only=False):
    return {"name": name, "description": description,
            "inputSchema": schema(properties, required),
            "annotations": {"readOnlyHint": read_only, "destructiveHint": False,
                            "idempotentHint": True, "openWorldHint": False}}


TOOLS = [
    tool("read_map", "Read the saved household map and this authenticated user's entire existing private draft. "
         "Always start here. Review and summarize ALL full_diff, including existing changes. Never expose another user's draft.", {}, read_only=True),
    tool("search_map", "Search saved map and own draft by text; names are not IDs. If 'Lo' matches several people, "
         "ask which one before proposing a relationship. Return stable IDs.", {"query": STR}, ("query",), True),
    tool("propose_changes", "Atomically propose or correct a batch in the same private draft. Does not save. "
         "Use known explicit IDs; create=true is required for new IDs. Upsert merges fields, unset removes fields. "
         "Deleting an object does not silently delete relations: dangling relations block save. "
         "Returns entire current diff/version/readiness. " + SAVE_POLICY,
         {**EXPECTED, "operations": {"type": "array", "minItems": 1, "items": OPERATION}},
         ("request_id", "expected_draft_version", "operations")),
    tool("resolve_conflicts", "Explicitly choose draft or saved value for each listed conflict. Does not save. "
         "Use exact collection/id/field from conflicts; '*' means the whole record. " + SAVE_POLICY,
         {**EXPECTED, "resolutions": {"type": "array", "minItems": 1, "items": schema({
             "collection": {"type": "string", "enum": list(COLLECTIONS)}, "id": STR, "field": STR,
             "choice": {"type": "string", "enum": ["draft", "saved"]}}, ("collection", "id", "field", "choice"))}},
         ("request_id", "expected_draft_version", "resolutions")),
    tool("save_draft", "SAVE the entire private draft into the shared household map. " + SAVE_POLICY +
         " On transport loss query get_save_receipt with this request_id before retrying; identical retries are safe. "
         "Check receipt.saved_diff against the intended whole draft and confirm what ACTUALLY saved from the receipt.",
         {**REQUEST, "draft_version": INT, "reviewed_map_version": INT},
         ("request_id", "draft_version", "reviewed_map_version")),
    tool("read_history", "Read saved change groups with actor, date, and exact diff. Other people's private drafts are excluded.",
         {}, read_only=True),
    tool("undo_as_draft", "Propose reversal of one saved change group in your private draft; this tool does not save. "
         "Keep unrelated later changes. Later changes to affected fields become explicit conflicts. "
         "If a current private proposal overlaps, reject without changing the draft; resolve that proposal first. "
         + SAVE_POLICY,
         {**EXPECTED, "group_id": STR}, ("request_id", "expected_draft_version", "group_id")),
    tool("get_save_receipt", "After a missing save response, look up durable save receipt by original request ID. "
         "Returns change group, actor, date, exact saved diff; read-only and limited to your own save requests.",
         {"save_request_id": STR}, ("save_request_id",), True),
]
TOOL_BY_NAME = {t["name"]: t for t in TOOLS}


class StateFile:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def transaction(self, callback):
        with open(str(self.path) + ".lock", "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            state = json.loads(self.path.read_text()) if self.path.exists() else fixture()
            result = callback(state)
            temporary = self.path.with_name(self.path.name + ".writing-" + str(os.getpid()))
            temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
            os.replace(temporary, self.path)
            return result


def inject(state, user, scenario):
    if scenario == "lose-next-receipt":
        state["lose_next_receipt"] = True
        return {"scenario": scenario, "effect": "Next successful save commits then closes MCP stdout without returning receipt"}
    if scenario in ("draft-edit", "draft-price-edit"):
        draft = state["drafts"][user]
        rebase(state, user)
        if scenario == "draft-price-edit":
            draft["target"]["objects"]["subscription-tonrum"]["price"] = 239
        else:
            draft["target"]["objects"]["subscription-tonrum"]["note"] = "Ändrad av samma användare i annan klient"
        draft["version"] += 1
        return {"scenario": scenario, **view(state, user)}
    other = "kim" if user == "alex" else "alex"
    # Scenario controller is outside MCP and deliberately excludes the other user's pending draft.
    before = clone(state["map"])
    if scenario == "independent-save":
        state["map"]["objects"]["card-alex"]["note"] = "Kortnamn kontrollerat av " + other
    elif scenario == "conflicting-save":
        state["map"]["objects"]["subscription-tonrum"]["price"] = 199
    state["map_version"] += 1
    group_id = "change-" + str(len(state["history"]) + 1).zfill(4)
    state["history"].append({"group_id": group_id, "actor": other, "saved_at": now(),
                             "map_version": state["map_version"],
                             "full_diff": differences(before, state["map"]),
                             "before": before, "after": clone(state["map"])})
    return {"scenario": scenario, "actor": other, "group_id": group_id, **view(state, user)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True, help="Scratch JSON path; use a clearly PROTOTYPE-named path")
    parser.add_argument("--user", choices=USERS, default="alex", help="Authenticated prototype identity; fixed outside MCP")
    parser.add_argument("--reset", action="store_true", help="Replace ONLY this scratch state with synthetic fixture and exit")
    parser.add_argument("--inject", choices=("draft-edit", "draft-price-edit", "independent-save", "conflicting-save", "lose-next-receipt"))
    args = parser.parse_args()
    storage = StateFile(args.state)
    if args.reset:
        def reset(state):
            state.clear()
            state.update(fixture())
            return {"reset": True, **view(state, args.user)}
        print(json.dumps(storage.transaction(reset), ensure_ascii=False, indent=2))
        return
    if args.inject:
        print(json.dumps(storage.transaction(lambda s: inject(s, args.user, args.inject)), ensure_ascii=False, indent=2))
        return
    for line in sys.stdin:
        request = None
        try:
            request = json.loads(line)
            method = request.get("method")
            if "id" not in request:
                continue
            if method == "initialize":
                requested = request.get("params", {}).get("protocolVersion")
                supported = ("2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05")
                result = {"protocolVersion": requested if requested in supported else "2025-11-25",
                          "capabilities": {"tools": {"listChanged": False}},
                          "serverInfo": {"name": "skyttel-THROWAWAY-PROTOTYPE", "version": "0.0.2"},
                          "instructions": "SYNTHETIC HOUSEHOLD PROTOTYPE. Read saved map and entire own existing draft first. "
                          "Ask human to disambiguate people. All modifications except save_draft are private proposals. "
                          + SAVE_POLICY + " Never claim saved without a receipt. Identity is fixed by host process."}
            elif method == "ping":
                result = {}
            elif method == "tools/list":
                result = {"tools": TOOLS}
            elif method == "tools/call":
                params = request.get("params", {})
                payload, is_error, lose = storage.transaction(
                    lambda state: tool_call(state, args.user, params.get("name"), params.get("arguments", {})))
                if lose:
                    return
                result = {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}],
                          "structuredContent": payload, "isError": is_error}
            else:
                print(json.dumps({"jsonrpc": "2.0", "id": request["id"],
                                  "error": {"code": -32601, "message": "Method not found"}}), flush=True)
                continue
            print(json.dumps({"jsonrpc": "2.0", "id": request["id"], "result": result}, ensure_ascii=False), flush=True)
        except (ValueError, TypeError, KeyError, AttributeError) as error:
            print(json.dumps({"jsonrpc": "2.0", "id": request.get("id") if isinstance(request, dict) else None,
                              "error": {"code": -32602, "message": str(error)}}), flush=True)


if __name__ == "__main__":
    main()
