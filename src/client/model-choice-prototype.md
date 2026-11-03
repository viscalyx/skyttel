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

- A: compact picker below the existing text-view heading, opening a dialog.
- B: visible controls beside the message field; voice has a dialog opener.
- C: a link to the actual conversation settings page, with the choices there.

The existing App and router render the actual HouseholdMap, WorkspaceTools,
TextView, draft review, VoiceBox, SettingsScreen and ConversationSettings.
The prototype adds controls inside those components. Their existing layout,
navigation, map renderer and responsive behavior remain in use.
When the text view closes, the same selection is available below the actual
voice box. Conversation settings include the choices in all three variants.

On the development household route, fixture responses supply a signed-in
example household, map data, a draft and settings. A simulated conversation
hook supplies text and voice states to the real presentation components.
There are no provider, microphone, authentication-service or database calls.
Browser storage is also replaced with memory-only fixtures on this route.
State resets on reload. The query parameter preserves the layout choice.
Production mode does not activate these fixtures or proposed controls.

## Review scenarios

1. Compare all three layouts on desktop and mobile.
2. Open Prova in the floating prototype menu. Hide the menu when assessing
   the message field; the small Prototyp button brings it back.
3. Start work, then select a different model and reasoning level. Compare
   the settings for current work with those for the next request.
4. Finish work and start again. The new request uses the new settings.
5. Make the selected model unavailable. The selection stays visible and
   starting another request is blocked until an available choice is selected.
6. Toggle text and voice separately and together. Their selection is shared.
7. Use Tab, native select keys, and Escape. Closing the dialog restores focus.
8. Open the actual draft panel and conversation settings, then return to the
   map. Compare the controls in the context of those existing app surfaces.

Availability loss is a presentation scenario. Recovery of a failed running
request is not modeled here. There is no queued-request simulation.
General household editing, membership administration, and consent changes
are outside this fixture. This is not a production backend implementation.

## Verification and limits

TypeScript and focused Biome checks pass. A production build passes.
Browser inspection covers desktop at 1440 pixels, mobile at 390 and 320
pixels, native select keyboard changes, dialog Escape and focus restoration,
changes during work, the next request, unavailable models, voice-only
presentation, and actual settings navigation. Accessible labels and status
text are inspected through the
browser accessibility tree. No screen reader software evaluation or full
WCAG conformance assessment is performed. No automated tests are added.

Screenshots show initial proposals; the live demo is the source for interaction.
The floating variant bar belongs to the prototype and can be hidden to keep
the app unobstructed. It is not proposed product UI.
