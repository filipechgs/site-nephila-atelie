"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_JSON = path.join(ROOT, "site.json");
const IMG = path.join(ROOT, "img");

const DEFAULT_COPY = {
  seoTitle: "Nephila · Crochê & Macramê artesanal por Milena",
  seoDescription: "Nephila — peças artesanais em crochê e macramê por Milena. Bolsas, decoração e acessórios feitos à mão, exclusivos e únicos.",
  seoShare: "Peças artesanais em crochê e macramê: bolsas, decoração e acessórios feitos à mão, exclusivos e únicos.",
  seoKeywords: "Nephila, crochê, macramê, bolsas artesanais, decoração artesanal, acessórios feitos à mão, Milena, ateliê",
  navInicio: "Início",
  navSobre: "Sobre",
  navProdutos: "Produtos",
  navTodas: "Todas as peças",
  navExclusiva: "Exclusividade",
  navContato: "Contato",
  navCta: "Pedir uma peça",
  heroEyebrow: "crochê · macramê · feito à mão",
  heroTitle: "arte em cada linha,\nnó por nó",
  heroCopy: "Peças exclusivas tecidas por **Milena**, da primeira laçada ao último detalhe. Cada Nephila é única — como quem a usa.",
  heroPrimary: "Ver bolsas",
  heroSecondary: "Pedir uma peça",
  aboutEyebrow: "a artesã",
  aboutTitle: "Por trás de cada peça,\nas mãos da *Milena*.",
  aboutTags: ["Peça única", "Feita à mão", "Fios selecionados"],
  productsEyebrow: "ateliê",
  productsTitle: "Peças que carregam história",
  productsIntro: "Bolsas, decoração e acessórios tecidos à mão. Toque numa peça para conhecê-la — disponibilidade e medidas são combinadas direto com a artesã.",
  filterAll: "Todos",
  cardAsk: "Quero saber mais",
  orderButton: "Fazer pedido",
  emptyCategory: "Em breve, novas peças artesanais por aqui.",
  emptyPhoto: "Foto em breve",
  exclusiveEyebrow: "trabalho artesanal",
  exclusiveTitle: "Nada de prateleira.\nNada de duas iguais.",
  exclusiveLead: "Cada Nephila é produzida para ser **única**: o textura, o caimento e o acabamento variam a cada peça — é a assinatura do feito à mão.",
  exclusiveCta: "Quer uma peça exclusiva ou saber a disponibilidade de uma bolsa?\n**Fale direto com Milena:**",
  exclusiveWhatsapp: "WhatsApp",
  exclusiveEmail: "E-mail",
  exclusiveCards: [
    { title: "Peça única", text: "Nenhuma bolsa sai do tear igual à anterior. Você leva algo só seu." },
    { title: "Sob encomenda", text: "Produção sob demanda: a peça é feita pensando no seu gosto." },
    { title: "Atendimento direto", text: "Disponibilidade, medidas e prazos são combinados diretamente com a artesã." }
  ],
  contactEyebrow: "conversar com a artesã",
  contactTitle: "Encomende ou tire dúvidas",
  contactIntro: "Disponibilidade, valores e entrega são sempre combinados direto com a Milena. É só chamar no canal que preferir — ela responde com carinho.",
  formNameLabel: "Seu nome",
  formNamePlaceholder: "Como podemos te chamar?",
  formMessageLabel: "Mensagem",
  formMessagePlaceholder: "Olá, Milena! Gostaria de saber a disponibilidade de…",
  formSubmit: "Enviar pelo WhatsApp",
  formHint: "O formulário abre uma conversa no WhatsApp com a mensagem pronta para enviar.",
  footerCredit: "Nephila · Crochê & Macramê · Feito à mão pela Milena",
  floatLabel: "Conversar com Milena no WhatsApp"
};

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function line(value, max, label, required) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) {
    if (required) fail(400, label + " não pode ficar vazio.");
    return "";
  }
  if (text.length > max) fail(400, label + " está longo demais.");
  return text;
}

function block(value, max, label) {
  const text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) fail(400, label + " não pode ficar vazio.");
  if (text.length > max) fail(400, label + " está longo demais.");
  return text;
}

function paragraphs(value, label) {
  const parts = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!parts.length) fail(400, label + " não pode ficar vazia.");
  if (parts.length > 6) fail(400, label + " tem parágrafos demais. O máximo é 6.");
  parts.forEach((part) => {
    if (part.length > 800) fail(400, label + " tem um parágrafo longo demais.");
  });
  return parts;
}

