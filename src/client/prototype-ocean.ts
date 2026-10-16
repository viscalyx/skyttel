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

export const oceanLifeOptions = [
  { key: 'all', name: 'Alla sex ljusformer' },
  { key: 'original', name: 'Ursprungliga maneter · jämförelse' },
  { key: 'crown', name: 'Kronmanet · blå krona' },
  { key: 'siphonophore', name: 'Sifonofor · lysande koloni' },
  { key: 'lanternfish', name: 'Lanternfish · rader av ljusorgan' },
  { key: 'vampire', name: 'Vampyrbläckfisk · armspetsar och ljusmoln' },
  { key: 'ostracods', name: 'Musselkräftor · utsöndrade ljusspår' },
  { key: 'anglerfish', name: 'Djuphavsmarulk · lysande lockbete' },
] as const;
export type OceanLife = (typeof oceanLifeOptions)[number]['key'];

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
      life: { value: 0 },
      aspect: { value: 1 },
      tangent: { value: 0.4142 },
      rotation: { value: new Matrix3() },
      worldRotation: { value: new Matrix3() },
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
      wildlife: {
        value: [
          new Vector4(-0.55, 0.25, 0.07, -0.12),
          new Vector4(0.6, 0.2, 0.065, -0.18),
          new Vector4(-0.57, -0.1, 0.065, -0.12),
          new Vector4(0.58, -0.2, 0.065, 0.16),
          new Vector4(-0.4, -0.29, 0.06, -0.12),
          new Vector4(0.58, 0.0, 0.065, -0.08),
          new Vector4(1.7, 0.15, 0.08, 0.2),
          new Vector4(-2.2, 0.3, 0.08, -0.15),
          new Vector4(2.7, -0.2, 0.08, 0.2),
          new Vector4(-1.5, -0.4, 0.075, -0.1),
          new Vector4(2.1, 0.5, 0.08, 0.2),
          new Vector4(-2.9, -0.1, 0.07, -0.2),
        ],
      },
    },
    vertexShader: `
      varying vec2 screen;
      void main() { screen=uv*2.-1.; gl_Position=vec4(position.xy,.999,1.); }
    `,
    fragmentShader: `
      varying vec2 screen;
      uniform float dark, life, aspect, tangent;
      uniform mat3 rotation, worldRotation;
      uniform vec3 offset;
      uniform vec4 creatures[8];
      uniform vec4 wildlife[12];
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
      float segment(vec2 p, vec2 a, vec2 b) {
        vec2 v=b-a;
        return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));
      }
      float pointGlow(vec2 p, float size) {
        return exp(-dot(p,p)/(size*size))+.12*exp(-dot(p,p)/(size*size*8.));
      }
      vec3 animalLight(vec2 p, int kind) {
        vec3 blue=vec3(.04,.55,.74), cyan=vec3(.035,.67,.66);
        vec3 light=vec3(0.);
        if(kind==0) {
          // Atolla-inspired alarm crown, frozen as one illustrative instant.
          float angle=atan(p.y,p.x), r=length(p);
          float scallop=.84+.055*cos(angle*12.);
          float crown=exp(-abs(r-scallop)*42.);
          float radial=pow(.5+.5*cos(angle*12.),18.)*exp(-pow((r-.66)*5.,2.));
          float tail=exp(-abs(p.x-.10*sin(p.y*3.))*65.)
            *(1.-smoothstep(-.85,-.65,p.y))*smoothstep(-3.0,-1.6,p.y);
          light=blue*(crown*.38+radial*.17+tail*.055);
        } else if(kind==1) {
          // A colony of separate zooid-like units with selective blue light.
          for(int j=0;j<10;j++) {
            float y=-1.8+float(j)*.40;
            float x=sin(y*1.5)*.30;
            vec2 pod=p-vec2(x,y);
            float body=exp(-dot(pod*vec2(3.8,5.),pod*vec2(3.8,5.)));
            float organ=pointGlow(pod-vec2(.07,.025),.065);
            float thread=exp(-abs(p.x-x-.18*sin(p.y*5.+float(j)))*80.)
              *(1.-smoothstep(y-.3,y,p.y))*smoothstep(y-.8,y-.3,p.y);
            light+=blue*(body*.045+organ*.22+thread*.012);
          }
        } else if(kind==2) {
          // Photophores stay attached to the belly and side of a faint fish.
          float body=exp(-pow(length(p/vec2(1.25,.42)),4.));
          float tail=(1.-smoothstep(.0,.10,abs(p.y)-(-p.x-1.)*.65))
            *smoothstep(-1.9,-1.7,p.x)*(1.-smoothstep(-1.05,-.95,p.x));
          light+=blue*(body*.024+tail*.018);
          for(int j=0;j<7;j++) {
            float x=-.86+float(j)*.28;
            light+=cyan*pointGlow(p-vec2(x,-.25+.07*x*x),.046)*.29;
            light+=blue*pointGlow(p-vec2(x,.03+.035*x*x),.036)*.18;
          }
        } else if(kind==3) {
          // Vampire-squid-like web, glowing arm tips and detached luminous fluid.
          float mantle=exp(-pow(length((p-vec2(0.,.55))/vec2(.48,.70)),4.));
          light+=blue*mantle*.025;
          for(int j=0;j<7;j++) {
            float angle=(float(j)-3.)*.32;
            vec2 tip=vec2(sin(angle)*1.2,-.6-cos(angle)*.7);
            float web=exp(-segment(p,vec2(0.,.20),tip)*65.);
            light+=blue*web*.028+cyan*pointGlow(p-tip,.060)*.32;
          }
          vec2 cloud=p-vec2(-1.55,-1.45);
          float fluid=exp(-dot(cloud/vec2(.55,.70),cloud/vec2(.55,.70))*2.);
          float specks=pow(noise(p*24.+31.),10.);
          light+=cyan*fluid*(.018+specks*.13);
        } else if(kind==4) {
          // Secreted courtship traces: a shallow-water reference, not marine snow.
          for(int row=0;row<3;row++) for(int j=0;j<7;j++) {
            float x=-1.25+float(j)*.39;
            float y=(float(row)-1.)*.47+sin(x*1.6+float(row))*.17;
            y+=(hash(vec2(float(j),float(row)))-.5)*.10;
            float size=.035+hash(vec2(float(row),float(j)))*.014;
            light+=cyan*pointGlow(p-vec2(x,y),size)*(.15+float(j)*.022);
          }
        } else {
          // A bacterial lure attached to a subdued fish, not a floating map dot.
          float body=exp(-pow(length((p-vec2(-.25,-.15))/vec2(.85,.52)),4.));
          light+=blue*body*.023;
          vec2 previous=vec2(.05,.28);
          for(int j=1;j<=10;j++) {
            float t=float(j)/10.;
            vec2 curve=(1.-t)*(1.-t)*vec2(.05,.28)
              +2.*(1.-t)*t*vec2(.40,1.85)+t*t*vec2(1.05,.94);
            light+=blue*exp(-segment(p,previous,curve)*90.)*.025;
            previous=curve;
          }
          light+=cyan*pointGlow(p-vec2(1.05,.94),.075)*.39;
        }
        return light;
      }
      void main() {
        vec3 d=normalize(rotation*vec3(screen.x*aspect*tangent,screen.y*tangent,-1.));
        vec2 q=vec2(atan(d.x,-d.z),asin(clamp(d.y,-1.,1.)));
        q+=offset.xy*.12;
        float veil=noise(q*3.5)+noise(q*8.+13.)*.25;
        vec3 colour;
        if(dark<.5) {
          d=normalize(worldRotation*vec3(screen.x*aspect*tangent,screen.y*tangent,-1.));
          // Intersect actual horizontal planes: sand below, surface above.
          // Light E never maps its patterns through spherical angle coordinates.
          vec3 origin=vec3(offset.x*2.,clamp(offset.y,-.3,.3),offset.z*2.);
          vec3 water=mix(vec3(.61,.84,.86),vec3(.78,.94,.93),smoothstep(-.6,.6,d.y));
          colour=water;
          if(d.y<-.001) {
            float distance=(-1.35-origin.y)/d.y;
            vec3 hit=origin+d*distance;
            vec2 sand=hit.xz;
            float grain=noise(sand*95.);
            float ripple=sin(sand.x*9.+sin(sand.y*1.7)*1.5)*.5+.5;
            vec3 bed=vec3(.87,.81,.65)+(grain-.5)*.035+(ripple-.5)*.025;
            vec2 wave=sand*2.2+vec2(sin(sand.y*1.5),sin(sand.x*1.3))*.18;
            float pattern=caustic(wave);
            bed=mix(bed,vec3(.99,.97,.80),pattern*.29);
            // The water gradually filters the distant warm sand into blue-green.
            colour=mix(water,bed,exp(-distance*.065));
          } else if(d.y>.001) {
            float distance=(1.15-origin.y)/d.y;
            vec3 hit=origin+d*distance;
            vec2 surface=hit.xz;
            float waves=noise(surface*2.)*.65+noise(surface*5.+11.)*.35;
            float lines=caustic(surface*1.7+vec2(waves));
            vec3 top=mix(vec3(.54,.82,.86),vec3(.84,.97,.96),waves);
            top=mix(top,vec3(.96,1.,.99),lines*.27);
            colour=mix(water,top,exp(-distance*.075));
          }
          // Distributed sunlight through the water, with no converging source.
          float shafts=0.;
          for(int sampleIndex=1;sampleIndex<=3;sampleIndex++) {
            vec3 samplePoint=origin+d*float(sampleIndex)*1.6;
            float band=samplePoint.x*6.+sin(samplePoint.z*2.1)*.8;
            shafts+=pow(.5+.5*cos(band),10.)/3.;
          }
          float horizontal=1.-smoothstep(.06,.55,abs(d.y));
          colour=mix(colour,vec3(.91,.99,.95),shafts*horizontal*.12);
        } else {
          // Deep water has no sunbeams. Local living light supplies the accents.
          colour=vec3(.008,.025,.048)+vec3(.003,.022,.024)*veil;
          float distant=exp(-pow((q.x+.55)*2.,2.)-pow((q.y+.2)*1.4,2.));
          colour+=vec3(.0,.012,.017)*distant;
        }
        // Jelly-like forms stay at the periphery, with an empty working centre.
        if(dark>.5 && life<-.5) {
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
        }
        if(dark>.5 && life>-.5) {
          for(int i=0;i<12;i++) {
            int kind=i%6;
            if(life>.5 && abs(float(kind)+1.-life)>.1) continue;
            vec4 animal=wildlife[i];
            // Keep the new forms visible beside the map on narrow screens too.
            if(i<6) animal.x*=min(1.,aspect/.95);
            vec2 p=q-animal.xy;
            p.x=mod(p.x+3.14159,6.28318)-3.14159;
            float co=cos(animal.w), si=sin(animal.w);
            p=mat2(co,-si,si,co)*p/animal.z;
            if(abs(p.x)>3. || abs(p.y)>3.3) continue;
            colour+=animalLight(p,kind);
          }
        }
        // Sparse suspended matter, deliberately softer than the starfield in D.
        vec2 cell=floor(q*100.), f=fract(q*100.)-.5;
        float grain=exp(-dot(f,f)*100.)*step(.985,hash(cell));
        float quiet=smoothstep(.15,.65,abs(q.x));
        if(dark>.5) colour+=mix(vec3(.04,.055,.05),vec3(.035,.08,.085),dark)*grain*quiet;
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
    configure(active: boolean, dark: boolean, life: OceanLife) {
      mesh.visible = active;
      material.uniforms.dark.value = dark ? 1 : 0;
      material.uniforms.life.value =
        life === 'original'
          ? -1
          : [
              'all',
              'crown',
              'siphonophore',
              'lanternfish',
              'vampire',
              'ostracods',
              'anglerfish',
            ].indexOf(life);
    },
    update(rotation: Matrix3, offset: Vector3, aspect: number, tangent: number) {
      material.uniforms.rotation.value.copy(rotation).premultiply(initialInverse);
      material.uniforms.worldRotation.value.copy(rotation);
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
