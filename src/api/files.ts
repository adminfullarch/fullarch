import { supabase } from '../lib/supabase'
import type { FileKind, PatientFile } from '../types/database.types'

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
 * Faz upload do arquivo para o Google Drive (via Edge Function, que usa a
 * conta de serviço da clínica) e grava o metadado no Supabase.
 * O binário NUNCA passa pelo cliente-Supabase — só pela Edge Function.
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
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sessão expirada — faça login novamente.')

  const form = new FormData()
  form.append('file', params.file)
  form.append('patientId', params.patientId)
  form.append('patientName', params.patientName)
  form.append('kind', params.kind)
  form.append('label', params.label?.trim() || params.file.name)
  if (params.treatmentId) form.append('treatmentId', params.treatmentId)

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-upload`
  const res = await fetch(functionsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Falha no upload (HTTP ${res.status}).`)
  }

  const { file } = (await res.json()) as { file: PatientFile }

  // Reflete no que a Timeline já sabe fazer bem: todo arquivo novo vira evento.
  await supabase.from('timeline_events').insert({
    patient_id: params.patientId,
    title: params.kind === 'image' ? 'Imagem adicionada' : 'Documento adicionado',
    description: file.label,
    kind: params.kind === 'image' ? 'Imagem' : 'Documento',
  })

  return file
}

export async function deletePatientFile(id: string) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sessão expirada — faça login novamente.')

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-upload`
  const res = await fetch(functionsUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId: id }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Falha ao excluir arquivo (HTTP ${res.status}).`)
  }
}