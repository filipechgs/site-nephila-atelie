# Nephila — Ateliê de Fios

Portfólio online da **Nephila**, marca artesanal de crochê e macramê criada pela artesã **Milena**.

**Endereço do site:** [nephilaatelie.com.br](https://nephilaatelie.com.br)

## Objetivo

O site funciona como portfólio e vitrine de produtos artesanais, com o objetivo de converter visitas em vendas. Os visitantes conhecem o trabalho de Milena, navegam pelas peças e entram em contato diretamente por WhatsApp ou e-mail para encomendas.

## Estrutura do projeto

```
site-nephila/
├── index.html              # Página principal (seções semânticas)
├── css/
│   └── style.css           # Estilos mobile-first, paleta da marca
├── js/
│   ├── data.js             # Config central — EDITE AQUI para conteúdo
│   └── main.js             # Renderização, navbar, carrosséis, contato
├── fonts/
│   └── Alice-Regular.ttf   # Fonte do título da marca
├── img/
│   ├── logo-fundo-branco-nome.jpeg
│   ├── logo-fundo-azul.jpeg
│   ├── milena.jpeg          # Foto da artesã
│   ├── favicon.ico          # Favicon 32x32
│   ├── favicon-192.png      # Favicon Android
│   ├── apple-touch-icon.png # Favicon iOS
│   └── produtos/            # Fotos dos produtos (até 3 por produto)
├── CNAME                    # Domínio no GitHub Pages
└── .gitignore
```

## Como atualizar conteúdo

Todo o conteúdo editável do site vive em **`js/data.js`**. Para alterar textos, produtos, fotos ou dados de contato, basta editar esse arquivo. O restante do site renderiza automaticamente.

### Editar dados da artesã

```js
artisan: {
  name: "Milena",
  role: "Artesã · Crochê & Macramê",
  bio: ["Sua bio aqui..."]
}
```

### Editar contato (WhatsApp / e-mail)

```js
contact: {
  whatsappNumber: "5571993044037",   // formato internacional, só números
  whatsappDisplay: "(71) 99304-4037",
  whatsappMessage: "Olá, Milena! ...",
  email: "milena@nephila.com.br"
}
```

### Adicionar um produto

```js
{
  id: "nome-do-produto",
  name: "Nome do Produto",
  category: "bolsas",          // bolsas | decoracao | acessorios
  desc: "Descrição curta.",
  photos: ["img/produtos/foto1.jpeg"]  // até 3 fotos (carrossel automático)
}
```

### Adicionar fotos a um produto existente

Basta acrescentar mais caminhos no array `photos`:

```js
photos: ["img/produtos/foto1.jpeg", "img/produtos/foto2.jpeg", "img/produtos/foto3.jpeg"]
```

### Criar uma nova categoria

Adicione em `SITE.categories`:

```js
{ id: "novo-id", label: "Nome da Categoria", blurb: "Descrição curta." }
```

E use o mesmo `id` no campo `category` dos produtos.

## Como usar um agente de IA para atualizar

Este projeto foi organizado para que agentes de IA (como opencode, Cursor, Copilot) possam atualizar o conteúdo de forma segura e simples.

### Regra principal

**Edite apenas `js/data.js` para conteúdo.** O HTML, CSS e JS principal não precisam ser alterados para mudanças de texto, fotos ou produtos.

### Exemplos de comandos para o agente

```
"Adicione o produto 'Rosa' na categoria bolsas com a foto img/produtos/rosa.jpeg"
"Troque o telefone de WhatsApp para (71) 99999-9999"
"Atualize a bio da Milena para: ..."
"Adicione uma nova categoria chamada 'Chapéus'"
"Coloque 3 fotos no produto Gabi: foto1, foto2, foto3"
```

### O que o agente deve fazer

1. Ler `js/data.js` para entender a estrutura
2. Fazer a alteração solicitada no arquivo `data.js`
3. Rodar `node --check js/main.js` para validar sintaxe JS
4. Fazer commit e push das alterações

### O que o agente NÃO deve alterar sem pedir

- Estrutura HTML (`index.html`)
- Estilos CSS (`css/style.css`)
- Lógica JS (`js/main.js`)
- Nomes ou caminhos de arquivos de imagem
- Configuração do domínio (`CNAME`)

## Tecnologias

- HTML, CSS e JavaScript puros (sem frameworks)
- Google Fonts (Fraunces, Jost) com fallback offline
- Fonte local Alice para o título da marca
- Design mobile-first, responsivo
- Publicação via GitHub Pages

## Licença

Conteúdo e design © Nephila — Ateliê de Fios. Todos os direitos reservados.
