# Personal position: coordinate entry in Navigation

Throwaway UI experiment for design review. Three coordinate fields form one
row above the selected object's existing movement buttons in Navigation.
Object properties contain no position editor. The fields supplement the
buttons; they do not replace them. Valid edits move the object immediately.

## Run

```sh
npm run prototype:planes
```

Open the printed **Position prototype** URL in a fresh private window.
Choose the Google sign-in buttons; the launcher uses a synthetic identity
and a disposable database, not Google. Reopen the full URL after sign-in if
its query is lost. If a stale browser binding prevents sign-in, use
**Börja om i den här webbläsaren** in this disposable installation and retry.

Select an object and open **Navigera**. X, Y and Z appear in one row above
the object's movement buttons. Each valid edit moves that axis immediately;
there is no apply button and no need to leave the field. The existing
movement buttons remain available. **Om koordinaterna**
explains the fixed axes and the distinction from physical measurements.

To select without visual map navigation, open **Tabell**, select an object
by its name, then return through **Karta** and open **Navigera**. Object
details have their ordinary contents, with no added position controls.

Both Navigation modes retain the coordinate row. In mini mode the fields
are narrow; long values scroll within an input. Try keyboard editing and a
small viewport when reviewing this layout. Focus stays in the edited field.

The household route uses `prototype-position` to enable this experiment.
`prototype-planes` retains the plane comparison, and `plane-depth=overlay`
starts without tint. The old `variant` query no longer selects an editor.
The development-only experiment is disabled in production builds.

## State and limits

Coordinates change only in memory, including movement through Navigation
buttons and the plane probe. Reloading restores the seeded positions.
Other application actions still use the disposable database. No real model
or voice is enabled. Changing the selected object discards incomplete input.

Each axis validates independently. Empty or incomplete input, nonfinite
values and values outside -10000 to +10000 leave that axis at its last valid
position. An invalid X field does not block valid Y or Z edits. Typing a
multi-digit value can therefore move through several valid intermediate
positions. Existing movement buttons refresh the affected coordinate field.

Fields show coordinate values; the optional summary rounds to two decimals.
Exact near-zero descriptions, final movement announcements, automatic-layout
coordinates and relationship position descriptions remain open design work.
Objects without seeded personal coordinates show an unavailable message.
The synthetic household provides coordinates for all nine objects.

Immediate movement is a user requirement. Wording and polite movement
announcements remain trial choices.
The agreed silent automatic-reference visibility policy remains unchanged.
This prototype does not implement that automatic-visibility behavior.

## Evidence

The `evidence-position/navigation-immediate.png` image shows the current
coordinate row without an apply button. Other Navigation images document
the preceding apply-button experiment; A/B/C images document the separate
object-details experiment. They are historical evidence.

Browser inspection confirms immediate decimal entry (-2.5), retained input
focus, unchanged X during empty input, a lone minus sign and out-of-range
10001, and independent Y movement while X is invalid. A movement button
then changes X to -1.5 and refreshes its field. The server still retains the
seeded (10, -8, 0), version 1. The preceding layout review covers the row in
normal/mini Navigation and at 320 pixels without document-level overflow.

Typecheck, lint and documentation checks accompany this change. No test
suite or billable provider call runs. Actual screen-reader output, complete
contrast and magnification still require review. These observations are not
a WCAG conformance claim.
