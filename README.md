# Bairro Ativo (versão 3)

Aplicativo gratuito para celular (PWA) que organiza os **cursos**, os **eventos** e o **caixa** da Associação Comunitária Santo Inácio de Loyola (Boqueirão, Curitiba).

Prática extensionista de Carlos Rodrigo do Nascimento – Análise e Desenvolvimento de Sistemas – PUCPR.

## Novidades da versão 3

| Mudança | Como funciona |
|---|---|
| Confirmação ao sair | O botão voltar do celular fecha a janela aberta, volta para a tela anterior ou para o Início, e no Início pergunta "Sair do app?" |
| Relatórios por tipo | Geral, Cursos, Eventos, Caixa ou Bazar, por mês ou por ano |
| Até 3 usuários sincronizados | Login com e-mail e senha; dados no Cloud Firestore (Firebase) com cópia offline em cada celular |

## Dois modos de uso

- **Só neste celular** (padrão): deixe `firebase-config.js` como `null`. Sem login, dados só no aparelho.
- **Sincronizado (até 3 celulares)**: crie um projeto no Firebase, preencha `firebase-config.js` e publique as regras de `firestore.rules`.

## Configurar a sincronização (uma vez)

1. Acesse console.firebase.google.com e crie o projeto `bairro-ativo` (pode desativar o Google Analytics).
2. **Authentication → Começar → E-mail/senha → Ativar.**
3. **Authentication → Usuários → Adicionar usuário**: cadastre até 3 e-mails e senhas (presidente e ajudantes).
4. **Firestore Database → Criar banco de dados** → local `southamerica-east1 (São Paulo)` → modo de produção.
5. **Firestore Database → Regras**: cole o conteúdo de `firestore.rules`, troque os 3 e-mails de exemplo pelos e-mails reais (minúsculos) e clique em **Publicar**.
6. **Configurações do projeto → Seus apps → Web (</>)** → registre o app `Bairro Ativo` (sem Hosting) e copie o objeto `firebaseConfig`.
7. Em `firebase-config.js`, troque `null` pelo objeto do exemplo, com os valores copiados, e publique no GitHub.
8. No celular, abra o app, entre com e-mail e senha. Na primeira entrada, o app oferece enviar os dados já cadastrados no celular.

Os dados de configuração do Firebase (apiKey etc.) não são secretos; quem protege os dados são as regras de acesso, que liberam apenas os e-mails da lista.

## Custos e limites

O plano gratuito do Firebase (Spark) atende com folga: 1 GiB de dados e dezenas de milhares de leituras e gravações por dia. Não há cobrança enquanto não for adicionado um cartão.

## Publicar no GitHub Pages

Envie todos os arquivos para a raiz do repositório `bairro-ativo`. Em **Settings → Pages**, use a branch `main` e a pasta `/ (root)`.

## Nova versão

Ao alterar arquivos, aumente o número em `VERSAO` no `sw.js` (ex.: `bairro-ativo-v4`) para os celulares receberem a atualização.

## Privacidade (LGPD)

- No modo sincronizado, os dados ficam no Cloud Firestore (Google), na região de São Paulo, acessíveis apenas aos 3 e-mails autorizados nas regras.
- O CPF é opcional, validado e exibido mascarado. Os relatórios não trazem CPF nem telefone.
- Ao sair da conta, os dados são apagados do celular (continuam na nuvem).
