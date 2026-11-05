// Склеивает src/ в index.html. Собранный index.html руками не править.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(root, "src", f), "utf8");

const out =
  read("head.html") +
  "<script>\n" +
  read("data.js") +
  read("cloud.js") +
  read("engine.js") +
  read("tail.html");

fs.writeFileSync(path.join(root, "index.html"), out);
console.log("index.html собран, " + out.length + " байт");
