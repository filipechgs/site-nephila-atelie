"use strict";

const state = {
  catalog: { categories: [], warnings: [] },
  view: { type: "home" },
  dirty: false,
  pending: [],
  saving: false
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
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

function setStatus(message, kind) {
  const el = document.getElementById("status");
  el.className = "status" + (kind ? " is-" + kind : "");
  el.textContent = message || "";
}

async function api(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new Error("Não consegui falar com o painel. Deixe o comando npm start aberto.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}

function activeCategory() {
  if (state.view.type === "category" || state.view.type === "category-form") return state.view.id || "";
  if (state.view.type === "product") return state.view.category || "";
  return "";
}

function categoryById(id) {
  return state.catalog.categories.find((category) => category.id === id) || null;
}

function currentProduct() {
  if (state.view.type !== "product" || !state.view.slug) return null;
  const category = categoryById(state.view.category);
  if (!category) return null;
  return category.products.find((product) => product.slug === state.view.slug) || null;
}

function clearPending() {
  state.pending.forEach((item) => URL.revokeObjectURL(item.url));
  state.pending = [];
}

function go(view) {
  if (state.dirty && !window.confirm("Há alterações não salvas. Quer descartar?")) return;
  clearPending();
  state.dirty = false;
  state.view = view;
  render();
}

function pieceCount(n) {
  return n + (n === 1 ? " peça" : " peças");
}

function renderCategories() {
  const list = document.getElementById("catList");
  const active = activeCategory();
  if (!state.catalog.categories.length) {
    list.innerHTML = "<li class=\"empty\">Nenhuma categoria ainda. Comece por Nova.</li>";
    return;
  }
  list.innerHTML = state.catalog.categories.map((category) => (
    "<li><button type=\"button\" data-action=\"open-category\" data-id=\"" + esc(category.id) + "\" class=\"" +
    (category.id === active ? "is-active" : "") + "\"><strong>" + esc(category.label) +
    "</strong><small>" + pieceCount(category.products.length) + "</small></button></li>"
  )).join("");
}

function renderHome() {
  return (
    "<h2>Como publicar uma peça</h2>" +
    "<ol class=\"steps\">" +
    "<li>Crie uma categoria — por exemplo, Bolsas. O texto dela aparece no site acima das peças.</li>" +
    "<li>Abra a categoria e cadastre a peça: nome, descrição, materiais, preço e fotos.</li>" +
    "<li>Clique em <strong>Gerar site</strong> para ver a página neste computador. Depois, <strong>Publicar</strong> envia as peças ao ar.</li>" +
    "</ol>" +
    "<p class=\"hint\">As fotos não precisam estar com o nome certo. O painel grava como nome-da-peca-0.jpeg, nome-da-peca-1.jpeg e assim por diante.</p>"
  );
}

function renderCategory(category) {
  const pieces = category.products.map((product) => {
    const photo = product.photos[0];
    const thumb = photo
      ? "<img src=\"/" + esc(photo.src) + "\" alt=\"\">"
      : "<span class=\"piece__fallback\">Sem foto</span>";
    return (
      "<li><button type=\"button\" class=\"piece\" data-action=\"open-product\" data-category=\"" +
      esc(category.id) + "\" data-slug=\"" + esc(product.slug) + "\">" +
      thumb +
      "<span><strong>" + esc(product.name) + "</strong><em>" + esc(product.price || "Sem preço") + "</em></span>" +
      "</button></li>"
    );
  }).join("");
  return (
    "<div class=\"workspace__head\"><h2>" + esc(category.label) + "</h2>" +
    "<div class=\"workspace__actions\">" +
    "<button type=\"button\" class=\"btn btn--small btn--ghost\" data-action=\"edit-category\" data-id=\"" + esc(category.id) + "\">Editar categoria</button>" +
    "<button type=\"button\" class=\"btn btn--small btn--dark\" data-action=\"new-product\" data-category=\"" + esc(category.id) + "\">Nova peça</button>" +
    "</div></div>" +
    "<p class=\"blurb\">" + esc(category.blurb) + "</p>" +
    (pieces
      ? "<ul class=\"piece-list\">" + pieces + "</ul>"
      : "<p class=\"empty\">Esta categoria ainda não tem peças. Use Nova peça.</p>")
  );
}

function categoryOptions(selected) {
  return state.catalog.categories.map((category) => (
    "<option value=\"" + esc(category.id) + "\"" + (category.id === selected ? " selected" : "") + ">" +
    esc(category.label) + "</option>"
  )).join("");
}

function renderCategoryForm() {
  const current = state.view.id ? categoryById(state.view.id) : null;
  const label = current ? current.label : "";
  const blurb = current ? current.blurb : "";
  const canDelete = current && current.products.length === 0;
  const blocked = current && current.products.length
    ? "<p class=\"hint\">Para excluir esta categoria, apague ou mova as " + pieceCount(current.products.length) + " antes.</p>"
    : "";
  return (
    "<button type=\"button\" class=\"back\" data-action=\"back-category\">Voltar</button>" +
    "<h2>" + (current ? "Editar categoria" : "Nova categoria") + "</h2>" +
    "<p class=\"hint\">O nome vira a pasta. Decoração, por exemplo, fica na pasta decoracao.</p>" +
    "<form class=\"form\" data-form=\"category\">" +
    "<label><span>Nome</span><input name=\"label\" type=\"text\" required maxlength=\"60\" value=\"" + esc(label) + "\" placeholder=\"Bolsas\">" +
    "<p class=\"slug\" id=\"slugHint\"></p></label>" +
    "<label><span>Texto de apresentação</span><textarea name=\"blurb\" required maxlength=\"800\" placeholder=\"Bolsas artesanais em crochê e macramê.\">" + esc(blurb) + "</textarea>" +
    "<p class=\"hint\">Essa frase aparece no site, acima das peças da categoria.</p></label>" +
    "<div class=\"form__row\">" +
    "<button class=\"btn btn--dark\" type=\"submit\">Salvar categoria</button>" +
    (canDelete ? "<button class=\"btn btn--quiet\" type=\"button\" data-action=\"delete-category\" data-id=\"" + esc(current.id) + "\">Excluir categoria</button>" : "") +
    "</div>" +
    blocked +
    "</form>"
  );
}

function photoCard(photo, position, total) {
  return (
    "<li class=\"photo\"><img src=\"/" + esc(photo.src) + "\" alt=\"\">" +
    "<span class=\"photo__name\">" + esc(photo.file) + "</span>" +
    "<div class=\"photo__actions\">" +
    "<button type=\"button\" data-action=\"move-photo\" data-index=\"" + photo.index + "\" data-dir=\"-1\" aria-label=\"Mover foto para a esquerda\"" + (position === 0 ? " disabled" : "") + ">Esquerda</button>" +
    "<button type=\"button\" data-action=\"move-photo\" data-index=\"" + photo.index + "\" data-dir=\"1\" aria-label=\"Mover foto para a direita\"" + (position === total - 1 ? " disabled" : "") + ">Direita</button>" +
    "<button type=\"button\" data-action=\"remove-photo\" data-index=\"" + photo.index + "\">Remover</button>" +
    "</div></li>"
  );
}

function pendingCard(item, index) {
  return (
    "<li class=\"photo\"><img src=\"" + esc(item.url) + "\" alt=\"\">" +
    "<span class=\"photo__name\">Nova · " + esc(item.file.name) + "</span>" +
    "<div class=\"photo__actions\">" +
    "<button type=\"button\" data-action=\"remove-pending\" data-index=\"" + index + "\">Tirar</button>" +
    "</div></li>"
  );
}

function renderPhotos() {
  const product = currentProduct();
  const photos = product ? product.photos : [];
  const saved = photos.map((photo, position) => photoCard(photo, position, photos.length)).join("");
  const pending = state.pending.map((item, index) => pendingCard(item, index)).join("");
  const blocks = [];
  if (saved) blocks.push("<ul class=\"photos\">" + saved + "</ul>");
  if (pending) blocks.push("<p class=\"hint\">Estas fotos entram ao salvar:</p><ul class=\"photos\">" + pending + "</ul>");
  if (!saved && !pending) blocks.push("<p class=\"empty\">Nenhuma foto ainda.</p>");
  return blocks.join("");
}

function renderProductForm() {
  const product = currentProduct();
  const selected = product ? state.view.category : state.view.category;
  const materials = product ? product.materials.join("\n") : "";
  return (
    "<button type=\"button\" class=\"back\" data-action=\"open-category\" data-id=\"" + esc(state.view.category) + "\">Voltar para a categoria</button>" +
    "<h2>" + (product ? "Editar " + esc(product.name) : "Nova peça") + "</h2>" +
    "<form class=\"form\" data-form=\"product\">" +
    "<label><span>Categoria</span><select name=\"category\" required>" + categoryOptions(selected) + "</select></label>" +
    "<label><span>Nome da peça</span><input name=\"name\" type=\"text\" required maxlength=\"80\" value=\"" + esc(product ? product.name : "") + "\" placeholder=\"Rita\">" +
    "<p class=\"slug\" id=\"slugHint\"></p></label>" +
    "<label><span>Descrição</span><textarea name=\"desc\" required maxlength=\"4000\" placeholder=\"Bolsa artesanal com acabamento impecável e fios selecionados.\">" + esc(product ? product.desc : "") + "</textarea>" +
    "<p class=\"hint\">Parágrafo que aparece logo abaixo do nome.</p></label>" +
    "<label><span>Materiais</span><textarea name=\"materials\" maxlength=\"2000\" placeholder=\"Fio de algodão&#10;Forro de tecido\">" + esc(materials) + "</textarea>" +
    "<p class=\"hint\">Um material por linha. Pode deixar em branco.</p></label>" +
    "<label><span>Preço em reais</span><input name=\"price\" type=\"text\" required maxlength=\"60\" value=\"" + esc(product ? product.price : "") + "\" placeholder=\"R$ 180,00\">" +
    "<p class=\"hint\">Como deve aparecer no site. Se ainda não tiver valor, escreva Sob consulta.</p></label>" +
    "<div>" +
    "<span class=\"hint\">Fotos</span>" +
    "<div id=\"photosMount\">" + renderPhotos() + "</div>" +
    "<div class=\"dropzone\" id=\"dropzone\">" +
    "<p>Arraste as fotos para cá ou escolha no computador. JPEG, PNG ou WebP, até 12 fotos.</p>" +
    "<button class=\"btn btn--small btn--ghost\" type=\"button\" data-action=\"pick-photos\">Escolher fotos</button>" +
    "<input id=\"photoInput\" type=\"file\" accept=\".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp\" multiple hidden>" +
    "</div>" +
    "<p class=\"hint\">O nome original não importa. Ao salvar, viram nome-da-peca-0.jpeg, nome-da-peca-1.jpeg…</p>" +
    "</div>" +
    "<div class=\"form__row\">" +
    "<button class=\"btn btn--dark\" type=\"submit\">Salvar peça</button>" +
    (product ? "<button class=\"btn btn--quiet\" type=\"button\" data-action=\"delete-product\">Excluir peça</button>" : "") +
    "</div>" +
    "</form>"
  );
}

function renderWorkspace() {
  const workspace = document.getElementById("workspace");
  if (state.view.type === "category") {
    const category = categoryById(state.view.id);
    workspace.innerHTML = category ? renderCategory(category) : renderHome();
  } else if (state.view.type === "category-form") {
    workspace.innerHTML = renderCategoryForm();
    updateSlugHint();
  } else if (state.view.type === "product") {
    const category = categoryById(state.view.category);
    workspace.innerHTML = category ? renderProductForm() : renderHome();
    updateSlugHint();
  } else {
    workspace.innerHTML = renderHome();
  }
}

function render() {
  renderCategories();
  renderWorkspace();
}

function updateSlugHint() {
  const hint = document.getElementById("slugHint");
  if (!hint) return;
  const form = hint.closest("form");
  if (!form) return;
  if (form.dataset.form === "category") {
    const slug = slugify(form.label.value);
    hint.textContent = slug ? "Pasta: produtos/" + slug + "/" : "A pasta recebe o nome em letras minúsculas, sem acento.";
  } else {
    const slug = slugify(form.name.value);
    hint.textContent = slug ? "Pasta e arquivos: " + slug + "/" + slug + ".md e " + slug + "-0.jpeg" : "O nome da pasta acompanha o nome da peça.";
  }
}

function fillPhotos() {
  const mount = document.getElementById("photosMount");
  if (mount) mount.innerHTML = renderPhotos();
}

function isAllowedPhoto(file) {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  return /\.(jpe?g|png|webp)$/.test(name) || type === "image/jpeg" || type === "image/png" || type === "image/webp";
}

function addPending(fileList) {
  const product = currentProduct();
  const incoming = Array.from(fileList || []);
  if (!incoming.length) return;
  const room = 12 - ((product ? product.photos.length : 0) + state.pending.length);
  if (room <= 0) {
    setStatus("Uma peça pode ter no máximo 12 fotos.", "error");
    return;
  }
  const accepted = incoming.slice(0, room);
  if (accepted.length < incoming.length) {
    setStatus("Só cabem mais " + room + " fotos nesta peça.", "warn");
  }
  for (const file of accepted) {
    if (!isAllowedPhoto(file)) {
      setStatus("Use fotos JPEG, PNG ou WebP.", "error");
      return;
    }
    state.pending.push({ file, url: URL.createObjectURL(file) });
  }
  state.dirty = true;
  fillPhotos();
}

async function saveCategory(form) {
  if (state.saving) return;
  state.saving = true;
  try {
    const payload = { label: form.label.value, blurb: form.blurb.value };
    const result = state.view.id
      ? await api("/api/categories/" + encodeURIComponent(state.view.id), {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
      })
      : await api("/api/categories", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
      });
    state.catalog = result.catalog;
    state.dirty = false;
    state.view = { type: "category", id: result.category };
    render();
    setStatus("Categoria salva.", "ok");
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    state.saving = false;
  }
}

async function saveProduct(form) {
  if (state.saving) return;
  state.saving = true;
  try {
    const payload = {
      name: form.name.value,
      desc: form.desc.value,
      materials: form.materials.value.split("\n"),
      price: form.price.value,
      category: form.category.value
    };
    const isNew = !state.view.slug;
    let result = isNew
      ? await api("/api/products", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) })
      : await api("/api/products/" + encodeURIComponent(state.view.category) + "/" + encodeURIComponent(state.view.slug), {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
      });
    state.catalog = result.catalog;
    state.view = { type: "product", category: result.category, slug: result.slug };
    if (state.pending.length) {
      const data = new FormData();
      state.pending.forEach((item) => data.append("photos", item.file));
      result = await api("/api/products/" + encodeURIComponent(state.view.category) + "/" + encodeURIComponent(state.view.slug) + "/photos", {
        method: "POST",
        body: data
      });
      state.catalog = result.catalog;
      clearPending();
    }
    state.dirty = false;
    render();
    setStatus("Peça salva. Quando terminar as alterações, clique em Gerar site.", "ok");
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    state.saving = false;
  }
}

