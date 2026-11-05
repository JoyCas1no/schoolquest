// Ручной интеграционный тест облака (нужна сеть, создаёт тестовые аккаунты sqtest_*).
// Запуск: node tools/_cloudtest.mjs ; тестовых пользователей потом удалить (см. конец вывода).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src", "cloud.js"), "utf8");
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("ОШИБКА:", m); } else console.log("ok:", m); };

// "устройство" = отдельный контекст со своим localStorage
function device() {
  const store = {};
  const ctx = { console, Date, Math, JSON, fetch, setTimeout, clearTimeout, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] } };
  vm.createContext(ctx);
  vm.runInContext(src + "\n;globalThis.Cloud=Cloud;", ctx);
  return { Cloud: ctx.Cloud, store };
}

const stamp = Date.now().toString(36);
const userA = "sqtest_a" + stamp, userB = "sqtest_b" + stamp, pass = "test-pass-" + stamp;

const d1 = device();
await d1.Cloud.signUp(userA, pass, "parent@example.com");
ok(d1.Cloud.online && d1.Cloud.user === userA, "регистрация даёт сессию");

const save = { nick: { custom: "Тест" }, grade: 4, battles: 3, ts: Date.now(), coll: { frog: 2 } };
await d1.Cloud.push(save);
ok(true, "push выполнен");

const d2 = device();
await d2.Cloud.signIn(userA, pass);
const row = await d2.Cloud.pull();
ok(row && row.data && row.data.nick.custom === "Тест" && row.data.coll.frog === 2, "второе устройство получило сохранение");

let err = "";
{ const dx = device(); try { await dx.Cloud.signIn(userA, "wrong-password"); } catch (e) { err = dx.Cloud.human(e); } }
ok(/Неверный логин или пароль/.test(err), "неверный пароль отклонён: " + err);

err = "";
{ const dx = device(); try { await dx.Cloud.signUp(userA, pass, ""); } catch (e) { err = e.message; } }
ok(/занят/.test(err), "занятый логин отклонён: " + err);

// изоляция: второй пользователь не видит сохранение первого
const d3 = device();
await d3.Cloud.signUp(userB, pass, "");
const rowB = await d3.Cloud.pull();
ok(rowB === null, "пользователь B не видит сохранение A (RLS)");
await d3.Cloud.push({ nick: { custom: "Б" }, ts: 1 });
const rowA2 = await d2.Cloud.pull();
ok(rowA2.data.nick.custom === "Тест", "сохранение A не затронуто записью B");

// без входа данные недоступны
let anonStatus = null;
try { anonStatus = await fetch("https://glxvhzqcjktniwfoqcal.supabase.co/rest/v1/saves?select=data", { headers: { apikey: "x" } }).then((r) => r.status); } catch (e) {}
ok(anonStatus === 401 || anonStatus === 403, "без ключа сохранения недоступны (HTTP " + anonStatus + ")");

// слишком большое сохранение отвергается (ограничение 100 КБ)
let big = "";
try { await d1.Cloud.push({ junk: "x".repeat(150000) }); big = "принято"; } catch (e) { big = "отклонено"; }
ok(big === "отклонено", "сохранение больше 100 КБ отклонено");

console.log(bad ? "ТЕСТ НЕ ПРОЙДЕН: " + bad : "Облачный тест пройден");
console.log("Удалить тестовых пользователей (Supabase SQL Editor):\n  delete from auth.users where email like 'sqtest\\_%@schoolquest.game';");
process.exit(bad ? 1 : 0);
