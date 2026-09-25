"""THROWAWAY server-side GPT-Live monitor; no session creation or API retries.

Install websockets in the prototype runtime. OPENAI_API_KEY stays on the server;
reflected audio is discarded. A socket closing without session.closed leaves
final usage unconfirmed. Official Live guides checked 2026-09-15.
"""

import json
import math
import os
import threading
from urllib.parse import quote

from websockets.sync.client import connect


class Monitor:
    """Observe one existing session and close it after a local time allowance.

    start() attaches in the background and returns self. send() waits up to ten
    seconds for attachment. close_session() queues an idempotent session.close,
    including when attachment is still pending. stop() requests closure while
    active and releases the transport after the final event. Failures emit only
    fixed codes. No method creates a session or retries an external operation.

    All received events except reflected audio reach on_event unchanged. Session
    snapshots retain expires_at. Usage is cumulative and must not be summed.
    The application owns filtering, budget accounting, tool execution, and
    blocking new work after failure. Keep the callback short.
    """

    def __init__(self, session_id, on_event, max_seconds=300):
        if not isinstance(session_id, str) or not session_id:
            raise ValueError("A Live session ID is required")
        if not math.isfinite(max_seconds) or max_seconds <= 0:
            raise ValueError("max_seconds must be a positive finite duration")
        self.session_id = session_id
        self.on_event = on_event
        self.max_seconds = max_seconds
        self.session = {}
        self.expires_at = None
        self.finalized = False
        self.failed = False
        self._lock = threading.RLock()
        self._send_lock = threading.RLock()
        self._ready = threading.Event()
        self._done = threading.Event()
        self._socket = None
        self._thread = None
        self._timer = None
        self._final_timer = None
        self._close_requested = False
        self._close_sent = False

    def start(self):
        with self._lock:
            if self._thread is not None:
                return self
            self._timer = threading.Timer(self.max_seconds, self.close_session)
            self._timer.daemon = True
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._timer.start()
            self._thread.start()
        return self

    def _emit(self, event):
        try:
            self.on_event(event)
        except Exception:
            self._fail("callback")

    def _fail(self, stage):
        with self._lock:
            if self.failed:
                return
            self.failed = True
        # Never forward exception messages, HTTP bodies, headers, or credentials.
        try:
            self.on_event({"type": "prototype.sideband.failed", "stage": stage})
        except Exception:
            pass
        self._disconnect()

    def _run(self):
        stage = "attach"
        try:
            key = os.environ.get("OPENAI_API_KEY")
            if not key:
                self._fail(stage)
                return
            headers = {"Authorization": "Bearer " + key}
            url = ("wss://api.openai.com/v1/live/sessions/"
                   + quote(self.session_id, safe="") + "/attach")
            socket = connect(url, additional_headers=headers, open_timeout=10,
                             close_timeout=2, max_size=8 * 1024 * 1024)
            with self._lock:
                if self._done.is_set():
                    socket.close()
                    return
                self._socket = socket
                self._ready.set()
            # The attached session is already running; never send session.start.
            if self._close_requested:
                self.close_session()
            stage = "receive"
            for message in socket:
                event = json.loads(message)
                if not isinstance(event, dict) or not isinstance(event.get("type"), str):
                    self._fail("event_format")
                    return
                if event["type"] in ("session.input_audio.append",
                                     "session.output_audio.delta"):
                    continue
                snapshot = event.get("session")
                if isinstance(snapshot, dict):
                    with self._lock:
                        self.session = snapshot
                        if "expires_at" in snapshot:
                            self.expires_at = snapshot["expires_at"]
                if event["type"] == "session.closed":
                    with self._lock:
                        self.finalized = True
                self._emit(event)
                if self.finalized or self.failed:
                    break
            if not self.finalized and not self.failed:
                self._fail("closed_without_final")
        except Exception:
            if not self.finalized and not self.failed:
                self._fail(stage)
        finally:
            self._disconnect()

    def send(self, event):
        """Send an application-owned event; rejected/failed sends raise safely."""
        if not isinstance(event, dict) or not isinstance(event.get("type"), str):
            raise ValueError("A Live event object with a type is required")
        if event["type"] == "session.close":
            return self.close_session()
        if not self._ready.wait(timeout=10):
            self._fail("attach_timeout")
            raise RuntimeError("Live sideband is unavailable")
        with self._send_lock:
            with self._lock:
                socket = self._socket
                blocked = self.failed or self.finalized or self._close_requested
            if blocked or socket is None:
                raise RuntimeError("Live sideband is unavailable or closing")
            try:
                socket.send(json.dumps(event, ensure_ascii=False))
            except Exception:
                self._fail("send")
                raise RuntimeError("Live sideband send failed") from None
        return True

    def close_session(self):
        """Request finalization once; keep receiving final usage and snapshots."""
        with self._send_lock:
            with self._lock:
                if self.finalized or self.failed or self._close_sent:
                    return False
                self._close_requested = True
                socket = self._socket
                if socket is None:
                    return False
                self._close_sent = True
                self._final_timer = threading.Timer(
                    20, self._finalization_timeout,
                )
                self._final_timer.daemon = True
                self._final_timer.start()
            try:
                socket.send(json.dumps({"type": "session.close"}))
            except Exception:
                self._fail("close_send")
                return False
        return True

    def _finalization_timeout(self):
        if not self.finalized:
            self._fail("finalization_timeout")

    def _disconnect(self):
        with self._lock:
            self._done.set()
            self._ready.set()
            socket, self._socket = self._socket, None
            for timer in (self._timer, self._final_timer):
                if timer is not None:
                    timer.cancel()
        if socket is not None:
            try:
                socket.close()
            except Exception:
                pass

    def stop(self):
        """Drain an active session; release transport after finalization/failure."""
        if not self.finalized and not self.failed:
            self.close_session()
            return
        self._disconnect()
        if self._thread is not None and self._thread is not threading.current_thread():
            self._thread.join(timeout=2)
