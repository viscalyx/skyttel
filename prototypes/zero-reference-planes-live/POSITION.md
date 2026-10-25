# Personal position: object-details comparison

Throwaway UI experiment for design review. The question is whether object
details give useful access to personal position and movement without visual
map selection, and which layout works best. No layout is accepted yet.

## Run and compare

```sh
npm run prototype:planes
```

Open the printed **Position comparison** URL in a fresh private browser
window. The launcher provides a synthetic identity and a disposable database.
Choose the Google sign-in buttons; they use the local fixture, not Google.
After sign-in, reopen the full comparison URL if its query is lost. If an old
browser binding prevents sign-in, use **Börja om i den här webbläsaren** in
this disposable installation, then sign in again.

Open **Tabell** and select the **Provobjekt 00** name to expand its details.
Scroll to **Position i din vy**. Compare the three layouts with the bottom
arrows, or use Left/Right while an arrow button has focus:

- `variant=A`: three axis rows, each with decrease/increase buttons.
- `variant=B`: choose one axis, then decrease/increase its value.
- `variant=C`: enter all three coordinates and apply them together.

The existing household route uses `prototype-position` to enable this
comparison. Keep `prototype-planes` to retain the plane comparison as well.
`plane-depth=overlay` starts without tint. All reference shapes and weights
remain available. The comparison is disabled in production builds.

Positions remain the same when switching layouts. Return to **Karta** to
see the result. Existing Navigation movement buttons and the plane probe
sliders share the same temporary positions. Object positions change only in
memory in this mode; reloading restores the seeded values. Other application
actions still use the disposable database. No real model or voice is enabled.

## Review prompts

- Find an object from the table without selecting it on the map first.
- Read its position relative to zero. Move it across zero on each axis.
- Compare the number of actions, clarity and space used by each layout.
- In C, move directly to X = -2, Y = 0, Z = 3. Compare the map afterward.
- Try keyboard use and a narrow window. Check that the bottom comparison
  bar does not prevent reaching the controls by scrolling.
- Decide whether position belongs in object details at all, and whether
  parts of different layouts should be combined.

## Experiment choices and limits

The current readout uses signed values, two decimal places and the existing
Swedish axis vocabulary: sidled, höjd and djup. Numeric precision, final
wording and movement-result announcements remain design choices. The trial
readout can round a very small nonzero value to zero; this must be resolved
before using it as an exact zero-plane indicator.

Buttons use one coordinate unit per action. C accepts values within the
existing position bounds. The temporary status region announces a movement
result politely and keeps focus on the control. It is experiment behavior,
not an accepted announcement policy or a screen-reader conformance result.

Objects without seeded personal coordinates show an unavailable message;
this experiment does not add automatic-layout coordinate access. The
synthetic nine-object household has seeded coordinates for every object.
Relationship position descriptions, automatic reference visibility, saved
reference settings and the proposed tint/zoom controls are outside this
comparison. The accepted silent visibility policy remains a design decision.

## Browser evidence

The `evidence-position` images show A/B/C at desktop and 320-pixel widths.
Browser inspection checks click and keyboard activation, focus retention,
switcher keys, direct coordinate entry, movement through zero, shared map
positions and the unchanged saved position. At 320 pixels the position panel
is 234 pixels wide and its movement buttons are at least 44 pixels high.
The existing table remains horizontally scrollable; the position editor
itself fits the narrow view.

In the observed sequence, A changes X from 10 to 12, B changes it to 13,
C applies (-2, 0, 3), and Navigation moves it to (-2, 1, 3). The map probe
and details agree while the server retains (10, -8, 0), version 1.
Reloading restores the seeded position. These checks use synthetic data.

Typecheck, lint, documentation checks and the production build pass.
No test suite or billable provider
call is part of this experiment. Actual screen-reader output, complete
contrast evaluation, all theme/background combinations and magnification
still require review. This is not a claim of WCAG conformance.
