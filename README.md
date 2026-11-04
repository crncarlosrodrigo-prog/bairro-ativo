# Bairro Ativo

Aplicativo gratuito para celular (PWA) que organiza os **cursos**, os **eventos** e o **caixa** da Associação Comunitária Santo Inácio de Loyola (Boqueirão, Curitiba).

Prática extensionista de Carlos Rodrigo do Nascimento – Análise e Desenvolvimento de Sistemas – PUCPR.

## Funcionalidades

| Módulo | O que faz |
|---|---|
| Cursos | Cursos, turmas com início e fim, matrícula de alunos (nome, telefone, endereço, bairro e CPF opcional, mascarado) |
| Eventos | Participantes por número ou por lista de nomes; total de participações por ano |
| Caixa | Entradas (bazar, doação, evento) e saídas (luz, água, material), forma (espécie ou conta), vínculo a um evento, saldo do mês |
| Relatórios | PDF anual (cursos, alunos, eventos e participantes) e PDF mensal do caixa, para compartilhar pelo WhatsApp |
| Cópia de segurança | Exporta e recupera todos os dados em um arquivo `.json` |

## Tecnologia

- HTML, CSS e JavaScript puros, sem servidor
- Dados guardados **somente no aparelho** (IndexedDB, com localStorage como reserva)
- Service worker: funciona sem internet depois de instalado
- jsPDF 2.5.2 (incluído em `vendor/`) para gerar os PDFs no próprio celular

## Publicar no GitHub Pages

1. Crie o repositório `bairro-ativo` em github.com/crncarlosrodrigo-prog.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
4. O app fica em `https://crncarlosrodrigo-prog.github.io/bairro-ativo/`.

## Instalar no celular Android

Abra o endereço no Chrome, toque nos três pontinhos e escolha **"Instalar app"** ou **"Adicionar à tela inicial"**.

## Nova versão

Depois de alterar algum arquivo, aumente o número em `VERSAO` no `sw.js` (por exemplo, `bairro-ativo-v2`) para os celulares receberem a atualização.

## Privacidade (LGPD)

- Nenhum dado sai do celular, a não ser quando a presidente gera um PDF ou uma cópia de segurança.
- O CPF é opcional, validado e exibido mascarado (`***.982.247-**`). Os relatórios não mostram dados pessoais dos alunos.
