import { supabase } from '../lib/supabase'
import type { FileKind, PatientFile } from '../types/database.types'
import { validarArquivo } from '../data/uploadRules'

const BUCKET = 'patient-files'

/** Validade das URLs assinadas, em segundos. */
const URL_VALIDA_POR = 60 * 60

export async function listPatientFiles(patientId: string, kind?: FileKind) {
  let query = supabase
    .from('files')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (kind) query = query.eq('kind', kind)
  const { data, error } = await query
  if (error) throw error
  return data as PatientFile[]
}

/**
 * O bucket é privado, então nada é acessível por URL fixa: cada visualização
 * gera um link assinado que expira. É o que mantém documento e foto de
 * paciente fora do alcance de quem não está autenticado.
 */
export async function signedUrlFor(storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, URL_VALIDA_POR)
  if (error) throw error
  return data.signedUrl
}

/** Assina vários caminhos de uma vez, para não fazer uma chamada por miniatura. */
export async function signedUrlsFor(storagePaths: string[]) {
  if (storagePaths.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(storagePaths, URL_VALIDA_POR)
  if (error) throw error
  const mapa: Record<string, string> = {}
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl
  }
  return mapa
}

/** Remove acentos e caracteres que atrapalham no caminho do objeto. */
function nomeSeguro(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[^ -~]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Envia o arquivo direto do navegador para o Supabase Storage, autenticado
 * pela sessão que já existe, e grava o metadado em `files`.
 *
 * Os objetos ficam organizados por paciente e tipo, o que mantém o bucket
 * navegável e permite, mais adiante, políticas RLS por prefixo de caminho.
 */
export async function uploadPatientFile(params: {
  file: File
  patientId: string
  patientName: string
  kind: FileKind
  label?: string
  treatmentId?: string
}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) throw new Error('Sessão expirada — faça login novamente.')

  const validacao = await validarArquivo(params.file, params.kind)
  if (!validacao.ok) throw new Error(validacao.erro)

  const caminho = `${params.patientId}/${params.kind}/${Date.now()}_${nomeSeguro(params.file.name)}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(caminho, params.file, {
    // O content-type vem da extensao validada, nunca do que o navegador
    // informou: arquivos HEIC de iPhone costumam chegar com o tipo vazio, e um
    // tipo forjado nao deve decidir como o arquivo sera servido depois.
    contentType: validacao.contentType,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data: fileRow, error: insertError } = await supabase
    .from('files')
    .insert({
      patient_id: params.patientId,
      treatment_id: params.treatmentId ?? null,
      kind: params.kind,
      label: params.label?.trim() || params.file.name,
      storage_path: caminho,
      uploaded_by: user.id,
    })
    .select()
    .single()

  // Sem o metadado o objeto viraria lixo invisível no bucket, então desfazemos.
  if (insertError) {
    await supabase.storage.from(BUCKET).remove([caminho])
    throw insertError
  }

  // Reflete no que a Timeline já sabe fazer bem: todo arquivo novo vira evento.
  await supabase.from('timeline_events').insert({
    patient_id: params.patientId,
    title: params.kind === 'image' ? 'Imagem adicionada' : 'Documento adicionado',
    description: fileRow.label,
    kind: params.kind === 'image' ? 'Imagem' : 'Documento',
  })

  return fileRow as PatientFile
}

/**
 * Remove o objeto antes do metadado. Na ordem inversa, uma falha deixaria o
 * arquivo órfão no bucket sem nada que apontasse para ele.
 */
export async function deletePatientFile(file: Pick<PatientFile, 'id' | 'storage_path'>) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storage_path])
  if (storageError) throw storageError

  const { error } = await supabase.from('files').delete().eq('id', file.id)
  if (error) throw error
}
