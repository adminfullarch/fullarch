-- Restringe o bucket no servidor. A validacao no navegador e apenas conforto
-- para o usuario: qualquer um pode chamar a API direto, entao o limite que
-- realmente protege e este.
--
-- image/svg+xml fica deliberadamente de fora: SVG e XML e pode carregar
-- <script>, o que abriria caminho para XSS armazenado quando o arquivo fosse
-- aberto no navegador. O mesmo vale para text/html.
update storage.buckets
set
  file_size_limit = 26214400, -- 25 MB, o maior entre imagem (15) e documento (25)
  allowed_mime_types = array[
    -- imagens
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    -- documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
where id = 'patient-files';
