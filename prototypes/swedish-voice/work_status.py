"""THROWAWAY: observable work phases and timings, without transcript contents."""

from contextlib import contextmanager
import threading
import time


class WorkStatus:
    def __init__(self):
        self.lock = threading.RLock()
        self.records = {}
        self.current = None
        self.sequence = time.time_ns() // 1000

    def _changed(self, record):
        if record is self.current:
            self.sequence = max(self.sequence + 1, time.time_ns() // 1000)
            record["sequence"] = self.sequence

    def queue(self, key, revision, *, transport="mcp", completion_mode="standard"):
        with self.lock:
            if key in self.records and self.records[key]["active"]:
                return
            record = {"job_id": key, "revision": revision, "active": True,
                      "transport": transport,
                      "completion_mode": completion_mode, "model_steps": [],
                      "phase": "queue", "started_at": time.time(),
                      "model_calls": 0, "model_ms": 0, "tool_ms": 0,
                      "verify_ms": 0, "queue_ms": 0, "total_ms": 0,
                      "_started": time.monotonic(), "_processing": None}
            self.records[key] = record
            if self.current is None or revision >= self.current["revision"]:
                self.current = record
                self._changed(record)

    def processing(self, key, *, transport=None):
        with self.lock:
            record = self.records.get(key)
            if record and not record["active"]:
                self.queue(key, record["revision"], transport=record["transport"],
                           completion_mode=record["completion_mode"])
                record = self.records[key]
            if record and record["active"] and record["_processing"] is None:
                if transport is not None:
                    record["transport"] = transport
                record["_processing"] = time.monotonic()
                record["queue_ms"] = round((record["_processing"] - record["_started"]) * 1000)

    @contextmanager
    def measure(self, key, phase):
        started = time.monotonic()
        with self.lock:
            record = self.records.get(key)
            tracking = record and record["active"]
            if tracking:
                record["phase"] = phase
                if phase == "model":
                    record["model_calls"] += 1
                self._changed(record)
        try:
            yield
        finally:
            with self.lock:
                if tracking:
                    record[phase + "_ms"] += round((time.monotonic() - started) * 1000)
                    self._changed(record)

    def finish(self, key, phase):
        with self.lock:
            record = self.records.get(key)
            if record and record["active"]:
                record.update(active=False, phase=phase,
                              total_ms=round((time.monotonic() - record["_started"]) * 1000))
                self._changed(record)

    def snapshot(self):
        with self.lock:
            if self.current is None:
                return None
            result = {key: value for key, value in self.current.items() if not key.startswith("_")}
            result["elapsed_ms"] = (round((time.monotonic() - self.current["_started"]) * 1000)
                                    if result["active"] else result["total_ms"])
            return result

    def has_active(self):
        with self.lock:
            return any(record["active"] for record in self.records.values())

    def model_result(self, key, response, elapsed_ms):
        """Keep timing, token counts and tool names; never argument/transcript text."""
        def count(value):
            return value if type(value) is int and value >= 0 else None
        usage = response.get("usage") or {}
        with self.lock:
            record = self.records.get(key)
            if record is None:
                return
            record["model_steps"].append({
                "call": len(record["model_steps"]) + 1, "elapsed_ms": elapsed_ms,
                "input_tokens": count(usage.get("input_tokens")),
                "output_tokens": count(usage.get("output_tokens")),
                "cached_tokens": count((usage.get("input_tokens_details") or {}).get("cached_tokens")),
                "reasoning_tokens": count((usage.get("output_tokens_details") or {}).get("reasoning_tokens")),
                "tools": [item.get("name", "unknown") for item in response.get("output", [])
                          if item.get("type") == "function_call"],
            })
            self._changed(record)
