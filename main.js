// ================= IMPORTS =================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ================= CONFIG =================
const CONFIG = {
  camera: {
    frustumSize: 15,
    near: 0.1,
    far: 100,
    position: { x: -3, y: 22, z: 22 },
  },

  controls: {
    enableDamping: true,
    dampingFactor: 0.08,
    enablePan: true,
    enableZoom: true,
    enableRotate: true,
    minPolarAngle: Math.PI / 25,
    maxPolarAngle: Math.PI / 3,
    rotateSpeed: 0.4,
    zoomSpeed: 0.8,
    panSpeed: 0.8,
    screenSpacePanning: true,
    minZoom: 1.3,
    maxZoom: 3.2,
  },

  lighting: {
    ambientIntensity: 0.7,
    directional: {
      intensity: 0.9,
      position: { x: -10, y: 20, z: -10 },
      castShadow: true,
      shadow: {
        mapSize: 5024, // Adjust for cylinder Shadow sharpness
        near: 1,
        far: 50,
        bounds: 20,
        opacity: 0.2,
      },
    },
  },

  dots: {
    radius: 0.09,
    height: 0.3,
    color: 0x7ae0ff,
    spacing: 1.5, // (1.0 = original)
  },

  hover: {
    radius: 0.3,
    maxLift: 0.45,
    easing: 0.12,
    threshold: 0.001,
  },
};

// ================= HOTSPOTS =================
const HOTSPOTS = [
  {
    id: "cheltenham-master",
    label: "Cheltenham Master POP",
    message:
      "Fully operational\nServing EMEA Region\nPOP capacity: 800,000 DAU (@5% concurrency 40,000 users)",
    lat: 78.8994,
    lon: 0.0783,
  },
  {
    id: "cheltenham-ai",
    label: "Cheltenham AI Node",
    message:
      "In test operation\nServing Worldwide\nNode capacity: 1,000,000 DAU (@1% concurrency 10,000 users)",
    lat: 80.8994,
    lon: 5.0783,
  },
  {
    id: "ljubljana",
    label: "Ljubljana POP",
    message:
      "Fully operational\nServing Central and Eastern Europe\nPOP capacity: 400,000 DAU (@5% concurrency 20,000 users)",
    lat: 70.0569,
    lon: 35.5058,
  },
  {
    id: "angola",
    label: "Angola POP",
    message:
      "Fully operational\nServing Africell subscribers nationwide\nPOP capacity: 400,000 DAU (@5% concurrency 20,000 users)",
    lat: -8.839,
    lon: 13.2894,
  },
  {
    id: "johannesburg",
    label: "Johannesburg POP",
    message:
      "To be operational in March 2026\nServing sub-Saharan Africa\nPOP capacity: 400,000 DAU (@5% concurrency 20,000 users)",
    lat: -38.2041,
    lon: 45.0473,
  },
  {
    id: "miami",
    label: "Miami POP",
    message:
      "To be operational in March 2026\nServing North and South America\nPOP capacity: 600,000 DAU (@5% concurrency 30,000 users)",
    lat: 40.7617,
    lon: -121.1918,
  },
  {
    id: "singapore",
    label: "Singapore POP",
    message:
      "To be operational in March 2026\nServing Eastern Hemisphere from India to Oceania\nPOP capacity: 400,000 DAU (@5% concurrency 20,000 users)",
    lat: 1.3521,
    lon: 152.8198,
  },
];

// Map hotspots
function latLonToMapXY(lat, lon, mapWidth = 20, mapHeight = 10) {
  const x = (lon / 180) * (mapWidth / 2);
  const y = (lat / 90) * (mapHeight / 2);
  return { x, y };
}

// ================= SCENE =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1efed); // Adjust map background from here

// ================= CAMERA =================
const aspect = window.innerWidth / window.innerHeight;
const f = CONFIG.camera.frustumSize;

const camera = new THREE.OrthographicCamera(
  -f * aspect,
  f * aspect,
  f,
  -f,
  CONFIG.camera.near,
  CONFIG.camera.far,
);

camera.position.set(
  CONFIG.camera.position.x,
  CONFIG.camera.position.y,
  CONFIG.camera.position.z,
);

// DEFAULT ZOOM
camera.zoom = 1.5;
camera.updateProjectionMatrix();

camera.lookAt(0, 0, 0);

// ================= RENDERER =================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.touchAction = "none";
document.body.appendChild(renderer.domElement);

// ================= CONTROLS =================
const controls = new OrbitControls(camera, renderer.domElement);

