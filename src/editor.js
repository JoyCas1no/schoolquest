import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const $ = (id) => document.getElementById(id);
const canvas = $("scene");
const GRID = 100;
const LIMIT = GRID / 2;
const CAPACITY = GRID * GRID;
const WALL_CAPACITY = 2 * GRID * (GRID + 1);
const WALL_HEIGHT = 1.35;
const STORAGE_KEY = "schoolquest.floor-editor.v1";
const STYLE_NAMES = { tile: "Русский", linoleum: "Природа", wood: "Английский", blue: "Логика", rose: "Искусство", violet: "Математика", sand: "Коридор" };
const cells = new Map();
const walls = new Map();
const history = [];
let tool = "floor";
let currentStyle = "tile";
let ready = false;
let dirty = false;
let saveTimer = 0;
let toastTimer = 0;
let topView = false;
let viewSize = 13;
const cameraTarget = new THREE.Vector3(0, 0, 0);
let azimuth = Math.PI / 4;
let elevation = 0.88;

function key(x, z) { return `${x},${z}`; }
function inside(x, z) { return Number.isInteger(x) && Number.isInteger(z) && x >= -LIMIT && x < LIMIT && z >= -LIMIT && z < LIMIT; }
function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  return forms[a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2];
}
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}
function wallKey(side, x, z) { return `${side},${x},${z}`; }
function wallInside(side, x, z) {
  return Number.isInteger(x) && Number.isInteger(z) && (side === "h"
    ? x >= -LIMIT && x < LIMIT && z >= -LIMIT && z <= LIMIT
    : x >= -LIMIT && x <= LIMIT && z >= -LIMIT && z < LIMIT);
}
function cellSnapshot() {
  return [...cells.values()].map((c) => [c.x, c.z, c.style]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
function wallSnapshot() {
  return [...walls.values()].map((w) => [w.side, w.x, w.z]).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1] || a[2] - b[2]);
}
function snapshot() { return { cells: cellSnapshot(), walls: wallSnapshot() }; }
function restore(data) {
  cells.clear();
  walls.clear();
  const cellRows = Array.isArray(data) ? data : (data?.cells || []);
  const wallRows = Array.isArray(data) ? [] : (data?.walls || []);
  for (const row of cellRows) {
    if (!Array.isArray(row) || row.length !== 3) continue;
    const [x, z, style] = row;
    if (inside(x, z) && STYLE_NAMES[style]) cells.set(key(x, z), { x, z, style });
  }
  for (const row of wallRows) {
    if (!Array.isArray(row) || row.length !== 3) continue;
    const [side, x, z] = row;
    if ((side === "h" || side === "v") && wallInside(side, x, z)) walls.set(wallKey(side, x, z), { side, x, z });
  }
  rebuild();
  updateUI();
}
function pushHistory(before) {
  const after = snapshot();
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  history.push({ before, after });
  if (history.length > 60) history.shift();
  $("undoBtn").disabled = false;
}
function markDirty() {
  dirty = true;
  $("saveStatus").textContent = "Сохраняем…";
  $("saveDot").classList.add("dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(false), 550);
}
function saveNow(showMessage = true) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, updatedAt: new Date().toISOString(), ...snapshot() }));
    dirty = false;
    $("saveStatus").textContent = "Черновик сохранён";
    $("saveDot").classList.remove("dirty");
    if (showMessage) toast("Черновик сохранён на этом устройстве");
  } catch (error) {
    $("saveStatus").textContent = "Не удалось сохранить";
    if (showMessage) toast("Нет доступа к локальному хранилищу");
  }
}
function updateUI() {
  const n = cells.size;
  $("cellCount").textContent = `${n} ${plural(n, ["плитка", "плитки", "плиток"])} · ${walls.size} ${plural(walls.size, ["стена", "стены", "стен"])}`;
  $("undoBtn").disabled = history.length === 0;
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (error) {
  $("loaderIcon").style.display = "none";
  $("loadingTitle").textContent = "3D недоступно";
  $("loadingSub").textContent = "Откройте редактор в современном браузере с поддержкой WebGL";
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9eee8);
scene.fog = new THREE.Fog(0xe9eee8, 32, 64);
const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 160);
scene.add(new THREE.HemisphereLight(0xffffff, 0x91a294, 2.15));
const sun = new THREE.DirectionalLight(0xfff7e8, 2.5);
sun.position.set(-8, 16, 10);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdce9e3, 0.65);
fill.position.set(10, 8, -12);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0xe3e9e2, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.012;
scene.add(ground);