async function removePhoto(index) {
  const result = await api(
    "/api/products/" + encodeURIComponent(state.view.category) + "/" + encodeURIComponent(state.view.slug) + "/photos/" + index,
    { method: "DELETE" }
  );
  state.catalog = result.catalog;
  fillPhotos();
  setStatus("Foto removida. Gere o site de novo para a página pública atualizar.", "ok");
}

async function movePhoto(index, dir) {
  const product = currentProduct();
  if (!product) return;
  const order = product.photos.map((photo) => photo.index);
  const pos = order.indexOf(Number(index));
  const next = pos + dir;
  if (pos < 0 || next < 0 || next >= order.length) return;
  const swap = order[pos];
  order[pos] = order[next];
  order[next] = swap;
  const result = await api(
    "/api/products/" + encodeURIComponent(state.view.category) + "/" + encodeURIComponent(state.view.slug) + "/photos/order",
    { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ order }) }
  );
  state.catalog = result.catalog;
  fillPhotos();
}

async function deleteCategory(id) {
  if (!window.confirm("Excluir esta categoria? Essa ação não desfaz.")) return;
  const result = await api("/api/categories/" + encodeURIComponent(id), { method: "DELETE" });
  state.catalog = result.catalog;
  state.dirty = false;
  state.view = { type: "home" };
  render();
  setStatus("Categoria excluída.", "ok");
}

