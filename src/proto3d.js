import * as THREE from "three";

/* ================= базовая проверка WebGL ================= */
const canvas = document.getElementById("c3d");
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById("msg").textContent = "😢 3D не поддерживается на этом устройстве";
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd9ff);
scene.fog = new THREE.Fog(0x9fd9ff, 14, 30);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

/* свет */
scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x6fae5c, 0.9));
const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
scene.add(sun);

/* ================= помощники ================= */
function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function cone(r, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, h, seg || 12),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function ball(r, color, x, y, z, w, h) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 18, 14),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x || 0, y || 0, z || 0);
  if (w) m.scale.set(1, h || 1, 1);
  m.castShadow = true;
  return m;
}
/* лицо: глаза и улыбка на прозрачной текстуре */
function face(mood) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#1e1b2e";
  if (mood === "angry") {
    g.save(); g.translate(36, 48); g.rotate(0.5); g.fillRect(-10, -14, 20, 26); g.restore();
    g.save(); g.translate(92, 48); g.rotate(-0.5); g.fillRect(-10, -14, 20, 26); g.restore();
    g.lineWidth = 8; g.strokeStyle = "#1e1b2e"; g.beginPath(); g.arc(64, 108, 18, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  } else {
    g.beginPath(); g.ellipse(36, 50, 11, 15, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(92, 50, 11, 15, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 7; g.strokeStyle = "#1e1b2e";
    g.beginPath(); g.arc(64, 76, 22, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: t, transparent: true })
  );
  p.position.z = 0.256;
  return p;
}

/* ================= мир ================= */
const world = new THREE.Group();
scene.add(world);

/* остров-платформа */
const island = ball(7.5, 0x58b368, 0, -1.4, 0);
island.scale.set(1, 0.32, 1);
island.receiveShadow = true;
world.add(island);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(7.5, 40),
  new THREE.MeshLambertMaterial({ color: 0x6fcB7a })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.98;
ground.receiveShadow = true;
world.add(ground);
/* травинки-конусы и цветочки */
for (let i = 0; i < 26; i++) {
  const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4.6;
  if (Math.random() < 0.5) {
    const g2 = cone(0.08, 0.3, 0x3f9e4d, Math.cos(a) * r, 1.12, Math.sin(a) * r, 5);
    world.add(g2);
  } else {
    const f = ball(0.09, [0xff6b9d, 0xffd166, 0xff8c42][i % 3], Math.cos(a) * r, 1.14, Math.sin(a) * r);
    world.add(f);
  }
}
/* деревья */
function tree(x, z, s) {
  const t = new THREE.Group();
  t.add(box(0.35 * s, 1.1 * s, 0.35 * s, 0x8b5a2b, 0, 0.55 * s, 0));
  t.add(cone(0.95 * s, 1.7 * s, 0x2f8f46, 0, 1.8 * s, 0, 8));
  t.add(cone(0.7 * s, 1.2 * s, 0x3aa856, 0, 2.5 * s, 0, 8));
  t.position.set(x, 0.98, z);
  world.add(t);
}
tree(-5.6, -3.2, 1); tree(5.8, -2.8, 1.15); tree(-4.2, 4.4, 0.8); tree(4.6, 4.8, 0.9);
/* облака */
const clouds = [];
for (let i = 0; i < 5; i++) {
  const cl = new THREE.Group();
  cl.add(ball(0.9, 0xffffff, 0, 0, 0));
  cl.add(ball(0.6, 0xffffff, 0.9, 0.1, 0.1));
  cl.add(ball(0.65, 0xffffff, -0.85, 0.05, -0.1));
  cl.position.set(-8 + i * 4.2, 5 + Math.random() * 2, -6 - Math.random() * 3);
  cl.userData.v = 0.15 + Math.random() * 0.2;
  clouds.push(cl); world.add(cl);
}

/* ================= блочный герой ================= */
function buildHero(kind) {
  const g = new THREE.Group();
  const skin = 0xffd9a0;
  const P = {};
  /* ноги */
  P.legL = box(0.22, 0.42, 0.24, 0x3b4a8f, -0.14, 0.21, 0);
  P.legR = box(0.22, 0.42, 0.24, 0x3b4a8f, 0.14, 0.21, 0);
  /* торс */
  const shirt = { warrior: 0x4a7de2, mage: 0x8b5fd6, rogue: 0x3f9e5a, vampire: 0x2b2440 }[kind];
  P.body = box(0.62, 0.62, 0.34, shirt, 0, 0.73, 0);
  /* руки: точка вращения — плечо */
  function arm(x) {
    const a = new THREE.Group();
    a.position.set(x, 1.0, 0);
    const m = box(0.18, 0.5, 0.2, shirt, 0, -0.22, 0);
    const hand = ball(0.11, skin, 0, -0.5, 0);
    a.add(m); a.add(hand);
    return a;
  }
  P.armL = arm(-0.41); P.armR = arm(0.41);
  /* голова */
  P.head = new THREE.Group();
  P.head.position.set(0, 1.36, 0);
  const skull = box(0.52, 0.5, 0.5, skin, 0, 0, 0);
  P.head.add(skull);
  P.head.add(face("normal"));
  /* волосы/шапка */
  if (kind === "warrior") {
    P.head.add(box(0.56, 0.14, 0.54, 0x8a5a33, 0, 0.28, 0));
    P.head.add(box(0.56, 0.22, 0.1, 0x9aa7bd, 0, 0.2, 0.24)); /* обруч шлема */
    const sw = new THREE.Group();
    sw.position.set(0, -0.5, 0);
    sw.add(box(0.07, 0.55, 0.03, 0xc8d2e0, 0, -0.32, 0));
    sw.add(box(0.16, 0.06, 0.05, 0x8a5a33, 0, -0.05, 0));
    P.armR.add(sw);
    const sh = box(0.1, 0.42, 0.36, 0x9aa7bd, 0, -0.28, 0.12);
    P.armL.add(sh);
  } else if (kind === "mage") {
    const hat = cone(0.34, 0.62, 0x5b3fb0, 0, 0.5, 0, 10);
    P.head.add(hat);
    P.head.add(ball(0.05, 0xffd166, 0, 0.84, 0));
    const st = new THREE.Group();
    st.position.set(0, -0.5, 0);
    st.add(cone(0.05, 0.9, 0x8a5a33, 0, -0.4, 0, 6));
    st.add(ball(0.12, 0x7dd8ff, 0, 0.14, 0));
    P.armR.add(st);
  } else if (kind === "rogue") {
    P.head.add(cone(0.32, 0.4, 0x2f7a45, 0, 0.36, 0, 8));
    P.head.add(box(0.54, 0.1, 0.52, 0x2f7a45, 0, 0.14, 0));
    const d1 = box(0.05, 0.3, 0.03, 0xd7dde8, 0, -0.62, 0);
    P.armR.add(d1);
    const d2 = box(0.05, 0.3, 0.03, 0xd7dde8, 0, -0.62, 0);
    P.armL.add(d2);
  } else if (kind === "vampire") {
    P.head.add(box(0.56, 0.16, 0.54, 0x14101f, 0, 0.3, 0));
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.62, 0.95, 10, 1, true, Math.PI * 0.6, Math.PI * 1.8),
      new THREE.MeshLambertMaterial({ color: 0x8f1d3a, side: THREE.DoubleSide })
    );
    cape.position.set(0, 0.66, 0);
    g.add(cape);
    P.cape = cape;
    P.head.add(cone(0.04, 0.14, 0xffffff, -0.14, -0.22, 0.2, 4));
    P.head.add(cone(0.04, 0.14, 0xffffff, 0.14, -0.22, 0.2, 4));
  }
  g.add(P.legL, P.legR, P.body, P.armL, P.armR, P.head);
  g.userData.parts = P;
  return g;
}

