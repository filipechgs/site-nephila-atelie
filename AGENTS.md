# AGENTS.md — Guia para agentes de IA

Este arquivo explica a estrutura do projeto para que agentes de IA possam trabalhar com o código de forma segura e eficiente.

## Visão geral

Site portfólio da Nephila (ateliê de crochê e macramê). Publicado via GitHub Pages em `nephilaatelie.com.br`.

## Arquitetura

O site é data-driven. Todo conteúdo é definido em `js/data.js` e renderizado por `js/main.js`. O HTML e CSS são estáticos — o JS monta dinamicamente navbar, produtos, carrosséis e links de contato.

### Fluxo de dados

```
js/data.js (conteúdo) → js/main.js (renderização) → index.html (estrutura)
```

## Arquivos e responsabilidades

| Arquivo | O que faz | Pode editar? |
|---------|-----------|--------------|
| `js/data.js` | Config central: dados da artesã, contato, categorias, produtos | SIM — este é o arquivo principal |
| `js/main.js` | Renderiza navbar, filtros, carrosséis, formulário WhatsApp | Cuidado — lógica |
| `css/style.css` | Estilos mobile-first, paleta teal/dourado/creme | Cuidado — visual |
| `index.html` | Seções semânticas da página | Cuidado — estrutura |
| `img/produtos/` | Fotos dos produtos (1 a 3 por produto) | SIM — adicionar/remover |
| `img/milena.jpeg` | Foto da artesã | SIM — substituir |
| `fonts/Alice-Regular.ttf` | Fonte do título da marca | Não mexer |

## Paleta de cores

Extraída das logos originais:

- **Teal (azul-petróleo):** `#0C3747` (CSS: `--teal-700`)
- **Dourado:** `#CDA550` (CSS: `--gold`)
- **Creme (fundo):** `#F8F1E9` (CSS: `--cream`)

## Estrutura de `js/data.js`

```js
const SITE = {
  brand: "Nephila",           // Nome da marca
  artisan: {                  // Dados da artesã
    name: "Milena",
    firstName: "Milena",
    role: "Artesã · Crochê & Macramê",
    bio: ["Parágrafo 1...", "Parágrafo 2..."]
  },
  contact: {                  // Dados de contato
    whatsappNumber: "5571993044037",    // Só números, formato intl
    whatsappDisplay: "(71) 99304-4037", // Exibição amigável
    whatsappMessage: "Olá, Milena! ...",// Mensagem pré-preenchida
    email: "milena@nephila.com.br"
  },
  categories: [               // Categorias de produto
    { id: "bolsas", label: "Bolsas", blurb: "..." },
    { id: "decoracao", label: "Decoração", blurb: "..." },
    { id: "acessorios", label: "Acessórios", blurb: "..." }
  ],
  products: [                 // Produtos do portfólio
    {
      id: "rita",             // Slug único
      name: "Rita",           // Nome exibido
      category: "bolsas",     // Deve existir em categories
      desc: "Descrição...",   // Opcional
      photos: [               // 1 a 3 fotos
        "img/produtos/rita.jpeg"
      ]
    }
  ]
};
```

## Como adicionar um produto

1. Coloque a(s) foto(s) em `img/produtos/`
2. Adicione o objeto em `SITE.products` em `js/data.js`
3. O carrossel aparece automaticamente se houver mais de 1 foto

## Como adicionar uma categoria

1. Adicione em `SITE.categories`
2. Use o `id` nos produtos: `category: "novo-id"`

## Seções da página (ordem no HTML)

1. **Início** (`#inicio`) — Hero com logo e tagline
2. **Sobre** (`#sobre`) — Biografia da Milena
3. **Produtos** (`#produtos`) — Filtros + grid de produtos por categoria
4. **Exclusividade** (`#exclusiva`) — Diferenciais do trabalho artesanal
5. **Contato** (`#contato`) — WhatsApp, e-mail e formulário

## Navbar

- Fixa no topo, backdrop blur
- Mobile: hamburger → menu dropdown
- Desktop: links inline, submenu "Produtos" com hover
- CTA "Pedir uma peça" linka para WhatsApp

## Carrossel de fotos

Cada produto pode ter até 3 fotos. O `main.js` cria automaticamente:
- Track deslizante
- Setas prev/next
- Indicadores (dots)
- Miniaturas (thumbnails)

Se `photos` tem 1 foto, controles são ocultos.

## Contato

- Botão flutuante de WhatsApp (canto inferior direito)
- Links na seção "Contato" (WhatsApp + e-mail)
- Formulário que abre WhatsApp com mensagem pré-preenchida
- CTA "Quero saber mais" em cada card de produto

## Comandos úteis

```bash
# Verificar sintaxe JS
node --check js/data.js
node --check js/main.js

# Testar renderização (headless Edge)
msedge.exe --headless=new --dump-dom file:///D:/site-nephila/index.html

# Git
git add -A && git commit -m "mensagem" && git push
```

## Regras para o agente

1. **Sempre ler `js/data.js` antes de editar conteúdo**
2. **Nunca alterar `js/main.js` sem necessidade**
3. **Validar sintaxe JS após edições**: `node --check js/data.js`
4. **Manter a estrutura de arrays/objetos intacta**
5. **Não adicionar dependências externas** (projeto é vanilla)
6. **Preservar a paleta de cores** (teal/dourado/creme)
7. **Commit em português**
