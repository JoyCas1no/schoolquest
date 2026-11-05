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
function M(color, opt) { return new THREE.MeshLambertMaterial(Object.assign({ color }, opt || {})); }
function GLOW(color) { return new THREE.MeshBasicMaterial({ color }); }
function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function cone(r, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 10), M(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function ball(r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), M(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function cyl(rt, rb, h, color, x, y, z, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), M(color));
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  return m;
}
function grp(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x || 0, y || 0, z || 0);
  return g;
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
/* улыбка дуги (тор) для морд */
function smile(x, y, z, r, color) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 6, 14, Math.PI), M(color));
  m.position.set(x, y, z);
  m.rotation.x = Math.PI / 2 + 0.35;
  m.rotation.z = Math.PI;
  return m;
}

/* ================= мир ================= */
const world = new THREE.Group();
scene.add(world);

/* остров-платформа */
const island = ball(7.5, 0x58b368, 0, -1.4, 0);
island.scale.set(1, 0.32, 1);
island.receiveShadow = true;
world.add(island);
const ground = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), M(0x6fcb7a));
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.98;
ground.receiveShadow = true;
world.add(ground);
/* вытоптанная тропинка боя */
const path = new THREE.Mesh(new THREE.CircleGeometry(2.6, 30), M(0xc9a06a));
path.rotation.x = -Math.PI / 2;
path.position.y = 1.0;
path.receiveShadow = true;
world.add(path);

/* деревья с кроной из пучков */
function tree(x, z, s) {
  const t = grp(x, 0.98, z);
  t.add(cyl(0.16 * s, 0.24 * s, 1.2 * s, 0x8b5a2b, 0, 0.6 * s, 0));
  /* корни */
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4;
    const r = box(0.1 * s, 0.1 * s, 0.5 * s, 0x7a4c22, Math.sin(a) * 0.28 * s, 0.1 * s, Math.cos(a) * 0.28 * s);
    r.rotation.y = a;
    t.add(r);
  }
  t.add(ball(0.85 * s, 0x2f8f46, 0, 1.6 * s, 0));
  t.add(ball(0.6 * s, 0x3aa856, 0.55 * s, 1.35 * s, 0.15 * s));
  t.add(ball(0.62 * s, 0x3aa856, -0.5 * s, 1.4 * s, -0.1 * s));
  t.add(ball(0.5 * s, 0x45b964, 0.05 * s, 2.05 * s, -0.05 * s));
  /* яблоки */
  t.add(ball(0.09 * s, 0xe23b3b, 0.5 * s, 1.7 * s, 0.5 * s));
  t.add(ball(0.09 * s, 0xe23b3b, -0.6 * s, 1.5 * s, 0.4 * s));
  world.add(t);
}
tree(-6.0, -3.4, 1); tree(6.2, -3.0, 1.15); tree(-4.6, 4.8, 0.8); tree(5.0, 5.2, 0.9);

/* цветы со стеблями и лепестками */
function flower(x, z, color) {
  const f = grp(x, 0.98, z);
  f.add(cyl(0.02, 0.03, 0.3, 0x3f9e4d, 0, 0.15, 0, 6));
  f.add(ball(0.06, 0xffd166, 0, 0.32, 0));
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const p = ball(0.055, color, Math.cos(a) * 0.1, 0.32, Math.sin(a) * 0.1);
    p.scale.y = 0.5;
    f.add(p);
  }
  world.add(f);
}
flower(2.4, 2.2, 0xff6b9d); flower(-2.6, 1.8, 0xff8c42); flower(1.8, -2.4, 0xc77dff);
flower(-1.9, -2.2, 0xff6b9d); flower(3.4, 0.6, 0xffd166); flower(-3.5, -0.4, 0xff8c42);

/* грибы */
function shroom(x, z, s) {
  const m = grp(x, 0.98, z);
  m.add(cyl(0.09 * s, 0.12 * s, 0.3 * s, 0xfff1dd, 0, 0.15 * s, 0, 8));
  const cap = ball(0.22 * s, 0xe23b3b, 0, 0.34 * s, 0);
  cap.scale.y = 0.6;
  m.add(cap);
  m.add(ball(0.045 * s, 0xffffff, 0.1 * s, 0.4 * s, 0.08 * s));
  m.add(ball(0.04 * s, 0xffffff, -0.09 * s, 0.42 * s, -0.05 * s));
  m.add(ball(0.035 * s, 0xffffff, 0.02 * s, 0.44 * s, -0.1 * s));
  world.add(m);
}
shroom(-2.9, 2.9, 1); shroom(3.1, 2.6, 0.75); shroom(2.6, -3.1, 0.9);

