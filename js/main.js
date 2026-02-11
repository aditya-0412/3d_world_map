// ================= IMPORTS =================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

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
    minZoom: 1.5,
    maxZoom: 30.5,
  },

  performance: {
    maxPixelRatio: 1.5,
  },

  lighting: {
    ambientIntensity: 0.45,

    directional: {
      intensity: 1.5,
      position: { x: -15, y: 25, z: -10 },
      castShadow: true,

      shadow: {
        mapSize: 2048, // Lower for smoother FPS
        near: 1,
        far: 50,
        bounds: 20,
        opacity: 0.2,
      },
    },

    // Soft top highlight (gives bright dot caps)
    topLight: {
      intensity: 1.1,
      position: { x: 0, y: 12, z: 6 },
    },
  },

  interaction: {
    hoverCooldownFrames: 2, // frames to lock hover after change (prevents flicker)
    hoverFalloff: 0.92, // decay factor for hover lift (instead of instant reset)
  },

  dots: {
    radius: 0.09,
    height: 0.3,
    color: 0x7ae0ff,
    spacing: 1.5, // (1.0 = original)
    dome: {
      heightRatio: 0.5, // relative to top radius (smaller = subtler dome)
      segments: 8,
    },
    material: {
      roughness: 0.55,
      metalness: 0.0,
    },
    capMaterial: {
      roughness: 0.4,
      metalness: 0.05,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
    },
  },

  dotGeometry: {
    radialSegments: 32,
    heightMultiplier: 1.15,
    topRadiusFactor: 0.98,
  },

  hotspots: {
    radiusMultiplier: 1.5,
    heightMultiplier: 2.2,
    radialSegments: 30,
    dome: {
      heightRatio: 0.5, // relative to top radius (smaller = subtler dome)
      segments: 8,
    },
    connectionLine: {
      enabled: true,
      color: 0x5a5a5a,
      opacity: 0.55,
      heightOffset: 0,
      arcHeight: 4.95, // world units
      segments: 50, // points per hotspot segment
    },

    material: {
      roughness: 0.3,
      metalness: 0.01,
    },
    capMaterial: {
      roughness: 0.4,
      metalness: 0.08,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
    },
  },

  hover: {
    radius: 0.35,
    maxLift: 0.55,
    easing: 0.16,
    threshold: 0.001,
  },
};

// ================= CONSTANTS =================
const GROUND_Y = 0;
const DOT_BASE_Y = GROUND_Y; // exact contact point

function getCylinderCenterY(height, lift = 0) {
  return DOT_BASE_Y + height / 2 + lift;
}

function createDomedCylinderGeometry(
  topRadius,
  bottomRadius,
  height,
  radialSegments,
  domeHeightRatio,
  domeSegments,
) {
  const ratio = Math.max(0.08, Math.min(domeHeightRatio, 0.7));
  const domeHeight = Math.min(topRadius * ratio, height * 0.45);
  const cylinderHeight = Math.max(0.001, height - domeHeight);

  const cylinder = new THREE.CylinderGeometry(
    topRadius,
    bottomRadius,
    cylinderHeight,
    radialSegments,
    1,
    true,
  );

  const theta = 2 * Math.atan(domeHeight / topRadius);
  const sphereRadius = topRadius / Math.sin(theta);
  const dome = new THREE.SphereGeometry(
    sphereRadius,
    radialSegments,
    domeSegments,
    0,
    Math.PI * 2,
    0,
    theta,
  );

  const rimY = sphereRadius * Math.cos(theta);
  dome.translate(0, cylinderHeight / 2 - rimY, 0);

  const bottomCap = new THREE.CircleGeometry(bottomRadius, radialSegments);
  bottomCap.rotateX(-Math.PI / 2);
  bottomCap.translate(0, -cylinderHeight / 2, 0);

  const merged = mergeGeometries([cylinder, dome, bottomCap], true);
  merged.computeVertexNormals();
  merged.translate(0, -domeHeight / 2, 0);
  return merged;
}

function getHotspotWorldPosition(hs, out) {
  const p = dotPositions[hs.dotIndex];
  const hotspotHeight = CONFIG.dots.height * CONFIG.hotspots.heightMultiplier;
  out.set(
    p.x * SPACING,
    getCylinderCenterY(hotspotHeight, p.lift) +
      CONFIG.hotspots.connectionLine.heightOffset,
    -p.y * SPACING,
  );
}

