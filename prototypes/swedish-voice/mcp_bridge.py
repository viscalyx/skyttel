"""THROWAWAY: stdio MCP or direct calls for the synthetic Swedish voice trial.

Both transports use the unchanged external-mcp server's transaction and tool
logic as the simulated user Alex.
"""

import copy
import fcntl
import hashlib
import json
import os
import queue
import runpy
import subprocess
import sys
import threading
from pathlib import Path


SERVER_PATH = Path(__file__).resolve().parents[1] / "external-mcp" / "server.py"
FIXTURE_ID = "swedish-voice-synthetic-v1"
HISTORY_TOOL = {
    "name": "read_history",
    "description": (
        "Läs en sida av sparade ändringsgrupper, senaste först, med exakt full_diff. "
        "Ange limit=1 för senaste sparandet eller för att ångra det som sparades nyss. "
        "Utan limit visas högst fem grupper. has_more visar om äldre grupper finns; "
        "använd next_before_map_version som before_map_version för nästa sida. "
        "En sida är inte hela historiken. Andras privata utkast ingår inte."
    ),
    "inputSchema": {
        "type": "object", "properties": {
            "limit": {"type": "integer", "minimum": 1, "maximum": 20},
            "before_map_version": {"type": "integer", "minimum": 1},
        }, "required": [], "additionalProperties": False,
    },
    "annotations": {"readOnlyHint": True, "destructiveHint": False,
                    "idempotentHint": True, "openWorldHint": False},
}
RESTORE_TOOL = {
    "name": "restore_draft_deletions",
    "description": (
        "Återställ valda objekt som är sparade i kartan men föreslagna att tas "
        "bort i det aktuella utkastet. Återställ även deras sparade relationer "
        "som är föreslagna att tas bort. Använd detta när personen ber att "
        "ångra sådana osparade borttagningar. Ange objektens stabila ID:n från "
        "read_map. Fälten hämtas från den sparade kartan, aldrig från modellen. "
        "Andra utkaständringar behålls. Verktyget sparar ingenting och är inte "
        "generell ångra-historik. Kontrollera svarets restored_deletions innan "
        "du bekräftar vilka poster som återställts; ett error innebär att du "
        "inte får påstå att återställningen lyckades."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "request_id": {"type": "string", "minLength": 1},
            "expected_draft_version": {"type": "integer", "minimum": 1},
            "object_ids": {
                "type": "array", "minItems": 1, "uniqueItems": True,
                "items": {"type": "string", "minLength": 1},
            },
        },
        "required": ["request_id", "expected_draft_version", "object_ids"],
        "additionalProperties": False,
    },
    "annotations": {
        "readOnlyHint": False, "destructiveHint": False,
        "idempotentHint": True, "openWorldHint": False,
    },
}


