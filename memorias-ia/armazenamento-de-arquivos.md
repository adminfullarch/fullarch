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

- ~~Nenhum upload real foi feito ainda.~~ **Validado em producao.** Em
  2026-09-09, as 20:40 UTC, uma imagem JPEG vinda de iPhone foi enviada pela
  interface. O caminho seguiu o formato esperado
  (`{patientId}/image/{timestamp}_{nome}`), o objeto existe no bucket e o
  metadado em `files` aponta para ele — sem orfao dos dois lados. O filtro de
  upload deixou passar o JPEG, como esperado.
- **Documentos ainda nao foram exercitados**, nem a exclusao pela interface,
  nem a rejeicao de um tipo proibido.
- As politicas liberam qualquer usuario autenticado a ler e apagar qualquer
  arquivo do bucket. Hoje o sistema e single-tenant e todos sao da mesma
  clinica, entao o impacto e limitado. Antes de abrir para varias clinicas, as
  politicas precisam filtrar por prefixo de caminho, e o caminho ja comeca com
  o `patientId` justamente para permitir isso.
- O handoff de testes do Drive foi removido do canal junto com a decisao: a
  function que ele testava nao existe mais.

## Filtro de upload

Imagens aceitam `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic` e `.heif`, ate 15 MB.
Documentos aceitam `.pdf`, `.doc`, `.docx`, `.odt`, `.rtf`, `.txt`, `.xls` e
`.xlsx`, ate 25 MB. As regras ficam em `src/data/uploadRules.ts`.

A validacao existe em duas camadas. No navegador, `validarArquivo` confere
extensao, tamanho e os primeiros bytes do arquivo, e serve para dar mensagem
clara antes de gastar banda. No servidor, o bucket tem `allowed_mime_types` e
`file_size_limit`, e **essa e a camada que protege** — qualquer usuario
autenticado pode chamar a API do Storage direto e ignorar o navegador.

**SVG e HTML estao bloqueados de proposito, nas duas camadas.** SVG e XML e
aceita `<script>` embutido; aberto no navegador, executaria JavaScript no
contexto de quem abriu, que e XSS armazenado. Radiografia e foto intraoral
nunca sao SVG, entao nao ha o que perder. Nao afrouxar isso.

O content-type enviado ao Storage vem da extensao ja validada, nunca do
`file.type` informado pelo navegador: arquivos HEIC de iPhone costumam chegar
com tipo vazio, e um tipo forjado nao deve decidir como o arquivo sera servido
depois.

A checagem de assinatura pega o arquivo renomeado — um `.html` salvo como
`.jpg` passa pela extensao, mas nao tem assinatura de imagem. TXT nao tem
assinatura estavel e por isso nao e checado.

Vale registrar o que o filtro **nao** faz: ele nao e antivirus. Um `.docx` com
macro maliciosa passa, porque e um ZIP valido com a extensao certa. O risco ai
e para a maquina de quem baixa, nao para o banco.

## Validacao

- Comando executado: `npm run build`
- Resultado: sucesso, 98 modulos transformados, sem referencias remanescentes a
  `drive-upload` ou `google_drive` em `src/`.
- Migration `arquivos_no_supabase_storage` aplicada ao projeto BD_Odonto.
- Bucket, politicas e colunas confirmados por consulta a `storage.buckets`,
  `pg_policies` e `information_schema.columns`.
