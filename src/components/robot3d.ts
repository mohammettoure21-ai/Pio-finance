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
  renderer.setPixelRatio(
    Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5),
  );
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
    color: 0xe5dfff,
    emissive: 0x9b87ef,
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
  const sphere = (r: number) => new THREE.SphereGeometry(r, 28, 20);
  const box = (x: number, y: number, z: number, r = 0.08) =>
    new RoundedBoxGeometry(x, y, z, 5, r);
  mesh(box(0.69, 0.58, 0.48, 0.2), shell, body, 0, -0.05);
  mesh(box(0.37, 0.19, 0.04, 0.04), dark, body, 0, -0.02, 0.233);
  mesh(sphere(0.055), glow, body, 0, -0.02, 0.265);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12), chrome, body, 0, 0.29);
  const head = new THREE.Group();
  head.position.set(0, 0.68, 0);
  body.add(head);
  mesh(box(1.32, 1.02, 0.87, 0.3), shell, head);
  mesh(box(1.13, 0.79, 0.12, 0.25), chrome, head, 0, -0.015, 0.422);
  mesh(box(1.08, 0.74, 0.14, 0.23), screen, head, 0, -0.015, 0.465);
  // Helmet seam and soft highlights recover the original rounded toy design.
  const seam = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.5, 0.34, 0.34),
    new THREE.Vector3(0, 0.48, 0.35),
    new THREE.Vector3(0.5, 0.34, 0.34),
  ]);
  mesh(new THREE.TubeGeometry(seam, 20, 0.013, 6, false), dark, head);
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
      new THREE.TorusGeometry(0.155, 0.046, 12, 32),
      glow,
      eyes,
      x,
      0.025,
      0.568,
    );
    const pupil = mesh(sphere(0.108), dark, eyes, x, 0.025, 0.58);
    pupil.scale.z = 0.26;
    mesh(sphere(0.032), glow, eyes, x - 0.033, 0.073, 0.611);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 0.12, 0.02, 0.58),
      new THREE.Vector3(x, -0.025, 0.59),
      new THREE.Vector3(x + 0.12, 0.02, 0.58),
    ]);
    mesh(new THREE.TubeGeometry(curve, 12, 0.017, 6, false), glow, lids);
  }
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, -0.22, 0.58),
    new THREE.Vector3(0, -0.24, 0.59),
    new THREE.Vector3(0.07, -0.22, 0.58),
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
  const workstation = new THREE.Group();
  scene.add(workstation);
  workstation.visible = mood !== "walking";
  // Real 3D desk, keyboard, monitor and chair, independent from the robot.
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0x39475b,
    metalness: 0.55,
    roughness: 0.28,
  });
  const displayMaterial = new THREE.MeshStandardMaterial({
    color: 0x173f58,
    emissive: 0x164766,
    emissiveIntensity: 0.7,
    roughness: 0.4,
  });
  mesh(box(1.55, 0.075, 0.78, 0.04), deskMaterial, workstation, 0, -0.48, 0.57);
  for (const side of [-1, 1])
    mesh(
      box(0.07, 0.65, 0.09, 0.02),
      chrome,
      workstation,
      side * 0.65,
      -0.82,
      0.55,
    );
  mesh(box(0.64, 0.035, 0.25, 0.02), dark, workstation, 0.03, -0.425, 0.64);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      mesh(
        box(0.055, 0.01, 0.045, 0.008),
        chrome,
        workstation,
        -0.22 + col * 0.08,
        -0.401,
        0.57 + row * 0.063,
      );
    }
  const monitor = new THREE.Group();
  monitor.position.set(-0.5, -0.09, 0.48);
  monitor.rotation.y = -0.25;
  workstation.add(monitor);
  mesh(box(0.69, 0.46, 0.06, 0.04), dark, monitor, 0, 0.12);
  mesh(box(0.6, 0.36, 0.015, 0.025), displayMaterial, monitor, 0, 0.12, 0.038);
  for (let row = 0; row < 4; row++)
    mesh(
      box(0.27 + (row % 2) * 0.14, 0.018, 0.008, 0.004),
      glow,
      monitor,
      -0.04,
      0.24 - row * 0.075,
      0.05,
    );
  mesh(box(0.05, 0.17, 0.05, 0.01), chrome, monitor, 0, -0.17);
  mesh(box(0.28, 0.025, 0.15, 0.01), dark, monitor, 0, -0.28);
  mesh(box(0.49, 0.07, 0.42, 0.06), dark, workstation, 0.04, -0.55, -0.12);
  mesh(box(0.47, 0.45, 0.08, 0.08), dark, workstation, 0.04, -0.25, -0.37);
  mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.51, 12),
    chrome,
    workstation,
    0.04,
    -0.85,
    -0.12,
  );
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
      mood === "walking"
        ? Math.sin(t * 2) * 0.014
        : -0.09 + Math.sin(t * 1.3) * 0.009,
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
      root.rotation.x = mood === "walking" ? 0 : -1.05;
      knee.rotation.x = mood === "walking" ? 0.03 : 1.05;
    });
    if (mood === "working" || mood === "ready" || mood === "command") {
      head.rotation.x = 0.12 + Math.sin(t * 0.7) * 0.035;
      head.rotation.y = -0.12 + Math.sin(t * 0.8) * 0.05;
      arms.forEach(({ root, elbow }, i) => {
        root.rotation.x =
          -0.72 + Math.sin(t * (mood === "working" ? 5 : 2.6) + i * 1.7) * 0.09;
        elbow.rotation.x =
          -0.8 + Math.sin(t * (mood === "working" ? 5.5 : 3) + i) * 0.13;
      });
    } else if (mood === "overloaded") {
      body.rotation.z = Math.sin(t * 2) * 0.04;
      head.rotation.x = 0.22;
      arms[1].root.rotation.set(-0.7, 0, 2.1);
      arms[1].elbow.rotation.x = -1.35;
    } else if (mood === "walking") {
      const step = Math.sin(t * 8);
      legs.forEach(({ root, knee }, i) => {
        root.rotation.x = step * (i ? 0.4 : -0.4);
        knee.rotation.x = Math.max(0, step * (i ? -0.4 : 0.4));
      });
      arms.forEach(({ root }, i) => {
        root.rotation.x = step * (i ? -0.3 : 0.3);
      });
      body.position.y += Math.abs(step) * 0.035;
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