/* ================= монстры ================= */
function buildMonster(id) {
  const g = new THREE.Group();
  const P = { id, baseY: 0 };
  if (id === "frog") {
    const body = ball(0.55, 0x5ec24d, 0, 0.45, 0); body.scale.set(1.15, 0.85, 1);
    g.add(body);
    g.add(ball(0.16, 0xffffff, -0.22, 0.92, 0.1));
    g.add(ball(0.16, 0xffffff, 0.22, 0.92, 0.1));
    g.add(ball(0.08, 0x14202e, -0.22, 0.94, 0.22));
    g.add(ball(0.08, 0x14202e, 0.22, 0.94, 0.22));
    g.add(box(0.5, 0.06, 0.06, 0x2f7a3a, 0, 0.32, 0.5));
    P.head = g;
  } else if (id === "mouse") {
    g.add(ball(0.42, 0x9aa2b5, 0, 0.42, 0));
    g.add(ball(0.2, 0xb9c0d4, -0.28, 0.78, 0));
    g.add(ball(0.2, 0xb9c0d4, 0.28, 0.78, 0));
    g.add(ball(0.07, 0xff8fa3, 0, 0.42, 0.4));
    g.add(ball(0.05, 0x14202e, -0.15, 0.52, 0.35));
    g.add(ball(0.05, 0x14202e, 0.15, 0.52, 0.35));
    const tail = box(0.06, 0.06, 0.6, 0xe59aa8, 0, 0.3, -0.55);
    tail.rotation.x = 0.4; g.add(tail);
    P.head = g;
  } else if (id === "fox") {
    g.add(box(0.5, 0.55, 0.45, 0xe8762d, 0, 0.55, 0));
    g.add(box(0.42, 0.4, 0.4, 0xe8762d, 0, 1.02, 0));
    g.add(cone(0.12, 0.3, 0xe8762d, -0.16, 1.36, 0, 4));
    g.add(cone(0.12, 0.3, 0xe8762d, 0.16, 1.36, 0, 4));
    g.add(box(0.24, 0.18, 0.2, 0xfff1dd, 0, 0.92, 0.24));
    g.add(ball(0.05, 0x14202e, -0.11, 1.08, 0.21));
    g.add(ball(0.05, 0x14202e, 0.11, 1.08, 0.21));
    const tail = ball(0.2, 0xe8762d, 0, 0.55, -0.42);
    tail.scale.set(0.8, 0.8, 1.6);
    g.add(tail);
    g.add(box(0.2, 0.16, 0.12, 0xfff1dd, 0, 0.55, -0.78));
    P.head = g;
  } else if (id === "owl") {
    g.add(ball(0.45, 0x8a5a33, 0, 0.62, 0));
    g.add(ball(0.16, 0xffffff, -0.17, 0.78, 0.36));
    g.add(ball(0.16, 0xffffff, 0.17, 0.78, 0.36));
    g.add(ball(0.07, 0x14202e, -0.17, 0.78, 0.48));
    g.add(ball(0.07, 0x14202e, 0.17, 0.78, 0.48));
    g.add(cone(0.07, 0.16, 0xffb03a, 0, 0.62, 0.46, 4));
    const w1 = box(0.14, 0.55, 0.3, 0x6d4426, -0.5, 0.6, 0);
    const w2 = box(0.14, 0.55, 0.3, 0x6d4426, 0.5, 0.6, 0);
    g.add(w1, w2); P.wingL = w1; P.wingR = w2;
    P.head = g;
  } else if (id === "dra") {
    g.add(box(0.6, 0.55, 0.5, 0x4fae5c, 0, 0.5, 0));
    g.add(box(0.5, 0.45, 0.45, 0x4fae5c, 0, 1.0, 0.05));
    g.add(ball(0.07, 0x14202e, -0.13, 1.08, 0.3));
    g.add(ball(0.07, 0x14202e, 0.13, 1.08, 0.3));
    g.add(cone(0.09, 0.28, 0xffd166, -0.16, 1.36, 0, 4));
    g.add(cone(0.09, 0.28, 0xffd166, 0.16, 1.36, 0, 4));
    g.add(cone(0.07, 0xffffff, 0, 0.86, 0.3, 4));
    const w1 = box(0.08, 0.5, 0.6, 0x3a8a46, -0.5, 0.75, -0.15);
    const w2 = box(0.08, 0.5, 0.6, 0x3a8a46, 0.5, 0.75, -0.15);
    w1.rotation.z = 0.5; w2.rotation.z = -0.5;
    g.add(w1, w2);
    const tail = box(0.14, 0.14, 0.7, 0x4fae5c, 0, 0.4, -0.55);
    g.add(tail);
    P.head = g;
  } else { /* robot */
    g.add(box(0.62, 0.6, 0.45, 0x9aa7bd, 0, 0.55, 0));
    g.add(box(0.5, 0.42, 0.42, 0xb7c3d4, 0, 1.05, 0));
    g.add(ball(0.08, 0x35e0ff, -0.12, 1.08, 0.23));
    g.add(ball(0.08, 0x35e0ff, 0.12, 1.08, 0.23));
    g.add(box(0.2, 0.05, 0.05, 0x35e0ff, 0, 0.95, 0.22));
    g.add(box(0.04, 0.3, 0.04, 0x6d7a8f, 0, 1.4, 0));
    g.add(ball(0.06, 0xff5f6d, 0, 1.58, 0));
    const a1 = box(0.14, 0.5, 0.14, 0x7d8ba0, -0.44, 0.62, 0);
    const a2 = box(0.14, 0.5, 0.14, 0x7d8ba0, 0.44, 0.62, 0);
    g.add(a1, a2); P.armL = a1; P.armR = a2;
    P.head = g;
  }
  g.userData.parts = P;
  return g;
}

