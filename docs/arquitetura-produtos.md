# Arquitetura dos produtos

Decisões de como as peças do site Nephila são guardadas, editadas e publicadas.

## Decisões

- A fonte da verdade das peças é a pasta `produtos/`, não o `js/data.js`.
- Um script lê essa pasta e gera `js/data.js`. O `index.html` e o `js/main.js` continuam iguais: o site público segue estático no GitHub Pages.
- O painel de edição usa Node e Express, sem login. Ele escuta na rede de casa, na porta `3847`. Ao iniciar, o console mostra a URL absoluta para abrir de outro aparelho.
- Quem cria e edita categorias, textos e fotos é o painel. **Ver Site** atualiza a página neste computador e abre a prévia. **Publicar atualização** faz commit e push, depois de uma confirmação.
- Marca, bio e contato ficam em `site.json`. O painel não altera esses dados.
- O preço é o último parágrafo do Markdown da peça, em reais, como deve aparecer no site (exemplo: `R$ 180,00`).
- As fotos podem ser enviadas com qualquer nome. O servidor grava `nome-da-peca-0.jpeg`, `nome-da-peca-1.jpeg` e assim por diante.

## Fluxo

```
produtos/  +  site.json
        │
        ▼
 scripts/build-data.js     ← também pelo botão Ver Site
        │
        ▼
    js/data.js
        │
        ▼
 index.html + js/main.js   ← GitHub Pages
```

Salvar uma peça não publica. **Ver Site** atualiza a página neste computador e abre a prévia. **Publicar atualização** envia ao GitHub, com a mensagem à vista antes do envio.

## Rede de casa

O servidor escuta em `0.0.0.0:3847`. No console aparecem o endereço deste computador e o de cada IPv4 da rede local:

```
Painel neste computador: http://127.0.0.1:3847/admin
Painel na rede de casa:  http://192.168.1.20:3847/admin
```

Não há login. Quem estiver na mesma rede Wi-Fi pode abrir o painel e publicar. Se o celular não conectar, o Firewall do Windows precisa permitir o Node na rede privada.

A tela do painel se adapta ao celular: os botões principais ficam fixos no rodapé.

## Publicar

O botão **Publicar atualização** gera o site de novo, mostra a mensagem e a lista de arquivos, e só então faz o commit e o `git push` da branch atual para o remoto que ela já acompanha.

Entram no commit apenas:

- `produtos/`
- `js/data.js`
- `site.json`

Outras alterações do repositório ficam de fora. O painel não altera a configuração do Git, não troca de branch, não ignora hooks e não faz push forçado.

A mensagem sai do que mudou nas pastas: peça nova, peça atualizada, fotos, categoria. Dá para editar o texto antes de confirmar. Se o GitHub recusar o envio, o commit permanece neste computador e o painel mostra o erro.

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

Técnica: Crochê, Macramê

R$ 180,00
```

| Parte | Campo no site |
| --- | --- |
| Título `#` | Nome |
| Primeiro parágrafo | Descrição |
| Lista com `-` | Materiais (pode ficar de fora) |
| Parágrafo `Técnica:` | Técnicas, separadas por vírgula. No site viram `Crochê · Macramê` |
| Último parágrafo | Preço |

Se o preço for só um número, como `180,00`, o painel grava `R$ 180,00`. Texto como `Sob consulta` permanece como foi escrito.

Sem o parágrafo `Técnica:`, o site mostra `Crochê · Macramê`. Ao salvar a peça no painel com o campo vazio, esse padrão é gravado no Markdown.

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
- Publicar as peças no GitHub, com confirmação.

Renomear o nome visível também renomeia a pasta e os arquivos, para o slug continuar igual ao nome.

## O que fica de fora

- Login no painel.
- Editar bio, WhatsApp ou e-mail pelo painel (isso é o `site.json`).
- Publicar a cada salvamento. O envio ao GitHub só acontece no botão **Publicar atualização**, com confirmação.
- Gerar um `index.html` novo. A página já existe e lê o `js/data.js`.

## Peças migradas

As fotos que estavam em `img/produtos/` foram para `produtos/bolsas/<peça>/`. O preço inicial ficou `Sob consulta` e a lista de materiais vazia, até alguém preencher no painel.
