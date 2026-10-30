import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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
  getMood: () => RobotMood = () => mood,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const gl = renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const software = debug
    ? /swiftshader|llvmpipe|software/i.test(
        String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
      )
    : false;
  renderer.setPixelRatio(
    software ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5),
  );
  const frameRate = software ? 4 : 24;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  // Studio reflections make the lacquered shells read like the reference toys.
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.04, 0.1, 10, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  studio.dispose();
  pmrem.dispose();
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
    metalness: 0.65,
    roughness: 0.2,
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
    emissiveIntensity: 0.85,
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
  // Reference silhouette: domed helmet and matching colored face, with separate eye cups.
  const helmet = mesh(sphere(1), shell, head);
  helmet.scale.set(0.7, 0.56, 0.51);
  function facePlate(
    width: number,
    height: number,
    radius: number,
    material: THREE.Material,
    z: number,
  ) {
    const shape = new THREE.Shape();
    const x = -width / 2,
      y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
        curveSegments: 12,
      }),
      material,
      head,
      0,
      -0.025,
      z,
    );
  }
  facePlate(1.12, 0.86, 0.29, dark, 0.466);
  facePlate(1.085, 0.825, 0.28, shell, 0.482);
  const seam = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.56, 0.29, 0.31),
    new THREE.Vector3(-0.34, 0.49, 0.25),
    new THREE.Vector3(0, 0.55, 0.16),
    new THREE.Vector3(0.34, 0.49, 0.25),
    new THREE.Vector3(0.56, 0.29, 0.31),
  ]);
  mesh(new THREE.TubeGeometry(seam, 28, 0.012, 6, false), dark, head);
  for (const side of [-1, 1]) {
    const joint = mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.18, 32),
      chrome,
      head,
      side * 0.68,
      -0.01,
      -0.015,
    );
    joint.rotation.z = Math.PI / 2;
    const ear = mesh(
      new THREE.CylinderGeometry(0.235, 0.25, 0.15, 32),
      dark,
      head,
      side * 0.77,
      -0.01,
      -0.015,
    );
    ear.rotation.z = Math.PI / 2;
    const cap = mesh(
      new THREE.CylinderGeometry(0.185, 0.19, 0.045, 32),
      screen,
      head,
      side * 0.86,
      -0.01,
      -0.015,
    );
    cap.rotation.z = Math.PI / 2;
    const ring = mesh(
      new THREE.TorusGeometry(0.22, 0.018, 10, 32),
      chrome,
      head,
      side * 0.854,
      -0.01,
      -0.015,
    );
    ring.rotation.y = Math.PI / 2;
  }
  const eyes = new THREE.Group();
  head.add(eyes);
  const lids = new THREE.Group();
  head.add(lids);
  for (const x of [-0.255, 0.255]) {
    const socket = mesh(sphere(1), screen, head, x, -0.035, 0.54);
    socket.scale.set(0.205, 0.237, 0.062);
    const iris = mesh(
      new THREE.TorusGeometry(0.13, 0.04, 14, 36),
      glow,
      eyes,
      x,
      -0.035,
      0.61,
    );
    iris.scale.y = 1.12;
    const pupil = mesh(sphere(0.1), screen, eyes, x, -0.035, 0.625);
    pupil.scale.set(1, 1.1, 0.32);
    mesh(sphere(0.031), glow, eyes, x - 0.035, 0.014, 0.663);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - 0.125, -0.02, 0.613),
      new THREE.Vector3(x, -0.065, 0.625),
      new THREE.Vector3(x + 0.125, -0.02, 0.613),
    ]);
    mesh(new THREE.TubeGeometry(curve, 14, 0.017, 6, false), glow, lids);
  }
  const arms: { root: THREE.Group; elbow: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set(side * 0.43, 0.09, 0);
    body.add(root);
    mesh(sphere(0.13), chrome, root);
    const upperArmor = mesh(sphere(1), shell, root, 0, -0.19);
    upperArmor.scale.set(0.12, 0.18, 0.14);
    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    root.add(elbow);
    mesh(sphere(0.095), dark, elbow);
    const forearmArmor = mesh(sphere(1), shell, elbow, 0, -0.15);
    forearmArmor.scale.set(0.105, 0.16, 0.13);
    mesh(sphere(0.105), dark, elbow, 0, -0.31);
    for (let finger = 0; finger < 3; finger++)
      mesh(
        box(0.037, 0.09, 0.055, 0.015),
        dark,
        elbow,
        -0.055 + finger * 0.055,
        -0.38,
        0.035,
      );
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
    mesh(sphere(0.11), dark, knee);
    const kneeArmor = mesh(sphere(1), shell, knee, 0, -0.015, 0.085);
    kneeArmor.scale.set(0.115, 0.12, 0.065);
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
    mood = getMood();
    workstation.visible = mood !== "walking";
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
    if (getMood() !== mood) lastFrame = -100;
    if (!visible || document.hidden || time - lastFrame < 1000 / frameRate)
      return;
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
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}
