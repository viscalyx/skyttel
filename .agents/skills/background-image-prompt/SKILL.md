---
name: background-image-prompt
description: Write a 360° image-generation prompt from a Skyttel spatial-map background scenario. Use when turning a proposed environment or background issue into a spherical panorama prompt.
---

# Background image prompt

Turn a scenario into a complete, copyable image prompt in the scenario's
language. A panoramic texture surrounds the observer; the map camera shows
only a perspective crop of it at a time.

## Gather the scenario

Read the supplied scenario or background issue. Identify the theme and visual
style, observer's position, starting view and focal point, and what appears to
each side, behind, above and below. Identify the light source and its effects
around the scene. Identify landmarks and other features that occur only once.
Ask for missing details that are necessary to distinguish directions or
locate the observer; make and state reasonable assumptions for lesser gaps.
Let the environment determine whether there is a horizon, ground or sky.

## Write the prompt

Write one continuous, standalone prompt without placeholders. Incorporate the
scenario's details in a coherent arrangement around a fixed observer:

- Specify an equirectangular 2:1 texture covering 360° horizontally and 180°
  from straight up to straight down, mapped to the inside of a sphere.
- Place the starting view at the horizontal center of the texture. Describe
  the unique features at each side and the opposite view at the joining edges.
  Describe what appears at the upper and lower poles.
- Carry the light source, illumination and shadows consistently around the
  scene. Place each unique landmark once. Ask for seamless side edges and
  poles that work when viewed directly, without mirrored scenes or repeated
  focal points.
- Request the scenario's intended medium and detail. Describe only the
  environmental elements the scenario calls for, and omit text and interface
  graphics unless requested.

Return the prompt ready to paste into an image generator, followed by the map
review below. Generate an image only when the user also asks for one. When no
image is available, present the review as steps for the resulting image.

## Example

Scenario: An observer on Earth looks from inside the Milky Way. The bright
galactic core is ahead, with a fainter band in the opposite direction. Dark
dust lanes cross the band and sparser stars appear toward the galactic poles.

Example prompt for image generation:

> Create a photorealistic texture of the entire sky around an observer on Earth
> inside the Milky Way. Use an equirectangular 2:1 image covering 360° around
> the observer and 180° from directly overhead to directly below, for the
> inside of a sphere. Place the galactic plane along the texture equator and
> the warm white galactic core once at the horizontal center. Extend dense
> star clouds and branching dark dust lanes to either side, continuing into a
> much fainter band toward the galactic anticenter at the joined side edges.
> Give each direction distinct structure. Show sparse dark star fields at
> both galactic poles. Keep the stars and illumination consistent around the
> sky, join the edges seamlessly, and make both poles suitable for direct
> viewing. Render fine stars with natural colors, without mirrored fields,
> repeated cores, a ground horizon, or text.

This is an example prompt. The Milky Way image in the map is a photographic
panorama.

## Review in the map

View the generated texture from inside the sphere in the actual map. Check
the start view, a quarter turn, a half turn, straight up and straight down,
then a full turn back to the start. Follow a landmark across the texture seam
and verify continuity at both poles. On mobile and desktop, check that objects,
labels and relationships remain distinguishable against the brightest and
darkest areas. Report observations and any directions still unverified.