function itemLines(value, label, min, maxCount, maxLen) {
  const parts = String(value ?? "")
    .split(/\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length < min) fail(400, label + " precisa de pelo menos " + min + ".");
  if (parts.length > maxCount) fail(400, label + " tem itens demais.");
  parts.forEach((part) => {
    if (part.length > maxLen) fail(400, label + " tem um item longo demais.");
  });
  return parts;
}

function whatsappNumber(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = "55" + digits;
  if (digits.length < 12 || digits.length > 15) {
    fail(400, "O WhatsApp precisa ter DDD e o 55 do Brasil. Exemplo: 5571993044037.");
  }
  return digits;
}

function emailAddress(value) {
  const text = line(value, 120, "O e-mail", true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) fail(400, "O e-mail não parece válido.");
  return text;
}

function httpUrl(value, label) {
  let text = line(value, 300, label, true);
  if (!/^https?:\/\//i.test(text)) text = "https://" + text;
  let url;
  try {
    url = new URL(text);
  } catch (err) {
    fail(400, label + " precisa ser um endereço da internet.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(400, label + " precisa começar com https://");
  }
  return url.toString();
}

function photoPath(value) {
  const norm = String(value || "").replace(/\\/g, "/");
  if (!/^img\/milena\.(jpe?g|png|webp)$/i.test(norm)) return "img/milena.jpeg";
  return norm;
}

function copyFrom(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const copy = {};
  Object.keys(DEFAULT_COPY).forEach((key) => {
    if (key === "aboutTags" || key === "exclusiveCards") return;
    copy[key] = source[key] ? source[key] : DEFAULT_COPY[key];
  });
  copy.aboutTags = Array.isArray(source.aboutTags) && source.aboutTags.length
    ? source.aboutTags.map((item) => String(item))
    : DEFAULT_COPY.aboutTags.slice();
  copy.exclusiveCards = DEFAULT_COPY.exclusiveCards.map((card, index) => {
    const saved = source.exclusiveCards && source.exclusiveCards[index] ? source.exclusiveCards[index] : {};
    return {
      title: saved.title || card.title,
      text: saved.text || card.text
    };
  });
  return copy;
}

function shape(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const artisan = data.artisan || {};
  const contact = data.contact || {};
  const bio = Array.isArray(artisan.bio) && artisan.bio.length
    ? artisan.bio.map((item) => String(item))
    : [
      "Cada peça Nephila nasce nas mãos de Milena, linha por linha, nó por nó.",
      "O nome vem da aranha Nephila, que tece fios de seda dourada e resistente. É assim que Milena tece: tramas delicadas, feitas para durar."
    ];
  return {
    brand: data.brand || "Nephila",
    artisan: {
      name: artisan.name || "Milena",
      firstName: artisan.firstName || artisan.name || "Milena",
      role: artisan.role || "Artesã · Crochê & Macramê",
      bio,
      photo: photoPath(artisan.photo)
    },
    contact: {
      whatsappNumber: contact.whatsappNumber || "5571993044037",
      whatsappDisplay: contact.whatsappDisplay || "(71) 99304-4037",
      whatsappMessage: contact.whatsappMessage || "Olá, Milena! Vi o site Nephila e quero saber mais sobre suas peças.",
      email: contact.email || "milena@nephila.com.br",
      instagram: contact.instagram || "https://instagram.com/seu-perfil",
      mercadoLivre: contact.mercadoLivre || "https://www.mercadolivre.com.br/perfil/seu-perfil"
    },
    copy: copyFrom(data.copy)
  };
}

function readRaw() {
  if (!fs.existsSync(SITE_JSON)) fail(500, "site.json não encontrado.");
  try {
    return JSON.parse(fs.readFileSync(SITE_JSON, "utf8"));
  } catch (err) {
    fail(500, "site.json está ilegível.");
  }
}

function writeRaw(site) {
  const tmp = SITE_JSON + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(site, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, SITE_JSON);
}

function readSite() {
  return shape(readRaw());
}

function toFields(site) {
  const copy = site.copy;
  return {
    brand: site.brand,
    name: site.artisan.name,
    firstName: site.artisan.firstName,
    role: site.artisan.role,
    bio: site.artisan.bio.join("\n\n"),
    photo: site.artisan.photo,
    whatsappNumber: site.contact.whatsappNumber,
    whatsappDisplay: site.contact.whatsappDisplay,
    whatsappMessage: site.contact.whatsappMessage,
    email: site.contact.email,
    instagram: site.contact.instagram,
    mercadoLivre: site.contact.mercadoLivre,
    seoTitle: copy.seoTitle,
    seoDescription: copy.seoDescription,
    seoShare: copy.seoShare,
    seoKeywords: copy.seoKeywords,
    navInicio: copy.navInicio,
    navSobre: copy.navSobre,
    navProdutos: copy.navProdutos,
    navTodas: copy.navTodas,
    navExclusiva: copy.navExclusiva,
    navContato: copy.navContato,
    navCta: copy.navCta,
    heroEyebrow: copy.heroEyebrow,
    heroTitle: copy.heroTitle,
    heroCopy: copy.heroCopy,
    heroPrimary: copy.heroPrimary,
    heroSecondary: copy.heroSecondary,
    aboutEyebrow: copy.aboutEyebrow,
    aboutTitle: copy.aboutTitle,
    aboutTags: copy.aboutTags.join("\n"),
    productsEyebrow: copy.productsEyebrow,
    productsTitle: copy.productsTitle,
    productsIntro: copy.productsIntro,
    filterAll: copy.filterAll,
    cardAsk: copy.cardAsk,
    orderButton: copy.orderButton,
    emptyCategory: copy.emptyCategory,
    emptyPhoto: copy.emptyPhoto,
    exclusiveEyebrow: copy.exclusiveEyebrow,
    exclusiveTitle: copy.exclusiveTitle,
    exclusiveLead: copy.exclusiveLead,
    exclusive1Title: copy.exclusiveCards[0].title,
    exclusive1Text: copy.exclusiveCards[0].text,
    exclusive2Title: copy.exclusiveCards[1].title,
    exclusive2Text: copy.exclusiveCards[1].text,
    exclusive3Title: copy.exclusiveCards[2].title,
    exclusive3Text: copy.exclusiveCards[2].text,
    exclusiveCta: copy.exclusiveCta,
    exclusiveWhatsapp: copy.exclusiveWhatsapp,
    exclusiveEmail: copy.exclusiveEmail,
    contactEyebrow: copy.contactEyebrow,
    contactTitle: copy.contactTitle,
    contactIntro: copy.contactIntro,
    formNameLabel: copy.formNameLabel,
    formNamePlaceholder: copy.formNamePlaceholder,
    formMessageLabel: copy.formMessageLabel,
    formMessagePlaceholder: copy.formMessagePlaceholder,
    formSubmit: copy.formSubmit,
    formHint: copy.formHint,
    footerCredit: copy.footerCredit,
    floatLabel: copy.floatLabel
  };
}

function siteFromFields(input, photo) {
  const body = input || {};
  return {
    brand: line(body.brand, 40, "O nome da marca", true),
    artisan: {
      name: line(body.name, 80, "O nome", true),
      firstName: line(body.firstName, 40, "O nome nas mensagens", true),
      role: line(body.role, 80, "A função", true),
      bio: paragraphs(body.bio, "A biografia"),
      photo: photoPath(photo)
    },
    contact: {
      whatsappNumber: whatsappNumber(body.whatsappNumber),
      whatsappDisplay: line(body.whatsappDisplay, 40, "O WhatsApp como aparece no site", true),
      whatsappMessage: line(body.whatsappMessage, 400, "A mensagem do WhatsApp", true),
      email: emailAddress(body.email),
      instagram: httpUrl(body.instagram, "O Instagram"),
      mercadoLivre: httpUrl(body.mercadoLivre, "O Mercado Livre")
    },
    copy: {
      seoTitle: line(body.seoTitle, 140, "O título do Google", true),
      seoDescription: block(body.seoDescription, 320, "A descrição do Google"),
      seoShare: block(body.seoShare, 320, "O texto de compartilhamento"),
      seoKeywords: line(body.seoKeywords, 300, "As palavras do Google", true),
      navInicio: line(body.navInicio, 30, "O menu Início", true),
      navSobre: line(body.navSobre, 30, "O menu Sobre", true),
      navProdutos: line(body.navProdutos, 30, "O menu Produtos", true),
      navTodas: line(body.navTodas, 40, "O menu Todas as peças", true),
      navExclusiva: line(body.navExclusiva, 30, "O menu Exclusividade", true),
      navContato: line(body.navContato, 30, "O menu Contato", true),
      navCta: line(body.navCta, 40, "O botão do menu", true),
      heroEyebrow: line(body.heroEyebrow, 80, "A frase pequena do início", true),
      heroTitle: block(body.heroTitle, 160, "O título do início"),
      heroCopy: block(body.heroCopy, 500, "O texto do início"),
      heroPrimary: line(body.heroPrimary, 40, "O botão das peças", true),
      heroSecondary: line(body.heroSecondary, 40, "O botão de pedir", true),
      aboutEyebrow: line(body.aboutEyebrow, 80, "A frase pequena do Sobre", true),
      aboutTitle: block(body.aboutTitle, 180, "O título do Sobre"),
      aboutTags: itemLines(body.aboutTags, "Os selos do Sobre", 1, 6, 40),
      productsEyebrow: line(body.productsEyebrow, 80, "A frase pequena das peças", true),
      productsTitle: block(body.productsTitle, 160, "O título das peças"),
      productsIntro: block(body.productsIntro, 500, "O texto das peças"),
      filterAll: line(body.filterAll, 30, "O filtro Todas", true),
      cardAsk: line(body.cardAsk, 40, "O texto do card", true),
      orderButton: line(body.orderButton, 40, "O botão de pedido", true),
      emptyCategory: line(body.emptyCategory, 160, "O aviso de categoria vazia", true),
      emptyPhoto: line(body.emptyPhoto, 40, "O aviso sem foto", true),
      exclusiveEyebrow: line(body.exclusiveEyebrow, 80, "A frase pequena da exclusividade", true),
      exclusiveTitle: block(body.exclusiveTitle, 180, "O título da exclusividade"),
      exclusiveLead: block(body.exclusiveLead, 500, "O texto da exclusividade"),
      exclusiveCards: [1, 2, 3].map((n) => ({
        title: line(body["exclusive" + n + "Title"], 60, "O título do bloco " + n, true),
        text: block(body["exclusive" + n + "Text"], 280, "O texto do bloco " + n)
      })),
      exclusiveCta: block(body.exclusiveCta, 300, "O convite da exclusividade"),
      exclusiveWhatsapp: line(body.exclusiveWhatsapp, 30, "O botão de WhatsApp", true),
      exclusiveEmail: line(body.exclusiveEmail, 30, "O botão de e-mail", true),
      contactEyebrow: line(body.contactEyebrow, 80, "A frase pequena do contato", true),
      contactTitle: block(body.contactTitle, 160, "O título do contato"),
      contactIntro: block(body.contactIntro, 500, "O texto do contato"),
      formNameLabel: line(body.formNameLabel, 40, "O rótulo do nome", true),
      formNamePlaceholder: line(body.formNamePlaceholder, 80, "O exemplo do nome", true),
      formMessageLabel: line(body.formMessageLabel, 40, "O rótulo da mensagem", true),
      formMessagePlaceholder: line(body.formMessagePlaceholder, 160, "O exemplo da mensagem", true),
      formSubmit: line(body.formSubmit, 60, "O botão do formulário", true),
      formHint: line(body.formHint, 220, "A explicação do formulário", true),
      footerCredit: line(body.footerCredit, 180, "O rodapé", true),
      floatLabel: line(body.floatLabel, 80, "O nome do botão de WhatsApp", true)
    }
  };
}

function updateSite(input) {
  const current = readSite();
  const site = siteFromFields(input, current.artisan.photo);
  writeRaw(site);
  return toFields(site);
}

function photoExt(file) {
  const name = String((file && file.originalname) || "").toLowerCase();
  const type = String((file && file.mimetype) || "").toLowerCase();
  if (type === "image/png" || /\.png$/.test(name)) return "png";
  if (type === "image/webp" || /\.webp$/.test(name)) return "webp";
  if (type === "image/jpeg" || type === "image/jpg" || /\.jpe?g$/.test(name)) return "jpeg";
  return "";
}

function savePhoto(file) {
  if (!file || !file.buffer || !file.buffer.length) fail(400, "Escolha uma foto.");
  const ext = photoExt(file);
  if (!ext) fail(400, "Use uma foto JPEG, PNG ou WebP.");
  const filename = "milena." + ext;
  const dest = path.join(IMG, filename);
  const rel = path.relative(IMG, dest);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) fail(400, "Não foi possível guardar a foto.");
  fs.mkdirSync(IMG, { recursive: true });
  fs.writeFileSync(dest, file.buffer);
  ["milena.jpeg", "milena.jpg", "milena.png", "milena.webp"].forEach((other) => {
    if (other === filename) return;
    const abs = path.join(IMG, other);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  });
  const site = readSite();
  site.artisan.photo = "img/" + filename;
  writeRaw(site);
  return toFields(site);
}

module.exports = {
  DEFAULT_COPY,
  readSite,
  toFields,
  updateSite,
  savePhoto
};
