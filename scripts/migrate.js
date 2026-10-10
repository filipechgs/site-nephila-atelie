#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const catalog = require("./catalog");

const ROOT = catalog.ROOT;
const DATA_JS = path.join(ROOT, "js", "data.js");

function migrate() {
  if (!fs.existsSync(DATA_JS)) {
    throw new Error("js/data.js não encontrado.");
  }
  const source = fs.readFileSync(DATA_JS, "utf8");
  if (source.includes("GERADO por scripts/build-data.js")) {
    console.log("js/data.js já é gerado a partir de produtos/. Nada a migrar.");
    return;
  }
  const site = Function(source + "\nreturn SITE;")();
  const categories = Array.isArray(site.categories) ? site.categories : [];
  const products = Array.isArray(site.products) ? site.products : [];

  for (const category of categories) {
    const created = catalog.slugify(category.label);
    if (created !== category.id) {
      throw new Error("A categoria \"" + category.label + "\" virou \"" + created + "\", diferente de \"" + category.id + "\".");
    }
    const marker = path.join(ROOT, "produtos", created, "_categoria.md");
    if (!fs.existsSync(marker)) {
      catalog.createCategory({ label: category.label, blurb: category.blurb });
    }
  }

  for (const product of products) {
    const slug = catalog.slugify(product.name);
    if (slug !== product.id) {
      throw new Error("A peça \"" + product.name + "\" virou \"" + slug + "\", diferente de \"" + product.id + "\".");
    }
    const dir = path.join(ROOT, "produtos", product.category, slug);
    const md = path.join(dir, slug + ".md");
    if (!fs.existsSync(md)) {
      catalog.createProduct({
        category: product.category,
        name: product.name,
        desc: product.desc || "Peça artesanal Nephila.",
        materials: [],
        price: "Sob consulta"
      });
    }
    const photos = Array.isArray(product.photos) ? product.photos : [];
    let index = 0;
    for (const rel of photos) {
      const src = path.join(ROOT, rel);
      const ext = (path.extname(rel) || ".jpeg").toLowerCase();
      const dest = path.join(dir, slug + "-" + index + ext);
      if (!fs.existsSync(src)) {
        if (!fs.existsSync(dest)) console.warn("Foto não encontrada: " + rel);
        index += 1;
        continue;
      }
      if (!fs.existsSync(dest)) fs.renameSync(src, dest);
      index += 1;
    }
  }

  console.log("Migração concluída: " + products.length + " peças em produtos/.");
}

try {
  migrate();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
