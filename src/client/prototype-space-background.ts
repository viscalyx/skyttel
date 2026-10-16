// THROWAWAY: three background structures on the real map, plus its reference.
import { Matrix3, Mesh, PerspectiveCamera, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';

export const backgroundPrototypeEnabled = import.meta.env.MODE === 'prototype';

export type BackgroundVariant = 'reference' | 'A' | 'B' | 'C';
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
    key: 'C',
    name: 'Böjda skikt',
    detail: 'Stora sammanhängande valv och glest placerade ljuspunkter.',
  },
];

export function readBackgroundVariant(value: string | null): BackgroundVariant {
  return backgroundVariants.find(({ key }) => key === value)?.key ?? 'A';
}

export function prototypeSpaceBackground() {
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
        } else {
          // C: coherent curved shells, deliberately unlike irregular cloud noise.
          float latitude = dot(d, normalize(vec3(-0.3,0.88,0.4)));
          float curve = latitude + 0.07 * sin(d.x * 3.0 + d.z);
          float shell = pow(0.5 + 0.5 * cos(curve * 19.0 + 0.5), 14.0);
          float veil = smoothstep(-0.6,0.3,curve);
          float glow = exp(-pow((curve + 0.28) * 4.0,2.0));
          vec3 light = mix(vec3(0.95,0.94,0.91), vec3(0.78,0.87,0.88), veil * 0.6);
          light = mix(light, vec3(0.66,0.80,0.81), shell * 0.17);
          light += vec3(0.035) * glow;
          vec3 night = mix(vec3(0.035,0.045,0.09),vec3(0.085,0.09,0.17),veil);
          night += shell * vec3(0.055,0.08,0.11) + glow * vec3(0.025,0.045,0.04);
          colour = mix(light, night, dark);
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
  const stillCamera = new PerspectiveCamera(45, 1, 0.1, 1000);
  stillCamera.rotation.set(-0.16, 0.35, 0);
  stillCamera.updateMatrixWorld();
  let reduced = false;
  return {
    mesh,
    configure(
      variant: BackgroundVariant,
      theme: 'light' | 'dark',
      enabled: boolean,
      reduce: boolean,
    ) {
      mesh.visible = variant !== 'reference' && enabled;
      material.uniforms.variant.value = ['A', 'B', 'C'].indexOf(variant);
      material.uniforms.dark.value = theme === 'dark' ? 1 : 0;
      reduced = reduce;
    },
    update(camera: PerspectiveCamera) {
      camera.updateMatrixWorld();
      material.uniforms.rotation.value.setFromMatrix4(
        reduced ? stillCamera.matrixWorld : camera.matrixWorld,
      );
      material.uniforms.offset.value
        .copy(reduced ? stillCamera.position : camera.position)
        .multiplyScalar(0.0015);
      material.uniforms.aspect.value = camera.aspect;
      material.uniforms.tangent.value = Math.tan(((reduced ? 45 : camera.fov) * Math.PI) / 360);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
