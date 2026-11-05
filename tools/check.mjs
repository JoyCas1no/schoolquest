// Проверка: сборка, синтаксис, данные, математика, адаптивность, случайные прохождения боёв.
// Запуск: node tools/check.mjs [число_прохождений]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runs = +process.argv[2] || 200;
let bad = 0;
const fail = (m) => { bad++; console.log("ОШИБКА:", m); };

execFileSync(process.execPath, [path.join(root, "tools", "build.mjs")], { stdio: "inherit" });
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

const el = () => ({ innerHTML: "", style: {}, classList: { add() {}, remove() {} }, onclick: null, dataset: {}, insertAdjacentHTML() {}, textContent: "", disabled: false });
const store = {};
const ctx = {
  console, Date, Math, JSON,
  setInterval: () => 0, clearInterval() {}, setTimeout: () => 0,
  localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] },
  confirm: () => true,
  document: { getElementById: () => el(), querySelectorAll: () => [], querySelector: () => el(), createElement: () => el(), body: { appendChild() {} } },
  window: { scrollTo() {} },
};
ctx.window.document = ctx.document;
vm.createContext(ctx);
try {
  vm.runInContext(js + "\n;globalThis.T={Cloud,normalize,save,setGrade,maxLevel,startLevel,load,getS:function(){return S},CLS,sayc,cleanName,BANK,genMath,SUBJ,MON,newState,recordAnswer,getQuestion,startLevel,leaderboard,setS:function(s){S=s}};", ctx);
} catch (e) { fail("скрипт не запускается: " + e.message); process.exit(1); }
const T = ctx.T;

// банки вопросов
for (const id in T.BANK) {
  T.BANK[id].forEach((lv, li) => {
    if (lv.length < 6) fail(`мало вопросов: ${id} ур.${li + 1}`);
    const seen = new Set();
    lv.forEach((q) => {
      const all = [q[1], ...q[2]];
      if (q[2].length !== 3 || new Set(all).size !== 4) fail("варианты: " + q[0]);
      if (seen.has(q[0])) fail("дубль вопроса: " + q[0]);
      seen.add(q[0]);
    });
  });
}

// математика
for (let l = 1; l <= 3; l++) {
  for (let i = 0; i < 3000; i++) {
    const q = T.genMath(l);
    if (new Set(q.o).size !== 4 || q.a < 0 || q.a > 3) { fail("математика, варианты: " + JSON.stringify(q)); break; }
    const m = q.q.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);
    if (m) {
      const a = +m[1], b = +m[3];
      const r = { "+": a + b, "−": a - b, "×": a * b, "÷": a / b }[m[2]];
      if (String(r) !== q.o[q.a]) { fail("математика, ответ: " + q.q); break; }
    }
    const p = q.q.match(/^(\d+)% от (\d+) = \?/);
    if (p && String((+p[2] * +p[1]) / 100) !== q.o[q.a]) { fail("проценты: " + q.q); break; }
    const x = q.q.match(/^x \+ (\d+) = (\d+)\./);
    if (x && String(+x[2] - +x[1]) !== q.o[q.a]) { fail("уравнение: " + q.q); break; }
  }
}

// адаптивность и случайные прохождения
for (let r = 0; r < runs; r++) {
  const S = T.newState();
  T.setS(S);
  const sj = T.SUBJ[r % T.SUBJ.length].id;
  const used = [];
  const p = 0.3 + Math.random() * 0.7;
  for (let i = 0; i < 40; i++) {
    const q = T.getQuestion(sj, used);
    if (!q || q.a < 0 || q.o.length !== 4) { fail("вопрос сломан в " + sj); break; }
    T.recordAnswer(sj, Math.random() < p);
    const l = S.subj[sj].lvl;
    if (l < 1 || l > T.maxLevel(S.grade)) { fail("уровень вне 1..потолок: " + l); break; }
  }
}
if (T.leaderboard.length === undefined) fail("рейтинг");

// потолок уровня по классу: до 6 класса материал уровня 3 (проценты и т.п.) не выдаём
for (let g = 1; g <= 11; g++) {
  const S3 = T.newState(); S3.grade = g; T.setS(S3);
  const cap = T.maxLevel(g), st = T.startLevel(g);
  if (st > cap || st < 1) fail(`старт ${st} вне потолка ${cap} для ${g} класса`);
  if ((g <= 5 && cap > 2) || (g <= 2 && cap > 1) || (g >= 6 && cap !== 3)) fail("потолок по классам: " + g);
  for (let i = 0; i < 60; i++) T.recordAnswer("math", true);
  if (S3.subj.math.lvl > cap) fail(`серия верных подняла уровень выше потолка: класс ${g}`);
}
{ // старое сохранение дочери: 4 класс, уровень 3 → подрезается до 2
  const old = T.newState(); old.nick = { custom: "Мия" }; old.grade = 4;
  T.SUBJ.forEach((x) => (old.subj[x.id].lvl = 3));
  store["schoolquest_v1"] = JSON.stringify(old);
  T.load();
  const L = T.getS();
  if (!L || T.SUBJ.some((x) => L.subj[x.id].lvl !== 2)) fail("старое сохранение не подрезано до потолка");
  delete store["schoolquest_v1"];
}

