# Three zero planes: real application comparison

Throwaway design experiment for live review. Keep this branch separate from
production. The current question is whether a plane tint makes the depth of
objects and connections clear while text labels remain readable. All four
reference variants and all three visual weights remain available.

## Run

From this branch, with the repository dependencies installed:

```sh
npm run prototype:planes
```

Open the printed URL in a fresh private browser window. Choose the Google
sign-in buttons: this launcher supplies a synthetic identity and never
contacts Google. After sign-in, reopen the printed URL, including its query.
Use a fresh private window for each new disposable installation, since
cookies are shared by host even when the port changes.

The launcher serves the actual development client, server, camera, map
objects, relationships, labels, settings and backgrounds. Its database is
temporary and independent of the normal development database. It loads nine
invented objects with positions on both sides of each plane. Ctrl+C stops
the launcher and deletes its database. No model or voice provider is enabled.

For a denser comparison, stop the launcher and use:

```sh
npm run prototype:planes -- --dense
```

This loads 80 invented objects. Both modes use Vite port 5179 and a printed
application port. The command holds the repository's shared process lock;
stop it before running builds or tests.

The prototype also works with ordinary development startup: append
`?prototype-planes` to the existing household route. Shape and visual-weight
changes stay in memory. The ordinary app's editing and personal-view actions
still behave normally; the disposable launcher is preferable for experiments.
The comparison is disabled in production builds.

## Compare

The bottom panel has independent native selects:

- Shape: square, oval, circle or lines. Circle is the starting shape.
- Weight: subtle, original or prominent. Subtle is the starting weight.
- Depth: A keeps content above planes; B tints parts behind plane surfaces.
  The printed URL starts with B. The `plane-depth=overlay` and
  `plane-depth=tint` query values select the comparison on reload.

The three patch shapes retain three mutually perpendicular planes centered
at the shared coordinate origin. The additional lines variant shows only
the X, Y and Z axes through that origin, extending in both directions.
It has no plane fills, boundaries or grids; six signed axis labels identify
the directions. All four variants support the three visual weights.
Switching a select preserves the camera,
objects and relationships. Collapse the panel to see content beneath it.
Tab and the native select keys operate the controls; there are no global
arrow-key overrides to compete with navigation. Reopening a settings page
can expand the temporary panel again. Reloading resets comparison choices;
reopen the original comparison URL if navigation removes its query.

## Review depth

The prototype panel includes X, Y and Z sliders for the synthetic
**Provobjekt 00**. Move it through zero on each axis, then compare A and B
without moving the camera. The sliders change only the current display;
reload to restore the sample positions. Ordinary map drag actions still
use the application's personal-view behavior in the disposable database.

In B, only the parts of object symbols and connections behind a finite
plane patch receive its color. Text labels, focus outlines and proposal
badges remain readable. A circle or oval does not tint content beyond its
boundary. The Lines variant has no surfaces and therefore adds no tint.
Rotate the camera to compare the opposite side and zoom close to the planes.

The tint uses trial opacity values of 18%, 26% and 34% per covering plane
for Subtle, Original and Prominent. These are stronger than the surface
fills to make the comparison visible on symbols. Multiple tints combine.
They are experiment values, not accepted final styling. This cue depends
on color and does not establish an accessible equivalent or exact signed
coordinates. Plane grids and borders do not yet overlay content.

The experiment clips patches at the camera and uses camera depth for
symbols and straight connections. Tint on curved, removed connections uses
an approximation; exact treatment of those curves and arrowheads needs
further work if this rendering is selected. No production decision follows
from running the comparison.

Capture the focused comparison in an isolated browser:

```sh
npm run prototype:planes -- --capture-depth
```

The `evidence-depth` directory contains A/B pairs in both themes, all shapes,
movement through each coordinate plane, camera movement and small-screen
controls. Its report records browser errors and whether the comparison and
probe sliders leave saved household and personal-view data unchanged.
The optional zoom-size setting and label collision policy are design
requirements; this depth experiment does not implement them.

The XZ boundary is solid, YZ is dashed and XY is dotted. Plane names and
coordinate equations supplement their different colors. Labels disappear
near the viewport edge or behind the camera. The geometry remains fixed in
map coordinates and receives the real camera projection and clipping.

