// supabase/functions/drive-upload/index.ts
//
// Recebe um arquivo do app (autenticado via Supabase Auth), envia pro
// Google Drive usando a conta de serviço fixa da clínica, e grava o
// metadado na tabela `files` usando a service role key (ignora RLS).
//
// Segredos necessários (definir com `supabase secrets set`):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   (a chave privada do JSON da conta de serviço)
//   GOOGLE_DRIVE_FOLDER_ID               (pasta do Drive compartilhada com a conta de serviço)
//   SUPABASE_URL                         (já vem por padrão no ambiente da function)
//   SUPABASE_ANON_KEY                    (já vem por padrão no ambiente da function)
//   SUPABASE_SERVICE_ROLE_KEY            (definir manualmente — nunca expor no frontend)
//
// Deploy: supabase functions deploy drive-upload
//
// IMPORTANTE: este código não foi executado contra credenciais reais
// (sem acesso a rede neste ambiente). Antes de usar em produção, teste
// o upload fim a fim com uma conta de serviço de teste.

import { google } from 'npm:googleapis@144'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = (
  Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ?? ''
).replace(/\\n/g, '\n')
const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  return google.drive({ version: 'v3', auth })
}

/**
 * Cada paciente ganha a própria subpasta dentro de GOOGLE_DRIVE_FOLDER_ID,
 * assim os arquivos ficam fisicamente isolados por paciente no Drive (não
 * só filtrados na tela) — se alguém abrir o Drive direto, paciente X e
 * paciente Y aparecem em pastas separadas.
 *
 * A busca usa `appProperties.patientId` (não o nome da pasta) pra achar a
 * pasta de novo com segurança, mesmo que alguém renomeie a pasta manualmente
 * no Drive depois.
 *
 * Nota: se dois uploads pro MESMO paciente novo acontecerem ao mesmo tempo
 * (milissegundos de diferença), é possível criar duas pastas por uma corrida
 * de condição — cenário raro numa clínica pequena, mas documentado aqui.
 */
async function getOrCreatePatientFolder(
  drive: ReturnType<typeof getDriveClient>,
  patientId: string,
  patientName: string
) {
  const search = await drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='patientId' and value='${patientId}' } and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  })
  const existing = search.data.files?.[0]
  if (existing?.id) return existing.id

  const created = await drive.files.create({
    requestBody: {
      name: patientName.trim() || patientId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      appProperties: { patientId },
    },
    fields: 'id',
  })
  if (!created.data.id) throw new Error('Não foi possível criar a pasta do paciente no Drive.')
  return created.data.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST' && req.method !== 'DELETE') return json({ error: 'Método não permitido.' }, 405)

  try {
    // 1) Confirma que quem chamou é um usuário autenticado de verdade
    //    (o token do usuário, não a service role, é usado aqui).
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) {
      return json({ error: 'Não autenticado.' }, 401)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({})) as { fileId?: string }
      if (!body.fileId) return json({ error: 'fileId é obrigatório.' }, 400)

      const { data: fileRow, error: fileError } = await supabaseAdmin
        .from('files')
        .select('id, google_drive_file_id')
        .eq('id', body.fileId)
        .maybeSingle()

      if (fileError) return json({ error: fileError.message }, 500)
      if (!fileRow) return json({ error: 'Arquivo não encontrado.' }, 404)

      const drive = getDriveClient()
      try {
        await drive.files.delete({ fileId: fileRow.google_drive_file_id })
      } catch (err) {
        const status = (err as { code?: number }).code
        if (status !== 404) throw err
      }

      const { error: deleteError } = await supabaseAdmin.from('files').delete().eq('id', fileRow.id)
      if (deleteError) return json({ error: deleteError.message }, 500)
      return json({ ok: true })
    }

    // 2) Lê o arquivo enviado (multipart/form-data)
    const form = await req.formData()
    const file = form.get('file') as File | null
    const patientId = form.get('patientId') as string | null
    const patientName = (form.get('patientName') as string | null) || patientId || 'Paciente'
    const kind = (form.get('kind') as string | null) ?? 'document'
    const label = (form.get('label') as string | null) ?? file?.name ?? 'Arquivo'
    const treatmentId = (form.get('treatmentId') as string | null) || null

    if (!file || !patientId) {
      return json({ error: 'Arquivo e patientId são obrigatórios.' }, 400)
    }
    if (kind !== 'image' && kind !== 'document') {
      return json({ error: "kind deve ser 'image' ou 'document'." }, 400)
    }

    // 3) Envia pro Google Drive com a conta de serviço da clínica,
    //    dentro da subpasta exclusiva deste paciente
    const buffer = new Uint8Array(await file.arrayBuffer())
    const drive = getDriveClient()
    const patientFolderId = await getOrCreatePatientFolder(drive, patientId, patientName)

    const uploadRes = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${file.name}`,
        parents: [patientFolderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: buffer,
      },
      fields: 'id, webViewLink',
    })

    const driveFileId = uploadRes.data.id
    if (!driveFileId) return json({ error: 'Upload ao Drive falhou (sem file id).' }, 500)
    const driveUrl = uploadRes.data.webViewLink ?? `https://drive.google.com/file/d/${driveFileId}/view`

    // 4) Grava o metadado no Supabase com a service role (ignora RLS de propósito)
    const { data: fileRow, error: insertError } = await supabaseAdmin
      .from('files')
      .insert({
        patient_id: patientId,
        treatment_id: treatmentId,
        kind,
        label,
        google_drive_file_id: driveFileId,
        google_drive_url: driveUrl,
        uploaded_by: userData.user.id,
      })
      .select()
      .single()

    if (insertError) return json({ error: insertError.message }, 500)

    return json({ file: fileRow })
  } catch (err) {
    console.error(err)
    return json({ error: String(err) }, 500)
  }
})