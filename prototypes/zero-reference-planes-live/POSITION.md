# Personal position: coordinate entry in Navigation

Throwaway UI experiment for design review. Three coordinate fields form one
row above the selected object's existing movement buttons in Navigation.
Object properties contain no position editor. The fields supplement the
buttons; they do not replace them. The final interaction remains for review.

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
the object's movement buttons. Enter coordinates, then use **Flytta till
position**. The existing buttons remain available. **Om koordinaterna**
explains the fixed axes and the distinction from physical measurements.

To select without visual map navigation, open **Tabell**, select an object
by its name, then return through **Karta** and open **Navigera**. Object
details have their ordinary contents, with no added position controls.

Both Navigation modes retain the coordinate row. In mini mode the fields
are narrow; long values scroll within an input. Try keyboard editing and a
small viewport before accepting this layout. The apply button keeps focus.

The household route uses `prototype-position` to enable this experiment.
`prototype-planes` retains the plane comparison, and `plane-depth=overlay`
starts without tint. The old `variant` query no longer selects an editor.
The development-only experiment is disabled in production builds.

## State and limits

Coordinates change only in memory, including movement through Navigation
buttons and the plane probe. Reloading restores the seeded positions.
Other application actions still use the disposable database. No real model
or voice is enabled. Changing the selected object discards unapplied input.

Fields show coordinate values; the optional summary rounds to two decimals.
Exact near-zero descriptions, final movement announcements, automatic-layout
coordinates and relationship position descriptions remain open design work.
Objects without seeded personal coordinates show an unavailable message.
The synthetic household provides coordinates for all nine objects.

The apply action, wording and polite movement announcement are trial choices.
The agreed silent automatic-reference visibility policy remains unchanged.
This prototype does not implement that automatic-visibility behavior.

## Evidence

The `evidence-position/navigation-*.png` images show normal Navigation,
mini Navigation and a 320-pixel viewport. The older A/B/C images document the
separate object-details experiment and do not describe the current design.

Browser inspection confirms that object details have no position editor,
the coordinate row precedes the movement buttons, direct entry applies
(-2, 0, 3), focus stays on the apply button, and the server retains the
seeded (10, -8, 0), version 1. The three fields share one row in both modes,
including the narrow viewport, without document-level horizontal overflow.

Typecheck, lint and documentation checks accompany this change. No test
suite or billable provider call runs. Actual screen-reader output, complete
contrast and magnification still require review. These observations are not
a WCAG conformance claim.
