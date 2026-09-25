# Recovered final Swedish voice prototype

This branch preserves a reconstruction of the approved final voice
prototype. It is a historical reference, separate from the application.

## Source and limits

- [Final approval in #14](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674)
  is dated 2026-09-15 21:24:04 UTC.
- [Final report](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688052442)
  records the final prototype and its verification.
- The published prototype branch ends at MCP base
  `90cf757b4d2fc1744686dfc4f868909daa544d2a`. It does not contain the final
  voice source. The issue records the failed signing/publication.
- Recovery starts from surviving tree
  `0aeb0d4c1927142950c05417ed191b5d32504201` and applies literal source-edit
  patches from the original 2026-09-15 sessions. Historical shell commands
  and provider calls are not replayed.
- The complete UI patch sequence applies, including successful split
  retries. Some earlier server/documentation retries have unmatched
  context. The recovered backend is not claimed to be an exact
  cryptographic match to the absent original final files.
- This branch contains source and prototype documentation only. Raw
  session logs, recovery audit records, credentials and runtime data are
  excluded.

Recovered UI SHA-256 values:

```text
index.html 6b0304e78ba78c6425d439f52a15ca9e2f6540b85527fb0eb9b837236c04db23
voice.js   ccebe58c9a34f6e3b8286b5157b25d459c0d06d9b275004152f5796955de9433
```

## Relationship to the map prototype

The user identifies
[#16's final device prototype](https://github.com/viscalyx/skyttel/issues/16#issuecomment-5678916527)
as the map and editor reference. Its source commit is
`38cf6abbc5de0828e6ec4ab15fbe97d7b2a74c6d`.
The final voice prototype refines speech, dialogue, model/MCP work,
whole-draft review, receipt recovery and confirmed display. Its simplified
map does not replace the approved spatial rendering, starfield, gestures
or editor from #16. Spec #31 excludes experimental model selectors and
trial budgets from the application.

## Local inspection

From this branch, start a credential-free preview with synthetic data:

```sh
env -u OPENAI_API_KEY python3 prototypes/swedish-voice/server.py \
  --port 8768 --runtime /tmp/skyttel-recovered-voice-preview
```

Open `http://127.0.0.1:8768`. Do not provide real household data. Provider
and microphone interaction are not required for visual inspection.
Recovery verification includes JavaScript syntax, Python parsing, local
MCP initialization and HTTP responses for the page, client and state.
This does not establish a new real-provider or human voice test result.
