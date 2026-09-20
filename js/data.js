/*
 * ============================================================================
 *  DATA.JS — Configuração central do site (EDIÇÃO FÁCIL)
 * ============================================================================
 *  Todo o conteúdo editável do site vive aqui: dados da artesã, contatos,
 *  categorias, produtos e fotos.
 *
 *  Para ADICIONAR / EDITAR / REMOVER conteúdo, altere apenas este arquivo.
 *  O restante (html, css, js) renderiza tudo automaticamente a partir dele.
 *
 *  Estrutura:
 *    SITE.brand          -> marca exibida no topo
 *    SITE.artisan        -> { name, tagline, bio }
 *    SITE.contact        -> WhatsApp e e-mail (troque os números/texto!)
 *    SITE.categories     -> { id, label, blurb } — ordena as seções de produtos
 *    SITE.products       -> produtos do portfólio. Cada produto:
 *        id           -> identificador único (use um slug simples)
 *        name         -> nome/modelo exibido
 *        category     -> id de uma categoria em SITE.categories
 *        desc         -> descrição curta (opcional)
 *        photos       -> ARRAY de fotos em img/produtos (de 1 a 3 fotos).
 *                        NÃO edite os nomes dos arquivos sem renomeá-los antes.
 *                        Para usar 2 ou 3 fotos de um produto, basta acrescentar
 *                        mais caminhos neste array — o carrossel aparece sozinho.
 * ============================================================================
 */

const SITE = {
  brand: "Nephila",
  artisan: {
    name: "Milena",
    firstName: "Milena",
    role: "Artesã · Crochê & Macramê",
    // Bio curta exibida na seção "Sobre". Edite à vontade.
    bio: [
      "Cada peça Nephila nasce nas mãos de Milena, linha por linha, nó por nó.",
      "O nome vem da aranha Nephila, que tece fios de seda dourada e resistente. É assim que Milena tece: tramas delicadas, feitas para durar."
    ]
  },
  contact: {
    // ATENÇÃO: troque pelos dados reais (formato internacional, só números).
    whatsappNumber: "5571993044037",
    whatsappDisplay: "(71) 99304-4037",
    whatsappMessage: "Olá, Milena! Vi o site Nephila e quero saber mais sobre suas peças.",
    email: "milena@nephila.com.br"
  },
  categories: [
    {
      id: "bolsas",
      label: "Bolsas",
      blurb: "Bolsas artesanais em crochê e macramê, resistentes e cheias de estilo."
    },
    {
      id: "decoracao",
      label: "Decoração",
      blurb: "Itens de decoração que trazem acolhimento e originalidade ao ambiente."
    },
    {
      id: "acessorios",
      label: "Acessórios",
      blurb: "Acessórios delicados que completam o look com um toque artesanal."
    }
  ],
  products: [
    {
      id: "rita",
      name: "Rita",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/rita.jpeg"]
    },
    {
      id: "gabi",
      name: "Gabi",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/gabi.jpeg"]
    },
    {
      id: "duda",
      name: "Duda",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/duda.jpeg"]
    },
    {
      id: "nanda",
      name: "Nanda",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/nanda.jpeg"]
    },
    {
      id: "melina",
      name: "Melina",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/melina.jpeg"]
    },
    {
      id: "malu",
      name: "Malu",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/malu.jpeg"]
    },
    {
      id: "lux",
      name: "Lux",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/lux.jpeg"]
    },
    {
      id: "flor",
      name: "Flor",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/flor.jpeg"]
    },
    {
      id: "trigo",
      name: "Trigo",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/trigo.jpeg"]
    },
    {
      id: "bau",
      name: "Bau",
      category: "bolsas",
      desc: "Bolsa artesanal com acabamento impecável e fios selecionados.",
      photos: ["img/produtos/bau.jpeg"]
    },
    {
      id: "trio",
      name: "Trio",
      category: "bolsas",
      desc: "Conjunto artesanal que une praticidade e charme em cada detalhe.",
      photos: ["img/produtos/trio.jpeg"]
    },
    {
      id: "novo-modelo",
      name: "Novo modelo",
      category: "bolsas",
      desc: "Peça artesanal em crochê ou macramê. Edite o nome e a descrição aqui.",
      photos: ["img/produtos/WhatsApp Image 2026-09-20 at 18.12.02 (3).jpeg"]
    }
  ]
};