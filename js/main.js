/* ============================================================
   NEPHILA — main.js
   Renderiza a página a partir de js/data.js.
   Fluxo: data.js (conteúdo) -> main.js (interfaces)
   Altere conteúdo em data.js; altere comportamento aqui.
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

  /* ---------------- <head> básico ---------------- */
  document.title = D.brand + " · Crochê & Macramê";

  /* ---------------- Hero ---------------- */
  $("#heroArtisan").textContent = D.artisan.name;

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
      { label: "Início", href: "#inicio" },
      { label: "Sobre", href: "#sobre" },
      {
        label: "Produtos",
        sub: [].concat(
          [{ label: "Todas as peças", href: "#produtos" }],
          D.categories.map((c) => ({ label: c.label, href: "#cat-" + c.id, filter: c.id }))
        )
      },
      { label: "Exclusividade", href: "#exclusiva" },
      { label: "Contato", href: "#contato" }
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
    cta.textContent = "Pedir uma peça";
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
    const pills = [{ id: "todas", label: "Todos" }].concat(
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
        empty.textContent = "Em breve, novas peças artesanais por aqui.";
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

  function buildCard(p) {
    const article = document.createElement("article");
    article.className = "card reveal";

    const car = buildCarousel(p.photos, p.name);

    const body = document.createElement("div");
    body.className = "card__body";
    body.innerHTML =
      '<h3 class="card__name">' + esc(p.name) + "</h3>" +
      '<p class="card__desc">' + esc(p.desc || "") + "</p>" +
      '<div class="card__cta">' +
      '<span class="card__tech">Crochê · Macramê</span>' +
      '<a class="card__ask" target="_blank" rel="noopener" data-wa-produto="' +
      esc(p.name) +
      '" href="' +
      waUrl("Olá, " + D.artisan.firstName + "! Vi o modelo " + p.name + " no site Nephila e quero saber mais.") +
      '">Quero saber mais</a>' +
      "</div>";

    article.appendChild(car);
    article.appendChild(body);
    return article;
  }

  /* --- Carrossel (1 a 3 fotos) --- */
  function buildCarousel(photos, productName) {
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
    el.appendChild(prev);
    el.appendChild(next);

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

      const thumbs = document.createElement("div");
      thumbs.className = "carousel__thumbs";
      photos.forEach((src, i) => {
        const t = document.createElement("button");
        t.className = "carousel__thumb" + (i === 0 ? " is-active" : "");
        t.type = "button";
        const im = document.createElement("img");
        im.src = src;
        im.alt = "";
        im.loading = "lazy";
        t.appendChild(im);
        thumbs.appendChild(t);
      });
      el.appendChild(thumbs);

      let index = 0;
      const go = (n) => {
        index = (n + photos.length) % photos.length;
        track.style.transform = "translateX(-" + index * 100 + "%)";
        $$(".carousel__dot", el).forEach((d, i) => d.classList.toggle("is-active", i === index));
        $$(".carousel__thumb", el).forEach((t, i) => t.classList.toggle("is-active", i === index));
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
     CONTATO — links WhatsApp/e-mail + formulário
     ============================================================ */
  const whatMsg = waUrl(D.contact.whatsappMessage);

  $("#canalWhatsapp").href = whatMsg;
  $("#canalWhatsapp").target = "_blank";
  $("#whatsappDisplay").textContent = D.contact.whatsappDisplay;
  $("#canalEmail").href = "mailto:" + D.contact.email;
  $("#emailDisplay").textContent = D.contact.email;
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
  const sectionIds = ["inicio", "sobre", "produtos", "exclusiva", "contato"].map((id) => document.getElementById(id));
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