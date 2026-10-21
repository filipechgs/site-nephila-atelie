/* ============================================================
   NEPHILA — main.js
   Renderiza a página a partir de js/data.js.
   Fluxo: produtos/ + site.json -> build -> data.js -> main.js
   Peças: painel (npm start) ou pasta produtos/. Comportamento da página: aqui.
   ============================================================ */

(function () {
  "use strict";

  const D = SITE; // atalho para js/data.js

  /* ---------------- Helpers ---------------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const waUrl = (msg) =>
    "https://wa.me/" + D.contact.whatsappNumber + "?text=" + encodeURIComponent(msg);
  const catOf = (id) => D.categories.find((c) => c.id === id);
  const copy = D.copy || {};

  function siteText(key, fallback) {
    return copy[key] || fallback;
  }

  function rich(value) {
    return esc(value)
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function setRich(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.innerHTML = rich(value);
  }

  function setMeta(selector, value) {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute("content", value);
  }

  function applySite() {
    document.title = siteText("seoTitle", D.brand + " · Crochê & Macramê artesanal por " + D.artisan.firstName);
    setMeta('meta[name="description"]', copy.seoDescription);
    setMeta('meta[name="keywords"]', copy.seoKeywords);
    setMeta('meta[name="author"]', D.artisan.name + " · " + D.brand);
    setMeta('meta[property="og:title"]', copy.seoTitle);
    setMeta('meta[property="og:description"]', copy.seoShare);
    setMeta('meta[property="og:site_name"]', D.brand);
    setMeta('meta[name="twitter:title"]', copy.seoTitle);
    setMeta('meta[name="twitter:description"]', copy.seoShare);

    const brandLink = document.querySelector(".navbar__brand");
    if (brandLink && D.brand) brandLink.setAttribute("aria-label", D.brand + " – voltar ao início");
    const logo = document.querySelector(".navbar__logo");
    if (logo && D.brand) logo.alt = "Logo " + D.brand;

    setText("heroEyebrow", copy.heroEyebrow);
    setRich("heroTitle", copy.heroTitle);
    setRich("heroCopy", copy.heroCopy);
    setText("heroPrimary", copy.heroPrimary);
    setText("heroSecondary", copy.heroSecondary);

    const photo = document.getElementById("aboutPhoto");
    if (photo && D.artisan.photo) {
      photo.src = D.artisan.photo + (D.artisan.photoVersion ? "?v=" + D.artisan.photoVersion : "");
      photo.alt = D.artisan.name + ", artesã da " + D.brand;
    }
    setText("aboutEyebrow", copy.aboutEyebrow);
    setRich("aboutTitle", copy.aboutTitle);
    const tags = document.getElementById("aboutTags");
    if (tags && Array.isArray(copy.aboutTags) && copy.aboutTags.length) {
      tags.innerHTML = copy.aboutTags.map((tag) => '<span class="tag">' + esc(tag) + "</span>").join("");
    }

    setText("productsEyebrow", copy.productsEyebrow);
    setRich("productsTitle", copy.productsTitle);
    setText("productsIntro", copy.productsIntro);

    setText("exclusiveEyebrow", copy.exclusiveEyebrow);
    setRich("exclusiveTitle", copy.exclusiveTitle);
    setRich("exclusiveLead", copy.exclusiveLead);
    setRich("exclusiveCta", copy.exclusiveCta);
    setText("exclusivaWhatsapp", copy.exclusiveWhatsapp);
    setText("exclusivaEmail", copy.exclusiveEmail);
    if (Array.isArray(copy.exclusiveCards)) {
      $$("#exclusiveGrid .card-excl").forEach((card, index) => {
        const item = copy.exclusiveCards[index];
        if (!item) return;
        const title = card.querySelector("h3");
        const text = card.querySelector("p");
        if (title && item.title) title.textContent = item.title;
        if (text && item.text) text.textContent = item.text;
      });
    }

    setText("contactEyebrow", copy.contactEyebrow);
    setRich("contactTitle", copy.contactTitle);
    setText("contactIntro", copy.contactIntro);
    setText("formNameLabel", copy.formNameLabel);
    setText("formMessageLabel", copy.formMessageLabel);
    setText("formSubmit", copy.formSubmit);
    setText("formHint", copy.formHint);
    const nameField = document.getElementById("formNome");
    const messageField = document.getElementById("formMensagem");
    if (nameField && copy.formNamePlaceholder) nameField.placeholder = copy.formNamePlaceholder;
    if (messageField && copy.formMessagePlaceholder) messageField.placeholder = copy.formMessagePlaceholder;
    setText("footerCredit", copy.footerCredit);
    const floatButton = document.getElementById("floatWhatsapp");
    if (floatButton && copy.floatLabel) floatButton.setAttribute("aria-label", copy.floatLabel);

    const dataNode = document.querySelector('script[type="application/ld+json"]');
    if (dataNode) {
      try {
        const data = JSON.parse(dataNode.textContent);
        (data["@graph"] || []).forEach((item) => {
          if (item["@type"] === "WebSite") {
            item.name = D.brand;
            if (copy.seoDescription) item.description = copy.seoDescription;
          }
          if (item["@type"] === "LocalBusiness") {
            item.name = D.brand;
            item.email = D.contact.email;
            item.telephone = "+" + D.contact.whatsappNumber;
            if (copy.seoDescription) item.description = copy.seoDescription;
            if (item.founder) {
              item.founder.name = D.artisan.name;
              item.founder.jobTitle = D.artisan.role;
              if (D.artisan.photo) item.founder.image = "https://nephilaatelie.com.br/" + D.artisan.photo;
            }
          }
        });
        dataNode.textContent = JSON.stringify(data);
      } catch (err) {
        /* mantém o JSON-LD que já está na página */
      }
    }
  }

  applySite();

  /* ---------------- Sobre ---------------- */
  const sobreBio = $("#sobreBio");
  D.artisan.bio.forEach((p) => {
    const el = document.createElement("p");
    el.textContent = p;
    sobreBio.appendChild(el);
  });

  /* ============================================================
     NAVBAR — links + dropdown de categorias
     ============================================================ */
  const navMenu = $("#navMenu");
  const navToggle = $("#navToggle");

  function buildNav() {
    const btnWhats = waUrl(D.contact.whatsappMessage);

    const links = [
      { label: siteText("navInicio", "Início"), href: "#inicio" },
      {
        label: siteText("navProdutos", "Produtos"),
        sub: [].concat(
          [{ label: siteText("navTodas", "Todas as peças"), href: "#produtos" }],
          D.categories.map((c) => ({ label: c.label, href: "#cat-" + c.id, filter: c.id }))
        )
      },
      { label: siteText("navSobre", "Sobre"), href: "#sobre" },
      { label: siteText("navExclusiva", "Exclusividade"), href: "#exclusiva" },
      { label: siteText("navContato", "Contato"), href: "#contato" }
    ];

    const ul = document.createElement("ul");
    ul.className = "navbar__links";

    links.forEach((link) => {
      const li = document.createElement("li");
      li.className = "navbar__item" + (link.sub ? " has-sub" : "");

      if (link.sub) {
        // Gatilho do dropdown como <div> (role="button"), no lugar de <button>
        const trigger = document.createElement("div");
        trigger.className = "navbar__link navbar__link--trigger";
        trigger.setAttribute("role", "button");
        trigger.setAttribute("tabindex", "0");
        trigger.setAttribute("aria-haspopup", "true");
        trigger.setAttribute("aria-expanded", "false");
        trigger.innerHTML = link.label + '<span class="navbar__caret" aria-hidden="true">▾</span>';
        const toggleSub = () => {
          const open = li.classList.toggle("is-open");
          trigger.setAttribute("aria-expanded", open);
        };
        trigger.addEventListener("click", toggleSub);
        trigger.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleSub();
          }
        });

        const sub = document.createElement("div");
        sub.className = "navbar__sub";
        link.sub.forEach((s) => {
          const a = document.createElement("a");
          a.href = s.href;
          a.textContent = s.label;
          if (s.filter) {
            a.dataset.gotoCategory = s.filter;
          }
          sub.appendChild(a);
        });

        li.appendChild(trigger);
        li.appendChild(sub);
      } else {
        const a = document.createElement("a");
        a.href = link.href;
        a.className = "navbar__link";
        a.textContent = link.label;
        a.dataset.nav = link.href.slice(1);
        li.appendChild(a);
      }
      ul.appendChild(li);
    });

    const ctaLi = document.createElement("li");
    ctaLi.className = "navbar__cta";
    const cta = document.createElement("a");
    cta.href = btnWhats;
    cta.className = "btn btn--gold";
    cta.target = "_blank";
    cta.rel = "noopener";
    cta.textContent = siteText("navCta", "Pedir uma peça");
    ctaLi.appendChild(cta);
    ul.appendChild(ctaLi);

    navMenu.appendChild(ul);
  }

  /* Menu mobile */
  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open);
  });
  /* Fecha o menu ao tocar num link */
  navMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      navMenu.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* Dropdown de categorias do menu */
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#navMenu")) {
      $$("#navMenu .navbar__item.has-sub.is-open").forEach((li) => li.classList.remove("is-open"));
    }
  });

  /* Categoria escolhida no dropdown -> ativa o filtro e rola até a seção */
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-goto-category]");
    if (link) {
      e.preventDefault();
      e.stopPropagation();
      setFilter(link.dataset.gotoCategory, true);
    }
  });

  /* Sombra da navbar ao rolar */
  const onScrollNav = () => $("#navbar").classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ============================================================
     PRODUTOS — filtros, seções por categoria e cards
     ============================================================ */
  const filtrosEl = $("#filtros");
  const categoriasEl = $("#categorias");

  function buildFiltros() {
    const pills = [{ id: "todas", label: siteText("filterAll", "Todos") }].concat(
      D.categories.map((c) => ({ id: c.id, label: c.label }))
    );
    pills.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "filtro" + (p.id === "todas" ? " is-active" : "");
      btn.dataset.filtro = p.id;
      btn.textContent = p.label;
      if (p.id === "todas") btn.setAttribute("aria-selected", "true");
      btn.addEventListener("click", () => setFilter(p.id, false));
      filtrosEl.appendChild(btn);
    });
  }

  function buildCategorias() {
    D.categories.forEach((cat) => {
      const sec = document.createElement("section");
      sec.className = "cat";
      sec.id = "cat-" + cat.id;
      sec.dataset.categoria = cat.id;

      const items = D.products.filter((p) => p.category === cat.id);
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "cat__blurb";
        empty.textContent = siteText("emptyCategory", "Em breve, novas peças artesanais por aqui.");
        sec.appendChild(empty);
      }

      const head = document.createElement("div");
      head.className = "cat__head";
      head.innerHTML =
        '<h3 class="cat__title">' +
        esc(cat.label) +
        '</h3><span class="cat__count">' +
        items.length +
        ' peça' +
        (items.length === 1 ? "" : "s") +
        "</span>";
      sec.appendChild(head);

      const blurb = document.createElement("p");
      blurb.className = "cat__blurb";
      blurb.textContent = cat.blurb;
      sec.appendChild(blurb);

      const grid = document.createElement("div");
      grid.className = "grid-produtos";
      items.forEach((p) => grid.appendChild(buildCard(p)));
      sec.appendChild(grid);

      categoriasEl.appendChild(sec);
    });
  }

  function formatTech(value) {
    const parts = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
    return parts.length ? parts.join(" · ") : "Crochê · Macramê";
  }

  function buildCard(p) {
    const article = document.createElement("article");
    article.className = "card reveal";
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute("aria-label", "Ver " + p.name);
    article.dataset.product = p.id;
    const photos = Array.isArray(p.photos) ? p.photos.filter(Boolean) : [];

    if (photos.length) {
      const frame = document.createElement("div");
      frame.className = "card__photos";
      const img = document.createElement("img");
      img.className = "card__photo is-on";
      img.src = photos[0];
      img.alt = p.name;
      img.loading = "lazy";
      frame.appendChild(img);
      article.appendChild(frame);
      if (photos.length > 1) bindCoverHover(article, frame, photos);
    } else {
      const empty = document.createElement("div");
      empty.className = "carousel carousel--empty";
      empty.textContent = siteText("emptyPhoto", "Foto em breve");
      article.appendChild(empty);
    }

    const price = p.price ? '<p class="card__price">' + esc(p.price) + "</p>" : "";
    const body = document.createElement("div");
    body.className = "card__body";
    body.innerHTML =
      '<h3 class="card__name">' + esc(p.name) + "</h3>" +
      price +
      '<p class="card__desc">' + esc(p.desc || "") + "</p>" +
      '<div class="card__cta">' +
      '<span class="card__tech">' + esc(formatTech(p.technique)) + "</span>" +
      '<span class="card__ask">' + esc(siteText("cardAsk", "Quero saber mais")) + "</span>" +
      "</div>";

    article.appendChild(body);
    article.addEventListener("click", () => openProduct(p.id));
    article.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProduct(p.id);
      }
    });
    return article;
  }

  /* A próxima foto surge por cima da capa enquanto o ponteiro está no card. */
  function bindCoverHover(article, frame, photos) {
    const imgs = [frame.firstElementChild];
    let index = 0;
    let timer = 0;
    let ready = false;
    let token = 0;

    function ensure() {
      if (ready) return;
      ready = true;
      photos.slice(1).forEach((src) => {
        const img = document.createElement("img");
        img.className = "card__photo";
        img.alt = "";
        img.decoding = "async";
        img.src = src;
        frame.appendChild(img);
        imgs.push(img);
      });
    }

    function whenReady(img, done) {
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener("load", done, { once: true });
    }

    function show(n) {
      ensure();
      n = (n + imgs.length) % imgs.length;
      if (n === index) return;
      const step = ++token;
      const next = imgs[n];
      whenReady(next, () => {
        if (step !== token || n === index) return;
        imgs.forEach((img) => {
          if (img.classList.contains("is-on")) img.style.zIndex = "1";
        });
        next.style.zIndex = "2";
        next.classList.add("is-on");
        index = n;
        window.setTimeout(() => {
          if (step !== token || index !== n) return;
          imgs.forEach((img, i) => {
            const on = i === n;
            img.classList.toggle("is-on", on);
            img.style.zIndex = on ? "1" : "";
          });
        }, 720);
      });
    }

    function cover() {
      window.clearInterval(timer);
      timer = 0;
      token += 1;
      if (!ready || index === 0) return;
      imgs.forEach((img, i) => {
        if (i === 0) {
          img.classList.add("is-on");
          img.style.zIndex = "1";
        } else {
          img.style.zIndex = "2";
          img.classList.remove("is-on");
        }
      });
      index = 0;
    }

    article.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      if (timer) return;
      show(index + 1);
      if (photos.length > 2) timer = window.setInterval(() => show(index + 1), 1800);
    });
    article.addEventListener("pointerleave", cover);
    article.addEventListener("click", cover);
  }

  /* --- Carrossel --- */
  function buildCarousel(photos, productName, options) {
    const opts = options || {};
    const el = document.createElement("div");
    el.className = "carousel";
    el.dataset.label = productName;

    const viewport = document.createElement("div");
    viewport.className = "carousel__viewport";
    const track = document.createElement("div");
    track.className = "carousel__track";

    photos.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel__slide";
      const img = document.createElement("img");
      img.src = src;
      img.alt = productName + " — foto " + (i + 1) + " de " + photos.length;
      img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });
    viewport.appendChild(track);
    el.appendChild(viewport);

    const prev = document.createElement("button");
    prev.className = "carousel__arrow carousel__arrow--prev";
    prev.type = "button";
    prev.innerHTML = "&#8249;";
    prev.setAttribute("aria-label", "Foto anterior de " + productName);
    const next = document.createElement("button");
    next.className = "carousel__arrow carousel__arrow--next";
    next.type = "button";
    next.innerHTML = "&#8250;";
    next.setAttribute("aria-label", "Próxima foto de " + productName);
    viewport.appendChild(prev);
    viewport.appendChild(next);

    if (photos.length > 1) {
      const dots = document.createElement("div");
      dots.className = "carousel__dots";
      photos.forEach((_, i) => {
        const d = document.createElement("button");
        d.className = "carousel__dot" + (i === 0 ? " is-active" : "");
        d.type = "button";
        d.setAttribute("aria-label", "Mostrar foto " + (i + 1));
        dots.appendChild(d);
      });
      el.appendChild(dots);

      if (opts.thumbs !== false) {
        const thumbs = document.createElement("div");
        thumbs.className = "carousel__thumbs";
        thumbs.setAttribute("role", "group");
        thumbs.setAttribute("aria-label", "Fotos de " + productName);
        photos.forEach((src, i) => {
          const t = document.createElement("button");
          t.className = "carousel__thumb" + (i === 0 ? " is-active" : "");
          t.type = "button";
          t.setAttribute("aria-label", "Foto " + (i + 1) + " de " + photos.length);
          t.setAttribute("aria-pressed", i === 0 ? "true" : "false");
          const im = document.createElement("img");
          im.src = src;
          im.alt = "";
          im.loading = "lazy";
          t.appendChild(im);
          thumbs.appendChild(t);
        });
        el.appendChild(thumbs);
      }

      let index = 0;
      const go = (n) => {
        index = (n + photos.length) % photos.length;
        track.style.transform = "translateX(-" + index * 100 + "%)";
        $$(".carousel__dot", el).forEach((d, i) => d.classList.toggle("is-active", i === index));
        $$(".carousel__thumb", el).forEach((t, i) => {
          const on = i === index;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-pressed", on ? "true" : "false");
          if (on && t.parentElement) {
            const scroller = t.parentElement;
            const left = t.offsetLeft - (scroller.clientWidth - t.offsetWidth) / 2;
            scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
          }
        });
      };
      prev.addEventListener("click", () => go(index - 1));
      next.addEventListener("click", () => go(index + 1));
      $$(".carousel__dot", el).forEach((d, i) => d.addEventListener("click", () => go(i)));
      $$(".carousel__thumb", el).forEach((t, i) => t.addEventListener("click", () => go(i)));
      el.dataset.index = "0";
    } else {
      prev.hidden = true;
      next.hidden = true;
    }
    return el;
  }

  /* --- Filtro por categoria --- */
  function setFilter(catId, shouldScroll) {
    const showAll = catId === "todas";
    $$(".cat", categoriasEl).forEach((sec) => {
      const match = showAll || sec.dataset.categoria === catId;
      sec.classList.toggle("hidden", !match);
    });

    $$(".filtro", filtrosEl).forEach((btn) => {
      const active = btn.dataset.filtro === catId;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-selected", "true");
      else btn.removeAttribute("aria-selected");
    });

    if (shouldScroll) {
      const target = showAll ? $("#produtos") : $("#cat-" + catId);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ============================================================
     MODAL DA PEÇA
     ============================================================ */
  const productModal = $("#productModal");
  const productModalMedia = $("#productModalMedia");
  let modalReturn = null;

  function closeProduct() {
    if (!productModal || productModal.hidden) return;
    productModal.hidden = true;
    document.body.classList.remove("modal-open");
    productModalMedia.innerHTML = "";
    if (modalReturn && modalReturn.focus) modalReturn.focus();
    modalReturn = null;
  }

  function openProduct(id) {
    const product = D.products.find((item) => item.id === id);
    if (!product || !productModal) return;
    const photos = Array.isArray(product.photos) ? product.photos.filter(Boolean) : [];
    const materials = Array.isArray(product.materials) ? product.materials.filter(Boolean) : [];
    const priceNote = product.price ? " (" + product.price + ")" : "";

    productModalMedia.innerHTML = "";
    if (photos.length) {
      productModalMedia.appendChild(buildCarousel(photos, product.name));
    } else {
      const empty = document.createElement("div");
      empty.className = "carousel carousel--empty";
      empty.textContent = siteText("emptyPhoto", "Foto em breve");
      productModalMedia.appendChild(empty);
    }

    $("#productModalTitle").textContent = product.name;
    const priceEl = $("#productModalPrice");
    priceEl.textContent = product.price || "";
    priceEl.hidden = !product.price;
    $("#productModalDesc").textContent = product.desc || "";

    const list = $("#productModalMaterials");
    list.innerHTML = materials.map((item) => "<li>" + esc(item) + "</li>").join("");
    list.hidden = !materials.length;

    $("#productModalTech").textContent = formatTech(product.technique);
    const order = $("#productModalOrder");
    order.textContent = siteText("orderButton", "Fazer pedido");
    order.href = waUrl(
      "Olá, " + D.artisan.firstName + "! Vi o modelo " + product.name + priceNote +
      " no site Nephila e quero fazer um pedido."
    );

    modalReturn = document.activeElement;
    productModal.hidden = false;
    document.body.classList.add("modal-open");
    $("#productModalClose").focus();
  }

  if (productModal) {
    productModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) closeProduct();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProduct();
    });
  }

  /* ============================================================
     CONTATO — links WhatsApp/e-mail + formulário
     ============================================================ */
  const whatMsg = waUrl(D.contact.whatsappMessage);

  $("#canalWhatsapp").href = whatMsg;
  $("#canalWhatsapp").target = "_blank";
  $("#whatsappDisplay").textContent = D.contact.whatsappDisplay;
  $("#canalEmail").href = "mailto:" + D.contact.email;
  $("#emailDisplay").textContent = D.contact.email;
  function socialLabel(url) {
    try {
      const parts = new URL(url).pathname.split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : url;
    } catch (err) {
      return url || "";
    }
  }

  $("#canalInstagram").href = D.contact.instagram || "#";
  $("#instagramDisplay").textContent = socialLabel(D.contact.instagram);
  $("#canalMercadoLivre").href = D.contact.mercadoLivre || "#";
  $("#mercadoLivreDisplay").textContent = socialLabel(D.contact.mercadoLivre);
  $("#floatWhatsapp").href = whatMsg;
  $("#exclusivaWhatsapp").href = whatMsg;
  $("#exclusivaWhatsapp").target = "_blank";
  $("#exclusivaEmail").href = "mailto:" + D.contact.email;

  const form = $("#formPedido");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = $("#formNome").value.trim();
    const msg = $("#formMensagem").value.trim();
    const texto = "Olá, " + D.artisan.firstName + "!" +
      (nome ? "\nMeu nome é " + nome + "." : "") +
      (msg ? "\n\n" + msg : "") +
      "\n\n(vi o site Nephila)";
    window.open(waUrl(texto), "_blank", "noopener");
  });

  /* ============================================================
     RODAPÉ + animação de revelação
     ============================================================ */
  $("#footYear").textContent = new Date().getFullYear();

  buildNav();
  buildFiltros();
  buildCategorias();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* Scrollspy — destaca a seção ativa na navbar */
  const sectionIds = ["inicio", "produtos", "sobre", "exclusiva", "contato"].map((id) => document.getElementById(id));
  const spy = () => {
    const mid = window.innerHeight * 0.4;
    let current = null;
    sectionIds.forEach((sec) => {
      if (sec && sec.getBoundingClientRect().top <= mid) current = sec.id;
    });
    $$(".navbar__link[data-nav]").forEach((a) => {
      const on = a.dataset.nav === current;
      a.setAttribute("aria-current", on ? "page" : "");
      a.classList.toggle("is-current", on);
    });
  };
  window.addEventListener("scroll", spy, { passive: true });
  window.addEventListener("resize", spy);
  spy();
})();