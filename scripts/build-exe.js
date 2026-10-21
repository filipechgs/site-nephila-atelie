"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WORK = path.join(__dirname, ".sea");
const EXE = path.join(ROOT, "atualizacao-nephila.exe");
const BLOB = path.join(WORK, "sea-prep.blob");
const CONFIG = path.join(WORK, "sea-config.json");
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  console.error("Para gerar o executável, use o Node 20 ou mais novo.");
  process.exit(1);
}

fs.mkdirSync(WORK, { recursive: true });
fs.writeFileSync(CONFIG, JSON.stringify({
  main: path.join(__dirname, "launcher.js"),
  output: BLOB,
  disableExperimentalSEAWarning: true
}, null, 2));

const prepared = spawnSync(process.execPath, ["--experimental-sea-config", CONFIG], {
  cwd: ROOT,
  stdio: "inherit"
});
if (prepared.status !== 0) process.exit(prepared.status || 1);

fs.copyFileSync(process.execPath, EXE);

const postjectPkg = require.resolve("postject/package.json");
const postjectMeta = require(postjectPkg);
const binRel = typeof postjectMeta.bin === "string" ? postjectMeta.bin : postjectMeta.bin.postject;
const bin = path.join(path.dirname(postjectPkg), binRel);
const injected = spawnSync(process.execPath, [
  bin,
  EXE,
  "NODE_SEA_BLOB",
  BLOB,
  "--sentinel-fuse",
  FUSE
], { cwd: ROOT, stdio: "inherit" });
if (injected.status !== 0) process.exit(injected.status || 1);

console.log("Executável pronto: " + EXE);
