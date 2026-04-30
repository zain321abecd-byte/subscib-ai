(function () {
  "use strict";

  const stage = document.querySelector("[data-hero-3d]");
  const canvas = stage && stage.querySelector("canvas");

  if (!stage || !canvas || !window.THREE) {
    return;
  }

  const THREE = window.THREE;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (error) {
    console.warn("SubscribAI 3D hero could not start.", error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  camera.position.set(0, 0, 8.8);

  const root = new THREE.Group();
  const rings = new THREE.Group();
  const network = new THREE.Group();
  scene.add(root);
  root.add(rings, network);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const orangeLight = new THREE.PointLight(0xff4a17, 2.2, 18);
  orangeLight.position.set(3, 2.4, 5);
  scene.add(orangeLight);

  const blueLight = new THREE.PointLight(0x49a9ff, 1.4, 18);
  blueLight.position.set(-3.5, -1.6, 4);
  scene.add(blueLight);

  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xff5a24,
    emissive: 0x6f1607,
    emissiveIntensity: 0.52,
    metalness: 0.45,
    roughness: 0.32,
    transparent: true,
    opacity: 0.92
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.04, 4), coreMaterial);
  root.add(core);

  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.22, 2),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.18
    })
  );
  root.add(wire);

  function ring(radius, tube, color, opacity, rotation) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 160),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity
      })
    );
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    rings.add(mesh);
    return mesh;
  }

  const ringOne = ring(2.18, 0.012, 0xff6b2b, 0.8, [1.12, 0.28, 0.12]);
  const ringTwo = ring(2.68, 0.01, 0x49a9ff, 0.48, [0.42, 1.26, 0.68]);
  const ringThree = ring(1.76, 0.009, 0xffffff, 0.32, [1.38, -0.64, 0.32]);

  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd6c8 });
  const accentNodeMaterial = new THREE.MeshBasicMaterial({ color: 0x49a9ff });
  const nodeGeometry = new THREE.SphereGeometry(0.055, 16, 16);
  const nodePositions = [
    [-2.38, 0.16, 0.18],
    [-1.74, 1.08, -0.28],
    [-0.86, -1.42, 0.24],
    [-0.2, 1.92, 0.02],
    [0.72, -1.72, -0.34],
    [1.48, 1.2, 0.22],
    [2.22, -0.24, -0.16],
    [1.92, -1.08, 0.34],
    [-2.08, -0.98, -0.1],
    [0.2, 0.88, 0.44],
    [1.02, 0.18, -0.48],
    [-1.02, 0.34, 0.52]
  ];

  nodePositions.forEach((position, index) => {
    const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? accentNodeMaterial : nodeMaterial);
    node.position.set(position[0], position[1], position[2]);
    network.add(node);
  });

  const linePoints = [];
  [
    [0, 1],
    [0, 8],
    [1, 3],
    [1, 9],
    [2, 4],
    [2, 8],
    [3, 5],
    [3, 9],
    [4, 7],
    [4, 10],
    [5, 6],
    [5, 10],
    [6, 7],
    [8, 11],
    [9, 10],
    [9, 11]
  ].forEach(([from, to]) => {
    linePoints.push(new THREE.Vector3(...nodePositions[from]), new THREE.Vector3(...nodePositions[to]));
  });

  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    new THREE.LineBasicMaterial({
      color: 0xff7b45,
      transparent: true,
      opacity: 0.32
    })
  );
  network.add(lines);

  const particleCount = 460;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = 2.8 + Math.random() * 2.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    particlePositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
    particlePositions[index * 3 + 2] = radius * Math.cos(phi) * 0.52;
  }

  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(particlePositions, 3)),
    new THREE.PointsMaterial({
      color: 0xff8c42,
      size: 0.028,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.62
    })
  );
  root.add(particles);

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let frameId = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  function resize() {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);

    if (width === lastWidth && height === lastHeight) {
      return;
    }

    lastWidth = width;
    lastHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 520 ? 9.8 : 8.8;
    camera.updateProjectionMatrix();
    root.scale.setScalar(width < 520 ? 0.82 : 1);
  }

  function render(time) {
    const elapsed = time * 0.001;
    pointer.x += (target.x - pointer.x) * 0.06;
    pointer.y += (target.y - pointer.y) * 0.06;

    root.rotation.y = elapsed * 0.16 + pointer.x * 0.18;
    root.rotation.x = -0.12 + Math.sin(elapsed * 0.42) * 0.08 + pointer.y * 0.12;
    core.rotation.y = elapsed * 0.38;
    core.rotation.x = elapsed * 0.18;
    wire.rotation.y = -elapsed * 0.24;
    wire.rotation.z = elapsed * 0.12;
    ringOne.rotation.z = elapsed * 0.24;
    ringTwo.rotation.x = 0.42 + elapsed * 0.18;
    ringThree.rotation.y = -0.64 - elapsed * 0.2;
    particles.rotation.y = -elapsed * 0.035;
    particles.rotation.x = elapsed * 0.022;

    renderer.render(scene, camera);
  }

  function animate(time) {
    resize();
    render(time || 0);

    if (!stage.classList.contains("is-ready")) {
      stage.classList.add("is-ready");
    }

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    target.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2);
  });

  stage.addEventListener("pointerleave", () => {
    target.x = 0;
    target.y = 0;
  });

  window.addEventListener("resize", resize);
  animate(0);

  window.addEventListener("pagehide", () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }
  });
})();
