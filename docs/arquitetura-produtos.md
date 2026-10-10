# Arquitetura dos produtos

Decisões de como as peças do site Nephila são guardadas, editadas e publicadas.

## Decisões

- A fonte da verdade das peças é a pasta `produtos/`, não o `js/data.js`.
- Um script lê essa pasta e gera `js/data.js`. O `index.html` e o `js/main.js` continuam iguais: o site público segue estático no GitHub Pages.
- O painel de edição roda só neste computador, com Node e Express, sem login. Ele escuta apenas em `127.0.0.1:3847`.
- Quem cria e edita categorias, textos e fotos é o painel. O botão **Gerar site** dispara o script.
- Marca, bio e contato ficam em `site.json`. O painel não altera esses dados.
- O preço é o último parágrafo do Markdown da peça, em reais, como deve aparecer no site (exemplo: `R$ 180,00`).
- As fotos podem ser enviadas com qualquer nome. O servidor grava `nome-da-peca-0.jpeg`, `nome-da-peca-1.jpeg` e assim por diante.

## Fluxo

```
produtos/  +  site.json
        │
        ▼
 scripts/build-data.js     ← também pelo botão Gerar site
        │
        ▼
    js/data.js
        │
        ▼
 index.html + js/main.js   ← GitHub Pages
```

Para o site no ar mudar, depois de gerar é preciso commit e push. O painel não publica sozinho.

## Pastas

```
produtos/
  _ordem.json                 # ordem de exibição; o painel mantém
  bolsas/
    _categoria.md
    rita/
      rita.md
      rita-0.jpeg
      rita-1.jpeg
  decoracao/
    _categoria.md
  acessorios/
    _categoria.md
```

Categorias e peças usam kebab-case, sem acento: `Chapéus de sol` vira `chapeus-de-sol`.

O slug da peça é único no site inteiro. Não pode existir outra peça com o mesmo nome de pasta, mesmo em outra categoria.

`_ordem.json` só guarda a ordem. Se uma pasta nova não estiver nele, ela entra no fim da lista. Não edite esse arquivo à mão, salvo para reordenar.

## Markdown da categoria

Arquivo `_categoria.md`:

```md
# Bolsas

Bolsas artesanais em crochê e macramê, resistentes e cheias de estilo.
```

- O título é o nome visível.
- O parágrafo é o texto que aparece acima das peças.
- O `id` da categoria é o nome da pasta, não o título.

## Markdown da peça

Arquivo com o mesmo nome da pasta, por exemplo `rita.md`:

```md
# Rita

Bolsa artesanal com acabamento impecável e fios selecionados.

- Fio de algodão
- Forro em tecido

R$ 180,00
```

| Parte | Campo no site |
| --- | --- |
| Título `#` | Nome |
| Primeiro parágrafo | Descrição |
| Lista com `-` | Materiais (pode ficar de fora) |
| Último parágrafo | Preço |

Se o preço for só um número, como `180,00`, o painel grava `R$ 180,00`. Texto como `Sob consulta` permanece como foi escrito.

## Fotos

- Formatos: JPEG, PNG ou WebP.
- Até 12 fotos por peça, 12 MB cada.
- O nome original é ignorado. A extensão é mantida (`.jpg` continua `.jpg`).
- A ordem no carrossel é a numeração: `0`, depois `1`, e assim por diante.

No `js/data.js` o caminho fica relativo, por exemplo `produtos/bolsas/rita/rita-0.jpeg`.

## O que o painel faz

- Criar, renomear e excluir categorias. Só exclui categoria vazia.
- Criar, editar, mover e excluir peças.
- Receber fotos pelo navegador e renomear.
- Remover foto e mudar a ordem.
- Gerar `js/data.js`.

Renomear o nome visível também renomeia a pasta e os arquivos, para o slug continuar igual ao nome.

## O que fica de fora

- Login no painel.
- Editar bio, WhatsApp ou e-mail pelo painel (isso é o `site.json`).
- Enviar sozinho ao GitHub.
- Gerar um `index.html` novo. A página já existe e lê o `js/data.js`.

## Peças migradas

As fotos que estavam em `img/produtos/` foram para `produtos/bolsas/<peça>/`. O preço inicial ficou `Sob consulta` e a lista de materiais vazia, até alguém preencher no painel.
