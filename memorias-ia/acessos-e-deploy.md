# Acessos e deploy

- **Data:** 2026-09-09
- **Escopo:** GitHub, Vercel, Supabase e o caminho de publicacao
- **Status:** vigente

> **Este arquivo nao contem credenciais, e nao deve passar a conter.**
> Ele vive num repositorio e registra apenas identificadores publicos e
> procedimentos. Senhas, tokens, chaves privadas e a `service_role key` sao
> compartilhados fora do repositorio — gerenciador de senhas ou convite dentro
> de cada plataforma. Quem precisar de acesso pede ao dono da conta.

## GitHub

- Repositorio: **`adminfullarch/fullarch`**
  (renomeado; o nome antigo `fullarck.admin` ainda aparece em remotes velhos —
  corrigir com `git remote set-url origin`).
- Branch de producao: **`main`**.
- Acesso: por convite de colaborador no repositorio.

## Vercel

- Projeto correto: **`vercel.com/fullarch/fullarch`**
- Producao: **https://fullarch.vercel.app**
- Deploy e automatico: **todo push na `main` publica em producao.** Nao ha
  passo manual.
- Branches que nao sejam `main` geram deploy de preview, com URL propria
  listada em Deployments.

### Armadilha conhecida

Existiu um projeto duplicado servindo **`fullarch-puce.vercel.app`**. O sufixo
`-puce` e o que o Vercel acrescenta quando o nome ja esta ocupado. Esse
endereco serve um bundle antigo e congelado, e **nao deve ser usado para
validar mudancas** — ja custou tempo uma vez. Recomendado apagar o projeto
duplicado.

### Variaveis de ambiente

Configuradas em Settings > Environment Variables do projeto no Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ambas tambem existem localmente em `.env.local`, que esta no `.gitignore`. Os
valores saem do painel do Supabase, em Settings > API. A `anon key` e publica
por natureza — ela viaja no bundle do navegador — e quem protege os dados e a
RLS, nao o segredo dessa chave. Ainda assim, nao a cole neste arquivo.

## Supabase

- Projeto: **BD_Odonto**
- Ref: **`cccukpzwbdaycdwmvdyp`**
- URL da API: `https://cccukpzwbdaycdwmvdyp.supabase.co`
- Regiao: `sa-east-1` · Postgres 17 · plano Free
- Acesso: por convite de membro na organizacao.

### Como aplicar mudancas de schema

Toda alteracao de banco precisa virar arquivo em `supabase/migrations/`, mesmo
quando aplicada por outro caminho. Sem isso o banco nao pode ser recriado.

Dois caminhos equivalentes:

1. **MCP do Supabase** — configurado em `.mcp.json` na raiz, apontando para
   `https://mcp.supabase.com/mcp`. A autenticacao e OAuth pelo navegador, sem
   token em arquivo; cada agente autoriza a propria sessao com `/mcp`. E como
   as migrations 0002 a 0006 foram aplicadas.
2. **Supabase CLI** — `npx supabase login`, `npx supabase link --project-ref
   cccukpzwbdaycdwmvdyp`, depois `npx supabase db push`.

### Historico de migrations

Saneado em 2026-09-10. Os arquivos em `supabase/migrations/` seguem a
convencao do CLI (`<timestamp>_<nome>.sql`) e **batem exatamente** com o que
esta registrado em `supabase_migrations.schema_migrations` — 9 de cada lado,
com os mesmos nomes.

Antes disso os arquivos se chamavam `0001_init.sql`, `0002_anamnese.sql` e
assim por diante, enquanto o banco registrava `20260909165417_...`. Um
`supabase db push` acharia que nenhum arquivo local tinha sido aplicado e
tentaria rodar todos de novo, falhando ao criar tabelas ja existentes.

Nunca renomeie um arquivo de migration sem acertar a linha correspondente em
`schema_migrations`: e essa correspondencia que mantem o banco reproduzivel.

**Cuidado com `supabase db reset`:** ele apaga o banco e recria a partir das
migrations. E o comando que destroi dados. `db push` e o registro de historico,
nao.

## Publicando uma mudanca

1. Trabalhar em branch, ou direto na `main` quando combinado.
2. `npm run build` — o build tem que passar antes do push. E `tsc -b && vite
   build`, entao ele tambem valida o TypeScript.
3. Se a mudanca toca o banco, aplicar a migration **e** commitar o arquivo
   correspondente em `supabase/migrations/`.
4. Push. O Vercel publica sozinho.
5. Conferir em `https://fullarch.vercel.app` — nunca no endereco `-puce`.

## Regra de convivencia entre agentes

Copilot e Claude Code editam este repositorio ao mesmo tempo. **Nunca usar
`git add -A`, `git add .` ou `git add -u`**: isso varre o trabalho em andamento
do outro para dentro do seu commit e, com push na `main`, publica em producao
sem revisao. Ja aconteceu uma vez, no commit `a4100a4`. Listar sempre os
caminhos explicitamente e conferir `git status` antes de commitar.
