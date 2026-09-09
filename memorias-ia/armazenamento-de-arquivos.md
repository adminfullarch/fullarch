# Armazenamento de documentos e fotos dos pacientes

- **Data:** 2026-09-09
- **Escopo:** aba de Imagens e Documentos do prontuario
- **Status:** vigente, substitui o plano do Google Drive

## Contexto

O plano original era guardar documentos e fotos no Google Drive, com uma conta
de servico e a Edge Function `drive-upload`. Ao preparar a conexao com o Drive,
tres problemas ficaram claros antes de qualquer credencial ser configurada.

Contas de servico nao tem cota de armazenamento propria. Enviar arquivos para
uma pasta de um Drive pessoal falharia; seria necessario um Drive compartilhado
do Google Workspace.

O escopo pedido pelo codigo era `drive.file`, que da acesso apenas a arquivos
criados pela propria aplicacao. A pasta pai seria criada manualmente, entao a
conta de servico provavelmente nao conseguiria enxerga-la nem gravar dentro.

O mais grave: a function salvava o `webViewLink` e a interface abria esse link,
mas o arquivo pertenceria a conta de servico. O navegador do dentista, logado
na conta pessoal dele, nao teria permissao alguma. O link daria acesso negado,
a menos que os arquivos fossem tornados publicos — inaceitavel para documento e
foto de paciente.

## Decisao

Os arquivos passam a viver no **Supabase Storage**, no bucket privado
`patient-files`. A decisao foi tomada pelo usuario em 2026-09-09, com a tabela
`files` ainda vazia, entao nao houve dados a migrar.

O upload vai direto do navegador para o Storage, autenticado pela sessao que ja
existe. A Edge Function `drive-upload` foi removida, e com ela a conta de
servico, os quatro segredos e o handoff de 12 testes que dependia dela.

Nenhum arquivo e servido por URL fixa. Cada visualizacao gera uma **URL
assinada com validade de uma hora**, que e o padrao adequado para dado pessoal
sensivel de saude e o ponto principal a preservar em qualquer mudanca futura.

## Fatos confirmados

- Bucket `patient-files` existe e esta marcado como **privado**.
- Tres politicas em `storage.objects`, todas restritas ao bucket e a usuarios
  autenticados: `staff_read_patient_files`, `staff_insert_patient_files` e
  `staff_delete_patient_files`.
- A tabela `files` perdeu `google_drive_file_id` e `google_drive_url`, e ganhou
  `storage_path text not null`.
- Caminho dos objetos: `{patientId}/{kind}/{timestamp}_{nome-sanitizado}`.
- Se o insert do metadado falhar, o objeto recem-enviado e removido do bucket,
  para nao virar lixo invisivel.
- Na exclusao, o objeto sai antes do metadado: na ordem inversa, uma falha
  deixaria arquivo orfao sem nada apontando para ele.

## Evidencias

- [`src/api/files.ts`](../src/api/files.ts): upload, URLs assinadas e exclusao.
- [`src/components/FilesTab.tsx`](../src/components/FilesTab.tsx): miniaturas e
  abertura por link assinado gerado no clique.
- [`supabase/migrations/0003_storage_arquivos.sql`](../supabase/migrations/0003_storage_arquivos.sql)
- Commit `42129c2` preserva o fluxo do Drive no historico, caso alguem precise
  consultar como era.

## Pendencias e riscos

- **Nenhum upload real foi feito ainda.** O build passa e o banco esta
  configurado, mas o fluxo completo pela interface nao foi exercitado.
- As politicas liberam qualquer usuario autenticado a ler e apagar qualquer
  arquivo do bucket. Hoje o sistema e single-tenant e todos sao da mesma
  clinica, entao o impacto e limitado. Antes de abrir para varias clinicas, as
  politicas precisam filtrar por prefixo de caminho, e o caminho ja comeca com
  o `patientId` justamente para permitir isso.
- Nao ha limite de tamanho nem validacao de tipo no upload.
- O handoff `handoff-testes-google-drive.md` esta obsoleto: a function que ele
  testava nao existe mais.

## Validacao

- Comando executado: `npm run build`
- Resultado: sucesso, 98 modulos transformados, sem referencias remanescentes a
  `drive-upload` ou `google_drive` em `src/`.
- Migration `arquivos_no_supabase_storage` aplicada ao projeto BD_Odonto.
- Bucket, politicas e colunas confirmados por consulta a `storage.buckets`,
  `pg_policies` e `information_schema.columns`.
