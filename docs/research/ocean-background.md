# Visual references for prototype E

For the designer and developers comparing Skyttel's spatial-map backgrounds.
This small investigation supports an ocean background with distinct light
and dark treatments. Source review: 2026-10-16.

## Comparison constraints

- Keep A and B unchanged in both themes; both light treatments work for the
  user, and both original dark treatments remain accepted references.
- D works for the user in dark theme; its light treatment does not.
- Add E primarily for light theme, with an optional, visibly different dark
  treatment. Preserve independent background choices for each theme.
- E illustrates ocean phenomena rather than simulating a particular depth,
  habitat, species, or a scientifically scaled underwater scene.

## Reference vocabulary

- **Sunlit water and depth:** most substantial sunlight is in the upper
  200 meters. A small amount can reach about 1,000 meters under favorable
  conditions, beyond which the ocean is without sunlight. A bright daytime
  underwater view and a dark deep-water view have different natural lighting.
  [NOAA: How far does light travel in the ocean?](https://oceanservice.noaa.gov/facts/light_travel.html)
- **Blue water, green water and focused sunlight:** seawater absorbs warm
  wavelengths more strongly than blue. Open water can look clear blue, while
  phytoplankton can make coastal water greener. Surface waves act as lenses,
  focusing and defocusing sunlight. This supports a blue-green palette and
  a restrained suggestion of underwater caustics, the focused light pattern.
  [WHOI: Shedding Light on Light in the Ocean](https://www.whoi.edu/oceanus/feature/shedding-light-on-light-in-the-ocean/)
- **Bioluminescence:** a living organism produces light through a chemical
  reaction. Marine examples usually emit blue light; other colors also
  occur. Jellyfish, comb jellies and other marine animals include luminous
  species. This is the appropriate reference for self-generated light in
  the dark ocean.
  [NOAA: What is bioluminescence?](https://oceanexplorer.noaa.gov/ocean-fact/bioluminescence/)
- **Fluorescence:** material absorbs light and emits light at a different
  wavelength. It requires excitation light; darkness alone does not trigger
  it. Smithsonian illustrates a fish whose fluorescent colors appear under
  dim blue light. Fluorescence and bioluminescence should not be used as
  interchangeable names for an underwater glow.
  [Smithsonian: Bioluminescent Animals Photo Gallery](https://ocean.si.edu/ocean-life/fish/bioluminescent-animals-photo-gallery)
- **Transparent jellies and rainbow comb rows:** jellyfish bells and comb
  jelly bodies provide recognizable soft silhouettes. The rainbow effect
  along comb jelly cilia comes from scattered light, not bioluminescence.
  Many jellies can also produce blue or green bioluminescence; this is a
  separate effect. Do not label rainbow comb bands as their own emitted light.
  [Smithsonian: Jellyfish and Comb Jellies](https://ocean.si.edu/ocean-life/invertebrates/jellyfish-and-comb-jellies)
- **Marine snow:** falling organic debris and other particles connect the
  upper water column with the deep ocean. NOAA describes pale flakes of
  varying sizes, including material that can take weeks to reach the bottom.
  This suggests sparse depth cues, rather than turning every particle into
  a glowing organism or drawing a uniform star field underwater.
  [NOAA: What is marine snow?](https://oceanservice.noaa.gov/facts/marinesnow.html)

## Light theme: design inference

The user requests a sand bed below the viewpoint and a water surface above
it, with refracted light in between and light patterns on the sand. Looking
down should reveal sand; looking up should reveal the surface. A spiral,
central focus or spherical texture around the viewpoint does not fit.

1. Intersect view rays with two horizontal planes. Map sand grain and light
   patterns onto the lower plane, and wave patterns onto the upper plane.
   Avoid projecting either pattern through spherical angle coordinates.
2. Fade distant sand into blue-green water to suggest absorption and depth.
   The warm sand, pale surface and turquoise volume are artistic choices
   for interface legibility, not a physical underwater light simulation.
3. Distribute diffuse light through the surface without one common origin.
   Reserve focused caustic patterns for the sand and surface, leaving the
   water between them quiet enough for household objects and connections.
4. Keep luminous animals in the separate dark treatment. Do not overlay
   animal silhouettes on the sand when the user looks down.

## Dark theme: design inference

Use deep navy and blue-black water, with a very faint teal depth gradient.
Replace the daytime light shafts and bright caustics with a few localized
blue-cyan glows on jelly-like bodies and a sparse cluster of tiny luminous
points. Keep a broad dark central area for the household map.

Base these accents on bioluminescence. If a separate fluorescent coral study
is useful later, make the assumed blue illumination explicit; do not suggest
that fluorescence needs no light. Avoid a neon reef covering the whole view.

The dark and light versions share an ocean identity but should have different
lighting, silhouette emphasis and contrast. A simple color inversion loses
the distinction between sunlit water and self-luminous deep-water life.

## Prototype boundaries

Keep positions stable while comparing backgrounds. Freeze light patterns
and organisms; do not add autonomous swimming, pulsing, flashing or falling
particles. Natural motion is reference material, not a requirement to animate
the interface. Background details must remain less prominent than map
objects, connections, selection states and text. Check the rendered result
with sparse and dense maps, mobile controls, panels and reduced motion.
These are design goals, not a claim of verified accessibility or realism.