def _prepare_fixture(state_path):
    """Extend the server's fixture once; reopening preserves drafts and receipts."""
    server = runpy.run_path(str(SERVER_PATH))

    def prepare(state):
        if state.get("voice_fixture") == FIXTURE_ID:
            return
        if state_path.exists():
            raise RuntimeError("The voice runtime contains an unknown fixture")
        state["voice_fixture"] = FIXTURE_ID
        state["PROTOTYPE"] = "SYNTHETIC SWEDISH VOICE DATA ONLY; WIPE ME"
        state["household"] = "synthetic-voice-household"
        objects = {
            "card-alex-1111": {
                "kind": "card", "name": "Alex syntetiska kort 1111",
                "last_four": "1111", "synthetic": True,
            },
            "account-tonrum": {
                "kind": "service_account", "name": "Alex tjänstekonto hos Tonrum",
                "synthetic": True,
            },
            "email-alex-login": {
                "kind": "email_address", "name": "alex@example.invalid",
                "address": "alex@example.invalid", "synthetic": True,
            },
            "email-household-contact": {
                "kind": "email_address", "name": "hushallet@example.invalid",
                "address": "hushallet@example.invalid", "synthetic": True,
            },
        }
        relations = {
            "rel-alex-owns-card": {
                "from": "person-alex", "type": "owns", "to": "card-alex",
            },
            "rel-alex-owns-card-1111": {
                "from": "person-alex", "type": "owns", "to": "card-alex-1111",
            },
            "rel-tonrum-account-service": {
                "from": "account-tonrum", "type": "for_service",
                "to": "service-tonrum",
            },
            "rel-tonrum-subscription-account": {
                "from": "subscription-tonrum", "type": "for_account",
                "to": "account-tonrum",
            },
            "rel-alex-uses-tonrum-account": {
                "from": "person-alex", "type": "uses", "to": "account-tonrum",
            },
            "rel-tonrum-login-address": {
                "from": "account-tonrum", "type": "login_address",
                "to": "email-alex-login",
            },
            "rel-tonrum-contact-address": {
                "from": "account-tonrum", "type": "contact_address",
                "to": "email-household-contact",
            },
            "rel-alex-uses-email": {
                "from": "person-alex", "type": "uses", "to": "email-alex-login",
            },
        }
        graphs = [state["map"]]
        for draft in state["drafts"].values():
            graphs.extend((draft["base"], draft["target"]))
        for graph in graphs:
            graph["objects"].update(copy.deepcopy(objects))
            graph["relations"].update(copy.deepcopy(relations))
            graph["objects"]["card-alex"].update(
                name="Alex syntetiska kort 0000", synthetic=True,
            )
        # The inherited Alex draft still proposes only the price 149 -> 179.

    server["StateFile"](state_path).transaction(prepare)
    return server