// Safe Object.assign (only simple props)
Object.assign(controls, {
  enableDamping: CONFIG.controls.enableDamping,
  dampingFactor: CONFIG.controls.dampingFactor,
  enablePan: CONFIG.controls.enablePan,
  enableZoom: CONFIG.controls.enableZoom,
  enableRotate: CONFIG.controls.enableRotate,
  rotateSpeed: CONFIG.controls.rotateSpeed,
  zoomSpeed: CONFIG.controls.zoomSpeed,
  panSpeed: CONFIG.controls.panSpeed,
  screenSpacePanning: CONFIG.controls.screenSpacePanning,
});

// Explicit constraints
controls.minPolarAngle = CONFIG.controls.minPolarAngle;
controls.maxPolarAngle = CONFIG.controls.maxPolarAngle;
controls.minZoom = CONFIG.controls.minZoom;
controls.maxZoom = CONFIG.controls.maxZoom;
controls.update();

// ================= LIGHTING =================
scene.add(new THREE.AmbientLight(0xffffff, CONFIG.lighting.ambientIntensity));

const dCfg = CONFIG.lighting.directional;
const dir = new THREE.DirectionalLight(0xffffff, dCfg.intensity);
dir.position.set(dCfg.position.x, dCfg.position.y, dCfg.position.z);
dir.castShadow = dCfg.castShadow;

dir.shadow.mapSize.set(dCfg.shadow.mapSize, dCfg.shadow.mapSize);
dir.shadow.camera.near = dCfg.shadow.near;
dir.shadow.camera.far = dCfg.shadow.far;
dir.shadow.camera.left = -dCfg.shadow.bounds;
dir.shadow.camera.right = dCfg.shadow.bounds;
dir.shadow.camera.top = dCfg.shadow.bounds;
dir.shadow.camera.bottom = -dCfg.shadow.bounds;
dir.intensity = 1.5;
dir.position.set(-15, 25, -10);

scene.add(dir);

// Shadow receiver plane
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ opacity: dCfg.shadow.opacity }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// Soft top highlight (gives bright dot caps)
const topLight = new THREE.DirectionalLight(0xffffff, 0.65);
topLight.position.set(0, 40, 10);
topLight.castShadow = false;
scene.add(topLight);

// ================= DOTS =================
const {
  radius: DOT_RADIUS,
  height: DOT_HEIGHT,
  color: DOT_COLOR,
} = CONFIG.dots;

const SPACING = CONFIG.dots.spacing;

let dotMesh = null;
let dotPositions = [];

const raycaster = new THREE.Raycaster();
raycaster.params.InstancedMesh = { threshold: DOT_RADIUS * 1.2 };
const mouse = new THREE.Vector2();

fetch("dots.json")
  .then((res) => res.json())
  .then(buildDotsFromFile);

function buildDotsFromFile(dots) {
  const geometry = new THREE.CylinderGeometry(
    DOT_RADIUS * 0.98,
    DOT_RADIUS,
    DOT_HEIGHT * 1.15,
    24,
    1,
    false,
  );

  const material = new THREE.MeshStandardMaterial({
    color: DOT_COLOR,
    roughness: 0.55,
    metalness: 0.0,
    envMapIntensity: 0.0,
    flatShading: false,
  });

  dotMesh = new THREE.InstancedMesh(geometry, material, dots.length);
  const dummy = new THREE.Object3D();

  dots.forEach(([x, y], i) => {
    dotPositions[i] = {
      x,
      y,
      lift: 0,
      targetLift: 0,
      isHotspot: false,
      hotspotIndex: -1,
    };

    dummy.position.set(x * SPACING, DOT_HEIGHT / 2, -y * SPACING);
    dummy.updateMatrix();
    dotMesh.setMatrixAt(i, dummy.matrix);
  });

  dotMesh.instanceMatrix.needsUpdate = true;
  dotMesh.frustumCulled = false;
  dotMesh.castShadow = true;

  scene.add(dotMesh);
  // --- Build hotspot dots ---
  const hotspotGeometry = new THREE.CylinderGeometry(
    CONFIG.dots.radius * 1.5,
    CONFIG.dots.radius * 1.5,
    CONFIG.dots.height * 1.8,
  );

  const hotspotMaterial = new THREE.MeshStandardMaterial({
    color: 0xe62929, // Hotspot color - RED Shaded
  });

  hotspotMesh = new THREE.InstancedMesh(
    hotspotGeometry,
    hotspotMaterial,
    HOTSPOTS.length,
  );

  const dummy2 = new THREE.Object3D();

  // Find nearest dot for each hotspot
  HOTSPOTS.forEach((hs, i) => {
    const { x, y } = latLonToMapXY(hs.lat, hs.lon);

    let bestIndex = -1;
    let bestDist = Infinity;

    dotPositions.forEach((p, idx) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;

      if (d < bestDist) {
        bestDist = d;
        bestIndex = idx;
      }
    });

    dotPositions[bestIndex].isHotspot = true;
    dotPositions[bestIndex].hotspotIndex = i;

    hotspotData[i] = { ...hs, dotIndex: bestIndex };

    const p = dotPositions[bestIndex];
    dummy2.position.set(p.x * SPACING, CONFIG.dots.height / 2, -p.y * SPACING);
    dummy2.updateMatrix();
    hotspotMesh.setMatrixAt(i, dummy2.matrix);
  });

  hotspotMesh.instanceMatrix.needsUpdate = true;
  hotspotMesh.frustumCulled = false;
  hotspotMesh.castShadow = true;

  scene.add(hotspotMesh);
}