/* камни */
function rock(x, z, s) {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * s, 0), M(0x9aa0ad));
  r.position.set(x, 1.1 * s, z);
  r.scale.y = 0.65;
  r.rotation.set(Math.random(), Math.random(), Math.random());
  r.castShadow = true;
  world.add(r);
}
rock(-3.4, 0.9, 1); rock(3.8, -1.2, 0.8); rock(0.5, 3.3, 0.7);

/* кусты */
function bush(x, z, s) {
  const b = grp(x, 0.98, z);
  b.add(ball(0.4 * s, 0x2f8f46, 0, 0.3 * s, 0));
  b.add(ball(0.3 * s, 0x3aa856, 0.3 * s, 0.25 * s, 0.1 * s));
  b.add(ball(0.28 * s, 0x3aa856, -0.28 * s, 0.22 * s, -0.05 * s));
  world.add(b);
}
bush(4.3, 1.6, 1); bush(-4.6, -1.4, 0.9);

/* облака */
const clouds = [];
for (let i = 0; i < 5; i++) {
  const cl = grp(-8 + i * 4.2, 5 + Math.random() * 2, -6 - Math.random() * 3);
  cl.add(ball(0.9, 0xffffff, 0, 0, 0));
  cl.add(ball(0.6, 0xffffff, 0.9, 0.1, 0.1));
  cl.add(ball(0.65, 0xffffff, -0.85, 0.05, -0.1));
  cl.userData.v = 0.15 + Math.random() * 0.2;
  clouds.push(cl); world.add(cl);
}

