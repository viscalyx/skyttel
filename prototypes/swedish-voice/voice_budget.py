"""THROWAWAY estimates for a locally limited voice trial.

The five-minute timer is a soft local stop, not a provider-enforced duration or
cost cap. Keep the reservation until trusted final usage arrives; partial usage
is cumulative and never settles the reservation. Missing final usage must block
new paid work. Final cost can exceed the initial reservation.
"""

import math


MAX_VOICE_SECONDS = 300
CLOSE_BUFFER_SECONDS = 60
MIN_BILLED_SECONDS = 15
USD_PER_MINUTE = 0.05


def _seconds(value, *, positive=False):
    """Accept finite JSON numbers, excluding booleans and numeric strings."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("Duration must be a finite number of seconds")
    try:
        seconds = float(value)
    except (OverflowError, ValueError):
        raise ValueError("Duration must be a finite number of seconds") from None
    if not math.isfinite(seconds) or seconds < 0 or (positive and seconds == 0):
        raise ValueError("Duration must be finite and nonnegative, or positive when required")
    return seconds


def usage_seconds(usage):
    """Read cumulative or final usage; absence is unknown, never zero usage."""
    if not isinstance(usage, dict) or "seconds" not in usage:
        raise ValueError("Usage must contain a finite seconds value")
    return _seconds(usage["seconds"])


def voice_cost_usd(seconds):
    """Estimate actual reported duration without capping it at the reservation."""
    duration = max(MIN_BILLED_SECONDS, _seconds(seconds))
    return round(duration / 60 * USD_PER_MINUTE, 9)


def voice_reservation_usd(max_seconds=MAX_VOICE_SECONDS,
                          close_buffer_seconds=CLOSE_BUFFER_SECONDS):
    """Reserve active allowance plus closing margin: the defaults reserve $0.30."""
    duration = _seconds(max_seconds, positive=True)
    closing = _seconds(close_buffer_seconds)
    return voice_cost_usd(duration + closing)


def should_close_voice(cumulative_seconds):
    """Request closure at five minutes; the buffer grants no extra active time."""
    return _seconds(cumulative_seconds) >= MAX_VOICE_SECONDS
