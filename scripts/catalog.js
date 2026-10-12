"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PRODUTOS = path.join(ROOT, "produtos");
const SITE_JSON = path.join(ROOT, "site.json");
const DATA_JS = path.join(ROOT, "js", "data.js");
const ORDER_PATH = path.join(PRODUTOS, "_ordem.json");

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHOTO_RE_EXT = "jpe?g|png|webp";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function assertSlug(slug, label) {
  if (!SLUG_RE.test(slug)) {
    throw new HttpError(400, (label || "O nome") + " precisa ter letras ou números.");
  }
}

function cleanLine(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function categoryDir(id) {
  assertSlug(id, "A categoria");
  const dir = path.join(PRODUTOS, id);
  if (!isInside(PRODUTOS, dir)) throw new HttpError(400, "Caminho inválido.");
  return dir;
}

function productDir(category, slug) {
  assertSlug(category, "A categoria");
  assertSlug(slug, "A peça");
  const dir = path.join(PRODUTOS, category, slug);
  if (!isInside(PRODUTOS, dir)) throw new HttpError(400, "Caminho inválido.");
  return dir;
}

function readOrder() {
  if (!fs.existsSync(ORDER_PATH)) return { categories: [], products: {} };
  try {
    const data = JSON.parse(fs.readFileSync(ORDER_PATH, "utf8"));
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      products: data.products && typeof data.products === "object" ? data.products : {}
    };
  } catch (err) {
    return { categories: [], products: {} };
  }
}

function writeOrder(order) {
  fs.mkdirSync(PRODUTOS, { recursive: true });
  fs.writeFileSync(ORDER_PATH, JSON.stringify(order, null, 2) + "\n", "utf8");
}