/* ================= акторы ================= */
const HERO_X = -1.15, MON_X = 1.15;
let hero = buildHero("warrior");
hero.position.set(HERO_X, 1, 0);
hero.rotation.y = 0.5;
world.add(hero);

const MONSTERS = ["frog", "mouse", "fox", "owl", "dra", "robot"];
const MON_NAMES = { frog: "Квакошмяк", mouse: "Грызун", fox: "Лис-Хитрозвёзд", owl: "Сова-Мудрица", dra: "Дракончик-Книгоед", robot: "Робот-Зубрилка" };
let monIdx = 0, monster = buildMonster(MONSTERS[0]);
monster.position.set(MON_X, 1, 0);
monster.rotation.y = -0.5;
world.add(monster);

/* кубик d20 */
const dice = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.32),
  new THREE.MeshLambertMaterial({ color: 0xffcf4a, flatShading: true })
);
dice.add(new THREE.LineSegments(
  new THREE.EdgesGeometry(dice.geometry),
  new THREE.LineBasicMaterial({ color: 0x2b1d00 })
));
dice.castShadow = true;
dice.visible = false;
scene.add(dice);

/* ================= звук ================= */
let AC = null;
function beep(f, d, type) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    g.gain.value = 0.07;
    o.connect(g); g.connect(AC.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
    o.stop(AC.currentTime + d);
  } catch (e) {}
}
const snd = {
  ok() { beep(660, 0.15); setTimeout(() => beep(880, 0.2), 120); },
  bad() { beep(180, 0.3, "sawtooth"); },
  tick() { beep(500, 0.04, "square"); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25), i * 130)); }
};