const grid = new THREE.GridHelper(GRID, GRID, 0x82998c, 0xaab9af);
grid.position.y = 0.052;
grid.material.transparent = true;
grid.material.opacity = 0.48;
scene.add(grid);
const borderPoints = [
  new THREE.Vector3(-LIMIT, 0.054, -LIMIT), new THREE.Vector3(LIMIT, 0.054, -LIMIT),
  new THREE.Vector3(LIMIT, 0.054, LIMIT), new THREE.Vector3(-LIMIT, 0.054, LIMIT),
  new THREE.Vector3(-LIMIT, 0.054, -LIMIT)
];
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPoints), new THREE.LineBasicMaterial({ color: 0x668575, transparent: true, opacity: 0.75 })));

const rayPlane = new THREE.Mesh(new THREE.PlaneGeometry(GRID, GRID), new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
rayPlane.rotation.x = -Math.PI / 2;
scene.add(rayPlane);
const ghost = new THREE.Mesh(
  new THREE.PlaneGeometry(0.94, 0.94),
  new THREE.MeshBasicMaterial({ color: 0x4f8b6d, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide })
);
ghost.rotation.x = -Math.PI / 2;
ghost.position.y = 0.058;
ghost.visible = false;
scene.add(ghost);

function updateCamera() {
  viewSize = THREE.MathUtils.clamp(viewSize, 5, 130);
  const distance = 30;
  camera.position.set(
    cameraTarget.x + Math.cos(azimuth) * Math.cos(elevation) * distance,
    cameraTarget.y + Math.sin(elevation) * distance,
    cameraTarget.z + Math.sin(azimuth) * Math.cos(elevation) * distance
  );
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / Math.max(1, h);
  camera.left = -viewSize * aspect / 2;
  camera.right = viewSize * aspect / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
  updateCamera();
}
window.addEventListener("resize", resize);
resize();

let baseGeometry;
let topGeometry;
let baseMesh;
let wallMesh;
const topMeshes = {};
const dummy = new THREE.Object3D();

function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeLinoleumTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d"), rnd = seeded(83);
  g.fillStyle = "#b8c5b3";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = rnd() > 0.5 ? "255,255,244" : "76,99,80";
    g.fillStyle = `rgba(${v},${0.025 + rnd() * 0.06})`;
    const s = 0.4 + rnd() * 1.2;
    g.fillRect(rnd() * 256, rnd() * 256, s, s);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
function makeWoodTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d"), rnd = seeded(217);
  g.fillStyle = "#cba778";
  g.fillRect(0, 0, 512, 512);
  for (let plank = 0; plank < 4; plank++) {
    const y = plank * 128;
    g.fillStyle = plank % 2 ? "rgba(255,235,194,.09)" : "rgba(100,57,25,.035)";
    g.fillRect(0, y, 512, 128);
    g.fillStyle = "rgba(93,57,30,.28)";
    g.fillRect(0, y, 512, 2);
    for (let line = 0; line < 42; line++) {
      const yy = y + rnd() * 128;
      g.strokeStyle = `rgba(100,59,29,${0.025 + rnd() * 0.055})`;
      g.lineWidth = 0.6 + rnd();
      g.beginPath();
      g.moveTo(0, yy);
      for (let x = 0; x <= 512; x += 24) g.lineTo(x, yy + Math.sin(x * 0.027 + line) * (1 + rnd() * 2));
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
function setupInstances(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const bases = [];
  let sourceTopMaterial = null;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    if (object.material.name === "Floor_Surface_Replaceable") {
      topGeometry = geometry;
      sourceTopMaterial = object.material;
    } else bases.push(geometry);
  });
  if (!topGeometry || bases.length !== 5) throw new Error("Unexpected floor model structure");
  baseGeometry = mergeGeometries(bases, false);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xa8a59a, roughness: 0.94, metalness: 0 });
  baseMesh = new THREE.InstancedMesh(baseGeometry, baseMaterial, CAPACITY);
  baseMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  baseMesh.frustumCulled = false;
  scene.add(baseMesh);
  const tileMaterial = sourceTopMaterial.clone();
  tileMaterial.roughness = 0.8;
  if (tileMaterial.map) tileMaterial.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const materials = {
    tile: tileMaterial,
    linoleum: new THREE.MeshStandardMaterial({ map: makeLinoleumTexture(), roughness: 0.9, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.76, metalness: 0 }),
    blue: new THREE.MeshStandardMaterial({ color: 0xa9c8d8, roughness: 0.88, metalness: 0 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xd9c79f, roughness: 0.92, metalness: 0 }),
    rose: new THREE.MeshStandardMaterial({ color: 0xd8afb0, roughness: 0.88, metalness: 0 }),
    violet: new THREE.MeshStandardMaterial({ color: 0xb9afd3, roughness: 0.88, metalness: 0 })
  };
  for (const style of Object.keys(materials)) {
    const mesh = new THREE.InstancedMesh(topGeometry, materials[style], CAPACITY);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    topMeshes[style] = mesh;
    scene.add(mesh);
  }
  const wallGeometry = new THREE.BoxGeometry(1.08, WALL_HEIGHT, 0.12);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.86, metalness: 0 });
  wallMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, WALL_CAPACITY);
  wallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wallMesh.frustumCulled = false;
  wallMesh.count = 0;
  scene.add(wallMesh);
}
function setInstance(mesh, index, cell) {
  dummy.position.set(cell.x + 0.5, 0, cell.z + 0.5);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
function rebuild() {
  if (!baseMesh) return;
  const all = [...cells.values()];
  all.forEach((cell, i) => setInstance(baseMesh, i, cell));
  baseMesh.count = all.length;
  baseMesh.instanceMatrix.needsUpdate = true;
  for (const [style, mesh] of Object.entries(topMeshes)) {
    const styled = all.filter((cell) => cell.style === style);
    styled.forEach((cell, i) => setInstance(mesh, i, cell));
    mesh.count = styled.length;
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (wallMesh) {
    [...walls.values()].forEach((wall, index) => {
      dummy.position.set(wall.x + (wall.side === "h" ? 0.5 : 0), WALL_HEIGHT / 2, wall.z + (wall.side === "v" ? 0.5 : 0));
      dummy.rotation.set(0, wall.side === "v" ? Math.PI / 2 : 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wallMesh.setMatrixAt(index, dummy.matrix);
    });
    wallMesh.count = walls.size;
    wallMesh.instanceMatrix.needsUpdate = true;
  }
}
function editCell(x, z, forcedTool) {
  if (!ready || !inside(x, z)) return;
  const k = key(x, z), previous = cells.get(k);
  const activeTool = forcedTool || tool;
  const before = snapshot();
  if (activeTool === "eraser") {
    if (!previous) return;
    cells.delete(k);
  } else {
    if (previous && previous.style === currentStyle) return;
    cells.set(k, { x, z, style: currentStyle });
  }
  pushHistory(before);
  rebuild();
  updateUI();
  markDirty();
}
function nearestWall(cell) {
  const localX = cell.point.x - cell.x, localZ = cell.point.z - cell.z;
  const candidates = [
    { side: "v", x: cell.x, z: cell.z, distance: localX },
    { side: "v", x: cell.x + 1, z: cell.z, distance: 1 - localX },
    { side: "h", x: cell.x, z: cell.z, distance: localZ },
    { side: "h", x: cell.x, z: cell.z + 1, distance: 1 - localZ }
  ];
  return candidates.reduce((nearest, item) => item.distance < nearest.distance ? item : nearest);
}
function addWall(cell) {
  if (!ready) return;
  const wall = nearestWall(cell), k = wallKey(wall.side, wall.x, wall.z);
  if (walls.has(k)) return;
  const before = snapshot();
  walls.set(k, { side: wall.side, x: wall.x, z: wall.z });
  pushHistory(before);
  rebuild();
  updateUI();
  markDirty();
}
function eraseAt(cell) {
  if (!ready) return;
  const wall = nearestWall(cell), k = wallKey(wall.side, wall.x, wall.z);
  const floor = cells.get(key(cell.x, cell.z));
  if (!walls.has(k) && !floor) return;
  const before = snapshot();
  if (walls.has(k)) walls.delete(k);
  else cells.delete(key(cell.x, cell.z));
  pushHistory(before);
  rebuild();
  updateUI();
  markDirty();
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function cellAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  ndc.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObject(rayPlane, false)[0];
  if (!hit) return null;
  const x = Math.floor(hit.point.x), z = Math.floor(hit.point.z);
  return inside(x, z) ? { x, z, point: hit.point } : null;
}
const wallGhost = new THREE.Mesh(
  new THREE.BoxGeometry(1.08, WALL_HEIGHT, 0.15),
  new THREE.MeshBasicMaterial({ color: 0x4f8b6d, transparent: true, opacity: 0.38, depthWrite: false })
);
wallGhost.visible = false;
scene.add(wallGhost);
function updateGhost(clientX, clientY) {
  const cell = cellAt(clientX, clientY);
  ghost.visible = Boolean(cell) && tool === "floor";
  wallGhost.visible = Boolean(cell) && tool !== "floor";
  if (cell && tool === "floor") {
    ghost.position.x = cell.x + 0.5;
    ghost.position.z = cell.z + 0.5;
    ghost.material.color.set(0x4f8b6d);
  } else if (cell) {
    const wall = nearestWall(cell);
    wallGhost.position.set(wall.x + (wall.side === "h" ? 0.5 : 0), WALL_HEIGHT / 2, wall.z + (wall.side === "v" ? 0.5 : 0));
    wallGhost.rotation.y = wall.side === "v" ? Math.PI / 2 : 0;
    wallGhost.material.color.set(tool === "eraser" ? 0xb85c52 : 0x4f8b6d);
  }
}

const pointers = new Map();
let gestureMulti = false;
let pinchStart = null;
function distanceAndMid() {
  const p = [...pointers.values()];
  if (p.length < 2) return null;
  return { distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
}
function panBy(dx, dy) {
  const scale = viewSize / Math.max(1, canvas.clientHeight);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
  right.y = 0; right.normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
  up.y = 0; up.normalize();
  cameraTarget.addScaledVector(right, -dx * scale);
  cameraTarget.addScaledVector(up, dy * scale);
  cameraTarget.x = THREE.MathUtils.clamp(cameraTarget.x, -LIMIT * 1.5, LIMIT * 1.5);
  cameraTarget.z = THREE.MathUtils.clamp(cameraTarget.z, -LIMIT * 1.5, LIMIT * 1.5);
  updateCamera();
}
canvas.addEventListener("pointerdown", (event) => {
  if (!ready) return;
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, button: event.button });
  ghost.visible = false;
  wallGhost.visible = false;
  if (pointers.size === 2) {
    gestureMulti = true;
    pinchStart = { ...distanceAndMid(), viewSize };
    pointers.forEach((p) => { p.moved = true; });
  }
});
canvas.addEventListener("pointermove", (event) => {
  if (!ready) return;
  const p = pointers.get(event.pointerId);
  if (!p) {
    if (event.pointerType === "mouse") updateGhost(event.clientX, event.clientY);
    return;
  }
  const dx = event.clientX - p.x, dy = event.clientY - p.y;
  p.x = event.clientX; p.y = event.clientY;
  if (Math.hypot(event.clientX - p.startX, event.clientY - p.startY) > 6) p.moved = true;
  if (pointers.size >= 2 && pinchStart) {
    const now = distanceAndMid();
    if (now && now.distance > 10) {
      viewSize = pinchStart.viewSize * pinchStart.distance / now.distance;
      resize();
      panBy(now.x - pinchStart.x, now.y - pinchStart.y);
      pinchStart.x = now.x; pinchStart.y = now.y;
    }
  } else if (p.moved) panBy(dx, dy);
});
function finishPointer(event, cancelled = false) {
  const p = pointers.get(event.pointerId);
  if (!p) return;
  const wasLast = pointers.size === 1;
  if (!cancelled && wasLast && !gestureMulti && !p.moved) {
    const cell = cellAt(event.clientX, event.clientY);
    if (cell) {
      const activeTool = p.button === 2 ? "eraser" : tool;
      if (activeTool === "wall") addWall(cell);
      else if (activeTool === "eraser") eraseAt(cell);
      else editCell(cell.x, cell.z);
    }
  }
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) gestureMulti = false;
}
canvas.addEventListener("pointerup", (event) => finishPointer(event));
canvas.addEventListener("pointercancel", (event) => finishPointer(event, true));
canvas.addEventListener("pointerleave", () => { if (!pointers.size) { ghost.visible = false; wallGhost.visible = false; } });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  viewSize *= Math.exp(event.deltaY * 0.001);
  resize();
}, { passive: false });

