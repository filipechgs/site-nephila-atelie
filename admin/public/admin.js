"use strict";

const state = {
  catalog: { categories: [], warnings: [] },
  view: { type: "home" },
  dirty: false,
  pending: [],
  site: null,
  sitePhoto: null,
  siteStamp: 0,
  unpublished: false,
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

let statusTimer = null;

function setStatus(message, kind) {
  const el = document.getElementById("status");
  const text = document.getElementById("statusText");
  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
  if (!message) {
    el.hidden = true;
    el.className = "status";
    text.textContent = "";
    return;
  }
  el.hidden = false;
  el.className = "status" + (kind ? " is-" + kind : "");
  text.textContent = message;
  statusTimer = setTimeout(() => setStatus(""), 6000);
}

function pieceNeedsSave() {
  if (state.view.type !== "product") return false;
  if (!state.view.slug) return true;
  return state.dirty || state.pending.length > 0;
}

function siteNeedsSave() {
  return state.view.type === "site" && (state.dirty || !!state.sitePhoto);
}

function unsaved() {
  return state.dirty || state.pending.length > 0 || !!state.sitePhoto;
}

function syncActionBar() {
  const savePiece = pieceNeedsSave();
  const saveSite = siteNeedsSave();
  const save = savePiece || saveSite;
  const publish = !save && state.unpublished;
  const bar = document.getElementById("actionBar");
  document.getElementById("btnSavePiece").hidden = !savePiece;
  document.getElementById("btnSaveSite").hidden = !saveSite;
  document.getElementById("btnPublish").hidden = !publish;
  document.getElementById("btnBuild").hidden = save;
  bar.classList.toggle("is-saving", save);
  bar.classList.toggle("is-single", !save && !publish);
}

function refreshUnpublished() {
  return api("/api/publish/pending").then((result) => {
    state.unpublished = !result.empty;
    syncActionBar();
  }).catch(() => {
    state.unpublished = false;
    syncActionBar();
  });
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

function clearSitePhoto() {
  if (state.sitePhoto) URL.revokeObjectURL(state.sitePhoto.url);
  state.sitePhoto = null;
}

function go(view) {
  if (unsaved() && !window.confirm("Há alterações não salvas. Quer descartar?")) return;
  clearPending();
  clearSitePhoto();
  state.dirty = false;
  state.view = view;
  render();
  scrollFormToTop();
}

function scrollFormToTop() {
  if (state.view.type !== "category" && state.view.type !== "category-form" && state.view.type !== "product" && state.view.type !== "site") return;
  const workspace = document.getElementById("workspace");
  if (!workspace) return;
  const top = workspace.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
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
    "<li>Clique em <strong>Ver Site</strong> para atualizar a página neste computador. Depois, <strong>Publicar atualização</strong> envia as peças ao ar.</li>" +
    "</ol>" +
    "<p class=\"hint\">Os textos da página, o contato e a foto da Milena ficam em <strong>Textos e foto</strong>.</p>" +
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
    "<form class=\"form\" id=\"productForm\" data-form=\"product\">" +
    "<label><span>Categoria</span><select name=\"category\" required>" + categoryOptions(selected) + "</select></label>" +
    "<label><span>Nome da peça</span><input name=\"name\" type=\"text\" required maxlength=\"80\" value=\"" + esc(product ? product.name : "") + "\" placeholder=\"Rita\">" +
    "<p class=\"slug\" id=\"slugHint\"></p></label>" +
    "<label><span>Descrição</span><textarea name=\"desc\" required maxlength=\"4000\" placeholder=\"Bolsa artesanal com acabamento impecável e fios selecionados.\">" + esc(product ? product.desc : "") + "</textarea>" +
    "<p class=\"hint\">Parágrafo que aparece logo abaixo do nome.</p></label>" +
    "<label><span>Materiais</span><textarea name=\"materials\" maxlength=\"2000\" placeholder=\"Fio de algodão&#10;Forro de tecido\">" + esc(materials) + "</textarea>" +
    "<p class=\"hint\">Um material por linha. Pode deixar em branco.</p></label>" +
    "<label><span>Técnica</span><input name=\"technique\" type=\"text\" maxlength=\"200\" value=\"" + esc(product && product.technique ? product.technique : "") + "\" placeholder=\"Crochê, Macramê\">" +
    "<p class=\"hint\">Separe por vírgula. No site aparece como Crochê · Macramê. Em branco, fica o padrão Crochê, Macramê.</p></label>" +
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
    (product
      ? "<div class=\"form__row\"><button class=\"btn btn--quiet\" type=\"button\" data-action=\"delete-product\">Excluir peça</button></div>"
      : "") +
    "</form>"
  );
}

const SITE_FIELDS = [
  { section: "A artesã", name: "name", label: "Nome", hint: "Aparece em negrito no início da página.", max: 80 },
  { name: "firstName", label: "Nome nas mensagens", hint: "O WhatsApp começa com Olá e este nome.", max: 40 },
  { name: "role", label: "Função", hint: "Aparece no Google, junto com o nome.", max: 80 },
  { name: "bio", label: "Biografia", hint: "Uma linha em branco separa os parágrafos. Aparece na seção Sobre.", max: 4000, area: true, rows: 8 },
  { section: "Contato", name: "whatsappNumber", label: "WhatsApp, só números", hint: "Com o 55 do Brasil. Exemplo: 5571993044037.", max: 20 },
  { name: "whatsappDisplay", label: "WhatsApp como aparece no site", hint: "Exemplo: (71) 99304-4037.", max: 40 },
  { name: "whatsappMessage", label: "Mensagem inicial do WhatsApp", hint: "Abre quando alguém toca no WhatsApp do site.", max: 400 },
  { name: "email", label: "E-mail", max: 120 },
  { name: "instagram", label: "Instagram", hint: "O endereço completo, começando com https://", max: 300 },
  { name: "mercadoLivre", label: "Mercado Livre", hint: "O endereço completo, começando com https://", max: 300 },
  { section: "Início", name: "heroEyebrow", label: "Frase pequena", hint: "Fica acima do título.", max: 80 },
  { name: "heroTitle", label: "Título", hint: "Enter quebra a linha. **negrito** e *itálico* também valem nos títulos e parágrafos.", max: 160, area: true, rows: 3, short: true },
  { name: "heroCopy", label: "Texto", max: 500, area: true, rows: 4 },
  { name: "heroPrimary", label: "Botão das peças", max: 40 },
  { name: "heroSecondary", label: "Botão de pedir", max: 40 },
  { section: "Menu", name: "navInicio", label: "Início", max: 30 },
  { name: "navSobre", label: "Sobre", max: 30 },
  { name: "navProdutos", label: "Produtos", max: 30 },
  { name: "navTodas", label: "Todas as peças", max: 40 },
  { name: "navExclusiva", label: "Exclusividade", max: 30 },
  { name: "navContato", label: "Contato", max: 30 },
  { name: "navCta", label: "Botão do menu", max: 40 },
  { section: "Sobre", name: "aboutEyebrow", label: "Frase pequena", max: 80 },
  { name: "aboutTitle", label: "Título", hint: "Enter quebra a linha.", max: 180, area: true, rows: 3, short: true },
  { name: "aboutTags", label: "Selos", hint: "Um selo por linha. Ficam abaixo da biografia.", max: 300, area: true, rows: 4, short: true },
  { section: "Peças", name: "productsEyebrow", label: "Frase pequena", max: 80 },
  { name: "productsTitle", label: "Título", max: 160, area: true, rows: 2, short: true },
  { name: "productsIntro", label: "Texto", max: 500, area: true, rows: 4 },
  { name: "filterAll", label: "Filtro de todas as categorias", max: 30 },
  { name: "cardAsk", label: "Texto no card", hint: "Aparece em cada peça, ao lado da técnica.", max: 40 },
  { name: "orderButton", label: "Botão de pedido", hint: "Fica na página da peça, e abre o WhatsApp.", max: 40 },
  { name: "emptyCategory", label: "Categoria sem peças", max: 160 },
  { name: "emptyPhoto", label: "Peça sem foto", max: 40 },
  { section: "Exclusividade", name: "exclusiveEyebrow", label: "Frase pequena", max: 80 },
  { name: "exclusiveTitle", label: "Título", hint: "Enter quebra a linha.", max: 180, area: true, rows: 3, short: true },
  { name: "exclusiveLead", label: "Texto", max: 500, area: true, rows: 4 },
  { name: "exclusive1Title", label: "Bloco 1, título", max: 60 },
  { name: "exclusive1Text", label: "Bloco 1, texto", max: 280, area: true, rows: 3, short: true },
  { name: "exclusive2Title", label: "Bloco 2, título", max: 60 },
  { name: "exclusive2Text", label: "Bloco 2, texto", max: 280, area: true, rows: 3, short: true },
  { name: "exclusive3Title", label: "Bloco 3, título", max: 60 },
  { name: "exclusive3Text", label: "Bloco 3, texto", max: 280, area: true, rows: 3, short: true },
  { name: "exclusiveCta", label: "Convite", hint: "Enter quebra a linha.", max: 300, area: true, rows: 3, short: true },
  { name: "exclusiveWhatsapp", label: "Botão de WhatsApp", max: 30 },
  { name: "exclusiveEmail", label: "Botão de e-mail", max: 30 },
  { section: "Contato na página", name: "contactEyebrow", label: "Frase pequena", max: 80 },
  { name: "contactTitle", label: "Título", max: 160 },
  { name: "contactIntro", label: "Texto", max: 500, area: true, rows: 4 },
  { name: "formNameLabel", label: "Rótulo do nome", max: 40 },
  { name: "formNamePlaceholder", label: "Exemplo do nome", max: 80 },
  { name: "formMessageLabel", label: "Rótulo da mensagem", max: 40 },
  { name: "formMessagePlaceholder", label: "Exemplo da mensagem", max: 160 },
  { name: "formSubmit", label: "Botão do formulário", max: 60 },
  { name: "formHint", label: "Explicação do formulário", max: 220 },
  { name: "floatLabel", label: "Nome do botão redondo", hint: "É o botão de WhatsApp que fica no canto da página.", max: 80 },
  { section: "Rodapé", name: "footerCredit", label: "Crédito", hint: "O ano é colocado sozinho, antes desta frase.", max: 180 },
  { section: "A marca", name: "brand", label: "Nome da marca", max: 40 },
  { section: "Google", name: "seoTitle", label: "Título", hint: "Aparece na aba do navegador e quando alguém procura o site.", max: 140 },
  { name: "seoDescription", label: "Descrição", max: 320, area: true, rows: 3, short: true },
  { name: "seoShare", label: "Texto ao compartilhar", hint: "Aparece quando o site é enviado no WhatsApp ou nas redes.", max: 320, area: true, rows: 3, short: true },
  { name: "seoKeywords", label: "Palavras", hint: "Separe por vírgula.", max: 300 }
];

function siteField(field, value) {
  const max = " maxlength=\"" + field.max + "\"";
  if (field.area) {
    return "<textarea name=\"" + field.name + "\" rows=\"" + (field.rows || 4) + "\"" + (field.short ? " class=\"short\"" : "") + max + " required>" + esc(value || "") + "</textarea>";
  }
  return "<input name=\"" + field.name + "\" type=\"text\"" + max + " required value=\"" + esc(value || "") + "\">";
}

function sitePhotoBlock() {
  const src = state.sitePhoto
    ? state.sitePhoto.url
    : (state.site && state.site.photo ? "/" + state.site.photo + "?t=" + (state.siteStamp || 1) : "");
  return (
    "<div class=\"portrait\"><img id=\"sitePhotoPreview\" src=\"" + esc(src) + "\" alt=\"Foto da Milena\"></div>" +
    "<div class=\"dropzone\" id=\"siteDrop\">" +
    "<p>Esta foto aparece na seção Sobre. JPEG, PNG ou WebP.</p>" +
    (state.sitePhoto ? "<p class=\"hint\">A nova foto entra quando você salvar.</p>" : "") +
    "<button class=\"btn btn--small btn--ghost\" type=\"button\" data-action=\"pick-site-photo\">Trocar foto</button>" +
    "<input id=\"sitePhotoInput\" type=\"file\" accept=\".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp\" hidden>" +
    "</div>"
  );
}

function renderSiteForm() {
  if (!state.site) {
    return "<h2>Textos e foto</h2><p class=\"empty\">Os textos ainda não carregaram. Atualize a página.</p>";
  }
  let section = "";
  const fields = SITE_FIELDS.map((field) => {
    let html = "";
    if (field.section !== section) {
      section = field.section;
      html += "<h3 class=\"form-section\">" + esc(section) + "</h3>";
      if (section === "A artesã") html += sitePhotoBlock();
    }
    html += "<label><span>" + esc(field.label) + "</span>" + siteField(field, state.site[field.name]) +
      (field.hint ? "<p class=\"hint\">" + esc(field.hint) + "</p>" : "") + "</label>";
    return html;
  }).join("");
  return (
    "<h2>Textos e foto</h2>" +
    "<p class=\"hint\">Quando mudar um texto ou a foto, <strong>Salvar textos e fotos</strong> aparece aqui embaixo.</p>" +
    "<form class=\"form\" id=\"siteForm\" data-form=\"site\" autocomplete=\"off\">" + fields + "</form>"
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
  } else if (state.view.type === "site") {
    workspace.innerHTML = renderSiteForm();
  } else {
    workspace.innerHTML = renderHome();
  }
}

function render() {
  renderCategories();
  const siteButton = document.getElementById("btnEditSite");
  if (siteButton) siteButton.classList.toggle("is-active", state.view.type === "site");
  renderWorkspace();
  syncActionBar();
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
  syncActionBar();
}

function setSitePhoto(fileList) {
  const file = Array.from(fileList || [])[0];
  if (!file) return;
  if (!isAllowedPhoto(file)) {
    setStatus("Use uma foto JPEG, PNG ou WebP.", "error");
    return;
  }
  clearSitePhoto();
  state.sitePhoto = { file, url: URL.createObjectURL(file) };
  state.dirty = true;
  const img = document.getElementById("sitePhotoPreview");
  if (img) img.src = state.sitePhoto.url;
  const zone = document.getElementById("siteDrop");
  if (zone && !zone.querySelector(".hint")) {
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = "A nova foto entra quando você salvar.";
    zone.insertBefore(note, zone.querySelector("button"));
  }
  syncActionBar();
}

async function saveSite(form) {
  if (state.saving) return;
  if (!state.site) {
    setStatus("Os textos ainda não carregaram.", "error");
    return;
  }
  state.saving = true;
  const payload = {};
  SITE_FIELDS.forEach((field) => {
    payload[field.name] = form.elements[field.name].value;
  });
  try {
    let result = await api("/api/site", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload)
    });
    state.site = result.fields;
    if (state.sitePhoto) {
      const data = new FormData();
      data.append("photo", state.sitePhoto.file);
      result = await api("/api/site/photo", { method: "POST", body: data });
      state.site = result.fields;
      clearSitePhoto();
    }
    state.dirty = false;
    state.siteStamp = Date.now();
    state.unpublished = true;
    render();
    setStatus("Textos salvos.", "ok");
    refreshUnpublished();
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    state.saving = false;
  }
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
    scrollFormToTop();
    setStatus("Categoria salva.", "ok");
    refreshUnpublished();
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
      technique: form.technique.value,
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
    state.unpublished = true;
    render();
    setStatus("Peça salva.", "ok");
    refreshUnpublished();
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
  refreshUnpublished();
  setStatus("Foto removida.", "ok");
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
  refreshUnpublished();
}