function updateHotspotConnectionLine() {
  if (!hotspotLine) return;

  const lineCfg = CONFIG.hotspots.connectionLine;
  const segments = Math.max(1, Math.floor(lineCfg.segments));
  const linePositions = hotspotLine.geometry.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let writeIndex = 0;

  for (let i = 0; i < hotspotData.length - 1; i += 1) {
    getHotspotWorldPosition(hotspotData[i], a);
    getHotspotWorldPosition(hotspotData[i + 1], b);

    const start = i === 0 ? 0 : 1;
    for (let s = start; s <= segments; s += 1) {
      const t = s / segments;
      const oneMinus = 1 - t;
      linePositions.array[writeIndex++] = a.x * oneMinus + b.x * t;
      linePositions.array[writeIndex++] =
        a.y * oneMinus +
        b.y * t +
        Math.sin(Math.PI * t) * lineCfg.arcHeight;
      linePositions.array[writeIndex++] = a.z * oneMinus + b.z * t;
    }
  }

  linePositions.needsUpdate = true;
  hotspotLine.geometry.computeBoundingSphere();
}

// ================= HOTSPOTS =================
const HOTSPOT_COLORS = {
  global: 0x008551, // traffic light green
  regional: 0xff8a00, // orange
  telco: 0xff4fa3, // pink
};

const HOTSPOTS = [];
async function loadHotspots(type, url) {
  return fetch(url)
    .then((res) => res.json())
    .then((data) => data.map((h) => ({ ...h, type })));
}

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
camera.zoom = 1.7;
camera.updateProjectionMatrix();

camera.lookAt(0, 0, 0);

// ================= RENDERER =================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, CONFIG.performance.maxPixelRatio),
);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
dir.shadow.bias = -0.0006;
dir.shadow.normalBias = 0.02;

scene.add(dir);

// Shadow receiver plane
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ opacity: dCfg.shadow.opacity }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = GROUND_Y;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// Soft top highlight (gives bright dot caps)
const topLight = new THREE.DirectionalLight(
  0xffffff,
  CONFIG.lighting.topLight.intensity,
);
topLight.position.set(
  CONFIG.lighting.topLight.position.x,
  CONFIG.lighting.topLight.position.y,
  CONFIG.lighting.topLight.position.z,
);
topLight.target.position.set(0, 0, 0);
scene.add(topLight.target);

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
const mouse = new THREE.Vector2();

Promise.all([
  loadHotspots("global", "./assets/global-hotspots.json"),
  loadHotspots("regional", "./assets/regional-hotspots.json"),
  loadHotspots("telco", "./assets/telco-hotspots.json"),
]).then(([global, regional, telco]) => {
  HOTSPOTS.push(...global, ...regional, ...telco);

  // Now safe to build dots
  fetch("./assets/dots.json")
    .then((res) => res.json())
    .then(buildDotsFromFile);
});
let hoverProxyMesh = null;