class Bridge:
    """Synchronous, thread-safe map calls; domain errors remain result dicts.

    Transport failures raise RuntimeError. A missing save response has an
    unknown outcome: reopen Bridge with the same runtime and query the receipt
    using the original save request ID before any retry. Calls are never retried
    automatically. Saving authorization belongs to the human/voice client.
    """

    def __init__(self, runtime_path: Path, *, transport="mcp"):
        if transport not in ("mcp", "direct"):
            raise ValueError("Unknown map transport")
        self.transport = transport
        self.runtime_path = Path(runtime_path).resolve()
        if self.runtime_path.is_relative_to(SERVER_PATH.parents[2]):
            raise ValueError("Voice scratch runtime must be outside the checkout")
        self.runtime_path.mkdir(parents=True, exist_ok=True)
        self.state_path = self.runtime_path / "PROTOTYPE-voice-state.json"
        server = _prepare_fixture(self.state_path)
        self._lock = threading.RLock()
        self._closed = False
        if transport == "direct":
            self._direct_server = server
            self._direct_storage = server["StateFile"](self.state_path)
            self.initialization = None
            self.tools = self._voice_tools(server["TOOLS"])
            return
        self._responses = queue.Queue()
        self._next_id = 0
        self._stderr = (self.runtime_path / "PROTOTYPE-mcp-stderr.log").open(
            "a", encoding="utf-8",
        )
        self._process = subprocess.Popen(
            [sys.executable, "-u", str(SERVER_PATH), "--state",
             str(self.state_path), "--user", "alex"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self._stderr,
            text=True, encoding="utf-8", bufsize=1,
        )
        self._reader = threading.Thread(target=self._read_stdout, daemon=True)
        self._reader.start()
        try:
            self.initialization = self._rpc("initialize", {
                "protocolVersion": "2025-06-18", "capabilities": {},
                "clientInfo": {"name": "skyttel-voice-PROTOTYPE", "version": "0.0.1"},
            })
            self._write({"jsonrpc": "2.0", "method": "notifications/initialized"})
            self.tools = self._voice_tools(self._rpc("tools/list", {})["tools"])
        except Exception:
            self.close()
            raise

    @staticmethod
    def _voice_tools(tools):
        return [copy.deepcopy(HISTORY_TOOL if tool["name"] == "read_history" else tool)
                for tool in tools] + [copy.deepcopy(RESTORE_TOOL)]

    def _read_stdout(self):
        try:
            for line in self._process.stdout:
                self._responses.put(line)
        finally:
            self._responses.put(None)

    def _write(self, message):
        try:
            self._process.stdin.write(json.dumps(message, ensure_ascii=False) + "\n")
            self._process.stdin.flush()
        except (BrokenPipeError, OSError, ValueError) as error:
            raise RuntimeError("MCP transport closed; a save outcome may be unknown") from error

    def _rpc(self, method, params):
        with self._lock:
            if self._closed:
                raise RuntimeError("MCP bridge is closed")
            self._next_id += 1
            request_id = self._next_id
            self._write({"jsonrpc": "2.0", "id": request_id,
                         "method": method, "params": params})
            while True:
                try:
                    line = self._responses.get(timeout=15)
                except queue.Empty as error:
                    self.close()
                    raise RuntimeError("MCP timed out; a save outcome may be unknown") from error
                if line is None:
                    self.close()
                    raise RuntimeError("MCP disconnected; a save outcome may be unknown")
                response = json.loads(line)
                if "id" not in response:
                    continue
                if response.get("id") != request_id:
                    self.close()
                    raise RuntimeError("Unexpected MCP response ID")
                if "error" in response:
                    raise RuntimeError("MCP error: " + json.dumps(response["error"]))
                return response["result"]

    def call(self, name, arguments):
        """Return the server payload, including its domain error if rejected."""
        if name == RESTORE_TOOL["name"]:
            return self._restore_draft_deletions(arguments)
        if name == HISTORY_TOOL["name"]:
            return self._read_history(arguments)
        return self._call_storage(name, arguments)

    def _read_history(self, arguments):
        if not isinstance(arguments, dict) or set(arguments) - {"limit", "before_map_version"}:
            return {"error": "invalid_history_paging"}
        limit = arguments.get("limit", 5)
        before = arguments.get("before_map_version")
        if (type(limit) is not int or not 1 <= limit <= 20 or
                ("before_map_version" in arguments and (type(before) is not int or before < 1))):
            return {"error": "invalid_history_paging"}
        result = self._call_storage("read_history", {})
        if result.get("error"):
            return result
        groups = sorted(result["groups"], key=lambda group: group["map_version"], reverse=True)
        eligible = [group for group in groups if before is None or group["map_version"] < before]
        page = eligible[:limit]
        more = len(eligible) > len(page)
        return {**result, "groups": page, "total_groups": len(groups), "has_more": more,
                "next_before_map_version": page[-1]["map_version"] if more else None,
                "order": "newest_first"}

    def _call_storage(self, name, arguments):
        """Call the unchanged domain tool through the selected transport."""
        if self.transport == "direct":
            with self._lock:
                if self._closed:
                    raise RuntimeError("Direct bridge is closed")
                payload, _, lose = self._direct_storage.transaction(
                    lambda state: self._direct_server["tool_call"](state, "alex", name, arguments))
                if lose:
                    self.close()
                    raise RuntimeError("Direct response lost; a save outcome may be unknown")
                return payload
        result = self._rpc("tools/call", {"name": name, "arguments": arguments})
        payload = result.get("structuredContent")
        if payload is None:
            for content in result.get("content", []):
                if content.get("type") == "text":
                    payload = json.loads(content["text"])
                    break
        if not isinstance(payload, dict):
            raise RuntimeError("MCP tool returned no object payload")
        return payload

    def _restore_draft_deletions(self, arguments):
        """Translate a bounded restoration into one real, atomic MCP proposal."""
        ledger_path = self.runtime_path / "PROTOTYPE-restore-requests.json"
        # Keep only adapter request metadata here. Household state is accessed
        # through the selected transport. Persist the batch before dispatch so retries
        # after a lost response or restart reuse the MCP server's exact request.
        with self._lock, open(str(ledger_path) + ".lock", "a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            current = self.view()

            def rejected(message):
                return {**current, "error": message}

            if (not isinstance(arguments, dict)
                    or set(arguments) != set(RESTORE_TOOL["inputSchema"]["required"])
                    or not isinstance(arguments.get("request_id"), str)
                    or not arguments["request_id"]
                    or type(arguments.get("expected_draft_version")) is not int
                    or not isinstance(arguments.get("object_ids"), list)
                    or not arguments["object_ids"]
                    or not all(isinstance(oid, str) and oid for oid in arguments["object_ids"])
                    or len(set(arguments["object_ids"])) != len(arguments["object_ids"])):
                return rejected("invalid_restore_arguments")
            request_id = arguments["request_id"]
            fingerprint = hashlib.sha256(json.dumps(
                arguments, sort_keys=True, ensure_ascii=False,
            ).encode()).hexdigest()
            ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {}
            record = ledger.get(request_id)
            if record and record["fingerprint"] != fingerprint:
                return rejected("request_id_reused_with_different_arguments")
            if record is None:
                if arguments["expected_draft_version"] != current["draft_version"]:
                    return rejected("stale_draft_version: read the entire current draft again")
                deleted = {
                    (change["collection"], change["id"]): change["before"]
                    for change in current["full_diff"]
                    if change["field"] == "*" and change["after"] is None
                    and isinstance(change["before"], dict)
                }
                selected = set(arguments["object_ids"])
                if any(("objects", oid) not in deleted for oid in selected):
                    return rejected("not_current_draft_deletion: use only currently deleted object IDs")
                records = {
                    ("objects", oid): deleted[("objects", oid)]
                    for oid in sorted(selected)
                }
                records.update({
                    (collection, rid): fields
                    for (collection, rid), fields in deleted.items()
                    if collection == "relations"
                    and (fields.get("from") in selected or fields.get("to") in selected)
                })
                if any((item["collection"], item["id"]) in records
                       for item in current["conflicts"]):
                    return rejected("restore_conflict: resolve the selected records explicitly first")
                present_objects = set(current["draft_map"]["objects"]) | selected
                if any(fields.get(endpoint) not in present_objects
                       for (collection, _), fields in records.items()
                       if collection == "relations" for endpoint in ("from", "to")):
                    return rejected("restore_missing_endpoint: a related object is also missing from the draft")
                operations = []
                for (collection, oid), fields in records.items():
                    if current["saved_map"][collection].get(oid) != fields:
                        return rejected("restore_saved_record_changed: read the map again")
                    operations.append({
                        "collection": collection, "id": oid, "op": "upsert",
                        "create": True, "fields": copy.deepcopy(fields),
                    })
                record = {
                    "fingerprint": fingerprint,
                    "proposal": {
                        "request_id": "restore-" + hashlib.sha256(request_id.encode()).hexdigest(),
                        "expected_draft_version": current["draft_version"],
                        "operations": operations,
                    },
                }
                ledger[request_id] = record
                temporary_path = ledger_path.with_suffix(".json.tmp")
                with temporary_path.open("w", encoding="utf-8") as pending:
                    json.dump(ledger, pending, ensure_ascii=False)
                    pending.flush()
                    os.fsync(pending.fileno())
                os.replace(temporary_path, ledger_path)
            result = self.call("propose_changes", record["proposal"])
            if result.get("error"):
                return result
            verified = self.view()
            operations = record["proposal"]["operations"]
            if any(verified["draft_map"][op["collection"]].get(op["id"]) != op["fields"]
                   for op in operations):
                return {**verified, "error": "restore_result_changed: read the current draft before confirming"}
            return {
                **verified,
                "restoration_status": "restored_in_draft",
                "restored_deletions": [
                    {"collection": op["collection"], "id": op["id"]}
                    for op in operations
                ],
            }

    def view(self):
        """Read the saved household map and Alex's complete effective draft."""
        return self.call("read_map", {})

    def close(self):
        with self._lock:
            if self._closed:
                return
            self._closed = True
            if self.transport == "direct":
                return
            if self._process.poll() is None:
                self._process.terminate()
                try:
                    self._process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self._process.kill()
                    self._process.wait(timeout=2)
            self._reader.join(timeout=2)
            self._process.stdin.close()
            self._process.stdout.close()
            self._stderr.close()
