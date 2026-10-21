"use strict";

const os = require("os");
const path = require("path");
const express = require("express");
const multer = require("multer");
const catalog = require("../scripts/catalog");
const publisher = require("../scripts/publish");
const siteContent = require("../scripts/site-content");

const PORT = Number(process.env.PORT) || 3847;
const ROOT = catalog.ROOT;
const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 12 }
});

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

function sendError(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const message = status >= 500
    ? "Erro inesperado no painel."
    : (err.message || "Não foi possível concluir.");
  res.status(status).json({ error: message });
}

function route(fn) {
  return (req, res) => {
    try {
      const result = fn(req);
      if (!res.headersSent) res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };
}

function withCatalog(result) {
  return Object.assign({ catalog: catalog.listCatalog() }, result);
}

function uploadError(err) {
  if (!err) return null;
  if (err.code === "LIMIT_FILE_SIZE") return "Cada foto pode ter no máximo 12 MB.";
  if (err.code === "LIMIT_FILE_COUNT") return "Envie no máximo 12 fotos por vez.";
  return err.message || "Não foi possível receber as fotos.";
}

app.get("/api/catalog", route(() => catalog.listCatalog()));

app.post("/api/categories", route((req) => {
  const created = catalog.createCategory(req.body || {});
  return withCatalog({ category: created.id });
}));

app.patch("/api/categories/:id", route((req) => {
  const updated = catalog.updateCategory(req.params.id, req.body || {});
  return withCatalog({ category: updated.id });
}));

app.delete("/api/categories/:id", route((req) => {
  catalog.deleteCategory(req.params.id);
  return withCatalog({});
}));

app.post("/api/products", route((req) => {
  const created = catalog.createProduct(req.body || {});
  return withCatalog(created);
}));

app.patch("/api/products/:category/:slug", route((req) => {
  const updated = catalog.updateProduct(req.params.category, req.params.slug, req.body || {});
  return withCatalog(updated);
}));

app.delete("/api/products/:category/:slug", route((req) => {
  const removed = catalog.deleteProduct(req.params.category, req.params.slug);
  return withCatalog(removed);
}));

app.post("/api/products/:category/:slug/photos", (req, res) => {
  upload.array("photos", 12)(req, res, (err) => {
    const message = uploadError(err);
    if (message) return res.status(400).json({ error: message });
    try {
      const saved = catalog.addPhotos(req.params.category, req.params.slug, req.files || []);
      res.json(withCatalog(saved));
    } catch (error) {
      sendError(res, error);
    }
  });
});

app.delete("/api/products/:category/:slug/photos/:index", route((req) => {
  const saved = catalog.deletePhoto(req.params.category, req.params.slug, req.params.index);
  return withCatalog(saved);
}));

app.put("/api/products/:category/:slug/photos/order", route((req) => {
  const saved = catalog.reorderPhotos(req.params.category, req.params.slug, (req.body || {}).order);
  return withCatalog(saved);
}));

app.post("/api/build", route(() => {
  const result = catalog.buildData();
  return Object.assign({ ok: true }, result);
}));

app.get("/api/site", route(() => ({ fields: siteContent.toFields(siteContent.readSite()) })));

app.patch("/api/site", route((req) => ({ fields: siteContent.updateSite(req.body || {}) })));

app.post("/api/site/photo", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    const message = uploadError(err);
    if (message) return res.status(400).json({ error: message });
    try {
      res.json({ fields: siteContent.savePhoto(req.file) });
    } catch (error) {
      sendError(res, error);
    }
  });
});

app.get("/api/publish/pending", route(() => publisher.pending()));

app.post("/api/publish/preview", route(() => publisher.preview()));

app.post("/api/publish", route((req) => publisher.publish((req.body || {}).message)));

function noStore(req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Os dados enviados não são válidos." });
  }
  return sendError(res, err);
});

app.use("/admin", noStore, express.static(path.join(ROOT, "admin", "public")));
app.use("/js", noStore, express.static(path.join(ROOT, "js")));
app.use("/css", noStore, express.static(path.join(ROOT, "css")));
app.use("/img", express.static(path.join(ROOT, "img")));
app.use("/fonts", express.static(path.join(ROOT, "fonts")));
app.use("/produtos", noStore, express.static(catalog.PRODUTOS));
app.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(ROOT, "index.html"));
});