function buildDotsFromFile(dots) {
  // --- create proxy FIRST ---

  const hoverProxyGeometry = new THREE.CylinderGeometry(
    DOT_RADIUS * 1.8,
    DOT_RADIUS * 1.8,
    DOT_HEIGHT * 2.5,
    12,
  );

  const hoverProxyMaterial = new THREE.MeshBasicMaterial({ visible: false });

  hoverProxyMesh = new THREE.InstancedMesh(
    hoverProxyGeometry,
    hoverProxyMaterial,
    dots.length,
  );

  hoverProxyMesh.frustumCulled = false;
  scene.add(hoverProxyMesh);

  const geometry = createDomedCylinderGeometry(
    DOT_RADIUS * CONFIG.dotGeometry.topRadiusFactor,
    DOT_RADIUS,
    DOT_HEIGHT * CONFIG.dotGeometry.heightMultiplier,
    CONFIG.dotGeometry.radialSegments,
    CONFIG.dots.dome.heightRatio,
    CONFIG.dots.dome.segments,
  );

  const sideMaterial = new THREE.MeshStandardMaterial({
    color: DOT_COLOR,
    roughness: CONFIG.dots.material.roughness,
    metalness: CONFIG.dots.material.metalness,
    flatShading: false,
  });
  const capMaterial = new THREE.MeshPhysicalMaterial({
    color: DOT_COLOR,
    roughness: CONFIG.dots.capMaterial.roughness,
    metalness: CONFIG.dots.capMaterial.metalness,
    clearcoat: CONFIG.dots.capMaterial.clearcoat,
    clearcoatRoughness: CONFIG.dots.capMaterial.clearcoatRoughness,
    flatShading: false,
  });

  dotMesh = new THREE.InstancedMesh(
    geometry,
    [sideMaterial, capMaterial, sideMaterial],
    dots.length,
  );
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

    dummy.position.set(
      x * SPACING,
      getCylinderCenterY(DOT_HEIGHT),
      -y * SPACING,
    );
    dummy.updateMatrix();
    dotMesh.setMatrixAt(i, dummy.matrix);
    hoverProxyMesh.setMatrixAt(i, dummy.matrix);
  });

  dotMesh.instanceMatrix.needsUpdate = true;
  dotMesh.frustumCulled = false;
  dotMesh.castShadow = true;
  hoverProxyMesh.instanceMatrix.needsUpdate = true;

  scene.add(dotMesh);
  // --- Build hotspot dots (BY TYPE) ---
  const hotspotGeometry = createDomedCylinderGeometry(
    CONFIG.dots.radius * CONFIG.hotspots.radiusMultiplier,
    CONFIG.dots.radius * CONFIG.hotspots.radiusMultiplier,
    CONFIG.dots.height * CONFIG.hotspots.heightMultiplier,
    CONFIG.hotspots.radialSegments,
    CONFIG.hotspots.dome.heightRatio,
    CONFIG.hotspots.dome.segments,
  );

  // Group hotspots by type
  const grouped = {};
  HOTSPOTS.forEach((hs) => {
    grouped[hs.type] ??= [];
    grouped[hs.type].push(hs);
  });

  Object.entries(grouped).forEach(([type, list]) => {
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: HOTSPOT_COLORS[type] ?? HOTSPOT_COLORS.default,
      roughness: CONFIG.hotspots.material.roughness,
      metalness: CONFIG.hotspots.material.metalness,
    });
    const capMaterial = new THREE.MeshPhysicalMaterial({
      color: HOTSPOT_COLORS[type] ?? HOTSPOT_COLORS.default,
      roughness: CONFIG.hotspots.capMaterial.roughness,
      metalness: CONFIG.hotspots.capMaterial.metalness,
      clearcoat: CONFIG.hotspots.capMaterial.clearcoat,
      clearcoatRoughness: CONFIG.hotspots.capMaterial.clearcoatRoughness,
    });

    const mesh = new THREE.InstancedMesh(
      hotspotGeometry,
      [sideMaterial, capMaterial, sideMaterial],
      list.length,
    );

    // IMPORTANT: store type on mesh (used for raycasting)
    mesh.userData.type = type;

    const dummy = new THREE.Object3D();

    list.forEach((hs, i) => {
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
      dotPositions[bestIndex].hotspotIndex = hotspotData.length;

      hotspotData.push({
        ...hs,
        dotIndex: bestIndex,
        meshType: type,
        meshInstanceId: i,
      });

      const p = dotPositions[bestIndex];
      const hotspotHeight =
        CONFIG.dots.height * CONFIG.hotspots.heightMultiplier;
      dummy.position.set(
        p.x * SPACING,
        getCylinderCenterY(hotspotHeight),
        -p.y * SPACING,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.castShadow = true;

    hotspotMeshes[type] = mesh;
    scene.add(mesh);
  });

  buildHotspotConnectionLine();
}

function buildHotspotConnectionLine() {
  if (
    !CONFIG.hotspots.connectionLine?.enabled ||
    hotspotData.length < 2
  ) {
    return;
  }

  const segments = Math.max(
    1,
    Math.floor(CONFIG.hotspots.connectionLine.segments),
  );
  const pointCount = (hotspotData.length - 1) * segments + 1;
  const positions = new Float32Array(pointCount * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: CONFIG.hotspots.connectionLine.color,
    transparent: CONFIG.hotspots.connectionLine.opacity < 1,
    opacity: CONFIG.hotspots.connectionLine.opacity,
  });

  hotspotLine = new THREE.Line(geometry, material);
  hotspotLine.frustumCulled = false;
  scene.add(hotspotLine);
  updateHotspotConnectionLine();
}

// Sync hotspot positions with dot lifts (called every frame)
function syncHotspotLift() {
  const dummy = new THREE.Object3D();

  hotspotData.forEach((hs) => {
    const p = dotPositions[hs.dotIndex];
    const mesh = hotspotMeshes[hs.meshType];
    const hotspotHeight = CONFIG.dots.height * CONFIG.hotspots.heightMultiplier;

    dummy.position.set(
      p.x * SPACING,
      getCylinderCenterY(hotspotHeight, p.lift),
      -p.y * SPACING,
    );
    dummy.updateMatrix();

    mesh.setMatrixAt(hs.meshInstanceId, dummy.matrix);
  });

  Object.values(hotspotMeshes).forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
  });

  updateHotspotConnectionLine();
}

