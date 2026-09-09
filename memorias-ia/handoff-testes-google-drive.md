# Handoff para testes do Google Drive

- **Data:** 2026-09-09
- **Responsavel pela execucao:** Claude Code
- **Status:** aguardando testes reais

## Contexto

A implementacao do fluxo de arquivos foi concluida nos arquivos abaixo:

- `src/api/files.ts`
- `src/components/FilesTab.tsx`
- `supabase/functions/drive-upload/index.ts`

O upload envia imagens e documentos para o Google Drive em uma subpasta por paciente e grava o metadado em `files`. A exclusao agora remove o arquivo do Drive e depois o metadado no Supabase.

## Testes solicitados

1. Executar `npm.cmd run build` e confirmar TypeScript e Vite.
2. Verificar a Edge Function com `supabase functions deploy drive-upload` em ambiente de teste.
3. Confirmar que os secrets necessarios estao configurados sem registrar valores sensiveis:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Com um usuario autenticado, testar upload de uma imagem.
5. Confirmar a criacao ou reutilizacao da subpasta do paciente no Google Drive.
6. Confirmar a linha correspondente na tabela `files`.
7. Testar abertura do link da imagem na aba de imagens.
8. Testar upload e abertura de um documento na aba de documentos.
9. Excluir a imagem pela interface e confirmar remocao no Google Drive e em `files`.
10. Repetir a exclusao para um arquivo cujo objeto ja nao exista no Drive e confirmar que o metadado e removido sem erro 404.
11. Testar chamadas sem sessao e confirmar resposta `401`.
12. Testar `OPTIONS` e confirmar CORS.

## Criterios de aceite

- Nenhum segredo aparece em logs, commits ou arquivos do frontend.
- Usuario nao autenticado nao consegue fazer upload ou exclusao.
- Upload salva o arquivo na pasta correta do paciente.
- Exclusao nao deixa arquivo orfao no Drive nem metadado orfao no Supabase.
- Falha no Drive nao remove o metadado prematuramente.
- Resultado de cada teste deve ser registrado nesta memoria ou em uma memoria de testes existente, sem criar outro assunto duplicado.

## Resultado

- **Data da execucao:** 2026-09-09
- **Executado por:** Claude Code
- **Ambiente:** projeto Supabase BD_Odonto (`cccukpzwbdaycdwmvdyp`), acessado
  via MCP. Nao existe projeto Supabase separado de teste.
- **Status geral:** BLOQUEADO. 2 de 12 testes executados.

### Bloqueio principal

**A Edge Function `drive-upload` nao esta publicada no projeto.**

- `list_edge_functions` no projeto retornou lista vazia.
- `POST`, `DELETE` e `OPTIONS` em
  `https://cccukpzwbdaycdwmvdyp.supabase.co/functions/v1/drive-upload`
  respondem `404` com corpo
  `{"code":"NOT_FOUND","message":"Requested function was not found"}`.

Sem a function publicada, os testes 4 a 12 nao podem ser executados: nao ha
endpoint para exercitar upload, exclusao, autenticacao ou CORS.

### Teste 1 — build

**PASSOU.** `npm run build` (`tsc -b && vite build`) concluiu com sucesso,
97 modulos transformados. O build inclui as alteracoes nao commitadas de
`src/api/files.ts`, `src/components/FilesTab.tsx` e da propria function, ou
seja, o TypeScript desse trabalho esta valido.

### Teste 2 — deploy da function

**NAO EXECUTADO.** Requer decisao do responsavel pelo projeto. O unico projeto
Supabase existente e o de producao, com dados reais de pacientes, e o handoff
pede deploy "em ambiente de teste". Publicar exigiria tambem que os segredos
estivessem configurados, sob risco de a function falhar em execucao — o codigo
usa assercoes nao-nulas (`!`) ao ler cada variavel de ambiente.

### Teste 3 — segredos configurados

**NAO VERIFICADO.** O MCP do Supabase nao expoe ferramenta para listar
segredos, e o CLI local nao esta vinculado ao projeto (`supabase/config.toml`
nao existe). Verificar manualmente no painel, em Edge Functions > Secrets, ou
apos `supabase link`, com `supabase secrets list`.

### Testes 4 a 10 — upload, pasta, metadado, links, exclusao

**BLOQUEADOS** pela ausencia da function. Alem disso, dependem de sessao
autenticada e de interacao com a interface, que este agente nao consegue
exercitar; precisam de execucao manual por um usuario no navegador.

### Teste 11 — chamada sem sessao retorna 401

**INCONCLUSIVO.** `POST` e `DELETE` sem cabecalho `Authorization` retornaram
`404`, e nao `401`, porque a function nao existe. O gateway responde antes de
qualquer logica de autenticacao. Reexecutar apos o deploy.

### Teste 12 — OPTIONS e CORS

**INCONCLUSIVO.** `OPTIONS` retornou `404`. Os cabecalhos CORS observados
(`Access-Control-Allow-Origin: *`) vem do gateway do Supabase, nao da function.
Reexecutar apos o deploy para validar o `corsHeaders` do codigo.

### Verificacoes adicionais feitas

- A tabela `files` existe com RLS habilitada e 0 linhas. Suas colunas
  (`patient_id`, `treatment_id`, `kind`, `label`, `google_drive_file_id`,
  `google_drive_url`, `uploaded_by`, `created_at`) correspondem exatamente ao
  insert feito pela function, entao o teste 6 deve funcionar assim que o
  endpoint existir.
- `src/api/files.ts` monta a URL como
  `${VITE_SUPABASE_URL}/functions/v1/drive-upload` e envia o token do usuario
  no `Authorization`, coerente com o que a function espera.

### Observacoes sobre o codigo, ainda nao validadas em execucao

- A leitura das variaveis de ambiente usa `!`, entao um segredo ausente vira
  erro em tempo de execucao, e nao uma mensagem clara. Vale validar as
  variaveis na inicializacao e retornar erro explicito.
- No `DELETE`, qualquer usuario autenticado pode remover o arquivo de qualquer
  paciente: a function busca a linha em `files` com a service role e nao checa
  vinculo entre o usuario e o paciente. Como o sistema hoje e single-tenant e
  todos os usuarios sao da mesma clinica, o impacto e limitado, mas convem
  registrar antes de qualquer abertura multi-clinica.

### Proximos passos recomendados

1. Confirmar os quatro segredos no painel do Supabase.
2. Decidir se o deploy sera feito no projeto de producao ou em um projeto novo
   de teste, e publicar a function.
3. Reexecutar os testes 11 e 12, que sao automatizaveis e nao precisam de
   interface.
4. Executar manualmente os testes 4 a 10 pelo navegador, com um paciente de
   teste, e registrar o resultado aqui.