async function deleteProduct() {
  if (!state.view.slug) return;
  if (!window.confirm("Excluir esta peça e as fotos dela?")) return;
  const category = state.view.category;
  const result = await api(
    "/api/products/" + encodeURIComponent(category) + "/" + encodeURIComponent(state.view.slug),
    { method: "DELETE" }
  );
  state.catalog = result.catalog;
  clearPending();
  state.dirty = false;
  state.view = { type: "category", id: category };
  render();
  setStatus("Peça excluída. Gere o site e publique para tirar ela da página no ar.", "ok");
}

async function buildSite() {
  if (state.dirty) {
    setStatus("Salve as alterações antes de gerar o site.", "error");
    return;
  }
  const button = document.getElementById("btnBuild");
  button.disabled = true;
  button.textContent = "Gerando…";
  try {
    const result = await api("/api/build", { method: "POST" });
    const warnings = result.warnings || [];
    const tail = warnings.length ? " Avisos: " + warnings.join(" ") : "";
    setStatus(
      "Site gerado com " + result.products + " peças. Abra Ver o site para conferir. Para o site no ar mudar, use Publicar." + tail,
      warnings.length ? "warn" : "ok"
    );
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Gerar site";
  }
}

function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "open-category") go({ type: "category", id: button.dataset.id });
  if (action === "edit-category") go({ type: "category-form", id: button.dataset.id });
  if (action === "new-product") go({ type: "product", category: button.dataset.category, slug: null });
  if (action === "open-product") go({ type: "product", category: button.dataset.category, slug: button.dataset.slug });
  if (action === "back-category") {
    go(state.view.id ? { type: "category", id: state.view.id } : { type: "home" });
  }
  if (action === "pick-photos") {
    const input = document.getElementById("photoInput");
    if (input) input.click();
  }
  if (action === "remove-pending") {
    const index = Number(button.dataset.index);
    const removed = state.pending.splice(index, 1)[0];
    if (removed) URL.revokeObjectURL(removed.url);
    fillPhotos();
  }
  if (action === "remove-photo") {
    removePhoto(button.dataset.index).catch((err) => setStatus(err.message, "error"));
  }
  if (action === "move-photo") {
    movePhoto(Number(button.dataset.index), Number(button.dataset.dir)).catch((err) => setStatus(err.message, "error"));
  }
  if (action === "delete-category") {
    deleteCategory(button.dataset.id).catch((err) => setStatus(err.message, "error"));
  }
  if (action === "delete-product") {
    deleteProduct().catch((err) => setStatus(err.message, "error"));
  }
}