Use the application's existing settings for light/dark themes, all seven
decorative backgrounds and a plain background. Use Navigation and the normal
gestures to rotate, zoom and pan. Try nearly edge-on views and moving the
origin off screen. Select an object away from zero, hold Shift and drag it
vertically to compare the independent local movement guide.

## Provisional choices and limits

- Squares span ±27 view units in each in-plane direction, matching the
  circles' diameter of 54 along both axes. Ovals have
  semiaxes 27 and 18.9: 50% larger in both directions than the initial
  comparison. This adjustment responds to live feedback asking for more
  width, height and depth. These are experiment dimensions, not agreed
  extents or physical measurements. The oval aspect ratio remains unchanged.
- Circles have radius 27 in both in-plane directions, matching the enlarged
  oval's major radius. Each circle belongs to its world-coordinate plane;
  camera perspective can make it appear elliptical on screen. The radius is
  a trial comparison size, not an accepted final extent.
- The lines variant spans −27 to +27 on each axis. It is an explicitly
  requested comparison, not a decision to replace the three-plane design.
  It reduces visual coverage but also removes the plane surfaces and
  boundaries that help compare positions against each zero plane.
- Plane geometry clips normally at the camera/viewport boundary. There is
  no camera-following extent, edge indicator or adaptive plane hiding.
- In A, household glyphs and connections render above the planes. B adds
  the depth tint described above. Position interpretation needs human
  review; no object-to-plane projections are added.
- Plane text does not participate in household label collision avoidance.
  Labels may overlap, disappear near edges, or be hidden under controls.
- Transparent plane intersections use ordinary blending. Edge-on planes
  become lines; this experiment does not decide a replacement for them.
- The comparison panel's placement, plane visibility and persistence are
  not final product decisions. The three visual weights approximate the
  concept direction in real rendering, not exact reproductions of raster art.
- Native controls, visible focus, 44-pixel select targets and a collapsible
  panel support review at small widths. Plane geometry is decorative to the
  accessibility tree; equations and border descriptions appear in panel text.
  Equivalent nonvisual position information remains an open design question.
  This is not a WCAG conformance claim.

## Evidence

The committed screenshot sets show the initial square half-extents 18 and
oval semiaxes 18 and 12.6.
They remain baseline evidence; use the running prototype to review the
enlarged squares and ovals and the additional circle and lines variants.
Rerunning the capture commands replaces those screenshots with the current
dimensions and adds
circle and lines captures for each visual weight in both themes.

The capture command uses an isolated Chromium context and synthetic identity:

```sh
npm run prototype:planes -- --capture
npm run prototype:planes -- --dense --capture
```

Each command captures the real app and exits. The `evidence-9` and
`evidence-80` directories contain all six combinations in both themes,
background examples, camera movement and mobile screenshots. Local guide
preview/drag evidence is captured on the sparse map.
Their `observations.json` files record unchanged rendered object positions
and saved household/personal-view state across style switches, keyboard
focus, local guide reference continuity, and browser runtime errors.

These captures support a live review; they do not decide retained options.
Review traceability and household readability while moving the camera,
then choose shape options, weight options and defaults, with any adjustments.
Exact edge-on behavior, screen-reader use, magnification, touch gestures and
contrast across all possible overlaps still require dedicated human review.

Start the visual review with these sparse-map pairs:

- Subtle: [dark square](evidence-9/dark-square-subtle.png),
  [dark oval](evidence-9/dark-oval-subtle.png),
  [light square](evidence-9/light-square-subtle.png),
  [light oval](evidence-9/light-oval-subtle.png).
- Original: [dark square](evidence-9/dark-square-original.png),
  [dark oval](evidence-9/dark-oval-original.png),
  [light square](evidence-9/light-square-original.png),
  [light oval](evidence-9/light-oval-original.png).
- Prominent: [dark square](evidence-9/dark-square-prominent.png),
  [dark oval](evidence-9/dark-oval-prominent.png),
  [light square](evidence-9/light-square-prominent.png),
  [light oval](evidence-9/light-oval-prominent.png).
