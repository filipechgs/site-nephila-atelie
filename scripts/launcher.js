"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const readline = require("node:readline");

if (process.platform === "win32") {
  spawnSync("cmd.exe", ["/d", "/s", "/c", "chcp 65001>nul"], {
    stdio: "ignore",
    windowsHide: true
  });
  process.title = "Nephila — atualizar as peças";
}

function explainAndWait(lines) {
  console.log("");
  lines.forEach((line) => console.log(line));
  console.log("");
  if (!process.stdin.isTTY) process.exit(1);
  console.log("Aperte Enter para fechar esta janela.");
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  input.question("", () => process.exit(1));
}

const root = __dirname;
process.chdir(root);
process.env.NEPHILA_LAUNCHER = "1";

const projectReady = fs.existsSync(path.join(root, "package.json"))
  && fs.existsSync(path.join(root, "server", "index.js"))
  && fs.existsSync(path.join(root, "node_modules", "express"));

if (!projectReady) {
  explainAndWait([
    "Não consegui abrir o painel.",
    "",
    "O programa atualizacao-nephila.exe precisa",
    "ficar dentro da pasta do site, junto com",
    "as pastas admin, produtos e node_modules.",
    "",
    "Não mova esse arquivo para a Área de Trabalho.",
    "Um atalho na Área de Trabalho pode."
  ]);
} else {
  try {
    const requireFromProject = createRequire(path.join(root, "package.json"));
    requireFromProject("./server/index.js");
  } catch (err) {
    explainAndWait([
      "Não consegui abrir o painel.",
      "Pode fechar esta janela e pedir ajuda em casa."
    ]);
  }
}