function scanCategoryIds() {
  if (!fs.existsSync(PRODUTOS)) return [];
  return fs.readdirSync(PRODUTOS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SLUG_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt"));
}

function scanProducts(category) {
  const dir = categoryDir(category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SLUG_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt"));
}

function orderedIds(found, preferred) {
  const seen = new Set();
  const out = [];
  for (const id of preferred || []) {
    if (found.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  for (const id of found) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function loadSyncedOrder() {
  const saved = readOrder();
  const categories = orderedIds(scanCategoryIds(), saved.categories);
  const products = {};
  for (const id of categories) {
    products[id] = orderedIds(scanProducts(id), saved.products[id] || []);
  }
  return { categories, products };
}

function writeCategoryMd({ label, blurb }) {
  return "# " + label.trim() + "\n\n" + blurb.trim() + "\n";
}

function parseCategoryMd(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  if (!lines[0] || !lines[0].startsWith("# ")) {
    throw new Error("A categoria precisa começar com # Nome.");
  }
  const label = lines[0].replace(/^#\s+/, "").trim();
  const blurb = lines.slice(1).join("\n").trim();
  if (!label || !blurb) throw new Error("A categoria precisa de nome e texto de apresentação.");
  return { label, blurb };
}

const DEFAULT_TECHNIQUE = "Crochê, Macramê";

function writeProductMd({ name, desc, materials, technique, price }) {
  const items = (materials || []).map((item) => String(item).trim()).filter(Boolean);
  const parts = ["# " + name.trim(), "", desc.trim(), ""];
  if (items.length) {
    parts.push(items.map((item) => "- " + item).join("\n"), "");
  }
  parts.push("Técnica: " + (technique || DEFAULT_TECHNIQUE).trim(), "");
  parts.push(price.trim(), "");
  return parts.join("\n");
}

function parseProductMd(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  if (!lines[0] || !lines[0].startsWith("# ")) {
    throw new Error("A peça precisa começar com # Nome.");
  }
  const name = lines[0].replace(/^#\s+/, "").trim();
  const blocks = lines.slice(1).join("\n").trim().split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (!name || blocks.length < 2) {
    throw new Error("A peça precisa de título, descrição e preço.");
  }
  const price = blocks[blocks.length - 1].replace(/\s*\n\s*/g, " ").trim();
  const middle = blocks.slice(1, -1);
  const materials = [];
  const extra = [];
  let technique = "";
  for (const block of middle) {
    const blockLines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const techniqueLine = block.match(/^técnica:\s*(.*)$/i);
    if (blockLines.length && blockLines.every((line) => /^[-*]\s+/.test(line))) {
      materials.push(...blockLines.map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean));
    } else if (techniqueLine && blockLines.length === 1) {
      technique = techniqueLine[1].trim();
    } else {
      extra.push(block);
    }
  }
  const desc = [blocks[0]].concat(extra).join("\n\n").trim();
  if (!desc || !price) throw new Error("A peça precisa de descrição e preço.");
  return { name, desc, materials, technique, price };
}

function asMaterials(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return value.split(/\n/);
  return [];
}

function normalizeTechnique(value) {
  const raw = String(value || "").replace(/^técnica:\s*/i, "");
  const parts = raw.split(",").map((item) => cleanLine(item)).filter(Boolean);
  if (!parts.length) return DEFAULT_TECHNIQUE;
  if (parts.length > 8) throw new HttpError(400, "São muitas técnicas. Deixe só as principais.");
  for (const part of parts) {
    if (part.length > 40) throw new HttpError(400, "Uma das técnicas está com o texto longo demais.");
  }
  return parts.join(", ");
}

function normalizePrice(value) {
  const raw = cleanLine(value);
  if (!raw) throw new HttpError(400, "Informe o preço em reais. Exemplo: R$ 180,00");
  if (raw.length > 60) throw new HttpError(400, "O preço está longo demais.");
  const money = raw.match(/^r\$\s*(.+)$/i);
  if (money) return "R$ " + money[1].trim();
  if (/^\d/.test(raw)) return "R$ " + raw;
  return raw;
}

function normalizeCategoryInput(input) {
  const label = cleanLine(input.label).replace(/^#+\s*/, "");
  const blurb = String(input.blurb || "").trim().replace(/\n{3,}/g, "\n\n");
  if (!label) throw new HttpError(400, "Dê um nome para a categoria.");
  if (label.length > 60) throw new HttpError(400, "O nome da categoria está longo demais.");
  if (!blurb) throw new HttpError(400, "Escreva um texto curto de apresentação da categoria.");
  if (blurb.length > 800) throw new HttpError(400, "O texto da categoria está longo demais.");
  const id = slugify(label);
  if (!id) throw new HttpError(400, "O nome da categoria precisa ter letras ou números.");
  return { label, blurb, id };
}

function normalizeProductInput(input, fallbackCategory) {
  const name = cleanLine(input.name).replace(/^#+\s*/, "");
  const desc = String(input.desc || "").trim().replace(/\n\s*\n/g, "\n").trim();
  const materials = asMaterials(input.materials).map((item) => cleanLine(item)).filter(Boolean);
  const technique = normalizeTechnique(input.technique);
  const category = cleanLine(input.category || fallbackCategory || "");
  if (!name) throw new HttpError(400, "Dê um nome para a peça.");
  if (name.length > 80) throw new HttpError(400, "O nome da peça está longo demais.");
  if (!desc) throw new HttpError(400, "Escreva a descrição da peça.");
  if (desc.length > 4000) throw new HttpError(400, "A descrição está longa demais.");
  if (materials.length > 30) throw new HttpError(400, "São muitos materiais. Deixe só os principais.");
  for (const item of materials) {
    if (item.length > 120) throw new HttpError(400, "Um dos materiais está com o texto longo demais.");
  }
  if (!SLUG_RE.test(category)) throw new HttpError(400, "Escolha uma categoria.");
  const slug = slugify(name);
  if (!slug) throw new HttpError(400, "O nome da peça precisa ter letras ou números.");
  return {
    name,
    desc,
    materials,
    technique,
    price: normalizePrice(input.price),
    category,
    slug
  };
}

function listPhotos(category, slug) {
  const dir = productDir(category, slug);
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp("^" + escapeReg(slug) + "-(\\d+)\\.(" + PHOTO_RE_EXT + ")$", "i");
  return fs.readdirSync(dir)
    .map((file) => {
      const match = file.match(re);
      if (!match) return null;
      return {
        index: Number(match[1]),
        file,
        ext: path.extname(file).toLowerCase(),
        abs: path.join(dir, file),
        src: "produtos/" + category + "/" + slug + "/" + file
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function stageRename(dir, items, finalName) {
  const staged = items.map((item, i) => {
    const tmp = path.join(dir, ".tmp-" + i + item.ext);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    fs.renameSync(item.abs || path.join(dir, item.file), tmp);
    return { tmp, ext: item.ext };
  });
  staged.forEach((item, i) => {
    fs.renameSync(item.tmp, path.join(dir, finalName(i, item.ext)));
  });
}

function renumberPhotos(category, slug) {
  const photos = listPhotos(category, slug);
  stageRename(productDir(category, slug), photos, (i, ext) => slug + "-" + i + ext);
}

function photoExt(file) {
  let ext = path.extname(file.originalname || "").toLowerCase();
  if (![".jpeg", ".jpg", ".png", ".webp"].includes(ext)) {
    const mime = {
      "image/jpeg": ".jpeg",
      "image/png": ".png",
      "image/webp": ".webp"
    }[file.mimetype];
    ext = mime || "";
  }
  if (![".jpeg", ".jpg", ".png", ".webp"].includes(ext)) {
    throw new HttpError(400, "Use fotos JPEG, PNG ou WebP.");
  }
  return ext;
}

function readCategory(id) {
  const file = path.join(categoryDir(id), "_categoria.md");
  if (!fs.existsSync(file)) throw new Error("Falta o arquivo _categoria.md.");
  return parseCategoryMd(fs.readFileSync(file, "utf8"));
}

function readProduct(category, slug) {
  const file = path.join(productDir(category, slug), slug + ".md");
  if (!fs.existsSync(file)) throw new Error("Falta o arquivo " + slug + ".md.");
  return parseProductMd(fs.readFileSync(file, "utf8"));
}

function listCatalog() {
  const warnings = [];
  const order = loadSyncedOrder();
  const categories = order.categories.map((id) => {
    let meta;
    try {
      meta = readCategory(id);
    } catch (err) {
      warnings.push(id + ": " + err.message);
      meta = { label: id, blurb: "" };
    }
    const products = (order.products[id] || []).map((slug) => {
      let parsed = { name: slug, desc: "", materials: [], technique: "", price: "" };
      let error = "";
      try {
        parsed = readProduct(id, slug);
      } catch (err) {
        error = err.message;
        warnings.push(id + "/" + slug + ": " + err.message);
      }
      return {
        slug,
        name: parsed.name,
        desc: parsed.desc,
        materials: parsed.materials,
        technique: parsed.technique || "",
        price: parsed.price,
        photos: listPhotos(id, slug).map((photo) => ({
          index: photo.index,
          file: photo.file,
          ext: photo.ext,
          src: photo.src
        })),
        error
      };
    });
    return { id, label: meta.label, blurb: meta.blurb, products };
  });
  return { categories, warnings };
}

function assertCategoryExists(id) {
  if (!scanCategoryIds().includes(id)) {
    throw new HttpError(404, "Categoria não encontrada.");
  }
}

function assertProductExists(category, slug) {
  assertCategoryExists(category);
  if (!scanProducts(category).includes(slug)) {
    throw new HttpError(404, "Peça não encontrada.");
  }
}

function assertSlugFree(slug, except) {
  for (const category of scanCategoryIds()) {
    for (const existing of scanProducts(category)) {
      if (existing !== slug) continue;
      if (except && except.category === category && except.slug === existing) continue;
      throw new HttpError(409, "Já existe uma peça com esse nome. Escolha outro.");
    }
  }
}

function persistOrder() {
  writeOrder(loadSyncedOrder());
}

function createCategory(input) {
  const fields = normalizeCategoryInput(input || {});
  if (fs.existsSync(categoryDir(fields.id))) {
    throw new HttpError(409, "Já existe uma categoria com esse nome.");
  }
  const dir = categoryDir(fields.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "_categoria.md"), writeCategoryMd(fields), "utf8");
  persistOrder();
  return { id: fields.id };
}

function updateCategory(id, input) {
  assertSlug(id, "A categoria");
  assertCategoryExists(id);
  const fields = normalizeCategoryInput(input || {});
  const dir = categoryDir(id);
  if (fields.id !== id && fs.existsSync(categoryDir(fields.id))) {
    throw new HttpError(409, "Já existe uma categoria com esse nome.");
  }
  const before = loadSyncedOrder();
  const index = before.categories.indexOf(id);
  const productOrder = before.products[id] || [];
  fs.writeFileSync(path.join(dir, "_categoria.md"), writeCategoryMd(fields), "utf8");
  if (fields.id !== id) {
    fs.renameSync(dir, categoryDir(fields.id));
    const order = loadSyncedOrder();
    order.categories = order.categories.filter((item) => item !== fields.id);
    const at = index >= 0 ? Math.min(index, order.categories.length) : order.categories.length;
    order.categories.splice(at, 0, fields.id);
    const present = new Set(scanProducts(fields.id));
    order.products[fields.id] = productOrder.filter((slug) => present.has(slug));
    for (const slug of scanProducts(fields.id)) {
      if (!order.products[fields.id].includes(slug)) order.products[fields.id].push(slug);
    }
    delete order.products[id];
    writeOrder(order);
  }
  return { id: fields.id };
}

function deleteCategory(id) {
  assertSlug(id, "A categoria");
  assertCategoryExists(id);
  if (scanProducts(id).length) {
    throw new HttpError(400, "Para excluir a categoria, apague ou mova as peças antes.");
  }
  fs.rmSync(categoryDir(id), { recursive: true, force: true });
  persistOrder();
  return { id };
}

function createProduct(input) {
  const fields = normalizeProductInput(input || {});
  assertCategoryExists(fields.category);
  assertSlugFree(fields.slug);
  const dir = productDir(fields.category, fields.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fields.slug + ".md"), writeProductMd(fields), "utf8");
  persistOrder();
  return { category: fields.category, slug: fields.slug };
}

function restoreProductOrder(before, oldCat, oldSlug, newCat, newSlug) {
  const index = (before.products[oldCat] || []).indexOf(oldSlug);
  const order = loadSyncedOrder();
  order.products[newCat] = (order.products[newCat] || []).filter((slug) => slug !== newSlug);
  const dest = order.products[newCat];
  const at = oldCat === newCat && index >= 0 ? Math.min(index, dest.length) : dest.length;
  dest.splice(at, 0, newSlug);
  writeOrder(order);
}

function updateProduct(category, slug, input) {
  assertProductExists(category, slug);
  const fields = normalizeProductInput(input || {}, category);
  assertCategoryExists(fields.category);
  if (fields.slug !== slug || fields.category !== category) {
    assertSlugFree(fields.slug, { category, slug });
  }
  const before = loadSyncedOrder();
  const oldDir = productDir(category, slug);
  renameAssets(oldDir, slug, fields.slug);
  const newDir = productDir(fields.category, fields.slug);
  if (path.resolve(oldDir) !== path.resolve(newDir)) {
    if (fs.existsSync(newDir)) throw new HttpError(409, "Já existe uma peça com esse nome nessa categoria.");
    fs.mkdirSync(path.dirname(newDir), { recursive: true });
    fs.renameSync(oldDir, newDir);
  }
  fs.writeFileSync(path.join(newDir, fields.slug + ".md"), writeProductMd(fields), "utf8");
  if (fields.slug !== slug || fields.category !== category) {
    restoreProductOrder(before, category, slug, fields.category, fields.slug);
  }
  return { category: fields.category, slug: fields.slug };
}

function renameAssets(dir, oldSlug, newSlug) {
  if (oldSlug === newSlug) return;
  const mdPath = path.join(dir, oldSlug + ".md");
  if (fs.existsSync(mdPath)) fs.renameSync(mdPath, path.join(dir, ".tmp-md"));
  const re = new RegExp("^" + escapeReg(oldSlug) + "-(\\d+)\\.(" + PHOTO_RE_EXT + ")$", "i");
  const photos = fs.readdirSync(dir)
    .map((file) => {
      const match = file.match(re);
      if (!match) return null;
      return {
        file,
        abs: path.join(dir, file),
        index: Number(match[1]),
        ext: path.extname(file).toLowerCase()
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
  stageRename(dir, photos, (i, ext) => newSlug + "-" + i + ext);
  const tmpMd = path.join(dir, ".tmp-md");
  if (fs.existsSync(tmpMd)) fs.renameSync(tmpMd, path.join(dir, newSlug + ".md"));
}

function deleteProduct(category, slug) {
  assertProductExists(category, slug);
  fs.rmSync(productDir(category, slug), { recursive: true, force: true });
  persistOrder();
  return { category };
}

function addPhotos(category, slug, files) {
  assertProductExists(category, slug);
  if (!files || !files.length) throw new HttpError(400, "Escolha ao menos uma foto.");
  const existing = listPhotos(category, slug);
  if (existing.length + files.length > 12) {
    throw new HttpError(400, "Uma peça pode ter no máximo 12 fotos.");
  }
  const dir = productDir(category, slug);
  let index = existing.reduce((max, photo) => Math.max(max, photo.index), -1) + 1;
  for (const file of files) {
    const ext = photoExt(file);
    fs.writeFileSync(path.join(dir, slug + "-" + index + ext), file.buffer);
    index += 1;
  }
  renumberPhotos(category, slug);
  return { category, slug };
}

function deletePhoto(category, slug, index) {
  assertProductExists(category, slug);
  const photo = listPhotos(category, slug).find((item) => item.index === Number(index));
  if (!photo) throw new HttpError(404, "Foto não encontrada.");
  fs.unlinkSync(photo.abs);
  renumberPhotos(category, slug);
  return { category, slug };
}

function reorderPhotos(category, slug, order) {
  assertProductExists(category, slug);
  const photos = listPhotos(category, slug);
  if (!Array.isArray(order) || order.length !== photos.length) {
    throw new HttpError(400, "A ordem das fotos está incompleta.");
  }
  const byIndex = new Map(photos.map((photo) => [photo.index, photo]));
  const next = order.map((idx) => {
    const photo = byIndex.get(Number(idx));
    if (!photo || byIndex.get(Number(idx)) === undefined) {
      throw new HttpError(400, "Uma das fotos não foi encontrada.");
    }
    return photo;
  });
  if (new Set(next.map((photo) => photo.index)).size !== photos.length) {
    throw new HttpError(400, "A ordem das fotos está repetida.");
  }
  stageRename(productDir(category, slug), next, (i, ext) => slug + "-" + i + ext);
  return { category, slug };
}

function readSite() {
  if (!fs.existsSync(SITE_JSON)) {
    throw new Error("site.json não encontrado.");
  }
  const site = JSON.parse(fs.readFileSync(SITE_JSON, "utf8"));
  for (const key of ["brand", "artisan", "contact"]) {
    if (!site[key]) throw new Error("site.json sem o campo " + key + ".");
  }
  return site;
}

function buildData() {
  const site = readSite();
  const catalog = listCatalog();
  const categories = catalog.categories.map((cat) => ({
    id: cat.id,
    label: cat.label,
    blurb: cat.blurb
  }));
  const products = [];
  for (const cat of catalog.categories) {
    for (const product of cat.products) {
      if (!product.photos.length) {
        catalog.warnings.push(cat.label + " / " + product.name + ": sem fotos.");
      }
      products.push({
        id: product.slug,
        name: product.name,
        category: cat.id,
        desc: product.desc,
        materials: product.materials,
        technique: product.technique || DEFAULT_TECHNIQUE,
        price: product.price,
        photos: product.photos.map((photo) => photo.src)
      });
    }
  }
  const payload = {
    brand: site.brand,
    artisan: site.artisan,
    contact: site.contact,
    categories,
    products
  };
  const banner = [
    "/*",
    " * GERADO por scripts/build-data.js — não edite este arquivo à mão.",
    " * Peças e categorias: pasta produtos/ (painel: npm start).",
    " * Marca, artesã e contato: site.json",
    " */",
    ""
  ].join("\n");
  fs.mkdirSync(path.dirname(DATA_JS), { recursive: true });
  fs.writeFileSync(DATA_JS, banner + "const SITE = " + JSON.stringify(payload, null, 2) + ";\n", "utf8");
  return {
    warnings: catalog.warnings,
    categories: categories.length,
    products: products.length
  };
}

module.exports = {
  ROOT,
  PRODUTOS,
  HttpError,
  slugify,
  writeProductMd,
  parseProductMd,
  listCatalog,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  addPhotos,
  deletePhoto,
  reorderPhotos,
  buildData
};
