import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type ProjectedPoint = { id: string; x: number; y: number; visible: boolean };

/** Owns only graphics and the camera. Household content stays in the shared editor. */
export function spatialScene(
  canvas: HTMLCanvasElement,
  onProject: (points: ProjectedPoint[]) => void,
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  scene.background = new Color('#102e2c');
  const camera = new PerspectiveCamera(45, 1, 0.1, 10000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 2;
  controls.maxDistance = 2000;
  const geometry = new SphereGeometry(0.22, 12, 8);
  const material = new MeshBasicMaterial({ color: '#8ccbbb' });
  const nodes = new Map<string, Mesh>();
  const locations = new Map<string, Vector3>();
  let lost = false;
  let needsFrame = true;
  function draw() {
    if (lost) return;
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
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
    const extent = Math.max(5, Math.ceil(Math.sqrt(locations.size)) * 2.5);
    controls.target.set(0, 0, 0);
    camera.position.set(0, extent * 0.2, (extent * 2.5) / Math.min(camera.aspect, 1));
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
    update(ids: string[]) {
      const first = locations.size === 0;
      for (const id of ids) {
        if (!locations.has(id)) {
          const index = locations.size;
          const angle = index * 2.4;
          const radius = Math.sqrt(index + 1) * 2;
          locations.set(
            id,
            new Vector3(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              ((index % 3) - 1) * 1.5,
            ),
          );
        }
        if (!nodes.has(id)) {
          const mesh = new Mesh(geometry, material);
          mesh.position.copy(locations.get(id) as Vector3);
          nodes.set(id, mesh);
          scene.add(mesh);
        }
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
    navigate(command: string) {
      if (command === 'left') controls.pan(50, 0);
      if (command === 'right') controls.pan(-50, 0);
      if (command === 'up') controls.pan(0, 50);
      if (command === 'down') controls.pan(0, -50);
      if (command === 'rotate-left') controls.rotateLeft(0.15);
      if (command === 'rotate-right') controls.rotateLeft(-0.15);
      if (command === 'tilt-up') controls.rotateUp(0.15);
      if (command === 'tilt-down') controls.rotateUp(-0.15);
      if (command === 'in') controls.dollyIn(0.8);
      if (command === 'out') controls.dollyOut(0.8);
      controls.update();
      draw();
    },
    contextLost(value: boolean) {
      lost = value;
      controls.enabled = !value;
      if (!value) draw();
    },
    dispose() {
      resize.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
