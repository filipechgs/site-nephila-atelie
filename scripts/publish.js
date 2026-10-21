"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ALLOWED = ["produtos", "js/data.js", "site.json"];

class PublishError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function git(args, options) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: (options && options.timeout) || 20000,
    windowsHide: true,
    env: Object.assign({}, process.env, {
      GIT_TERMINAL_PROMPT: "0",
      GCM_INTERACTIVE: "Never"
    })
  });
  if (result.error) {
    const timedOut = result.error.code === "ETIMEDOUT";
    throw new PublishError(400, timedOut ? "O Git demorou demais." : "Não foi possível executar o Git.");
  }
  return result;
}

function gitText(stderr, stdout) {
  return String(stderr || stdout || "").replace(/\0/g, "").trim().slice(0, 500);
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
}

function isMilenaPhoto(file) {
  return /^img\/milena\.(jpe?g|png|webp)$/i.test(file);
}

function isAllowed(file) {
  const norm = normalizePath(file);
  return norm === "js/data.js" || norm === "site.json" || isMilenaPhoto(norm) || norm === "produtos" || norm.indexOf("produtos/") === 0;
}

function publishPaths() {
  const photos = ["img/milena.jpeg", "img/milena.jpg", "img/milena.png", "img/milena.webp"]
    .filter((rel) => fs.existsSync(path.join(ROOT, rel)));
  return ALLOWED.concat(photos);
}

function parseStatusZ(stdout) {
  const raw = String(stdout || "").split("\0");
  if (raw.length && raw[raw.length - 1] === "") raw.pop();
  const entries = [];
  for (let i = 0; i < raw.length; i++) {
    const record = raw[i];
    if (!record || record.length < 4) continue;
    const xy = record.slice(0, 2);
    let filePath = record.slice(3);
    let orig = "";
    if (xy.indexOf("R") !== -1 || xy.indexOf("C") !== -1) {
      orig = filePath;
      i += 1;
      filePath = raw[i] || "";
    }
    if (filePath) entries.push({ xy, path: normalizePath(filePath), orig: normalizePath(orig) });
  }
  return entries;
}

