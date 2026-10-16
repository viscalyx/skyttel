// THROWAWAY motion comparison in the real map: layered, gentle and frozen.
import {
  Group,
  Matrix3,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import {
  type CosmicComposition,
  type CosmicPalette,
  prototypeCosmicSky,
} from './prototype-cosmic-sky.js';
import { type OceanLife, oceanLifeOptions, prototypeOcean } from './prototype-ocean.js';

export const backgroundPrototypeEnabled = import.meta.env.MODE === 'prototype';

export type BackgroundVariant = 'reference' | 'A' | 'B' | 'A-light' | 'B-light' | 'D' | 'E';
export type BackgroundMotion = 'layered' | 'gentle' | 'still';
export type ReducedBackground = 'freeze' | 'quiet' | 'off';
export type BackgroundPreview = {
  variant: BackgroundVariant;
  enabled: boolean;
  composition: CosmicComposition;
  palette: CosmicPalette;
  oceanLife: OceanLife;
  motion: BackgroundMotion;
  strength: number;
  layerDepth: number;
  simulateReduced: boolean;
  reducedBackground: ReducedBackground;
};
export const backgroundMotions = [
  { key: 'layered', name: 'Lager med parallax' },
  { key: 'gentle', name: 'Försiktig kamerarörelse' },
  { key: 'still', name: 'Stilla vid aktuell vy' },
] as const;

function boundedParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = params.get(key);
  const value = raw === null || raw.trim() === '' ? fallback : Number(raw);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
export const backgroundVariants: { key: BackgroundVariant; name: string; detail: string }[] = [
  { key: 'reference', name: 'Referens', detail: 'Dagens enfärgade bakgrund och stjärnhimmel.' },
  {
    key: 'A',
    name: 'Atmosfär',
    detail: 'Stora mjuka ljusfält. Inga partiklar eller tydliga kanter.',
  },
  {
    key: 'B',
    name: 'Dis och ljuspunkter',
    detail: 'Oregelbundet dis, fina stråk och avlägsna ljuspunkter.',
  },
  {
    key: 'A-light',
    name: 'Pärlemor',
    detail: 'Ny ljus atmosfär med varm pärlemor, aprikos och stora ljusfält.',
  },
  {
    key: 'B-light',
    name: 'Gryningsdis',
    detail: 'Ny ljus riktning med blått och rosafärgat dis samt ljusa öppningar.',
  },
  {
    key: 'D',
    name: 'Universum',
    detail: 'Stjärnhimmel, galaxer, nebulosor, stoft, stjärnhopar och en gles ringform.',
  },
  {
    key: 'E',
    name: 'Under världshavet',
    detail: 'Solbelyst vatten i ljust tema. Ett eget djuphav med bioluminiscens i mörkt tema.',
  },
];

export function readBackgroundVariant(value: string | null): BackgroundVariant {
  return backgroundVariants.find(({ key }) => key === value)?.key ?? 'A';
}

export function variantsForTheme(theme: 'light' | 'dark') {
  const keys =
    theme === 'light'
      ? ['reference', 'A-light', 'B-light', 'E']
      : ['reference', 'A', 'B', 'D', 'E'];
  return backgroundVariants.filter(({ key }) => keys.includes(key));
}

export function readBackgroundPreview(
  params: URLSearchParams,
  theme: 'light' | 'dark',
): BackgroundPreview {
  let value = params.get(theme) ?? params.get('variant') ?? (theme === 'light' ? 'A-light' : 'A');
  if (theme === 'light' && (value === 'A' || value === 'B')) value += '-light';
  if (theme === 'dark' && value.endsWith('-light')) value = value.slice(0, 1);
  if (!variantsForTheme(theme).some(({ key }) => key === value))
    value = theme === 'light' ? 'A-light' : 'A';
  const composition = params.get('composition');
  const palette = params.get('palette');
  const oceanLife = params.get('life');
  const motion = params.get('motion');
  const reducedBackground = params.get('reduced');
  return {
    variant: readBackgroundVariant(value),
    enabled: params.get('background') !== 'off',
    composition: composition === 'galaxies' || composition === 'nebulae' ? composition : 'sparse',
    palette: palette === 'dawn' || palette === 'lavender' ? palette : 'pearl',
    oceanLife: oceanLifeOptions.find(({ key }) => key === oceanLife)?.key ?? 'all',
    motion: motion === 'gentle' || motion === 'still' ? motion : 'layered',
    strength: boundedParam(params, 'strength', 0.7, 0, 1),
    layerDepth: boundedParam(params, 'depth', 1, 0.5, 2),
    simulateReduced: params.get('reduce') === 'on',
    reducedBackground:
      reducedBackground === 'quiet' || reducedBackground === 'off' ? reducedBackground : 'freeze',
  };
}

export function prototypeSpaceBackground(pixelRatio = 1) {
  const group = new Group();
  const cosmic = prototypeCosmicSky(pixelRatio);
  const ocean = prototypeOcean();
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      variant: { value: 0 },
      dark: { value: 0 },
      aspect: { value: 1 },
      tangent: { value: 0.4142 },
      rotation: { value: new Matrix3() },
      offset: { value: new Vector3() },
    },
    vertexShader: `
      varying vec2 screen;
      void main() {
        screen = uv * 2.0 - 1.0;
        gl_Position = vec4(position.xy, 0.999, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 screen;
      uniform float variant;
      uniform float dark;
      uniform float aspect;
      uniform float tangent;
      uniform mat3 rotation;
      uniform vec3 offset;
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        return noise(p) * 0.57 + noise(p * 2.03 + 9.2) * 0.28
          + noise(p * 4.09 + 21.7) * 0.15;
      }
      void main() {
        vec3 d = normalize(rotation * vec3(screen.x * aspect * tangent,
          screen.y * tangent, -1.0));
        vec3 p = d * 2.4 + offset;
        vec3 colour;
        if (variant < 0.5) {
          // A: only broad overlapping atmospheric light, with no fine texture.
          float a = pow(max(0.0, dot(d, normalize(vec3(-0.8,0.5,-0.9)))), 3.0);
          float b = pow(max(0.0, dot(d, normalize(vec3(0.9,-0.4,-0.5)))), 4.0);
          float c = pow(max(0.0, dot(d, normalize(vec3(0.1,0.9,-0.3)))), 5.0);
          vec3 light = mix(vec3(0.91,0.94,0.94), vec3(0.73,0.86,0.85), a * 0.72);
          light = mix(light, vec3(0.98,0.90,0.80), b * 0.65);
          light = mix(light, vec3(0.85,0.86,0.95), c * 0.5);
          vec3 night = vec3(0.035,0.067,0.12) + a * vec3(0.04,0.12,0.14)
            + b * vec3(0.07,0.04,0.12) + c * vec3(0.025,0.045,0.08);
          colour = mix(light, night, dark);
        } else if (variant < 1.5) {
          // B: a volume of cloud banks, with a finer irregular dust ribbon.
          float cloud = fbm(p * 1.25 + vec3(8.0,2.0,5.0));
          float band = 1.0 - smoothstep(0.08,0.72,
            abs(d.y + d.x * 0.52 + 0.12 + (cloud - 0.5) * 0.8));
          float wisps = fbm(p * vec3(3.0,9.0,3.0) + cloud * 2.0);
          float mist = smoothstep(0.22,0.8,cloud) * band;
          vec3 light = mix(vec3(0.93,0.95,0.96), vec3(0.72,0.83,0.88), mist * 0.9);
          light = mix(light, vec3(0.82,0.78,0.92), band * wisps * 0.25);
          light += vec3(0.045,0.043,0.03) * band * smoothstep(0.5,0.75,wisps);
          vec3 night = vec3(0.025,0.045,0.09);
          night += vec3(0.06,0.16,0.19) * mist;
          night += vec3(0.12,0.065,0.19) * band * wisps * 0.65;
          colour = mix(light, night, dark);
        } else if (variant < 2.5) {
          // A-light: luminous pearl with warm edges, independently authored.
          float glow=pow(max(0.0,dot(d,normalize(vec3(-.6,.5,-1.)))),2.);
          float warmth=pow(max(0.0,dot(d,normalize(vec3(.9,-.6,-.7)))),3.);
          colour=mix(vec3(.88,.89,.94),vec3(.995,.99,.96),glow*.95);
          colour=mix(colour,vec3(.96,.81,.73),warmth*.55);
        } else {
          // B-light: daylight through cloud, not a negative of the night sky.
          float cloud=fbm(p*1.8+vec3(8.,2.,5.));
          float opening=smoothstep(.30,.65,cloud);
          float band=.5+.5*sin(d.y*3.+d.x*2.+cloud*2.);
          colour=mix(vec3(.72,.83,.93),vec3(.98,.98,.99),opening);
          colour=mix(colour,vec3(.92,.78,.84),band*(1.-opening)*.35);
        }
        // Colours above are authored in display space.
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.visible = false;
  group.add(mesh, cosmic.group, ocean.mesh);
  const stillCamera = new PerspectiveCamera(45, 1, 0.1, 1000);
  const renderCamera = new PerspectiveCamera(45, 1, 0.1, 1000);
  const nearOffset = new Vector3();
  let hasFrame = false;
  let frozen = false;
  let preview = readBackgroundPreview(new URLSearchParams(), 'dark');
  let reduce = false;
  return {
    mesh: group,
    configure(
      variant: BackgroundVariant,
      theme: 'light' | 'dark',
      enabled: boolean,
      reducedMotion: boolean,
      composition: CosmicComposition = 'sparse',
      palette: CosmicPalette = 'pearl',
      points = true,
      oceanLife: OceanLife = 'all',
      motionPreview?: BackgroundPreview,
    ) {
      if (motionPreview) preview = motionPreview;
      reduce = reducedMotion || preview.simulateReduced;
      enabled &&= !(reduce && preview.reducedBackground === 'off');
      mesh.visible = !['reference', 'D', 'E'].includes(variant) && enabled;
      material.uniforms.variant.value = ['A', 'B', 'A-light', 'B-light'].indexOf(variant);
      material.uniforms.dark.value = theme === 'dark' ? 1 : 0;
      ocean.configure(
        variant === 'E' && enabled,
        theme === 'dark',
        oceanLife,
        !(reduce && preview.reducedBackground !== 'freeze'),
      );
      cosmic.configure(
        variant === 'D' && enabled,
        theme === 'dark',
        composition,
        palette,
        points && !(reduce && preview.reducedBackground !== 'freeze'),
      );
    },
    update(camera: PerspectiveCamera) {
      // The reference retains the real app's original camera response.
      if (preview.variant === 'reference') return camera;
      const freeze = reduce || preview.motion === 'still';
      // Capture the last displayed frame, rather than jump to a preset view.
      // Full rotation remains 1:1 in moving modes: E must retain up/down and
      // repeated complete turns must have no interpolation seam.
      if (freeze && !frozen && hasFrame) stillCamera.copy(renderCamera);
      if (!freeze || !hasFrame) {
        renderCamera.copy(camera);
        const factor = preview.motion === 'gentle' ? 0.2 : 1;
        renderCamera.position.multiplyScalar(preview.strength * factor * preview.layerDepth);
        renderCamera.fov = 45 * (camera.fov / 45) ** (preview.strength * factor);
        if (freeze) stillCamera.copy(renderCamera);
      } else {
        renderCamera.copy(stillCamera);
      }
      frozen = freeze;
      hasFrame = true;
      renderCamera.aspect = camera.aspect;
      renderCamera.updateProjectionMatrix();
      renderCamera.updateMatrixWorld();
      camera.updateMatrixWorld();
      material.uniforms.rotation.value.setFromMatrix4(renderCamera.matrixWorld);
      material.uniforms.offset.value
        .copy(renderCamera.position)
        .multiplyScalar(0.0015 / preview.layerDepth);
      material.uniforms.aspect.value = camera.aspect;
      material.uniforms.tangent.value = Math.tan((renderCamera.fov * Math.PI) / 360);
      cosmic.update(renderCamera, material.uniforms.rotation.value, material.uniforms.offset.value);
      ocean.update(
        material.uniforms.rotation.value,
        nearOffset.copy(renderCamera.position).multiplyScalar(0.0015),
        camera.aspect,
        material.uniforms.tangent.value,
      );
      return renderCamera;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      cosmic.dispose();
      ocean.dispose();
    },
  };
}
