"use strict";

const path = require("path");
const express = require("express");
const multer = require("multer");
const catalog = require("../scripts/catalog");

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

app.listen(PORT, "127.0.0.1", () => {
  console.log("Painel: http://127.0.0.1:" + PORT + "/admin");
  console.log("Prévia do site: http://127.0.0.1:" + PORT + "/");
});