function humanize(slug) {
  return String(slug || "").split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function inSentence(label) {
  if (!label) return "";
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function titleFromText(text) {
  const line = String(text || "").split(/\r?\n/).find((item) => item.startsWith("# "));
  return line ? line.slice(2).trim() : "";
}

function titleFromFile(abs) {
  try {
    return titleFromText(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    return "";
  }
}

function titleFromGit(rel) {
  const result = git(["show", "HEAD:" + rel]);
  if (result.status !== 0) return "";
  return titleFromText(result.stdout);
}

function isNew(xy) {
  return xy[0] === "?" || xy[1] === "?" || xy[0] === "A" || xy[1] === "A";
}

function isDeleted(xy) {
  return (xy[0] === "D" || xy[1] === "D") && xy[0] !== "?" && xy[1] !== "?" && xy[0] !== "A" && xy[1] !== "A";
}

function fileKind(name) {
  if (!name) return "dir";
  if (name.endsWith(".md")) return "md";
  if (/\.(jpe?g|png|webp)$/i.test(name)) return "photo";
  return "other";
}

function productLabel(category, slug, names) {
  if (names && names.product && names.product[category + "/" + slug]) return names.product[category + "/" + slug];
  if (names) return humanize(slug);
  const rel = "produtos/" + category + "/" + slug + "/" + slug + ".md";
  return titleFromFile(path.join(ROOT, rel)) || titleFromGit(rel) || humanize(slug);
}

function categoryLabel(id, names) {
  if (names && names.category && names.category[id]) return names.category[id];
  if (names) return humanize(id);
  const rel = "produtos/" + id + "/_categoria.md";
  return titleFromFile(path.join(ROOT, rel)) || titleFromGit(rel) || humanize(id);
}

function linesFromEntries(entries, names) {
  const products = new Map();
  const categories = new Map();
  let siteJson = false;
  let milena = false;
  let dataJs = false;
  let order = false;

  function bucket(category, slug) {
    const key = category + "/" + slug;
    if (!products.has(key)) products.set(key, { category, slug, files: [] });
    return products.get(key);
  }

  function categoryBucket(id) {
    if (!categories.has(id)) categories.set(id, { id, flags: [] });
    return categories.get(id);
  }

  entries.forEach((entry) => {
    const file = normalizePath(entry.path);
    if (file === "site.json") {
      siteJson = true;
      return;
    }
    if (isMilenaPhoto(file)) {
      milena = true;
      return;
    }
    if (file === "js/data.js") {
      dataJs = true;
      return;
    }
    if (file === "produtos/_ordem.json") {
      order = true;
      return;
    }
    let match = file.match(/^produtos\/([^/]+)\/([^/]+)\/(.+)$/);
    if (match) {
      bucket(match[1], match[2]).files.push({ xy: entry.xy, name: match[3] });
      return;
    }
    match = file.match(/^produtos\/([^/]+)\/_categoria\.md$/);
    if (match) {
      categoryBucket(match[1]).flags.push(entry.xy);
      return;
    }
    match = file.match(/^produtos\/([^/]+)\/([^/]+)$/);
    if (match) {
      bucket(match[1], match[2]).files.push({ xy: entry.xy, name: "" });
      return;
    }
    match = file.match(/^produtos\/([^/]+)$/);
    if (match) categoryBucket(match[1]).flags.push(entry.xy);
  });

  const addedCategories = [];
  const updatedCategories = [];
  const removedCategories = [];
  categories.forEach((category) => {
    const allNew = category.flags.length && category.flags.every(isNew);
    const allDeleted = category.flags.length && category.flags.every(isDeleted);
    const label = categoryLabel(category.id, names);
    if (allNew) addedCategories.push("Adiciona a categoria " + label);
    else if (allDeleted) removedCategories.push("Remove a categoria " + label);
    else updatedCategories.push("Atualiza a categoria " + label);
  });

  const added = [];
  const photos = [];
  const updated = [];
  const removed = [];
  products.forEach((product) => {
    const flags = product.files.map((file) => file.xy);
    const kinds = product.files.map((file) => fileKind(file.name));
    const name = productLabel(product.category, product.slug, names);
    const where = inSentence(categoryLabel(product.category, names));
    if (flags.length && flags.every(isNew)) {
      added.push("Adiciona a peça " + name + " em " + where);
      return;
    }
    if (flags.length && flags.every(isDeleted)) {
      removed.push("Remove a peça " + name);
      return;
    }
    if (kinds.length && kinds.every((kind) => kind === "photo")) {
      photos.push("Atualiza as fotos de " + name);
      return;
    }
    updated.push("Atualiza a peça " + name);
  });

  const sortPt = (list) => list.sort((a, b) => a.localeCompare(b, "pt"));
  const lines = []
    .concat(sortPt(addedCategories))
    .concat(sortPt(added))
    .concat(sortPt(photos))
    .concat(sortPt(updated))
    .concat(sortPt(removed))
    .concat(sortPt(updatedCategories))
    .concat(sortPt(removedCategories));
  if (milena) lines.push("Atualiza a foto da Milena");
  if (siteJson) lines.push("Atualiza os textos da página");
  if (!lines.length && order) lines.push("Atualiza a ordem das peças");
  if (!lines.length && dataJs) lines.push("Atualiza os dados gerados do site");
  return lines;
}

function composeMessage(lines) {
  if (!lines.length) return "";
  if (lines.length === 1) return lines[0].endsWith(".") ? lines[0] : lines[0] + ".";
  const onlySite = lines.every((line) => (
    line.startsWith("Atualiza os textos")
    || line.startsWith("Atualiza a foto da Milena")
    || line.startsWith("Atualiza os dados")
  ));
  const subject = onlySite ? "Atualiza os textos do site." : "Atualiza as peças do site.";
  return subject + "\n\n" + lines.map((line) => "- " + line).join("\n");
}

function messageFor(entries) {
  return composeMessage(linesFromEntries(entries));
}

function trackedChanges() {
  const result = git(["diff", "--name-only", "-z", "HEAD", "--"].concat(publishPaths()));
  if (result.status !== 0) {
    throw new PublishError(400, gitText(result.stderr, result.stdout) || "Não foi possível comparar as peças.");
  }
  const names = new Set();
  String(result.stdout || "").split("\0").forEach((file) => {
    const norm = normalizePath(file);
    if (norm && isAllowed(norm)) names.add(norm);
  });
  return names;
}

function readStatus() {
  const result = git(["status", "--porcelain", "-z", "-uall", "--"].concat(publishPaths()));
  if (result.status !== 0) {
    throw new PublishError(400, gitText(result.stderr, result.stdout) || "Não foi possível ler o estado do Git.");
  }
  const changed = trackedChanges();
  return parseStatusZ(result.stdout).filter((entry) => {
    if (!isAllowed(entry.path)) return false;
    if (entry.xy.indexOf("?") !== -1) return true;
    return changed.has(entry.path);
  });
}

function currentBranch() {
  const result = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (result.status !== 0) return "";
  return result.stdout.trim();
}

function splitMessage(message) {
  const clean = String(message || "").replace(/\0/g, "").replace(/\r\n/g, "\n").trim();
  if (!clean) throw new PublishError(400, "Escreva a mensagem do envio.");
  if (clean.length > 4000) throw new PublishError(400, "A mensagem está longa demais.");
  const parts = clean.split(/\n\s*\n/);
  const subject = parts.shift().replace(/\s*\n\s*/g, " ").trim();
  const body = parts.join("\n\n").trim();
  if (!subject) throw new PublishError(400, "Escreva a mensagem do envio.");
  return { subject, body };
}

function preview() {
  require("./catalog").buildData();
  const entries = readStatus();
  const branch = currentBranch();
  if (!entries.length) return { empty: true, message: "", files: [], branch };
  return {
    empty: false,
    message: messageFor(entries),
    files: entries.map((entry) => entry.path),
    branch
  };
}

function publish(message) {
  require("./catalog").buildData();
  const pending = readStatus();
  if (!pending.length) throw new PublishError(400, "Não há mudanças para publicar.");
  const split = splitMessage(message);
  const paths = publishPaths();
  const added = git(["add", "--"].concat(paths));
  if (added.status !== 0) {
    throw new PublishError(400, gitText(added.stderr, added.stdout) || "Não foi possível preparar os arquivos.");
  }
  const args = ["commit", "-m", split.subject];
  if (split.body) args.push("-m", split.body);
  args.push("--");
  args.push.apply(args, paths);
  const committed = git(args);
  if (committed.status !== 0) {
    throw new PublishError(400, gitText(committed.stderr, committed.stdout) || "O commit não foi feito.");
  }
  const hash = git(["rev-parse", "--short", "HEAD"]);
  const branch = currentBranch();
  const pushed = git(["push"], { timeout: 120000 });
  if (pushed.status !== 0) {
    return {
      ok: false,
      committed: true,
      pushed: false,
      commit: (hash.stdout || "").trim(),
      branch,
      error: gitText(pushed.stderr, pushed.stdout) || "O commit ficou neste computador. O envio ao GitHub falhou."
    };
  }
  return {
    ok: true,
    committed: true,
    pushed: true,
    commit: (hash.stdout || "").trim(),
    branch
  };
}

function pending() {
  const files = readStatus().map((entry) => entry.path);
  const unpushed = git(["diff", "--name-only", "-z", "@{upstream}", "HEAD", "--"].concat(publishPaths()));
  if (unpushed.status === 0) {
    String(unpushed.stdout || "").split("\0").forEach((file) => {
      const norm = normalizePath(file);
      if (norm && isAllowed(norm) && files.indexOf(norm) === -1) files.push(norm);
    });
  }
  return { empty: files.length === 0 };
}

function pushDryRun() {
  const result = git(["push", "--dry-run"], { timeout: 60000 });
  return {
    ok: result.status === 0,
    status: result.status,
    output: gitText(result.stderr, result.stdout)
  };
}

module.exports = {
  PublishError,
  parseStatusZ,
  linesFromEntries,
  composeMessage,
  isAllowed,
  preview,
  pending,
  publish,
  pushDryRun
};
