import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type RobotMood =
  | "sleeping"
  | "working"
  | "overloaded"
  | "command"
  | "ready"
  | "walking";
export function mountRobot(
  canvas: HTMLCanvasElement,
  color: string,
  mood: RobotMood,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.4, -1.4, 0.1, 30);
  camera.position.set(2, 1.1, 6);
  camera.lookAt(0, 0.05, 0);
  scene.add(new THREE.HemisphereLight(0xddecff, 0x374052, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3.8);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x89bfff, 2);
  rim.position.set(4, 2, -2);
  scene.add(rim);
  const shell = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.55,
    roughness: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x151b25,
    metalness: 0.6,
    roughness: 0.32,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0x95a4b7,
    metalness: 0.8,
    roughness: 0.23,
  });
  const screen = new THREE.MeshStandardMaterial({
    color: 0x060b14,
    metalness: 0.15,
    roughness: 0.2,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xc5e2ff,
    emissive: 0x88b5ff,
    emissiveIntensity: 1.7,
    roughness: 0.4,
  });
  const robot = new THREE.Group();
  scene.add(robot);
  const body = new THREE.Group();
  robot.add(body);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  const sphere = (r: number) => new THREE.SphereGeometry(r, 20, 14);
  const box = (x: number, y: number, z: number, r = 0.08) =>
    new RoundedBoxGeometry(x, y, z, 3, r);
  mesh(box(0.67, 0.56, 0.43, 0.14), shell, body, 0, -0.05);
  mesh(box(0.37, 0.19, 0.04, 0.04), dark, body, 0, -0.02, 0.233);
  mesh(sphere(0.055), glow, body, 0, -0.02, 0.265);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12), chrome, body, 0, 0.29);
  const head = new THREE.Group();
  head.position.set(0, 0.72, 0);
  body.add(head);
  const headShell = mesh(sphere(1), shell, head);
  headShell.scale.set(0.67, 0.51, 0.46);
  mesh(box(1.03, 0.65, 0.17, 0.2), screen, head, 0, -0.01, 0.43);
  for (const side of [-1, 1]) {
    const ear = mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.15, 24),
      dark,
      head,
      side * 0.67,
    );
    ear.rotation.z = Math.PI / 2;
    const ring = mesh(
      new THREE.TorusGeometry(0.16, 0.027, 8, 24),
      chrome,
      head,
      side * 0.76,
    );
    ring.rotation.y = Math.PI / 2;
  }
  const eyes = new THREE.Group();
  head.add(eyes);
  const lids = new THREE.Group();
  head.add(lids);
  for (const x of [-0.24, 0.24]) {
    mesh(
      new THREE.TorusGeometry(0.12, 0.033, 8, 24),
      glow,
      eyes,
      x,
      0.025,
      0.54,
    );
    const pupil = mesh(sphere(0.085), dark, eyes, x, 0.025, 0.548);
    pupil.scale.z = 0.26;
    mesh(sphere(0.023), glow, eyes, x - 0.027, 0.062, 0.575);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 0.12, 0.02, 0.55),
      new THREE.Vector3(x, -0.025, 0.56),
      new THREE.Vector3(x + 0.12, 0.02, 0.55),
    ]);
    mesh(new THREE.TubeGeometry(curve, 12, 0.017, 6, false), glow, lids);
  }
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, -0.19, 0.55),
    new THREE.Vector3(0, -0.21, 0.56),
    new THREE.Vector3(0.07, -0.19, 0.55),
  ]);
  mesh(new THREE.TubeGeometry(smile, 10, 0.012, 6, false), glow, head);
  const arms: { root: THREE.Group; elbow: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set(side * 0.43, 0.09, 0);
    body.add(root);
    mesh(sphere(0.13), chrome, root);
    mesh(box(0.18, 0.3, 0.2), shell, root, 0, -0.19);
    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    root.add(elbow);
    mesh(sphere(0.095), dark, elbow);
    mesh(box(0.16, 0.24, 0.18), shell, elbow, 0, -0.15);
    mesh(sphere(0.105), dark, elbow, 0, -0.31);
    arms.push({ root, elbow });
  }
  const legs: { root: THREE.Group; knee: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set(side * 0.2, -0.37, 0);
    body.add(root);
    mesh(sphere(0.12), dark, root);
    mesh(box(0.21, 0.28, 0.24), shell, root, 0, -0.18);
    const knee = new THREE.Group();
    knee.position.y = -0.35;
    root.add(knee);
    mesh(sphere(0.11), chrome, knee);
    mesh(box(0.19, 0.24, 0.2), shell, knee, 0, -0.15);
    mesh(box(0.29, 0.14, 0.4), shell, knee, 0, -0.32, 0.09);
    legs.push({ root, knee });
  }
  const shadow = mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    scene,
    0,
    -1.15,
  );
  shadow.rotation.x = -Math.PI / 2;
  const sweat = mesh(
    sphere(0.07),
    new THREE.MeshStandardMaterial({
      color: 0x7bd3ff,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
    }),
    robot,
    0.65,
    0.8,
    0.2,
  );
  sweat.scale.set(0.65, 1.4, 0.6);
  let frame = 0,
    disposed = false,
    visible = true,
    lastFrame = -100;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const seed = Number.parseInt(color.replace("#", ""), 16) % 17;
  function pose(time: number) {
    const t = time + seed;
    const sleeping = mood === "sleeping";
    eyes.visible = !sleeping;
    lids.visible = sleeping;
    eyes.scale.y = t % 5.7 > 5.55 && !sleeping ? 0.08 : 1;
    body.position.set(
      0,
      sleeping ? -0.18 + Math.sin(t * 1.3) * 0.012 : Math.sin(t * 2) * 0.014,
      0,
    );
    body.rotation.set(0, 0, sleeping ? 0.06 : 0);
    head.rotation.set(
      sleeping ? 0.4 + Math.sin(t * 1.3) * 0.015 : -0.04,
      sleeping ? -0.12 : Math.sin(t * 0.7) * 0.14,
      sleeping ? 0.12 : Math.sin(t * 0.5) * 0.025,
    );
    robot.rotation.y = -0.1;
    robot.position.x = 0;
    arms.forEach(({ root, elbow }, i) => {
      const side = i === 0 ? -1 : 1;
      root.rotation.set(sleeping ? -0.35 : -0.12, 0, side * 0.12);
      elbow.rotation.x = sleeping ? -0.75 : -0.1;
    });
    legs.forEach(({ root, knee }) => {
      root.rotation.x = sleeping ? -1.2 : 0;
      knee.rotation.x = sleeping ? 1.15 : 0.03;
    });
    if (mood === "working") {
      head.rotation.x = 0.16;
      arms.forEach(({ root, elbow }, i) => {
        root.rotation.x = -0.65 + Math.sin(t * 3 + i * 1.7) * 0.18;
        elbow.rotation.x = -0.65 + Math.sin(t * 3.5 + i) * 0.25;
      });
    } else if (mood === "command") {
      arms[1].root.rotation.z = 1 + Math.sin(t) * 0.18;
      arms[1].elbow.rotation.x = -0.5 + Math.sin(t * 1.2) * 0.2;
    } else if (mood === "overloaded") {
      body.rotation.z = Math.sin(t * 2) * 0.04;
      head.rotation.x = 0.22;
      arms[1].root.rotation.set(-0.7, 0, 2.1);
      arms[1].elbow.rotation.x = -1.35;
    } else if (mood === "walking" || (mood === "ready" && t % 14 < 2)) {
      const step = Math.sin(t * 8);
      legs.forEach(({ root, knee }, i) => {
        root.rotation.x = step * (i ? 0.4 : -0.4);
        knee.rotation.x = Math.max(0, step * (i ? -0.4 : 0.4));
      });
      arms.forEach(({ root }, i) => {
        root.rotation.x = step * (i ? -0.3 : 0.3);
      });
      body.position.y += Math.abs(step) * 0.035;
      if (mood === "ready")
        robot.position.x = Math.sin((t % 14) * Math.PI) * 0.1;
    }
    sweat.visible = mood === "overloaded";
    sweat.position.y = 0.9 - (t % 1.5) * 0.45;
  }
  function render(time: number) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (!visible || document.hidden || time - lastFrame < 1000 / 24) return;
    if (media.matches && lastFrame >= 0) return;
    lastFrame = time;
    pose(media.matches ? 0 : time / 1000);
    renderer.render(scene, camera);
  }
  const resize = new ResizeObserver(() => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -1.4 * aspect;
    camera.right = 1.4 * aspect;
    camera.updateProjectionMatrix();
    lastFrame = -100;
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  });
  observer.observe(canvas);
  const refresh = () => {
    lastFrame = -100;
  };
  media.addEventListener("change", refresh);
  frame = requestAnimationFrame(render);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    observer.disconnect();
    media.removeEventListener("change", refresh);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((m) => m.dispose());
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