function syncHotspotLift() {
  if (!hotspotMesh) return;

  const dummy = new THREE.Object3D();

  hotspotData.forEach((hs, i) => {
    const p = dotPositions[hs.dotIndex];

    dummy.position.set(p.x * SPACING, DOT_HEIGHT / 2 + p.lift, -p.y * SPACING);
    dummy.updateMatrix();
    hotspotMesh.setMatrixAt(i, dummy.matrix);
  });

  hotspotMesh.instanceMatrix.needsUpdate = true;
}

// ================= HOTSPOT DOTS =================
let hotspotMesh = null;
let hotspotData = [];

// ================= HOVER =================

let hoveredInstanceId = null;
let hoverCooldown = 0;

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function handleHover() {
  if (!dotMesh) return;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(dotMesh);

  // Small hysteresis to prevent flicker
  if (hits.length) {
    const id = hits[0].instanceId;

    if (hoveredInstanceId !== id) {
      hoveredInstanceId = id;
      hoverCooldown = 4; // frames to lock
    }
  } else if (hoverCooldown <= 0) {
    hoveredInstanceId = null;
  }

  hoverCooldown = Math.max(hoverCooldown - 1, 0);

  if (hoveredInstanceId === null) return;

  const center = dotPositions[hoveredInstanceId];
  const { radius, maxLift } = CONFIG.hover;

  dotPositions.forEach((p) => {
    const dx = (p.x - center.x) * SPACING;
    const dy = (p.y - center.y) * SPACING;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Smooth falloff (Gaussian-like)
    if (d < radius * 1.4) {
      const t = d / radius;
      p.targetLift = Math.max(p.targetLift, Math.exp(-t * t) * maxLift);
    }
  });
}

// ================= HOTSPOT INTERACTION =================
let activeHotspot = null;
const tooltip = document.getElementById("tooltip");

function handleHotspots(isClick = false) {
  if (!hotspotMesh) return;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(hotspotMesh);

  if (!hits.length) {
    if (!isClick) hideTooltip();
    return;
  }

  showTooltip(hotspotData[hits[0].instanceId]);
}

function showTooltip(hs) {
  activeHotspot = hs;

  tooltip.innerHTML = `<strong>${hs.label}</strong><br>${hs.message}`;
  tooltip.classList.add("visible");
}

function hideTooltip() {
  activeHotspot = null;
  tooltip.classList.remove("visible");
}

function updatePointer(e) {
  const x = e.touches ? e.touches[0].pageX : e.pageX;
  const y = e.touches ? e.touches[0].pageY : e.pageY;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;

  // Update raycaster mouse coords
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  handleHotspots(false);
}

// Pointer events (modern)
window.addEventListener("pointermove", updatePointer, { passive: true });

// Touch fallback (older Safari safety)
window.addEventListener("touchmove", updatePointer, { passive: true });


window.addEventListener("click", () => {
  handleHotspots(true);
});

function smoothLiftUpdate() {
  if (!dotMesh) return;

  const { easing, threshold } = CONFIG.hover;
  const dummy = new THREE.Object3D();
  let dirty = false;

  dotPositions.forEach((p, i) => {
    p.targetLift *= 0.92; // decay instead of reset

    const delta = p.targetLift - p.lift;
    if (Math.abs(delta) > threshold) {
      p.lift += delta * easing;
      dirty = true;

      dummy.position.set(
        p.x * SPACING,
        DOT_HEIGHT / 2 + p.lift,
        -p.y * SPACING,
      );
      dummy.updateMatrix();
      dotMesh.setMatrixAt(i, dummy.matrix);
    }
  });

  if (dirty) dotMesh.instanceMatrix.needsUpdate = true;
}

// ================= LOOP =================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  handleHover();
  smoothLiftUpdate();
  syncHotspotLift();
  renderer.render(scene, camera);
}
animate();

// ================= RESIZE =================
window.addEventListener("resize", () => {
  const a = window.innerWidth / window.innerHeight;
  const f = CONFIG.camera.frustumSize;

  camera.left = -f * a;
  camera.right = f * a;
  camera.top = f;
  camera.bottom = -f;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});
