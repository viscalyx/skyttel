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

Start with sunlit open water: pearl white near the upper edge, pale aqua
through the center, and slightly deeper blue-green toward the lower edges.
This palette is an illustration chosen for interface legibility, not a
claim that the deep ocean has ambient white daylight.

1. Distribute diffuse light across the water surface, with faint broken
   caustic ribbons near an edge. The user rejects a visible common origin
   or converging fan of rays in light E. Prefer gently varying, approximately
   parallel light bands rather than a single point source. Avoid a sharp
   mesh across the map: it could resemble household connections or a grid.
2. Place two or three transparent jelly silhouettes off center, using soft
   blue-green outlines and pale internal shading. Leave the main object and
   label area visually quiet. Keep tentacles faint and away from labels.
3. Add occasional small, softly shaded particles at different apparent
   sizes. Treat these as suspended material, with no sparkle crosses.
4. Consider a small, restrained iridescent accent on a comb jelly as a
   secondary study. Its rainbow suggests scattered ambient light; avoid
   describing it as bioluminescence or filling the whole scene with rainbow.

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