document.getElementById("catList").addEventListener("click", onClick);
document.getElementById("workspace").addEventListener("click", onClick);
document.getElementById("btnNewCategory").addEventListener("click", () => go({ type: "category-form" }));
document.getElementById("btnBuild").addEventListener("click", buildSite);

function closePublish() {
  document.getElementById("publishSheet").hidden = true;
}

async function openPublish() {
  if (state.dirty) {
    setStatus("Salve as alterações antes de publicar.", "error");
    return;
  }
  const button = document.getElementById("btnPublish");
  button.disabled = true;
  button.textContent = "Preparando…";
  try {
    const result = await api("/api/publish/preview", { method: "POST" });
    if (result.empty) {
      setStatus("Não há mudanças de peças para publicar.", "warn");
      return;
    }
    document.getElementById("publishMessage").value = result.message || "";
    const files = document.getElementById("publishFiles");
    files.innerHTML = (result.files || []).map((file) => "<li>" + esc(file) + "</li>").join("");
    document.getElementById("publishBranch").textContent = result.branch
      ? "Branch: " + result.branch
      : "";
    document.getElementById("publishSheet").hidden = false;
    document.getElementById("publishMessage").focus();
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Publicar";
  }
}

async function confirmPublish() {
  const confirm = document.getElementById("publishConfirm");
  confirm.disabled = true;
  confirm.textContent = "Enviando…";
  try {
    const result = await api("/api/publish", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ message: document.getElementById("publishMessage").value })
    });
    closePublish();
    if (result.pushed) {
      setStatus("Peças publicadas" + (result.commit ? " (" + result.commit + ")" : "") + ". O site no ar atualiza em instantes.", "ok");
    } else {
      setStatus("O commit ficou neste computador. O envio ao GitHub falhou. " + (result.error || ""), "warn");
    }
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    confirm.disabled = false;
    confirm.textContent = "Enviar ao ar";
  }
}