function isHomeIPv4(address) {
  const parts = String(address || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function isVirtualAdapter(name) {
  return /vmware|virtualbox|vbox|hyper-v|vethernet|wsl|loopback|bluetooth|tunnel|npcap|zerotier|tailscale|vpn|pseudo|virtual/i.test(name);
}

function homeAdminUrls(port, skipVirtual) {
  const urls = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    if (skipVirtual && isVirtualAdapter(name)) return;
    (nets[name] || []).forEach((net) => {
      const family = net.family;
      const ipv4 = family === "IPv4" || family === 4;
      if (!ipv4 || net.internal || !isHomeIPv4(net.address)) return;
      const url = "http://" + net.address + ":" + port + "/admin";
      if (urls.indexOf(url) === -1) urls.push(url);
    });
  });
  return urls;
}

function waitToClose() {
  if (!process.stdin.isTTY) process.exit(1);
  console.log("");
  console.log("Aperte Enter para fechar esta janela.");
  const readline = require("readline");
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  input.question("", () => process.exit(1));
}

function printLauncherHelp(port) {
  const here = "http://127.0.0.1:" + port + "/admin";
  const phones = homeAdminUrls(port, true);
  const lines = [
    "",
    "========================================",
    "",
    "  Nephila",
    "  Atualizar as peças",
    "",
    "========================================",
    "",
    "Deixe esta janela aberta.",
    "Enquanto ela estiver aberta, dá para",
    "atualizar as peças.",
    "",
    "Para parar, feche esta janela.",
    "",
    "----------------------------------------",
    "No computador",
    "----------------------------------------",
    "",
    "1. Abra o Chrome.",
    "   É o programa colorido de entrar",
    "   na internet. Se você usa outro,",
    "   pode abrir esse.",
    "",
    "2. Clique na barra do topo, onde fica",
    "   o endereço do site.",
    "",
    "   Não escreva na caixa do Google,",
    "   no meio da página.",
    "",
    "3. Apague o que estiver escrito,",
    "   digite o endereço abaixo igualzinho",
    "   e aperte Enter:",
    "",
    "   " + here,
    "",
    "----------------------------------------",
    "No celular",
    "----------------------------------------",
    "",
    "O celular precisa estar no mesmo Wi-Fi",
    "deste computador. A internet do chip",
    "(4G ou 5G) não serve.",
    ""
  ];
  if (!phones.length) {
    lines.push("Não encontrei o endereço do celular.");
    lines.push("Dá para atualizar neste computador,");
    lines.push("no endereço de cima.");
    lines.push("Confira se o Wi-Fi do computador");
    lines.push("está ligado.");
  } else {
    lines.push("1. Abra o Chrome no celular.");
    lines.push("");
    lines.push("2. Toque na barra de cima.");
    lines.push("");
    lines.push("3. Apague o que estiver escrito");
    lines.push("   e digite o endereço abaixo");
    lines.push("   igualzinho, com os pontos");
    lines.push("   e os dois-pontos:");
    lines.push("");
    phones.forEach((url) => {
      lines.push("   " + url);
      lines.push("");
    });
    if (phones.length > 1) {
      lines.push("Se o primeiro não abrir, tente o outro.");
      lines.push("");
    }
    lines.push("Se a página não abrir, confira se o");
    lines.push("celular está no mesmo Wi-Fi e digite");
    lines.push("de novo, com calma.");
  }
  lines.push("");
  lines.push("Se o Windows perguntar se este programa");
  lines.push("pode usar a rede, clique em Permitir.");
  lines.push("");
  console.log(lines.join("\n"));
}

function printDeveloperHelp(port) {
  console.log("Painel neste computador: http://127.0.0.1:" + port + "/admin");
  const urls = homeAdminUrls(port, false);
  if (!urls.length) console.log("Painel na rede de casa:  nenhum endereço IPv4 encontrado.");
  urls.forEach((url) => console.log("Painel na rede de casa:  " + url));
  console.log("Prévia do site: http://127.0.0.1:" + port + "/");
}

function startPanel() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    if (process.env.NEPHILA_LAUNCHER === "1") printLauncherHelp(PORT);
    else printDeveloperHelp(PORT);
  });
  server.on("error", (err) => {
    if (process.env.NEPHILA_LAUNCHER === "1") {
      console.log("");
      if (err.code === "EADDRINUSE") {
        console.log("O painel já está aberto em outra janela.");
        console.log("Procure a outra janela da Nephila e use");
        console.log("os endereços que aparecem nela.");
        console.log("");
        console.log("Se não achar essa janela, feche todas");
        console.log("as janelas pretas e abra este programa");
        console.log("de novo.");
      } else {
        console.log("Não consegui abrir o painel.");
        console.log("Pode fechar esta janela e pedir ajuda em casa.");
      }
      waitToClose();
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.error("O painel já está aberto na porta " + PORT + ".");
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });
}

if (require.main === module || process.env.NEPHILA_LAUNCHER === "1") startPanel();
