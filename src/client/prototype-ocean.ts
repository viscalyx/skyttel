// THROWAWAY E: sunlit water and a separate bioluminescent deep-sea treatment.
// Artistic scale and placement; references: docs/research/ocean-background.md.
import {
  Euler,
  Matrix3,
  Matrix4,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  Vector4,
} from 'three';

export function prototypeOcean() {
  const geometry = new PlaneGeometry(2, 2);
  const initialInverse = new Matrix3()
    .setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(-0.16, 0.35, 0)))
    .transpose();
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      dark: { value: 0 },
      aspect: { value: 1 },
      tangent: { value: 0.4142 },
      rotation: { value: new Matrix3() },
      offset: { value: new Vector3() },
      creatures: {
        value: [
          new Vector4(-0.57, 0.28, 0.1, -0.18),
          new Vector4(0.67, -0.25, 0.075, 0.25),
          new Vector4(0.78, 0.37, 0.045, -0.3),
          new Vector4(-0.38, -0.51, 0.04, 0.15),
          new Vector4(1.7, 0.15, 0.085, -0.12),
          new Vector4(-2.2, -0.12, 0.065, 0.2),
          new Vector4(2.7, 0.35, 0.06, -0.2),
          new Vector4(-1.4, 0.48, 0.035, 0.35),
        ],
      },
    },
    vertexShader: `
      varying vec2 screen;
      void main() { screen=uv*2.-1.; gl_Position=vec4(position.xy,.999,1.); }
    `,
    fragmentShader: `
      varying vec2 screen;
      uniform float dark, aspect, tangent;
      uniform mat3 rotation;
      uniform vec3 offset;
      uniform vec4 creatures[8];
      float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p) {
        vec2 cell=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(cell),hash(cell+vec2(1,0)),f.x),
          mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),f.x),f.y);
      }
      float caustic(vec2 p) {
        vec2 cell=floor(p), f=fract(p);
        float first=9., second=9.;
        for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
          vec2 neighbour=vec2(float(x),float(y));
          vec2 jitter=vec2(hash(cell+neighbour),hash(cell+neighbour+19.));
          float distance=length(neighbour+jitter-f);
          second=min(second,max(first,distance)); first=min(first,distance);
        }
        return 1.-smoothstep(.025,.12,second-first);
      }
      void main() {
        vec3 d=normalize(rotation*vec3(screen.x*aspect*tangent,screen.y*tangent,-1.));
        vec2 q=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)));
        q+=offset.xy*.12;
        float veil=noise(q*3.5)+noise(q*8.+13.)*.25;
        vec3 colour;
        if(dark<.5) {
          // Daylight loses its warmer wavelengths in water: an airy aqua volume.
          float depth=1.-smoothstep(-.75,.65,q.y);
          colour=mix(vec3(.92,.98,.95),vec3(.64,.85,.87),depth);
          colour+=vec3(.03,.035,.02)*(veil-.6);
          float fan=atan(q.x+.28,.95-q.y);
          float beam=pow(.5+.5*cos(fan*46.+sin(fan*13.)*.9),14.);
          float broad=pow(.5+.5*cos(fan*15.+.7),7.);
          float below=1.-smoothstep(.55,.95,q.y);
          colour=mix(colour,vec3(.98,1.,.95),
            (beam*.10+broad*.10)*below*exp(-depth*.9));
          vec2 warped=q*7.+vec2(sin(q.y*6.),sin(q.x*5.))*.30;
          float edges=smoothstep(.15,.8,abs(q.x));
          float bottom=1.-smoothstep(-.6,.0,q.y);
          float pattern=caustic(warped);
          colour=mix(colour,vec3(.98,1.,.93),pattern*(.05+edges*.10)*bottom);
          // A translucent suggestion of the surface, not a hard horizon.
          float ripple=pow(.5+.5*sin(q.x*28.+sin(q.x*8.)*2.+q.y*26.),12.);
          colour+=vec3(.02,.025,.015)*ripple*smoothstep(.15,.65,q.y);
        } else {
          // Deep water has no sunbeams. Local living light supplies the accents.
          colour=vec3(.008,.025,.048)+vec3(.003,.022,.024)*veil;
          float distant=exp(-pow((q.x+.55)*2.,2.)-pow((q.y+.2)*1.4,2.));
          colour+=vec3(.0,.012,.017)*distant;
        }
        // Jelly-like forms stay at the periphery, with an empty working centre.
        for(int i=0;i<8;i++) {
          if(dark<.5 && i>1) continue;
          vec4 animal=creatures[i];
          vec2 p=q-animal.xy;
          p.x=mod(p.x+3.14159,6.28318)-3.14159;
          float co=cos(animal.w), si=sin(animal.w);
          p=mat2(co,-si,si,co)*p/animal.z;
          if(abs(p.x)>2. || p.y>1.6 || p.y< -4.) continue;
          vec2 dome=vec2(p.x,p.y/.68);
          float radius=length(dome);
          float upper=smoothstep(-.13,.02,p.y);
          float rim=exp(-abs(radius-1.)*35.)*upper;
          float bell=(1.-smoothstep(.90,1.04,radius))*upper;
          float lip=exp(-abs(p.y+.04)*42.)*(1.-smoothstep(.8,1.,abs(p.x)));
          float ribs=pow(.5+.5*cos(atan(dome.y,dome.x)*7.),10.)*bell*.16;
          float tentacles=0.;
          for(int j=0;j<5;j++) {
            float strand=float(j)-2.;
            float lengthLimit=2.3+hash(vec2(float(i),float(j)))*1.1;
            float bend=sin(p.y*3.+strand*1.3)*(.08-p.y*.025);
            float x=strand*.25+bend;
            float line=exp(-abs(p.x-x)*75.);
            tentacles+=line*(1.-smoothstep(-.18,.02,p.y))*smoothstep(-lengthLimit,-.7,p.y);
          }
          float organs=exp(-dot(p-vec2(.0,.24),p-vec2(.0,.24))*26.)*.7;
          if(dark>.5) {
            float glow=exp(-radius*radius*1.4)*.10;
            vec3 hue=mix(vec3(.02,.65,.70),vec3(.10,.45,.72),float(i%3)*.25);
            colour+=hue*(rim*.40+lip*.20+ribs+tentacles*.16+organs*.38+glow);
          } else {
            colour=mix(colour,vec3(.38,.68,.70),bell*.075);
            colour=mix(colour,vec3(.98,1.,1.),
              clamp(rim*.27+lip*.16+ribs*.16+tentacles*.11,0.,.4));
          }
        }
        // Sparse suspended matter, deliberately softer than the starfield in D.
        vec2 cell=floor(q*100.), f=fract(q*100.)-.5;
        float grain=exp(-dot(f,f)*100.)*step(.985,hash(cell));
        float quiet=smoothstep(.15,.65,abs(q.x));
        colour+=mix(vec3(.04,.055,.05),vec3(.035,.08,.085),dark)*grain*quiet;
        gl_FragColor=vec4(colour,1.);
      }
    `,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  mesh.visible = false;
  return {
    mesh,
    configure(active: boolean, dark: boolean) {
      mesh.visible = active;
      material.uniforms.dark.value = dark ? 1 : 0;
    },
    update(rotation: Matrix3, offset: Vector3, aspect: number, tangent: number) {
      material.uniforms.rotation.value.copy(rotation).premultiply(initialInverse);
      material.uniforms.offset.value.copy(offset);
      material.uniforms.aspect.value = aspect;
      material.uniforms.tangent.value = tangent;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
