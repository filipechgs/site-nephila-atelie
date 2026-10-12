# Nephila — Ateliê de Fios

Portfólio online da **Nephila**, marca artesanal de crochê e macramê criada pela artesã **Milena**.

**Endereço do site:** [nephilaatelie.com.br](https://nephilaatelie.com.br)

## Objetivo

O site funciona como portfólio e vitrine de produtos artesanais, com o objetivo de converter visitas em vendas. Os visitantes conhecem o trabalho de Milena, navegam pelas peças e entram em contato diretamente por WhatsApp ou e-mail para encomendas.

## Estrutura do projeto

```
site-nephila/
├── index.html                 # Página pública
├── css/style.css
├── js/
│   ├── data.js                # Gerado — não editar as peças aqui
│   └── main.js                # Monta a página a partir de data.js
├── produtos/                  # Fonte da verdade das peças
│   ├── _ordem.json
│   └── bolsas/rita/rita.md    # texto + fotos da peça
├── site.json                  # Marca, bio e contato
├── admin/public/              # Painel local
├── server/index.js            # Express, na rede de casa
├── scripts/
│   ├── build-data.js          # produtos/ + site.json → js/data.js
│   ├── publish.js             # mensagem, commit e push das peças
│   └── migrate.js             # migração única, já aplicada
├── docs/arquitetura-produtos.md
├── img/                       # Logo, foto da artesã, favicon
├── fonts/
└── CNAME
```

As decisões e o formato dos arquivos estão em [docs/arquitetura-produtos.md](docs/arquitetura-produtos.md).

## Como atualizar as peças

O painel cria as pastas, o texto e os nomes das fotos. Não é preciso editar `js/data.js`.

```bash
npm install
npm start
```

Neste computador, abra [http://127.0.0.1:3847/admin](http://127.0.0.1:3847/admin). Ao iniciar, o console também mostra a URL absoluta da rede de casa (por exemplo `http://192.168.1.20:3847/admin`). Outro aparelho no mesmo Wi-Fi, inclusive o celular, abre o painel por esse endereço. A tela se ajusta ao tamanho do telefone.

1. Crie ou escolha uma categoria (Bolsas, Decoração…). O texto dela aparece no site acima das peças.
2. Cadastre a peça: nome, descrição, materiais (um por linha), preço em reais e fotos.
3. As fotos podem ter qualquer nome no computador. Ao salvar, viram `nome-da-peca-0.jpeg`, `nome-da-peca-1.jpeg`…
4. Clique em **Ver Site**. O painel atualiza a página e abre a prévia.
5. Clique em **Publicar atualização**. O painel mostra a mensagem e os arquivos. **Enviar ao ar** faz o commit e o push para o GitHub Pages.

**Publicar atualização** envia só `produtos/`, `js/data.js` e `site.json`. Quem edita as pastas à mão pode usar o mesmo botão depois de ver o site. Se o celular não abrir o painel, permita o Node no Firewall do Windows, na rede privada.

Peças que já estavam no site foram migradas com o preço **Sob consulta** e sem lista de materiais. Abra cada uma no painel para completar.

## Marca, bio e contato

Esses dados ficam em `site.json`, inclusive os links de Instagram e Mercado Livre. Os endereços atuais são placeholders (`seu-perfil`): troque pelas URLs reais e gere de novo.

```bash
npm run build
```

Ou use **Ver Site** no painel. Os dois fazem a mesma coisa, e o botão também abre a prévia.

## Publicar uma peça direto nas pastas

Dá para fazer sem o painel, desde que a convenção seja respeitada:

1. Crie `produtos/bolsas/rosa/`.
2. Escreva `rosa.md` com título, descrição, materiais e preço. O modelo está em [docs/arquitetura-produtos.md](docs/arquitetura-produtos.md).
3. Coloque as fotos como `rosa-0.jpeg`, `rosa-1.jpeg`.
4. Rode `npm run build`, ou abra o painel e use **Publicar atualização**.

## Como um agente de IA deve atualizar

**Não edite as peças em `js/data.js`.** Esse arquivo é gerado.

1. Alterar `produtos/` (ou orientar o uso do painel) e, se for marca ou contato, `site.json`.
2. Rodar `npm run build`.
3. Validar com `node --check js/data.js` e `node --check js/main.js`.

HTML, CSS, `js/main.js` e `CNAME` só mudam quando o comportamento ou o visual da página precisam mudar.

## Tecnologias

- Página pública: HTML, CSS e JavaScript puros
- Painel local: Node.js e Express
- Google Fonts (Fraunces, Jost) com fallback offline
- Fonte local Alice para o título da marca
- Design mobile-first, responsivo
- Publicação via GitHub Pages

## Licença

Conteúdo e design © Nephila — Ateliê de Fios. Todos os direitos reservados.