// ================= HOTSPOT DOTS =================
let hotspotMeshes = {};
let hotspotData = [];
let hotspotLine = null;

// ================= HOVER =================

let hoveredInstanceId = null;
let hoverCooldown = 0;
let liftActive = false;

function handleHover() {
  if (!dotMesh || !hoverProxyMesh) return;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(hoverProxyMesh);

  // Small hysteresis to prevent flicker
  if (hits.length) {
    const id = hits[0].instanceId;

    if (hoveredInstanceId !== id) {
      hoveredInstanceId = id;
      hoverCooldown = CONFIG.interaction.hoverCooldownFrames;
    }
  } else if (hoverCooldown <= 0) {
    hoveredInstanceId = null;
  }

  hoverCooldown = Math.max(hoverCooldown - 1, 0);

  if (hoveredInstanceId === null) return;

  const center = dotPositions[hoveredInstanceId];
  const { radius, maxLift } = CONFIG.hover;
  const outerRadius = radius * 1.4;
  const outerRadiusSq = outerRadius * outerRadius;
  const invRadius = 1 / radius;
  liftActive = true;

  dotPositions.forEach((p) => {
    const dx = (p.x - center.x) * SPACING;
    const dy = (p.y - center.y) * SPACING;
    const d2 = dx * dx + dy * dy;

    // Smooth falloff (Gaussian-like)
    if (d2 < outerRadiusSq) {
      const t = Math.sqrt(d2) * invRadius;
      p.targetLift = Math.max(p.targetLift, Math.exp(-t * t) * maxLift);
    }
  });
}

// ================= HOTSPOT INTERACTION =================
let activeHotspot = null;
const tooltip = document.getElementById("tooltip");

window.addEventListener("pointermove", (e) => {
  // Update tooltip position (viewport-safe)
  tooltip.style.left = `${e.clientX}px`;
  tooltip.style.top = `${e.clientY}px`;

  // Update normalized device coords for raycasting
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  handleHotspots(false);
});

window.addEventListener("pointerdown", (e) => {
  // Update mouse coords immediately on tap
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Position tooltip at tap point
  tooltip.style.left = `${e.clientX}px`;
  tooltip.style.top = `${e.clientY}px`;

  handleHotspots(true);
});

function handleHotspots(isClick = false) {
  raycaster.setFromCamera(mouse, camera);

  for (const mesh of Object.values(hotspotMeshes)) {
    const hits = raycaster.intersectObject(mesh);
    if (!hits.length) continue;

    const instanceId = hits[0].instanceId;
    const hs =
      hotspotData.find(
        (h) =>
          h.meshType === mesh.userData?.type && h.meshInstanceId === instanceId,
      ) || hotspotData.find((h) => h.meshInstanceId === instanceId);

    if (!hs) continue;

    if (isClick && activeHotspot === hs) {
      hideTooltip();
      return;
    }

    showTooltip(hs);
    return;
  }

  hideTooltip();
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

function smoothLiftUpdate() {
  if (!dotMesh) return;
  if (!liftActive && hoveredInstanceId === null) return;

  const { easing, threshold } = CONFIG.hover;
  const dummy = new THREE.Object3D();
  let dirty = false;

  dotPositions.forEach((p, i) => {
    p.targetLift *= CONFIG.interaction.hoverFalloff;

    const delta = p.targetLift - p.lift;
    if (Math.abs(delta) > threshold) {
      p.lift += delta * easing;
      dirty = true;

      dummy.position.set(
        p.x * SPACING,
        getCylinderCenterY(DOT_HEIGHT, p.lift),
        -p.y * SPACING,
      );
      dummy.updateMatrix();
      dotMesh.setMatrixAt(i, dummy.matrix);
      hoverProxyMesh.setMatrixAt(i, dummy.matrix);
    }
  });

  if (dirty) {
    dotMesh.instanceMatrix.needsUpdate = true;
    hoverProxyMesh.instanceMatrix.needsUpdate = true;
  }
  if (!dirty && hoveredInstanceId === null) {
    liftActive = false;
  }
}

// ================= LOOP =================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  handleHover();
  smoothLiftUpdate();
  if (liftActive) {
    syncHotspotLift();
  }
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
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, CONFIG.performance.maxPixelRatio),
  );
});