/* ================= герой (база + детали) ================= */
function buildHero(kind) {
  const g = new THREE.Group();
  const skin = 0xffd9a0;
  const P = {};
  const shirt = { warrior: 0x4a7de2, mage: 0x8b5fd6, rogue: 0x3f9e5a, vampire: 0x2b2440 }[kind];
  const pants = { warrior: 0x3b4a8f, mage: 0x4a3a80, rogue: 0x2c4a33, vampire: 0x1a1526 }[kind];

  /* ноги + сапоги */
  P.legL = grp(-0.14, 0.42, 0);
  P.legL.add(box(0.22, 0.42, 0.24, pants, 0, -0.21, 0));
  P.legL.add(box(0.24, 0.14, 0.34, 0x4a3220, 0, -0.36, 0.05));
  P.legR = grp(0.14, 0.42, 0);
  P.legR.add(box(0.22, 0.42, 0.24, pants, 0, -0.21, 0));
  P.legR.add(box(0.24, 0.14, 0.34, 0x4a3220, 0, -0.36, 0.05));

  /* торс + пояс */
  P.body = box(0.62, 0.62, 0.34, shirt, 0, 0.73, 0);
  P.body.add(box(0.64, 0.09, 0.36, 0x4a3220, 0, -0.24, 0));
  P.body.add(box(0.12, 0.11, 0.03, 0xffd166, 0, -0.24, 0.185));
  /* воротник */
  P.body.add(box(0.5, 0.08, 0.36, 0xd8d2ee, 0, 0.3, 0));

  /* руки: точка вращения — плечо */
  function arm(x) {
    const a = new THREE.Group();
    a.position.set(x, 1.0, 0);
    a.add(box(0.18, 0.5, 0.2, shirt, 0, -0.22, 0));
    a.add(ball(0.11, kind === "vampire" ? 0xd8d2ee : 0x4a3220, 0, -0.5, 0));
    return a;
  }
  P.armL = arm(-0.41); P.armR = arm(0.41);

  /* голова */
  P.head = grp(0, 1.36, 0);
  P.head.add(box(0.52, 0.5, 0.5, skin, 0, 0, 0));
  P.head.add(face("normal"));
  /* уши */
  P.head.add(box(0.06, 0.12, 0.1, skin, -0.28, 0, 0));
  P.head.add(box(0.06, 0.12, 0.1, skin, 0.28, 0, 0));

  /* волосы/шапка по классу */
  if (kind === "warrior") {
    /* шлем с гребнем */
    const helm = ball(0.3, 0x9aa7bd, 0, 0.18, 0);
    helm.scale.y = 0.75;
    P.head.add(helm);
    P.head.add(box(0.58, 0.1, 0.54, 0x8d99ae, 0, 0.12, 0));
    /* красный гребень */
    for (let i = 0; i < 4; i++) {
      P.head.add(box(0.05, 0.14, 0.12, 0xd33f3f, 0, 0.42 + Math.sin(i / 3 * Math.PI) * 0.08, 0.18 - i * 0.12));
    }
    /* наплечники */
    const s1 = ball(0.16, 0x9aa7bd, -0.41, 1.06, 0); s1.scale.y = 0.6;
    const s2 = ball(0.16, 0x9aa7bd, 0.41, 1.06, 0); s2.scale.y = 0.6;
    g.add(s1, s2);
    /* меч: клинок, гарда, навершие */
    const sw = grp(0, -0.5, 0);
    sw.add(box(0.07, 0.55, 0.03, 0xd7dde8, 0, -0.36, 0));
    sw.add(box(0.02, 0.5, 0.035, 0xffffff, 0, -0.38, 0));
    sw.add(box(0.22, 0.06, 0.06, 0x8a5a33, 0, -0.06, 0));
    sw.add(ball(0.05, 0xffd166, 0, 0.03, 0));
    P.armR.add(sw);
    /* щит: диск с боком и оковкой */
    const sh = grp(0, -0.28, 0.14);
    const disk = cyl(0.26, 0.26, 0.07, 0x7a8699, 0, 0, 0, 18);
    disk.rotation.z = Math.PI / 2;
    sh.add(disk);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20), M(0xffd166));
    rim.rotation.y = Math.PI / 2;
    sh.add(rim);
    const boss = ball(0.07, 0xd7dde8, 0, 0, 0);
    sh.add(boss);
    P.armL.add(sh);
  } else if (kind === "mage") {
    /* мантия-юбка */
    const robe = cyl(0.3, 0.44, 0.5, 0x7a4fd0, 0, 0.36, 0, 12);
    g.add(robe);
    /* колпак с полями, лентой и звёздами */
    P.head.add(cyl(0.36, 0.4, 0.05, 0x5b3fb0, 0, 0.22, 0, 14));
    P.head.add(cone(0.3, 0.58, 0x5b3fb0, 0, 0.53, 0, 12));
    P.head.add(cyl(0.31, 0.31, 0.07, 0xffd166, 0, 0.3, 0, 14));
    P.head.add(ball(0.05, 0xffd166, 0, 0.85, 0));
    P.head.add(ball(0.025, 0xffe9a0, 0.16, 0.5, 0.2));
    P.head.add(ball(0.02, 0xffe9a0, -0.2, 0.4, 0.14));
    /* посох: древко, шар, кольца */
    const st = grp(0, -0.5, 0);
    st.add(cyl(0.03, 0.04, 0.95, 0x8a5a33, 0, -0.32, 0, 8));
    const orb = ball(0.11, 0x7dd8ff, 0, 0.18, 0);
    orb.material = GLOW(0x9fe6ff);
    st.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 18), M(0xffd166));
    ring.position.y = 0.18;
    ring.rotation.x = Math.PI / 2;
    st.add(ring);
    const ring2 = ring.clone(); ring2.rotation.set(0.8, 0, 0);
    st.add(ring2);
    P.armR.add(st);
  } else if (kind === "rogue") {
    /* капюшон */
    P.head.add(cone(0.34, 0.42, 0x2f7a45, 0, 0.32, -0.03, 10));
    P.head.add(box(0.56, 0.1, 0.52, 0x2f7a45, 0, 0.16, 0));
    /* маска */
    P.head.add(box(0.54, 0.1, 0.04, 0x24491f, 0, 0.05, 0.26));
    /* плащ */
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.5, 0.85, 10, 1, true, Math.PI * 0.7, Math.PI * 1.6),
      M(0x2f7a45, { side: THREE.DoubleSide })
    );
    cape.position.set(0, 0.72, 0);
    g.add(cape);
    P.cape = cape;
    /* кинжалы с гардами */
    const d1 = grp(0, -0.5, 0);
    d1.add(box(0.05, 0.28, 0.03, 0xd7dde8, 0, -0.2, 0));
    d1.add(box(0.12, 0.04, 0.05, 0x8a5a33, 0, -0.05, 0));
    d1.add(ball(0.035, 0x4a3220, 0, 0, 0));
    P.armR.add(d1);
    const d2 = grp(0, -0.5, 0);
    d2.add(box(0.05, 0.28, 0.03, 0xd7dde8, 0, -0.2, 0));
    d2.add(box(0.12, 0.04, 0.05, 0x8a5a33, 0, -0.05, 0));
    d2.add(ball(0.035, 0x4a3220, 0, 0, 0));
    P.armL.add(d2);
  } else if (kind === "vampire") {
    /* причёска: зализанные пряди */
    P.head.add(box(0.56, 0.14, 0.54, 0x14101f, 0, 0.28, 0));
    P.head.add(box(0.1, 0.12, 0.06, 0x14101f, -0.2, 0.22, 0.26));
    P.head.add(box(0.12, 0.1, 0.06, 0x14101f, 0.05, 0.24, 0.26));
    P.head.add(box(0.08, 0.14, 0.06, 0x14101f, 0.24, 0.2, 0.26));
    /* высокий воротник */
    P.head.add(box(0.5, 0.14, 0.08, 0x8f1d3a, 0, -0.08, -0.26));
    /* плащ */
    const cape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.52, 0.85, 10, 1, true, Math.PI * 0.7, Math.PI * 1.6),
      M(0x8f1d3a, { side: THREE.DoubleSide })
    );
    cape.position.set(0, 0.72, 0);
    g.add(cape);
    P.cape = cape;
    /* клыки */
    P.head.add(cone(0.04, 0.13, 0xffffff, -0.14, -0.2, 0.22, 4));
    P.head.add(cone(0.04, 0.13, 0xffffff, 0.14, -0.2, 0.22, 4));
    /* медальон */
    P.body.add(ball(0.05, 0xffd166, 0, 0.05, 0.19));
    P.body.add(box(0.02, 0.14, 0.02, 0xffd166, 0, 0.16, 0.18));
  }
  g.add(P.legL, P.legR, P.body, P.armL, P.armR, P.head);
  g.userData.parts = P;
  return g;
}