/* ================= состояние боя ================= */
const CLS_LIST = [
  { id: "warrior", n: "🛡️ Воин" },
  { id: "mage", n: "🔮 Маг" },
  { id: "rogue", n: "🗡️ Плут" },
  { id: "vampire", n: "🧛 Вампир" }
];
let monHp = 5, monMax = 5, busy = false;
const $ = (id) => document.getElementById(id);

function drawHp() {
  let s = "";
  for (let i = 0; i < monMax; i++) s += i < monHp ? "❤️‍🔥" : "▫️";
  $("hp").textContent = MON_NAMES[MONSTERS[monIdx]] + "  " + s;
}

function setMonster(i) {
  monIdx = (i + MONSTERS.length) % MONSTERS.length;
  world.remove(monster);
  monster = buildMonster(MONSTERS[monIdx]);
  monster.position.set(MON_X, 1, 0);
  monster.rotation.y = -0.5;
  world.add(monster);
  monMax = monHp = 5;
  drawHp();
  $("msg").textContent = "Появился монстр: " + MON_NAMES[MONSTERS[monIdx]] + "!";
}

function setHero(kind) {
  const p = hero.position.clone(), r = hero.rotation.y;
  world.remove(hero);
  hero = buildHero(kind);
  hero.position.copy(p);
  hero.rotation.y = r;
  world.add(hero);
}

