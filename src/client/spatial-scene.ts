import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PersonalPosition, Position, ViewSettings } from '../shared/personal-view.js';
import { cameraGestures } from './spatial-navigation.js';

export type ProjectedPoint = { id: string; x: number; y: number; visible: boolean };

/** Owns only graphics and the camera. Household content stays in the shared editor. */
export function spatialScene(
  canvas: HTMLCanvasElement,
  onProject: (points: ProjectedPoint[]) => void,
  onOrientation: (axes: Position[]) => void = () => {},
  onMotion: () => void = () => {},
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const sky = new Scene();
  sky.background = new Color('#102e2c');
  const skyCamera = new PerspectiveCamera(45, 1, 0.1, 1000);
  const camera = new PerspectiveCamera(45, 1, 0.1, 500000);
  renderer.autoClear = false;
  const controls = new OrbitControls(camera, canvas);
  // Pointer transitions and independent pan directions belong to our gesture
  // adapter; Three retains camera projection and public orbit mathematics.
  controls.disconnect();
  let settings: Pick<ViewSettings, 'invertX' | 'invertY'> = { invertX: false, invertY: false };
  const gestures = cameraGestures(canvas, {
    rotate(x, y) {
      controls.rotateLeft(x);
      controls.rotateUp(y);
      controls.update();
      onMotion();
    },
    pan(x, y) {
      controls.pan(x * (settings.invertX ? -1 : 1), y * (settings.invertY ? -1 : 1));
      controls.update();
      onMotion();
    },
    zoom(factor) {
      controls.dollyIn(factor);
      controls.update();
      onMotion();
    },
  });
  controls.enableDamping = false;
  controls.minDistance = 2;
  controls.maxDistance = 100000;
  const geometry = new SphereGeometry(0.22, 12, 8);
  const material = new MeshBasicMaterial({ color: '#8ccbbb' });
  const nodes = new Map<string, Mesh>();
  const locations = new Map<string, Vector3>();
  const defaults = new Map<string, Vector3>();
  const starGeometry = new BufferGeometry();
  const starVertices = [];
  for (let index = 0; index < 900; index += 1) {
    const angle = index * 2.399963;
    const height = 1 - (2 * (index + 0.5)) / 900;
    const radius = Math.sqrt(1 - height * height);
    starVertices.push(Math.cos(angle) * radius * 300, height * 300, Math.sin(angle) * radius * 300);
  }
  starGeometry.setAttribute('position', new Float32BufferAttribute(starVertices, 3));
  const starMaterial = new PointsMaterial({ color: '#d8e8ec', size: 1.8, sizeAttenuation: false });
  const stars = new Points(starGeometry, starMaterial);
  stars.visible = false;
  sky.add(stars);
  let lost = false;
  let needsFrame = true;
  function draw() {
    if (lost) return;
    camera.updateMatrixWorld();
    // The distant sky uses orientation and zoom only, so neither camera
    // translation nor object placement gives it parallax or domain meaning.
    skyCamera.quaternion.copy(camera.quaternion);
    skyCamera.aspect = camera.aspect;
    skyCamera.fov = Math.max(15, Math.min(110, 45 * Math.sqrt(controls.getDistance() / 30)));
    skyCamera.updateProjectionMatrix();
    renderer.clear();
    renderer.render(sky, skyCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
    onOrientation(
      [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)].map((axis) =>
        axis.applyQuaternion(camera.quaternion.clone().invert()),
      ),
    );
    onProject(
      [...nodes].map(([id, mesh]) => {
        const point = mesh.position.clone().project(camera);
        return {
          id,
          x: ((point.x + 1) * canvas.clientWidth) / 2,
          y: ((1 - point.y) * canvas.clientHeight) / 2,
          visible: point.z > -1 && point.z < 1,
        };
      }),
    );
  }
  function reset() {
    const center = new Vector3();
    for (const mesh of nodes.values()) center.add(mesh.position);
    if (nodes.size) center.divideScalar(nodes.size);
    const extent = Math.max(
      5,
      ...[...nodes.values()].map((mesh) => mesh.position.distanceTo(center) + 2),
    );
    controls.target.copy(center);
    camera.position
      .copy(center)
      .add(new Vector3(0, extent * 0.2, (extent * 2.5) / Math.min(camera.aspect, 1)));
    controls.update();
    draw();
  }
  controls.addEventListener('change', draw);
  const resize = new ResizeObserver(() => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (needsFrame) {
      needsFrame = false;
      reset();
    } else draw();
  });
  resize.observe(canvas);
  reset();
  return {
    update(ids: string[], saved: PersonalPosition[] = []) {
      const first = locations.size === 0;
      for (const id of ids) {
        if (!locations.has(id)) {
          // Stable default placement is independent of sorting, filtering and
          // later additions. It has no meaning in household information.
          let hash = 0;
          for (const letter of id) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
          const index = hash;
          const angle = index * 2.4;
          const radius = 2 + Math.sqrt(index % 17) * 1.5;
          locations.set(
            id,
            new Vector3(
              Math.cos(angle) * radius,
              ((index % 7) - 3) * 1.4,
              Math.sin(angle) * radius,
            ),
          );
          defaults.set(id, (locations.get(id) as Vector3).clone());
        }
        const position = saved.find((item) => item.id === id);
        locations.set(
          id,
          position
            ? new Vector3(position.x, position.y, position.z)
            : (defaults.get(id) as Vector3).clone(),
        );
        if (!nodes.has(id)) {
          const mesh = new Mesh(geometry, material);
          mesh.position.copy(locations.get(id) as Vector3);
          nodes.set(id, mesh);
          scene.add(mesh);
        }
        nodes.get(id)?.position.copy(locations.get(id) as Vector3);
      }
      for (const [id, mesh] of nodes)
        if (!ids.includes(id)) {
          scene.remove(mesh);
          nodes.delete(id);
        }
      if (first) reset();
      else draw();
    },
    reset,
    configure(value: ViewSettings) {
      settings = value;
      stars.visible = value.stars;
      draw();
    },
    position(id: string): Position | null {
      const value = locations.get(id);
      return value ? { x: value.x, y: value.y, z: value.z } : null;
    },
    place(id: string, position: Position) {
      const value = new Vector3(position.x, position.y, position.z).clampScalar(-10000, 10000);
      locations.set(id, value);
      nodes.get(id)?.position.copy(value);
      draw();
      onMotion();
      return { x: value.x, y: value.y, z: value.z };
    },
    displacement(position: Position, dx: number, dy: number, height: boolean): Position {
      const distance = new Vector3(position.x, position.y, position.z).distanceTo(camera.position);
      const scale =
        (2 * distance * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(canvas.clientHeight, 1);
      const movement = height
        ? new Vector3(0, -dy * scale, 0)
        : new Vector3(dx * scale, -dy * scale, 0).applyQuaternion(camera.quaternion);
      return { x: position.x + movement.x, y: position.y + movement.y, z: position.z + movement.z };
    },
    project(position: Position) {
      const point = new Vector3(position.x, position.y, position.z).project(camera);
      return {
        x: ((point.x + 1) * canvas.clientWidth) / 2,
        y: ((1 - point.y) * canvas.clientHeight) / 2,
      };
    },
    navigate(command: string) {
      if (command === 'left') controls.pan(50 * (settings.invertX ? -1 : 1), 0);
      if (command === 'right') controls.pan(-50 * (settings.invertX ? -1 : 1), 0);
      if (command === 'up') controls.pan(0, 50 * (settings.invertY ? -1 : 1));
      if (command === 'down') controls.pan(0, -50 * (settings.invertY ? -1 : 1));
      if (command === 'rotate-left') controls.rotateLeft(0.15);
      if (command === 'rotate-right') controls.rotateLeft(-0.15);
      if (command === 'tilt-up') controls.rotateUp(0.15);
      if (command === 'tilt-down') controls.rotateUp(-0.15);
      if (command === 'in') controls.dollyIn(0.8);
      if (command === 'out') controls.dollyOut(0.8);
      controls.update();
      draw();
      onMotion();
    },
    contextLost(value: boolean) {
      lost = value;
      gestures.enabled(!value);
      controls.enabled = !value;
      if (!value) draw();
    },
    dispose() {
      resize.disconnect();
      controls.dispose();
      gestures.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