for (const button of document.querySelectorAll("[data-tool]")) {
  button.addEventListener("click", () => {
    tool = button.dataset.tool;
    document.querySelectorAll("[data-tool]").forEach((el) => {
      const active = el === button;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", String(active));
    });
    $("hint").textContent = tool === "floor"
      ? "Касание — поставить пол · движение — камера · щипок — масштаб"
      : tool === "wall" ? "Коснитесь ближнего края клетки, чтобы поставить стену" : "Коснитесь края стены или плитки, чтобы удалить";
  });
}
for (const button of document.querySelectorAll("[data-style]")) {
  button.addEventListener("click", () => {
    currentStyle = button.dataset.style;
    document.querySelectorAll("[data-style]").forEach((el) => {
      const active = el === button;
      el.classList.toggle("active", active);
      el.setAttribute("aria-pressed", String(active));
    });
    if (tool !== "floor") document.querySelector('[data-tool="floor"]').click();
    toast(`${STYLE_NAMES[currentStyle]} выбрана`);
  });
}
$("undoBtn").addEventListener("click", () => {
  const action = history.pop();
  if (!action) return;
  restore(action.before);
  markDirty();
  toast("Последнее действие отменено");
});
$("saveBtn").addEventListener("click", () => saveNow(true));
$("zoomIn").addEventListener("click", () => { viewSize *= 0.82; resize(); });
$("zoomOut").addEventListener("click", () => { viewSize *= 1.22; resize(); });
$("homeBtn").addEventListener("click", () => {
  cameraTarget.set(0, 0, 0);
  viewSize = 13;
  azimuth = Math.PI / 4;
  elevation = topView ? 1.52 : 0.88;
  resize();
});
$("viewBtn").addEventListener("click", () => {
  topView = !topView;
  elevation = topView ? 1.52 : 0.88;
  updateCamera();
  toast(topView ? "Вид сверху" : "Объёмный вид");
});
function openClear() {
  if (!cells.size && !walls.size) { toast("Карта уже пустая"); return; }
  $("clearModal").classList.remove("hidden");
  $("cancelClear").focus();
}
$("clearBtn").addEventListener("click", openClear);
$("mobileClearBtn").addEventListener("click", openClear);
$("cancelClear").addEventListener("click", () => $("clearModal").classList.add("hidden"));
$("clearModal").addEventListener("click", (event) => { if (event.target === $("clearModal")) $("clearModal").classList.add("hidden"); });
$("confirmClear").addEventListener("click", () => {
  const before = snapshot();
  cells.clear();
  walls.clear();
  pushHistory(before);
  rebuild();
  updateUI();
  markDirty();
  $("clearModal").classList.add("hidden");
  toast("Карта очищена");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") $("clearModal").classList.add("hidden");
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); $("undoBtn").click(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveNow(true); }
});
window.addEventListener("beforeunload", () => { if (dirty) saveNow(false); });

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

