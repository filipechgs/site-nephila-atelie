# AGENTS.md — Guia para agentes de IA

Este arquivo explica a estrutura do projeto para que agentes de IA possam trabalhar com o código de forma segura e eficiente.

## Visão geral

Site portfólio da Nephila (ateliê de crochê e macramê). Publicado via GitHub Pages em `nephilaatelie.com.br`.

## Arquitetura

A página pública continua data-driven. As peças não são mais editadas em `js/data.js`: a pasta `produtos/` é a fonte da verdade, e `scripts/build-data.js` gera o `data.js`. Marca, bio e contato vêm de `site.json`.

Há um painel local (Express, sem login, só em `127.0.0.1`) para criar e editar categorias, peças e fotos. O botão **Gerar site** roda o mesmo build.

Detalhes e o formato dos Markdown: `docs/arquitetura-produtos.md`.

### Fluxo de dados

```
produtos/ + site.json → scripts/build-data.js → js/data.js → js/main.js → index.html
```

## Arquivos e responsabilidades

| Arquivo | O que faz | Pode editar? |
|---------|-----------|--------------|
| `produtos/` | Categorias, Markdown e fotos das peças | SIM — fonte da verdade |
| `site.json` | Marca, bio e contato | SIM |
| `js/data.js` | Gerado pelo build. O site lê daqui | NÃO — rode `npm run build` |
| `js/main.js` | Renderiza navbar, filtros, carrosséis, contato | Cuidado — lógica |
| `css/style.css` | Estilos mobile-first, paleta teal/dourado/creme | Cuidado — visual |
| `index.html` | Seções semânticas da página | Cuidado — estrutura |
| `admin/public/` | Interface do painel | Cuidado |
| `server/index.js` | API local do painel | Cuidado |
| `scripts/catalog.js` | Leitura, gravação e build das peças | Cuidado |
| `img/milena.jpeg` | Foto da artesã | SIM — substituir |
| `fonts/Alice-Regular.ttf` | Fonte do título da marca | Não mexer |

## Paleta de cores

Extraída das logos originais:

- **Teal (azul-petróleo):** `#0C3747` (CSS: `--teal-700`)
- **Dourado:** `#CDA550` (CSS: `--gold`)
- **Creme (fundo):** `#F8F1E9` (CSS: `--cream`)

## Como adicionar um produto

Pelo painel (`npm start` → http://127.0.0.1:3847/admin) ou criando a pasta na convenção:

```
produtos/bolsas/rosa/rosa.md
produtos/bolsas/rosa/rosa-0.jpeg
```

O `.md` tem, nesta ordem: título `# Nome`, parágrafo de descrição, lista de materiais e parágrafo do preço. Depois rode `npm run build`.

O nome da pasta é kebab-case e único no site. Fotos: `{slug}-0.ext`, `{slug}-1.ext` (jpeg, jpg, png ou webp).

## Como adicionar uma categoria

Crie `produtos/nova-categoria/_categoria.md` com `# Nome` e um parágrafo de apresentação. O `id` é o nome da pasta. Rode `npm run build`.

## Campos gerados em `js/data.js`

Cada peça sai assim:

```js
{
  id: "rita",
  name: "Rita",
  category: "bolsas",
  desc: "Descrição",
  materials: ["Fio de algodão"],
  price: "R$ 180,00",
  photos: ["produtos/bolsas/rita/rita-0.jpeg"]
}
```

`brand`, `artisan` e `contact` são copiados de `site.json`.

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

Cada peça pode ter até 12 fotos. O `main.js` cria automaticamente:

- Track deslizante
- Setas prev/next
- Indicadores (dots)
- Miniaturas (thumbnails)

Se `photos` tem 1 foto, controles são ocultos. O card também mostra preço e, quando existem, os materiais.

## Contato

- Botão flutuante de WhatsApp (canto inferior direito)
- Links na seção "Contato" (WhatsApp + e-mail)
- Formulário que abre WhatsApp com mensagem pré-preenchida
- CTA "Quero saber mais" em cada card de produto

## Comandos úteis

```bash
npm install
npm start          # painel em http://127.0.0.1:3847/admin
npm run build      # regenera js/data.js

node --check js/data.js
node --check js/main.js
```

## Regras para o agente

1. **Peças e categorias:** editar `produtos/`, nunca o miolo de `js/data.js`
2. **Marca, bio e contato:** editar `site.json` e rodar `npm run build`
3. **Sempre gerar** `js/data.js` depois de mudar conteúdo (`npm run build`)
4. **Validar sintaxe** com `node --check`
5. **Não alterar** `js/main.js`, CSS ou HTML sem necessidade
6. **Site público sem framework.** Express e Multer são só do painel local
7. **Preservar a paleta** (teal/dourado/creme)
8. **Commit em português**
9. **Não rodar `npm run migrate` de novo** — a migração das fotos antigas já foi feita
