"""THROWAWAY: explicit model choices and standard text prices checked 2026-09-15."""
from dataclasses import dataclass


@dataclass(frozen=True)
class BackendModel:
    name: str
    input_per_million: float
    cached_per_million: float
    output_per_million: float
    reservation_usd: float

    def costs(self, usage):
        """Return conservative ledger cost and cache-adjusted estimate.

        Missing cache counters earn no discount. GPT-5.6/6 cache writes cost 1.25x.
        Payloads are below 60KB, hence below the 272K input-token tier.
        """
        inputs, outputs = usage.get("input_tokens"), usage.get("output_tokens")
        if any(type(value) is not int or value < 0 for value in (inputs, outputs)):
            raise ValueError("Invalid model usage")
        details = usage.get("input_tokens_details") or {}
        cached, writes = details.get("cached_tokens", 0), details.get("cache_write_tokens", 0)
        if (any(type(value) is not int or value < 0 for value in (cached, writes))
                or cached + writes > inputs):
            raise ValueError("Invalid cache usage")
        premium = writes * self.input_per_million * .25 if self.name.startswith(("gpt-5.6-", "gpt-6-")) else 0
        conservative = (inputs * self.input_per_million + premium
                        + outputs * self.output_per_million) / 1e6
        estimated = conservative - cached * (self.input_per_million - self.cached_per_million) / 1e6
        return conservative, estimated


BACKEND_MODELS = {
    "gpt-5-mini-2025-08-07": BackendModel("gpt-5-mini-2025-08-07", .25, .025, 2, .077),
    # At most 60KB input plus 4096 output tokens; reserve above even an all-byte
    # input-token estimate and 1.25x cache-write rate (0.30 + 0.08192 USD).
    "gpt-5.6-sol": BackendModel("gpt-5.6-sol", 4, .40, 20, .40),
    # The same conservative 60KB input / 4096 output ceiling as Sol.
    "gpt-5.6-terra": BackendModel("gpt-5.6-terra", 2, .20, 12, .21),
    "gpt-5.6-luna": BackendModel("gpt-5.6-luna", .20, .02, 1.20, .021),
    "gpt-6-astra": BackendModel("gpt-6-astra", 10, 1, 50, 1.0),
}