/* ================= монстры с деталями ================= */
function eye(x, y, z, rWhite, rPupil, irisColor) {
  const e = grp(x, y, z);
  e.add(ball(rWhite, 0xffffff, 0, 0, 0));
  if (irisColor) e.add(ball(rWhite * 0.6, irisColor, 0, 0, rWhite * 0.55));
  e.add(ball(rPupil, 0x14202e, 0, 0, rWhite * 0.72));
  e.add(ball(rPupil * 0.4, 0xffffff, rPupil * 0.5, rPupil * 0.5, rWhite * 0.8));
  return e;
}

function buildMonster(id) {
  const g = new THREE.Group();
  const P = { id, baseY: 0 };

  if (id === "frog") {
    /* овальное тело, светлое брюхо */
    const body = ball(0.5, 0x5ec24d, 0, 0.52, 0);
    body.scale.set(1.05, 0.78, 1.15);
    g.add(body);
    const belly = ball(0.44, 0xc9f0a8, 0, 0.42, 0.14);
    belly.scale.set(0.92, 0.66, 0.8);
    g.add(belly);
    /* пятна на спине */
    g.add(ball(0.09, 0x4aa83e, 0.15, 0.78, -0.2));
    g.add(ball(0.06, 0x4aa83e, -0.2, 0.72, -0.1));
    g.add(ball(0.05, 0x4aa83e, 0.02, 0.82, 0.05));
    /* глазные бугры с веками */
    const eL = grp(-0.24, 0.9, 0.22), eR = grp(0.24, 0.9, 0.22);
    eL.add(ball(0.16, 0x5ec24d, 0, 0, 0));
    eR.add(ball(0.16, 0x5ec24d, 0, 0, 0));
    eL.add(eye(0, 0.03, 0.12, 0.11, 0.055, null));
    eR.add(eye(0, 0.03, 0.12, 0.11, 0.055, null));
    g.add(eL, eR);
    /* передние лапки с пальцами */
    [[-0.34, 1], [0.34, -1]].forEach(([x, side]) => {
      const a = grp(x, 0.42, 0.3);
      a.add(cyl(0.05, 0.06, 0.3, 0x5ec24d, 0, -0.12, 0.02, 8));
      a.rotation.z = side * 0.25;
      const hand = ball(0.08, 0x5ec24d, side * 0.03, -0.28, 0.06);
      a.add(hand);
      for (let i = 0; i < 3; i++) {
        const f = cone(0.028, 0.12, 0xc9f0a8, side * (-0.04 + i * 0.04), -0.3, 0.14, 5);
        f.rotation.x = Math.PI / 2 - 0.3;
        a.add(f);
      }
      g.add(a);
    });
    /* задние лапы: бедро, голень, длинная ступня с пальцами */
    [[-0.48, 1], [0.48, -1]].forEach(([x, side]) => {
      const thigh = ball(0.24, 0x54b845, x, 0.36, -0.05);
      thigh.scale.set(0.8, 0.9, 1.3);
      g.add(thigh);
      g.add(ball(0.16, 0x5ec24d, x + side * 0.06, 0.22, 0.28));
      const foot = box(0.22, 0.09, 0.42, 0x5ec24d, x + side * 0.08, 0.06, 0.5);
      g.add(foot);
      for (let i = 0; i < 3; i++) {
        const toe = cone(0.035, 0.16, 0xc9f0a8, x + side * (-0.06 + i * 0.06), 0.05, 0.75, 5);
        toe.rotation.x = Math.PI / 2 - 0.25;
        g.add(toe);
      }
    });
    /* улыбка и щёчки */
    g.add(smile(0, 0.5, 0.56, 0.2, 0x2f7a3a));
    g.add(ball(0.05, 0xff9eb5, -0.3, 0.52, 0.42));
    g.add(ball(0.05, 0xff9eb5, 0.3, 0.52, 0.42));
  }

  else if (id === "mouse") {
    /* тело, брюшко */
    const body = ball(0.42, 0x9aa2b5, 0, 0.5, 0);
    body.scale.set(0.95, 1.05, 1.15);
    g.add(body);
    const belly = ball(0.3, 0xd0d6e4, 0, 0.42, 0.2);
    belly.scale.set(0.85, 0.95, 0.6);
    g.add(belly);
    /* голова, мордочка, нос */
    g.add(ball(0.3, 0xaab2c4, 0, 0.95, 0.12));
    const snout = cone(0.11, 0.26, 0xb9c0d4, 0, 0.86, 0.4, 10);
    snout.rotation.x = -Math.PI / 2 - 0.15;
    g.add(snout);
    g.add(ball(0.055, 0xff8fa3, 0, 0.9, 0.53));
    /* уши: снаружи серая, внутри розовая */
    [[-0.24, 1], [0.24, -1]].forEach(([x, side]) => {
      const ear = grp(x, 1.2, 0.03);
      const outer = ball(0.17, 0x9aa2b5, 0, 0, 0);
      outer.scale.set(1, 1.15, 0.35);
      ear.add(outer);
      const inner = ball(0.11, 0xffb3c2, 0, 0, 0.04);
      inner.scale.set(1, 1.15, 0.3);
      ear.add(inner);
      ear.rotation.z = side * 0.18;
      g.add(ear);
    });
    /* глаза, усы, бровки */
    g.add(eye(-0.13, 1.0, 0.34, 0.09, 0.045, null));
    g.add(eye(0.13, 1.0, 0.34, 0.09, 0.045, null));
    g.add(box(0.1, 0.025, 0.02, 0x6d7688, -0.13, 1.12, 0.36));
    g.add(box(0.1, 0.025, 0.02, 0x6d7688, 0.13, 1.12, 0.36));
    [[-1], [1]].forEach(([side]) => {
      for (let i = 0; i < 3; i++) {
        const w = box(0.22, 0.008, 0.008, 0xe8ecf4, side * 0.22, 0.87 + i * 0.03, 0.42);
        w.rotation.z = side * (0.15 - i * 0.15);
        w.rotation.y = side * 0.4;
        g.add(w);
      }
    });
    /* лапки с пальчиками, ступни */
    [[-0.3, 1], [0.3, -1]].forEach(([x, side]) => {
      const a = grp(x, 0.55, 0.28);
      a.add(cyl(0.05, 0.06, 0.24, 0x9aa2b5, 0, -0.1, 0, 8));
      a.rotation.z = side * 0.3;
      g.add(a);
      g.add(ball(0.1, 0xffc2ce, x + side * 0.02, 0.08, 0.28));
    });
    /* хвост: изогнутая дуга */
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 16, Math.PI * 1.1), M(0xe59aa8));
    tail.position.set(0, 0.45, -0.45);
    tail.rotation.set(0.3, Math.PI / 2, 0);
    tail.castShadow = true;
    g.add(tail);
  }

  else if (id === "fox") {
    /* тело, белая грудка */
    const body = ball(0.42, 0xe8762d, 0, 0.62, 0);
    body.scale.set(0.75, 0.85, 1.1);
    g.add(body);
    const chest = ball(0.3, 0xfff1dd, 0, 0.55, 0.28);
    chest.scale.set(0.7, 0.95, 0.55);
    g.add(chest);
    /* голова, острая морда */
    g.add(ball(0.28, 0xe8762d, 0, 1.05, 0.1));
    const snout = cone(0.13, 0.32, 0xfff1dd, 0, 0.98, 0.4, 8);
    snout.rotation.x = -Math.PI / 2 - 0.1;
    g.add(snout);
    g.add(ball(0.055, 0x2b1d12, 0, 1.02, 0.56));
    /* уши с розовой сердцевиной */
    [[-0.16, 1], [0.16, -1]].forEach(([x, side]) => {
      const e = grp(x, 1.36, 0.05);
      e.add(cone(0.11, 0.3, 0xe8762d, 0, 0.12, 0, 6));
      e.add(cone(0.06, 0.18, 0xffc2ce, 0, 0.08, 0.03, 6));
      e.rotation.z = side * 0.15;
      g.add(e);
    });
    /* глаза с бликами, брови, щёчные пучки */
    g.add(eye(-0.11, 1.1, 0.33, 0.08, 0.04, null));
    g.add(eye(0.11, 1.1, 0.33, 0.08, 0.04, null));
    g.add(box(0.1, 0.025, 0.02, 0x7a3c10, -0.11, 1.22, 0.34));
    g.add(box(0.1, 0.025, 0.02, 0x7a3c10, 0.11, 1.22, 0.34));
    [[-1], [1]].forEach(([side]) => {
      const tuft = cone(0.06, 0.18, 0xfff1dd, side * 0.26, 1.0, 0.18, 5);
      tuft.rotation.z = side * 1.2;
      g.add(tuft);
    });
    /* четыре лапы с лапками */
    [[-0.18, 0.25], [0.18, 0.25], [-0.18, -0.25], [0.18, -0.25]].forEach(([x, z]) => {
      g.add(box(0.14, 0.4, 0.16, 0xd0691f, x, 0.28, z));
      g.add(box(0.16, 0.12, 0.2, 0xfff1dd, x, 0.07, z + 0.02));
    });
    /* пушистый хвост слоями */
    const tail = grp(0, 0.72, -0.55);
    const t1 = ball(0.2, 0xe8762d, 0, 0, -0.1); t1.scale.set(0.8, 0.8, 1.7);
    tail.add(t1);
    const t2 = ball(0.17, 0xf0893d, 0, 0.05, -0.35);
    tail.add(t2);
    const tip = ball(0.15, 0xfff1dd, 0, 0.08, -0.55);
    tail.add(tip);
    tail.rotation.x = -0.5;
    g.add(tail);
  }

  else if (id === "owl") {
    /* яйцевидное тело, светлое брюшко с «перьями» */
    const body = ball(0.45, 0x8a5a33, 0, 0.75, 0);
    body.scale.set(0.9, 1.15, 0.85);
    g.add(body);
    const belly = ball(0.36, 0xd8b98a, 0, 0.62, 0.26);
    belly.scale.set(0.85, 1.0, 0.55);
    g.add(belly);
    for (let i = 0; i < 3; i++) {
      g.add(ball(0.05, 0xb9925e, -0.1 + i * 0.1, 0.52 - (i % 2) * 0.08, 0.44));
    }
    /* перьевые пучки на голове */
    [[-0.17, 1], [0.17, -1]].forEach(([x, side]) => {
      const t = cone(0.07, 0.2, 0x6d4426, x, 1.3, 0.02, 5);
      t.rotation.z = side * 0.35;
      g.add(t);
    });
    /* большие глаза: жёлтая радужка, зрачок, блик, сердитые брови */
    g.add(eye(-0.16, 1.02, 0.33, 0.14, 0.06, 0xffb03a));
    g.add(eye(0.16, 1.02, 0.33, 0.14, 0.06, 0xffb03a));
    const b1 = box(0.14, 0.035, 0.03, 0x4a2c14, -0.16, 1.2, 0.36);
    b1.rotation.z = -0.3;
    const b2 = box(0.14, 0.035, 0.03, 0x4a2c14, 0.16, 1.2, 0.36);
    b2.rotation.z = 0.3;
    g.add(b1, b2);
    /* клюв */
    const beak = cone(0.08, 0.2, 0xff9f1c, 0, 0.86, 0.4, 4);
    beak.rotation.x = Math.PI - 0.5;
    g.add(beak);
    /* крылья из перьевых пластин */
    function wing(side) {
      const w = grp(side * 0.4, 0.8, 0);
      w.add(box(0.12, 0.5, 0.34, 0x6d4426, side * 0.05, -0.1, -0.02));
      w.add(box(0.1, 0.28, 0.28, 0x8a5a33, side * 0.07, -0.4, 0.02));
      for (let i = 0; i < 3; i++) {
        const f = box(0.07, 0.2, 0.08, 0x5a3a1e, side * 0.07, -0.56, -0.1 + i * 0.12);
        f.rotation.x = -0.15 + i * 0.12;
        w.add(f);
      }
      return w;
    }
    P.wingL = wing(-1); P.wingR = wing(1);
    g.add(P.wingL, P.wingR);
    /* лапы с когтями */
    [[-0.15], [0.15]].forEach(([x]) => {
      g.add(cone(0.06, 0.18, 0xffb03a, x, 0.12, 0.08, 6));
      for (let i = 0; i < 3; i++) {
        const c = cone(0.02, 0.08, 0x3a2a12, x - 0.05 + i * 0.05, 0.05, 0.16, 4);
        c.rotation.x = Math.PI / 2;
        g.add(c);
      }
    });
  }

  else if (id === "dra") {
    /* тело, жёлтые брюшные пластины */
    const body = ball(0.4, 0x4fae5c, 0, 0.72, 0);
    body.scale.set(0.95, 1.0, 1.25);
    g.add(body);
    for (let i = 0; i < 4; i++) {
      g.add(box(0.28 - i * 0.04, 0.09, 0.04, 0xffd166, 0, 0.6 - i * 0.14, 0.38 - i * 0.03));
    }
    /* голова, морда, ноздри, зубы */
    g.add(ball(0.28, 0x4fae5c, 0, 1.2, 0.2));
    g.add(box(0.26, 0.16, 0.26, 0x45a050, 0, 1.1, 0.42));
    g.add(ball(0.025, 0x1e3a24, -0.08, 1.16, 0.55));
    g.add(ball(0.025, 0x1e3a24, 0.08, 1.16, 0.55));
    g.add(cone(0.03, 0.09, 0xffffff, -0.09, 1.0, 0.52, 4));
    g.add(cone(0.03, 0.09, 0xffffff, 0.09, 1.0, 0.52, 4));
    /* глаза с бровями */
    g.add(eye(-0.13, 1.28, 0.36, 0.08, 0.04, null));
    g.add(eye(0.13, 1.28, 0.36, 0.08, 0.04, null));
    const b1 = box(0.14, 0.04, 0.04, 0xffd166, -0.13, 1.4, 0.37); b1.rotation.z = -0.25;
    const b2 = box(0.14, 0.04, 0.04, 0xffd166, 0.13, 1.4, 0.37); b2.rotation.z = 0.25;
    g.add(b1, b2);
    /* рога */
    [[-0.14], [0.14]].forEach(([x]) => {
      const h = cone(0.07, 0.3, 0xffd166, x, 1.5, 0.1, 6);
      h.rotation.x = -0.3;
      g.add(h);
    });
    /* шипы по спине */
    for (let i = 0; i < 4; i++) {
      g.add(cone(0.06, 0.16, 0x3a8a46, 0, 1.02 - i * 0.18, 0.05 - i * 0.2, 5));
    }
    /* крылья с перепонкой */
    function dwing(side) {
      const w = grp(side * 0.3, 1.0, -0.1);
      w.add(box(0.5, 0.06, 0.06, 0x3a8a46, side * 0.25, 0.1, 0));
      w.add(box(0.4, 0.05, 0.05, 0x3a8a46, side * 0.45, 0.22, -0.05));
      const mem = box(0.48, 0.32, 0.02, 0x2f7a3a, side * 0.28, 0.0, -0.1);
      mem.rotation.x = 1.25;
      mem.rotation.z = side * 0.15;
      w.add(mem);
      const mem2 = box(0.34, 0.24, 0.02, 0x2f7a3a, side * 0.48, 0.12, -0.12);
      mem2.rotation.x = 1.25;
      mem2.rotation.z = side * 0.15;
      w.add(mem2);
      w.rotation.z = side * 0.35;
      return w;
    }
    P.wingL = dwing(-1); P.wingR = dwing(1);
    g.add(P.wingL, P.wingR);
    /* хвост с лопаткой */
    const tail = grp(0, 0.6, -0.55);
    const t1s = cyl(0.09, 0.12, 0.4, 0x4fae5c, 0, 0, -0.15, 8);
    t1s.rotation.x = Math.PI / 2 + 0.15;
    tail.add(t1s);
    const t2 = cyl(0.06, 0.09, 0.35, 0x4fae5c, 0, 0.03, -0.45, 8);
    t2.rotation.x = Math.PI / 2 + 0.1;
    tail.add(t2);
    const spade = cone(0.1, 0.22, 0x3a8a46, 0, 0.08, -0.68, 5);
    spade.rotation.x = Math.PI / 2 + 0.1;
    spade.scale.x = 1.6;
    tail.add(spade);
    g.add(tail);
    /* лапы с когтями */
    [[-0.25, 1], [0.25, -1]].forEach(([x, side]) => {
      g.add(cyl(0.09, 0.11, 0.3, 0x4fae5c, x, 0.2, 0.05, 8));
      g.add(ball(0.11, 0x45a050, x, 0.07, 0.15));
      for (let i = 0; i < 3; i++) {
        const c = cone(0.025, 0.1, 0xffffff, x - 0.06 + i * 0.06, 0.05, 0.28, 4);
        c.rotation.x = Math.PI / 2 - 0.2;
        g.add(c);
      }
    });
  }

  else { /* robot */
    /* корпус с панелью, болтами и вентиляцией */
    g.add(box(0.56, 0.5, 0.36, 0x9aa7bd, 0, 0.85, 0));
    g.add(box(0.4, 0.3, 0.02, 0x7d8ba0, 0, 0.85, 0.19));
    [[-0.24, 1.06], [0.24, 1.06], [-0.24, 0.64], [0.24, 0.64]].forEach(([x, y]) => {
      const bolt = cyl(0.03, 0.03, 0.03, 0x5d6a7d, x, y, 0.19, 6);
      bolt.rotation.x = Math.PI / 2;
      g.add(bolt);
    });
    for (let i = 0; i < 3; i++) {
      g.add(box(0.16, 0.02, 0.02, 0x5d6a7d, 0, 0.75 + i * 0.06, 0.19));
    }
    const core = ball(0.06, 0x35e0ff, 0, 0.98, 0.2);
    core.material = GLOW(0x35e0ff);
    g.add(core);
    /* таз */
    g.add(box(0.4, 0.2, 0.3, 0x7d8ba0, 0, 0.52, 0));
    /* голова со светящимся экраном-лицом */
    g.add(box(0.44, 0.38, 0.4, 0xb7c3d4, 0, 1.32, 0));
    const scr = box(0.34, 0.24, 0.02, 0x10222e, 0, 1.32, 0.2);
    scr.material = GLOW(0x10222e);
    g.add(scr);
    /* пиксельные глаза на экране */
    const eL = box(0.06, 0.09, 0.01, 0x35e0ff, -0.09, 1.35, 0.215);
    eL.material = GLOW(0x35e0ff);
    const eR = box(0.06, 0.09, 0.01, 0x35e0ff, 0.09, 1.35, 0.215);
    eR.material = GLOW(0x35e0ff);
    const mouth = box(0.12, 0.03, 0.01, 0x35e0ff, 0, 1.25, 0.215);
    mouth.material = GLOW(0x35e0ff);
    g.add(eL, eR, mouth);
    /* антенна с лампочкой */
    g.add(cyl(0.02, 0.02, 0.22, 0x6d7a8f, 0, 1.6, 0, 6));
    const bulb = ball(0.055, 0xff5f6d, 0, 1.74, 0);
    bulb.material = GLOW(0xff5f6d);
    g.add(bulb);
    /* руки: сегменты и суставы */
    [[-1], [1]].forEach(([side]) => {
      const shoulder = grp(side * 0.36, 1.02, 0);
      shoulder.add(ball(0.11, 0x5d6a7d, 0, 0, 0));
      shoulder.add(box(0.12, 0.32, 0.14, 0x7d8ba0, 0, -0.2, 0));
      shoulder.add(ball(0.09, 0x5d6a7d, 0, -0.4, 0));
      const fore = box(0.1, 0.28, 0.12, 0x9aa7bd, 0, -0.56, 0);
      shoulder.add(fore);
      const claw1 = box(0.04, 0.12, 0.05, 0x5d6a7d, -0.04, -0.74, 0);
      const claw2 = box(0.04, 0.12, 0.05, 0x5d6a7d, 0.04, -0.74, 0);
      claw1.rotation.z = 0.15; claw2.rotation.z = -0.15;
      shoulder.add(claw1, claw2);
      if (side < 0) P.armL = shoulder; else P.armR = shoulder;
      g.add(shoulder);
    });
    /* ноги: сегменты и стопы с пальцами */
    [[-0.17], [0.17]].forEach(([x]) => {
      g.add(box(0.14, 0.3, 0.18, 0x7d8ba0, x, 0.32, 0));
      g.add(ball(0.08, 0x5d6a7d, x, 0.16, 0.05));
      g.add(box(0.18, 0.1, 0.28, 0x5d6a7d, x, 0.06, 0.05));
      for (let i = 0; i < 2; i++) {
        g.add(box(0.05, 0.06, 0.08, 0x9aa7bd, x - 0.04 + i * 0.08, 0.06, 0.22));
      }
    });
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
let anim = null; /* {t, dur, r} */
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
  const aspect = window.innerWidth / window.innerHeight;
  const R = aspect < 0.75 ? 6.8 : (aspect < 1.1 ? 6.6 : 7.5);
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
  camera.fov = camera.aspect < 0.75 ? 64 : 50;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
let running = true;
document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) clock.getDelta(); });