document.getElementById("btnPublish").addEventListener("click", openPublish);
document.getElementById("publishCancel").addEventListener("click", closePublish);
document.getElementById("publishConfirm").addEventListener("click", confirmPublish);
document.getElementById("publishSheet").addEventListener("click", (event) => {
  if (event.target.id === "publishSheet") closePublish();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePublish();
});

document.getElementById("workspace").addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.dataset.form === "category") saveCategory(event.target);
  if (event.target.dataset.form === "product") saveProduct(event.target);
});

document.getElementById("workspace").addEventListener("input", (event) => {
  if (event.target.id === "photoInput") return;
  state.dirty = true;
  updateSlugHint();
});

document.getElementById("workspace").addEventListener("change", (event) => {
  if (event.target.id !== "photoInput") return;
  addPending(event.target.files);
  event.target.value = "";
});

document.getElementById("workspace").addEventListener("dragover", (event) => {
  if (!event.target.closest("#dropzone")) return;
  event.preventDefault();
  event.target.closest("#dropzone").classList.add("is-over");
});

document.getElementById("workspace").addEventListener("dragleave", (event) => {
  const zone = event.target.closest("#dropzone");
  if (zone) zone.classList.remove("is-over");
});

document.getElementById("workspace").addEventListener("drop", (event) => {
  const zone = event.target.closest("#dropzone");
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-over");
  addPending(event.dataTransfer.files);
});

api("/api/catalog").then((catalog) => {
  state.catalog = catalog;
  render();
  if (catalog.warnings && catalog.warnings.length) {
    setStatus("Há textos para revisar: " + catalog.warnings.join(" "), "warn");
  }
}).catch((err) => setStatus(err.message, "error"));