/* анимация броска */
let anim = null; /* {t, dur} */
function rollDice() {
  if (busy) return;
  busy = true;
  $("roll").disabled = true;
  const r = 1 + Math.floor(Math.random() * 20);
  anim = { t: 0, dur: 1.35, r };
  dice.visible = true;
  dice.position.set(HERO_X, 1.9, 0.4);
}

function resolveRoll(r) {
  const crit = r === 20;
  const strong = r >= 15;
  const dmg = crit ? 99 : (strong ? 2 : 1);
  $("dice").textContent = "🎲 " + r + (crit ? " — КРИТ!" : "");
  if (r <= 5) {
    snd.bad();
    $("msg").textContent = "Мимо! Монстр дразнится 😜 (бросок " + r + ")";
  } else {
    snd.ok();
    monHp = Math.max(0, monHp - dmg);
    drawHp();
    monster.userData.shake = 0.5;
    $("msg").textContent = crit
      ? "КРИТИЧЕСКИЙ УДАР! Монстр повержен! 🎉"
      : (strong ? "Сильный удар! −2 ❤️‍🔥" : "Попадание! −1 ❤️‍🔥");
    if (monHp <= 0) {
      snd.win();
      monster.userData.dead = true;
      $("msg").textContent = "Победа! " + MON_NAMES[MONSTERS[monIdx]] + " отдаёт страницу Книги! 📖";
      setTimeout(() => { setMonster(monIdx + 1); }, 2200);
    }
  }
  setTimeout(() => { busy = false; $("roll").disabled = false; dice.visible = false; $("dice").textContent = ""; }, 1500);
}

/* ================= камера: перетаскивание ================= */
let az = 0, pol = 1.1, azT = 0, polT = 1.1, dragging = false, px = 0, py = 0, lastTouch = 0;
function camUpdate() {
  az += (azT - az) * 0.08;
  pol += (polT - pol) * 0.08;
  /* на узком экране (телефон вертикально) подходим ближе, иначе герои прячутся за панелью */
  const aspect = window.innerWidth / window.innerHeight;
  const R = aspect < 0.75 ? 6.0 : (aspect < 1.1 ? 6.4 : 7.5);
  camera.position.set(
    Math.sin(az) * Math.sin(pol) * R,
    1 + Math.cos(pol) * R,
    Math.cos(az) * Math.sin(pol) * R
  );
  camera.lookAt(0, aspect < 0.75 ? 0.2 : 1.9, 0);
}
canvas.addEventListener("pointerdown", (e) => { dragging = true; px = e.clientX; py = e.clientY; lastTouch = Date.now(); });
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  azT += (e.clientX - px) * 0.008;
  polT = Math.min(1.35, Math.max(0.55, polT + (e.clientY - py) * 0.006));
  px = e.clientX; py = e.clientY;
  lastTouch = Date.now();
});
window.addEventListener("pointerup", () => { dragging = false; });

/* ================= интерфейс ================= */
CLS_LIST.forEach((c) => {
  const b = document.createElement("button");
  b.textContent = c.n;
  if (c.id === "warrior") b.classList.add("on");
  b.onclick = () => {
    setHero(c.id);
    [...$("classes").children].forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    snd.tick();
  };
  $("classes").appendChild(b);
});
$("mprev").onclick = () => setMonster(monIdx - 1);
$("mnext").onclick = () => setMonster(monIdx + 1);
$("roll").onclick = () => { snd.tick(); rollDice(); };
drawHp();

