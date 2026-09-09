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

Preencher pelo Claude Code com data, comandos executados, ambiente usado, resultado de cada teste e bloqueios encontrados. Nao registrar tokens, chaves privadas, URLs com credenciais ou dados reais de pacientes.