async function deleteCategory(id) {
  if (!window.confirm("Excluir esta categoria? Essa ação não desfaz.")) return;
  const result = await api("/api/categories/" + encodeURIComponent(id), { method: "DELETE" });
  state.catalog = result.catalog;
  state.dirty = false;
  state.view = { type: "home" };
  render();
  setStatus("Categoria excluída.", "ok");
  refreshUnpublished();
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
  setStatus("Peça excluída. Use Ver Site e publique para tirar ela da página no ar.", "ok");
  refreshUnpublished();
}

async function buildSite() {
  if (state.dirty || state.pending.length || state.sitePhoto) {
    setStatus("Salve as alterações antes de ver o site.", "error");
    return;
  }
  const button = document.getElementById("btnBuild");
  button.disabled = true;
  button.textContent = "Abrindo…";
  try {
    const result = await api("/api/build", { method: "POST" });
    const warnings = result.warnings || [];
    const tail = warnings.length ? " Avisos: " + warnings.join(" ") : "";
    window.open("/", "_blank", "noopener");
    refreshUnpublished();
    setStatus(
      "Página atualizada neste computador, com " + result.products + " peças." + tail,
      warnings.length ? "warn" : "ok"
    );
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Ver Site";
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
  if (action === "pick-site-photo") {
    const input = document.getElementById("sitePhotoInput");
    if (input) input.click();
  }
  if (action === "remove-pending") {
    const index = Number(button.dataset.index);
    const removed = state.pending.splice(index, 1)[0];
    if (removed) URL.revokeObjectURL(removed.url);
    fillPhotos();
    syncActionBar();
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
document.getElementById("btnEditSite").addEventListener("click", () => go({ type: "site" }));
document.getElementById("btnBuild").addEventListener("click", buildSite);

function closePublish() {
  document.getElementById("publishSheet").hidden = true;
}

async function openPublish() {
  if (unsaved()) {
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
    button.textContent = "Publicar atualização";
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
    state.unpublished = !result.pushed;
    syncActionBar();
    refreshUnpublished();
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
document.getElementById("statusClose").addEventListener("click", () => setStatus(""));
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
  if (event.target.dataset.form === "site") saveSite(event.target);
});

document.getElementById("workspace").addEventListener("input", (event) => {
  if (event.target.id === "photoInput" || event.target.id === "sitePhotoInput") return;
  state.dirty = true;
  updateSlugHint();
  syncActionBar();
});

document.getElementById("workspace").addEventListener("change", (event) => {
  if (event.target.id === "sitePhotoInput") {
    setSitePhoto(event.target.files);
    event.target.value = "";
    return;
  }
  if (event.target.id !== "photoInput") return;
  addPending(event.target.files);
  event.target.value = "";
});

function dropZone(event) {
  return event.target.closest("#dropzone, #siteDrop");
}

document.getElementById("workspace").addEventListener("dragover", (event) => {
  const zone = dropZone(event);
  if (!zone) return;
  event.preventDefault();
  zone.classList.add("is-over");
});

document.getElementById("workspace").addEventListener("dragleave", (event) => {
  const zone = dropZone(event);
  if (zone) zone.classList.remove("is-over");
});

document.getElementById("workspace").addEventListener("drop", (event) => {
  const zone = dropZone(event);
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-over");
  if (zone.id === "siteDrop") setSitePhoto(event.dataTransfer.files);
  else addPending(event.dataTransfer.files);
});

api("/api/catalog").then((catalog) => {
  state.catalog = catalog;
  render();
  refreshUnpublished();
  if (catalog.warnings && catalog.warnings.length) {
    setStatus("Há textos para revisar: " + catalog.warnings.join(" "), "warn");
  }
}).catch((err) => setStatus(err.message, "error"));

api("/api/site").then((result) => {
  state.site = result.fields;
  if (state.view.type === "site") render();
}).catch((err) => setStatus(err.message, "error"));