/* ================= размер и цикл ================= */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  /* в портрете поле зрения шире — иначе герой и монстр не помещаются по краям */
  camera.fov = camera.aspect < 0.75 ? 64 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
let running = true;
document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) clock.getDelta(); });

function idle(t, dt) {
  const hp = hero.userData.parts, mp = monster.userData.parts;
  /* герой: лёгкое покачивание и выпад */
  const moving = anim && anim.t < 0.55;
  if (moving) {
    const k = anim.t / 0.55;
    hero.position.x = HERO_X + Math.sin(k * Math.PI) * 1.1;
    hp.armR.rotation.x = -Math.sin(k * Math.PI) * 2.2;
    hp.armL.rotation.x = Math.sin(k * Math.PI) * 0.6;
    hero.position.y = 1 + Math.abs(Math.sin(k * Math.PI * 2)) * 0.1;
  } else {
    hero.position.x = HERO_X;
    hero.position.y = 1 + Math.sin(t * 2.2) * 0.03;
    hp.armR.rotation.x *= 0.85;
    hp.armL.rotation.x *= 0.85;
    hp.legL.rotation.x = Math.sin(t * 2.2) * 0.08;
    hp.legR.rotation.x = -Math.sin(t * 2.2) * 0.08;
  }
  if (hp.cape) hp.cape.rotation.y = Math.sin(t * 1.8) * 0.06;
  /* монстр: дыхание, полёт совы, тряска при ударе, падение при поражении */
  const m = monster;
  if (m.userData.shake > 0) {
    m.userData.shake -= dt;
    m.position.x = MON_X + Math.sin(m.userData.shake * 60) * 0.12;
    m.rotation.z = Math.sin(m.userData.shake * 60) * 0.08;
  } else if (!m.userData.dead) {
    m.position.x = MON_X;
    m.rotation.z = 0;
    if (mp.id === "owl") m.position.y = 1 + Math.sin(t * 3) * 0.15;
    else m.position.y = 1 + Math.sin(t * 2.5 + 1) * 0.04;
    const s = 1 + Math.sin(t * 2.5) * 0.02;
    m.scale.set(s, 1 / s * (m.scale.y < 0.9 ? m.scale.y : 1), s);
  }
  if (m.userData.dead) {
    m.rotation.z = Math.max(-Math.PI / 2, m.rotation.z - dt * 4);
    m.position.y = Math.max(0.6, m.position.y - dt * 0.6);
    const s = Math.max(0.01, m.scale.x - dt * 0.8);
    m.scale.set(s, s, s);
  }
  if (mp.wingL) { mp.wingL.rotation.z = Math.sin(t * 6) * 0.3; mp.wingR.rotation.z = -Math.sin(t * 6) * 0.3; }
  /* кубик */
  if (anim) {
    anim.t += dt;
    if (anim.t < anim.dur) {
      dice.rotation.x += dt * 14;
      dice.rotation.y += dt * 11;
      if (anim.t < 0.9) {
        dice.position.y = 1.9 + Math.sin(Math.min(1, anim.t / 0.9) * Math.PI) * 1.1;
        dice.position.x = HERO_X + (anim.t / 0.9) * (MON_X - HERO_X) * 0.8;
        if (Math.floor(anim.t * 12) !== Math.floor((anim.t - dt) * 12)) snd.tick();
      }
    } else {
      const a = anim; anim = null;
      resolveRoll(a.r);
    }
  }
  /* облака и лёгкий поворот камеры, когда не трогают */
  clouds.forEach((c) => {
    c.position.x += c.userData.v * dt;
    if (c.position.x > 12) c.position.x = -12;
  });
  if (!dragging && Date.now() - lastTouch > 4000) azT += dt * 0.06;
  camUpdate();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(() => {
  if (!running) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  idle(clock.elapsedTime, dt);
});