window.__dbg = () => JSON.stringify({
  cam: camera.position.toArray().map((v) => +v.toFixed(2)),
  fov: camera.fov,
  aspect: +camera.aspect.toFixed(2),
  az: +az.toFixed(2), pol: +pol.toFixed(2),
  w: window.innerWidth, h: window.innerHeight,
  heroX: +hero.position.x.toFixed(2),
  mon: MONSTERS[monIdx]
});

function idle(t, dt) {
  const hp = hero.userData.parts, mp = monster.userData.parts;
  /* герой: покачивание и выпад */
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
  /* монстр: дыхание, полёт совы, тряска, падение */
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
  }
  if (m.userData.dead) {
    m.rotation.z = Math.max(-Math.PI / 2, m.rotation.z - dt * 4);
    m.position.y = Math.max(0.6, m.position.y - dt * 0.6);
    const s = Math.max(0.01, m.scale.x - dt * 0.8);
    m.scale.set(s, s, s);
  }
  if (mp.wingL) {
    mp.wingL.rotation.z = Math.sin(t * 6) * 0.3;
    mp.wingR.rotation.z = -Math.sin(t * 6) * 0.3;
  }
  if (mp.armL) { mp.armL.rotation.x = Math.sin(t * 2.5) * 0.15; mp.armR.rotation.x = -Math.sin(t * 2.5) * 0.15; }
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
  /* облака и авторотация */
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
