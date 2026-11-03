# Conversation model controls: throwaway prototype

This prototype lets product reviewers compare three places for model and
reasoning controls in one conversation shared by text and voice.
It is a proposal awaiting human feedback, not an accepted design.

Run `npm run deps:prepare` once in this checkout, then:

```sh
npm run dev:client -- --host 0.0.0.0 --port 5173 --strictPort
```

Open <http://localhost:5173/households/prototype?variant=A>.
Use the bottom arrows or change `variant` to `A`, `B`, or `C`:

- A: compact picker in a shared conversation header, opening a dialog.
- B: visible controls beside the message field; voice has a dialog opener.
- C: a separate settings panel next to the conversation, stacked on mobile.

The prototype uses the existing workspace colors and household route shape,
with a simplified household shell and example data. It replaces the app only
on this explicit development URL. The normal app remains available on its
usual routes. Production builds exclude the prototype.

The shell, messages, draft, remembered settings, work and voice are simulated.
There are no provider, microphone, authentication, or database calls from the
prototype. State stays in memory and resets on reload. The query parameter
preserves only the layout choice.

## Review scenarios

1. Compare all three layouts on desktop and mobile.
2. Open the prototype scenario controls below the workspace.
3. Start work, then select a different model and reasoning level. Compare
   the settings for current work with those for the next request.
4. Finish work and start again. The new request uses the new settings.
5. Make the selected model unavailable. The selection stays visible and
   starting another request is blocked until an available choice is selected.
6. Toggle text and voice separately and together. Their selection is shared.
7. Use Tab, native select keys, and Escape. Closing the dialog restores focus.

Availability loss is a presentation scenario. Recovery of a failed running
request is not modeled here. There is no queued-request simulation.

## Verification and limits

TypeScript and focused Biome checks pass. A production build passes.
Browser inspection covers desktop at 1440 pixels, mobile at 390 and 320
pixels, native select keyboard changes, dialog Escape and focus restoration,
changes during work, the next request, unavailable models, and voice-only
presentation. Accessible labels and status text are inspected through the
browser accessibility tree. No screen reader software evaluation or full
WCAG conformance assessment is performed. No automated tests are added.

Screenshots show initial proposals; the live demo is the source for interaction.
The floating variant bar belongs to the prototype and can overlap content
while scrolling. It is not proposed product UI.