{ // смена класса
  const S4 = T.newState(); S4.grade = 8; T.SUBJ.forEach((x) => (S4.subj[x.id].lvl = 3)); T.setS(S4);
  if (!T.setGrade("4") || S4.grade !== 4 || T.SUBJ.some((x) => S4.subj[x.id].lvl !== 2)) fail("смена класса 8→4 не подрезала уровни");
  if (T.setGrade("0") || T.setGrade("12") || T.setGrade("abc") || S4.grade !== 4) fail("setGrade принял неверный класс");
  if (!T.setGrade(7) || T.SUBJ.some((x) => S4.subj[x.id].lvl !== 2)) fail("смена класса 4→7 не должна поднимать уровни");
}

// логин, почта родителя, нормализация данных из облака, сохранение без сети
["abc", "dragon_mia7", "a_b_c_d_e_f_g_h_i_j"].forEach((u) => { if (!T.Cloud.nameOk(u)) fail("логин должен проходить: " + u); });
["ab", "Dragon", "дракон", "a b c", "x".repeat(21), "a@b", ""].forEach((u) => { if (T.Cloud.nameOk(u)) fail("логин не должен проходить: " + u); });
["mama@mail.ru", "a.b@c.org"].forEach((m) => { if (!T.Cloud.mailOk(m)) fail("почта должна проходить: " + m); });
["mama", "a@b", "@x.ru", "a b@c.ru"].forEach((m) => { if (T.Cloud.mailOk(m)) fail("почта не должна проходить: " + m); });
if (T.Cloud.online) fail("в тестовой среде не должно быть сессии");
{
  const bare = T.normalize({ nick: { custom: "Мия" }, grade: 4, subj: { math: { lvl: 3, recent: [], ok: 1, tot: 2 } } });
  if (bare.subj.rus.lvl !== 1 && bare.subj.rus.lvl !== 2) fail("normalize не достроил предметы");
  if (bare.subj.math.lvl !== 2) fail("normalize не подрезал уровень по классу");
  if (typeof bare.coll !== "object" || typeof bare.ts !== "number") fail("normalize не достроил поля");
  const S5 = T.newState(); S5.nick = { custom: "Тест" }; T.setS(S5);
  const before = S5.ts; T.save();
  if (!(S5.ts >= before) || !store["schoolquest_v1"] || JSON.parse(store["schoolquest_v1"]).nick.custom !== "Тест") fail("save не записал состояние");
  delete store["schoolquest_v1"];
}

// классы героев и их реплики
for (const [k, c] of Object.entries(T.CLS)) {
  if (!c.n || !c.ico || !c.d) fail("класс без названия/значка/описания: " + k);
  if (!(c.hearts >= 3) || !(c.hints >= 1) || typeof c.bonus !== "number") fail("числа класса: " + k);
  if (c.lines) for (const [lk, arr] of Object.entries(c.lines)) {
    if (!Array.isArray(arr) || !arr.length || arr.some((s) => typeof s !== "string" || !s)) fail(`реплики ${k}.${lk}`);
  }
}
for (const k of Object.keys(T.CLS)) {
  const S2 = T.newState(); S2.cls = k; T.setS(S2);
  for (let i = 0; i < 300; i++) for (const key of ["fight", "hit", "miss"]) {
    const s = T.sayc(key);
    if (typeof s !== "string" || !s) { fail("sayc пустой: " + k + "." + key); break; }
  }
}
if (!T.CLS.vampire) fail("нет класса vampire");

// своё имя
const okNames = ["Лиза", "Мия 2010", "Star-Girl", "  Аня   Ко  "];
const badNames = ["", "а", "😀😀", "<b>x</b>", "ОченьДлинноеИмяГероя", "a@b.ru"];
okNames.forEach((n) => { if (!T.cleanName(n)) fail("имя должно проходить: " + n); });
badNames.forEach((n) => { if (T.cleanName(n)) fail("имя не должно проходить: " + n); });
if (T.cleanName("  Аня   Ко  ") !== "Аня Ко") fail("пробелы в имени не сжаты");

console.log(bad ? "ПРОВЕРКА НЕ ПРОЙДЕНА: " + bad : "Проверка пройдена");
process.exit(bad ? 1 : 0);