function showModelError(error) {
  console.error(error);
  $("loaderIcon").style.display = "none";
  $("loadingTitle").textContent = "Не удалось загрузить модель пола";
  $("loadingSub").textContent = "Проверьте соединение и обновите страницу";
}
function startEditor(gltf) {
  try {
    setupInstances(gltf);
    let restored = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && (saved.version === 1 || saved.version === 2) && Array.isArray(saved.cells)) {
        restore(saved.version === 1 ? saved.cells : saved);
        restored = true;
      }
    } catch (error) { /* Start with the sample patch if storage is unavailable. */ }
    if (!restored) {
      for (let x = -3; x < 3; x++) for (let z = -3; z < 3; z++) cells.set(key(x, z), { x, z, style: "tile" });
      for (let x = -3; x < 3; x++) {
        walls.set(wallKey("h", x, 3), { side: "h", x, z: 3 });
        if (x !== -1 && x !== 0) walls.set(wallKey("h", x, -3), { side: "h", x, z: -3 });
      }
      for (let z = -3; z < 3; z++) {
        walls.set(wallKey("v", -3, z), { side: "v", x: -3, z });
        walls.set(wallKey("v", 3, z), { side: "v", x: 3, z });
      }
      rebuild();
      updateUI();
    }
    ready = true;
    $("loading").classList.add("hidden");
    window.__EDITOR_READY__ = true;
  } catch (error) { showModelError(error); }
}
async function loadFloorModel() {
  try {
    const names = [...Array.from({ length: 7 }, (_, index) => String(index).padStart(2, "0")), "07-a", "07-b", "07-c", "07-d", "08"];
    const parts = await Promise.all(names.map(async (name) => {
      const response = await fetch(`./assets/models/floor-parts/part-${name}`);
      if (!response.ok) throw new Error(`Floor model part ${name}: HTTP ${response.status}`);
      return response.text();
    }));
    const encoded = parts.join("").replace(/\s/g, "");
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    new GLTFLoader().parse(bytes.buffer, "./assets/models/", startEditor, showModelError);
  } catch (error) { showModelError(error); }
}
loadFloorModel();

window.__editorProbe = () => ({
  ready,
  cells: cellSnapshot(),
  walls: wallSnapshot(),
  count: cells.size,
  wallCount: walls.size,
  grid: GRID,
  tool,
  style: currentStyle,
  history: history.length,
  dirty,
  viewSize,
  target: cameraTarget.toArray(),
  topView,
  drawCalls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles
});
window.__editorCellScreen = (x, z) => {
  const v = new THREE.Vector3(x + 0.5, 0.04, z + 0.5).project(camera);
  const rect = canvas.getBoundingClientRect();
  return { x: rect.left + (v.x + 1) * rect.width / 2, y: rect.top + (1 - v.y) * rect.height / 2 };
};
if (location.protocol === "https:" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./editor-sw.js").catch(() => {});
}
