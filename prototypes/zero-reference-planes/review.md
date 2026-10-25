# Three zero-reference planes: concept review

This throwaway concept supports a visual discussion with the product owner.
It is not an implementation or an approved design.

The concept uses the built-in imagegen tool. The exact generation prompt is
in `prompt.txt`; the image is `concept-v1.png`.

## Proposal

Three translucent, mutually perpendicular planes pass through one coordinate
origin: XZ at y = 0, YZ at x = 0, and XY at z = 0. Color, border pattern,
and direct labels distinguish them. Objects and relationships retain readable
labels. Four panels explore dark plain, dark cosmic, light plain, and light
ocean backgrounds. These are illustrative approximations of backgrounds,
not captures of the application's actual rendering.

The planes reference personal view coordinates, without physical units or
a floor or ceiling meaning. The local movement guide is outside this image.

## Initial observations, awaiting human review

- The three full planes and their shared origin are visible.
- Overlapping grids compete with household content, especially in light scenes.
- Dashed and dotted borders need clearer separation; labels supply an
  additional distinction beyond color.
- Object icons and labels remain legible in this sparse example. This does
  not establish legibility with a dense household map.
- Object depth relative to each plane is ambiguous in a static generated
  image. The image does not verify signed coordinates or geometric accuracy.

The next proposed visual experiment is subtler fills and fewer grid lines,
retaining all three full planes, their outlines, labels, and shared origin.
This is a proposal for the user's judgment, not an accepted simplification.

## What this image can inform

The review can compare visual weight, label backing, origin emphasis, border
patterns, and the general treatment across light and dark backgrounds.

## Evidence still needed

Camera rotation, edge-on planes, zoom, panning with an off-screen origin,
plane extent, depth ordering, overlap with the local movement guide, dense
maps, and actual controls require further decisions and possibly a small
interactive experiment. Other configured backgrounds are not represented.
Accessibility, contrast, keyboard operation, and nonvisual alternatives
remain unverified. No visual direction is approved yet.
