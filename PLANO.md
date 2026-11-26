# Resenha: plano do app aberto

Documento de passagem. Qualquer pessoa ou IA que pegar o projeto começa por aqui.

## O que é
App de rolês em Belo Horizonte. Começou pessoal, do dono do projeto, e vai virar aberto: amigos primeiro, público depois, talvez com um valor simbólico.

A versão pessoal continua no ar enquanto a nova não fica pronta:
- App atual: https://claude.ai/artifact/RymApxRtJTx1iLvgeR79SD (página do Claude com banco próprio)
- Busca diária de eventos: tarefa agendada no Claude do Mac, "resenha-busca-eventos", com as instruções em ~/.claude/scheduled-tasks/resenha-busca-eventos/SKILL.md
- Cópia de todos os dados do app atual: pasta `dados/app-atual` (não vai pro GitHub, tem coisa pessoal)

## Decisões já tomadas
- Três camadas: **pública** (eventos e lugares aprovados), **pessoal** (lista, fila, diário, caderno, ideias privadas) e **grupo** (fica pra depois).
- Qualquer pessoa pode sugerir evento ou lugar; o admin (o dono) aprova antes de aparecer pra todo mundo.
- Login com Google, e link por e-mail como opção secundária (o plano grátis do Supabase não deixa mudar o e-mail pra mandar código). Sem senha.
- Site instalável na tela do celular (PWA). Sem App Store por enquanto.
- Banco: Supabase. Hospedagem: GitHub Pages. Código num repositório do GitHub.
- Funções em grupo (fila da galera, "eu vou", rodízio da resenha): por enquanto não. Combinar no WhatsApp.
- Cobrança: decidir depois. Sugestão registrada: amigos de graça, cobrar só de quem chega de fora ou por funções extras, porque o princípio do rolê barato diz que dinheiro não pode virar barreira.

## Etapas
1. **Base** (feita em 26/11/2026, no ar em https://brederf.github.io/resenha/): esquema do banco com regras de acesso, login, app novo ligado no Supabase, migração dos dados, tela de aprovação pro admin, publicação no GitHub Pages.
2. **Robô na nuvem**: busca diária de eventos rodando no GitHub Actions, gravando direto no Supabase. Instagram e TikTok continuam pelo Chrome do Mac às sextas.
3. **IA por API**: ler print e montar roteiro, com a chave escondida numa função do Supabase. Conferir se a API escolhida lê imagem.
4. **Aberto ao público**: termos de uso, política de privacidade (LGPD) e, se for o caso, cobrança (Pix via Mercado Pago ou Stripe).

## Onde está cada coisa
- `index.html` + `src/main.js`: o app novo (Vite). A interface veio do app antigo; a parte de dados e o login usam o Supabase.
- `public/`: ícones e manifesto pra instalar no celular.
- Publicação: o GitHub Pages serve a branch `gh-pages`, que é só a pasta `dist` gerada. Pra publicar: `npm run publicar` (gera o build e manda pra gh-pages). As chaves públicas do Supabase estão em `.env.production`.
- `.github/workflows/publicar.yml` existe só no computador: o login do GitHub CLI não tem a permissão `workflow`. Quando tiver (`gh auth refresh -h github.com -s workflow`), dá pra commitar e trocar a fonte do Pages pra GitHub Actions.
- `npm run dev` roda local; `npm run build` gera a pasta dist; o primeiro usuário que entra vira admin.
- `referencia/app-antigo.html`: o app antigo, como referência.
- `supabase/001_esquema.sql`: tabelas e regras de acesso. Rodar no SQL Editor do Supabase.
- `src/importar-dev.js`: copia `dados/app-atual` pro Supabase, separando público e privado. Só roda no `npm run dev`, logado como admin: no console do navegador, `await __importar()`.
- `dados/app-atual/`: exportação do app antigo (rolês, eventos, caderno, radar).
- O app atual (HTML único) serve de base visual e de comportamento pro app novo.

## Banco (resumo)
- `perfis`: um por pessoa, criado no primeiro login. Campo `admin`.
- `roles`: lugares e ideias sem data. `publico` + `moderacao` (pendente, aprovado, recusado). Privado = só o dono vê.
- `eventos`: têm data. Mesma regra de público e moderação.
- `minha_lista`: a relação de cada pessoa com um rolê ou evento (quero, fila, feito, riscado, vou, talvez, passo, longo prazo, data, nota, checklist).
- `diario`: o que já rolou, se prestou e a nota.
- `notas`: o caderno pessoal.
- `fontes` e `radar_status`: radar de fontes e a última busca.

## Regras de escrita (do dono)
Português, direto. Nunca usar travessão: usar vírgula. Não concordar automaticamente. Dizer quando não sabe.

## Pendências
- Remarcar a cachoeira de ônibus (a de 02/08 não rolou).
- Confirmar o @ certo do perfil que ele chamou de "borabh".
- Resultado real do aniversário, inventário da tropa, tópicos de "Pra aprofundar depois".
