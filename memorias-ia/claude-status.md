# Status do Claude Code

- **Atualizado em:** 2026-09-09
- **Status:** frente de armazenamento entregue no codigo e no banco, aguardando
  validacao pela interface.

## Missoes concluidas nesta sessao

### Aba de anamnese odontologica

Transportada do esboco `anamnese.html` para o app, seguindo o design system.
As 9 especialidades viraram dados em `src/data/anamnese.ts`; o componente
apenas renderiza. Publicada em producao.

- Arquivos: `src/data/anamnese.ts`, `src/components/AnamneseTab.tsx`,
  `src/components/PatientProfile.tsx`, `src/api/questionnaire.ts`,
  `src/styles.css`, `supabase/migrations/0002_anamnese.sql`.
- Validacao: `npm run build` aprovado; migration aplicada; upsert testado no
  banco real; bundle publicado em `https://fullarch.vercel.app` confere.
- Detalhes em [`anamnese.md`](anamnese.md).

### Handoff de testes do Google Drive

Executado e **bloqueado**: a Edge Function `drive-upload` nunca esteve
publicada no projeto, entao 10 dos 12 testes nao tinham endpoint para
exercitar. Como o Drive foi descartado, o arquivo do handoff foi removido do
canal; o motivo do abandono esta em
[`armazenamento-de-arquivos.md`](armazenamento-de-arquivos.md).

### Migracao do armazenamento para o Supabase Storage

O caminho do Drive foi abandonado por decisao do usuario, apos tres problemas
identificados na leitura do codigo: conta de servico nao tem cota propria, o
escopo `drive.file` nao alcanca pasta criada manualmente, e o `webViewLink`
salvo apontava para arquivo que o navegador do dentista nao teria permissao de
abrir. Detalhes em [`armazenamento-de-arquivos.md`](armazenamento-de-arquivos.md).

- Arquivos: `src/api/files.ts`, `src/components/FilesTab.tsx`,
  `src/types/database.types.ts`, `src/styles.css`,
  `supabase/migrations/0003_storage_arquivos.sql`. Removido:
  `supabase/functions/drive-upload/index.ts`.
- Validacao: `npm run build` aprovado, 98 modulos; bucket privado, tres
  politicas e coluna `storage_path` confirmados por consulta ao banco.

## Aviso sobre o commit a4100a4

Ao commitar a migracao para o Storage, usei `git add -A` sobre `src/`,
`supabase/` e `memorias-ia/`. Isso varreu junto trabalho em andamento do
Copilot — `src/components/LandingPage.tsx`, alteracoes em `App.tsx` e
`Login.tsx`, e os quatro arquivos deste canal — que foram commitados sob a
minha mensagem e publicados na `main`.

O build passa com tudo junto e nada aparenta ter quebrado, mas o conteudo foi
para producao sem revisao do autor. Fica o registro. Daqui em diante listo os
caminhos explicitamente no `git add`.

### Limpeza de seguranca do banco (MISS-2026-09-09-001)

O banco carregava sete funcoes de uma tentativa anterior de autenticacao
propria, fora de qualquer migration. Por serem SECURITY DEFINER no schema
`public`, eram chamaveis por qualquer visitante via `/rest/v1/rpc/<nome>`.
Nenhuma era usada pelo app, e as tabelas que consultavam (`usuarios`,
`perfis`) nao existem em schema algum.

Todas removidas em `supabase/migrations/0005_limpeza_seguranca.sql`. Os
advisors de seguranca cairam de 15 avisos para 1.

### Isolamento por clinica (MISS-2026-09-09-002)

O acesso passa a depender do pertencimento a uma clinica, em vez de apenas
estar autenticado. Detalhes e validacao em [`multi-clinica.md`](multi-clinica.md).

Nota para o Copilot: a tela de cadastro poderia perguntar o nome da clinica e
passa-lo em `options.data.clinic_name` no `signUp` — o trigger ja usa esse
campo. Nao mexi em `Login.tsx` por ser sua frente de trabalho.

## Pendencias na minha frente

- Nenhum upload real foi feito pelo Storage; o fluxo pela interface ainda nao
  foi exercitado por um usuario.
- As politicas do bucket permitem que qualquer usuario autenticado leia ou
  apague qualquer arquivo. Suficiente para uma clinica; precisa filtrar por
  prefixo de caminho antes de qualquer abertura multi-clinica.
- Nao ha limite de tamanho nem validacao de tipo no upload.
- O historico de migrations do banco esta incompleto: `0001_init.sql` foi
  aplicado a mao e nao consta como executado.
- **Com o usuario:** ligar a protecao contra senhas vazadas em
  Authentication > Policies no painel. E o unico aviso de seguranca restante.

## Proxima acao

Aguardar o usuario exercitar upload de imagem e documento em
`https://fullarch.vercel.app` e registrar o resultado aqui.
