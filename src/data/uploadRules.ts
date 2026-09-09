import type { FileKind } from '../types/database.types'

/**
 * Regras de upload de arquivos do prontuário.
 *
 * Estas checagens rodam no navegador e servem para dar uma mensagem clara ao
 * usuário antes de gastar banda. Elas NÃO são a defesa: qualquer pessoa
 * autenticada pode chamar a API do Storage direto e ignorar tudo isto. A
 * defesa de verdade são o `allowed_mime_types` e o `file_size_limit` do
 * bucket, definidos em `supabase/migrations/0004_limites_upload.sql`.
 *
 * Duas exclusões são propositais e não devem ser afrouxadas:
 *
 * - **SVG** é XML e aceita `<script>` embutido. Um SVG malicioso aberto no
 *   navegador executaria JavaScript no contexto de quem abriu — XSS
 *   armazenado. Radiografia e foto intraoral nunca são SVG, então não há o
 *   que perder ao bloquear.
 * - **HTML** pelo mesmo motivo.
 */

export type RegraUpload = {
  /** Extensões aceitas, em minúsculas e com ponto. */
  extensoes: string[]
  /** Valor do atributo `accept` do input de arquivo. */
  accept: string
  /** Limite de tamanho em bytes. */
  tamanhoMaximo: number
  /** Texto curto para a mensagem de erro. */
  descricao: string
}

const MB = 1024 * 1024

export const REGRAS: Record<FileKind, RegraUpload> = {
  image: {
    extensoes: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
    accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif',
    tamanhoMaximo: 15 * MB,
    descricao: 'JPG, PNG, WEBP ou HEIC',
  },
  document: {
    extensoes: ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.xls', '.xlsx'],
    accept: '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx',
    tamanhoMaximo: 25 * MB,
    descricao: 'PDF, Word, Excel, ODT, RTF ou TXT',
  },
}

/**
 * O `type` que o navegador informa é pouco confiável — arquivos HEIC de
 * iPhone costumam chegar com o tipo vazio. Por isso o content-type enviado ao
 * Storage é derivado da extensão, e não do que o navegador disse.
 */
const MIME_POR_EXTENSAO: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/**
 * Primeiros bytes que cada formato precisa ter. Serve para pegar o caso do
 * arquivo renomeado: um `.html` salvo como `.jpg` passa pela checagem de
 * extensão, mas não tem assinatura de imagem.
 *
 * Formatos sem assinatura estável (TXT) ficam de fora e não são checados.
 */
const ASSINATURAS: Record<string, number[][]> = {
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.rtf': [[0x7b, 0x5c, 0x72, 0x74, 0x66]], // {\rtf
  // Office moderno e ODT sao arquivos ZIP.
  '.docx': [[0x50, 0x4b, 0x03, 0x04]],
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]],
  '.odt': [[0x50, 0x4b, 0x03, 0x04]],
  // Office legado usa o container OLE2.
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
}

export function extensaoDe(nome: string) {
  const ponto = nome.lastIndexOf('.')
  return ponto === -1 ? '' : nome.slice(ponto).toLowerCase()
}

function formatarTamanho(bytes: number) {
  return `${Math.round(bytes / MB)} MB`
}

/** WEBP e HEIC têm o identificador deslocado, então são checados à parte. */
async function assinaturaConfere(file: File, extensao: string) {
  const cabecalho = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const texto = (inicio: number, fim: number) =>
    String.fromCharCode(...cabecalho.slice(inicio, fim))

  if (extensao === '.webp') {
    return texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP'
  }
  if (extensao === '.heic' || extensao === '.heif') {
    return texto(4, 8) === 'ftyp'
  }

  const esperadas = ASSINATURAS[extensao]
  if (!esperadas) return true // sem assinatura conhecida, não há o que checar

  return esperadas.some((assinatura) =>
    assinatura.every((byte, i) => cabecalho[i] === byte)
  )
}

export type ResultadoValidacao =
  | { ok: true; contentType: string }
  | { ok: false; erro: string }

/**
 * Confere extensão, tamanho e assinatura antes do upload, e devolve o
 * content-type que deve ser enviado ao Storage.
 */
export async function validarArquivo(file: File, kind: FileKind): Promise<ResultadoValidacao> {
  const regra = REGRAS[kind]
  const extensao = extensaoDe(file.name)

  if (!regra.extensoes.includes(extensao)) {
    const alvo = kind === 'image' ? 'Nesta aba só entram imagens' : 'Nesta aba só entram documentos'
    return { ok: false, erro: `${alvo}: ${regra.descricao}.` }
  }

  if (file.size === 0) {
    return { ok: false, erro: 'O arquivo está vazio.' }
  }

  if (file.size > regra.tamanhoMaximo) {
    return {
      ok: false,
      erro: `Arquivo de ${formatarTamanho(file.size)}. O limite é ${formatarTamanho(regra.tamanhoMaximo)}.`,
    }
  }

  if (!(await assinaturaConfere(file, extensao))) {
    return {
      ok: false,
      erro: `O conteúdo do arquivo não corresponde à extensão ${extensao}. Verifique se ele não foi renomeado.`,
    }
  }

  return { ok: true, contentType: MIME_POR_EXTENSAO[extensao] ?? 'application/octet-stream' }
}
