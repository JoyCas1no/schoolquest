// Собирает 3D-прототип в один файл без CDN: three.js и src/proto3d.js -> proto3d.html.
// На GitHub Pages proto3d.html грузит three с CDN через import map, сборка не нужна.
// Запуск: node tools/proto.mjs (нужен npm install)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const res = await esbuild.build({
  entryPoints: [path.join(root, "src", "proto3d.js")],
  bundle: true,
  minify: true,
  format: "iife",
  write: false,
  logLevel: "silent"
});
const js = res.outputFiles[0].text;
const html = fs.readFileSync(path.join(root, "src", "proto.html"), "utf8");
if (!html.includes("<script type=\"module\"")) throw new Error("src/proto.html должен подключать модуль");
const out = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*<script type="module" src="\.\/src\/proto3d.js"><\/script>/,
  "<script>\n" + js + "\n</script>");
fs.writeFileSync(path.join(root, "proto3d.html"), out);
console.log("proto3d.html собран, " + out.length + " байт");
