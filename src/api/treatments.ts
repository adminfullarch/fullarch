import { supabase } from '../lib/supabase'
import type { Treatment, TreatmentSession, TreatmentStatus } from '../types/database.types'
import { addTimelineEvent } from './timeline'
import { ehConflitoDeHorario, MENSAGEM_HORARIO_OCUPADO } from './appointments'

export async function listTreatments(patientId: string) {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Treatment[]
}

export interface TreatmentWithPatient extends Treatment {
  patient_name: string
}

/**
 * Tratamentos que exigem uma ação (aprovar ou agendar), de qualquer
 * paciente — pra o card "Tratamentos pendentes" do Dashboard.
 */
export async function listPendingTreatments(limit = 5) {
  const { data, error } = await supabase
    .from('treatments')
    .select('*, patients(name)')
    .in('status', ['aguardando_aprovacao', 'nao_agendado'])
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patients?.name ?? 'Paciente',
  })) as TreatmentWithPatient[]
}

export async function listSessions(treatmentId: string) {
  const { data, error } = await supabase
    .from('treatment_sessions')
    .select('*')
    .eq('treatment_id', treatmentId)
    .order('session_date')
  if (error) throw error
  return data as TreatmentSession[]
}

export interface NewTreatmentInput {
  patientId: string
  name: string
  toothRef?: string
  professional?: string
  cost?: number
}

export async function createTreatment(input: NewTreatmentInput) {
  const { data, error } = await supabase
    .from('treatments')
    .insert({
      patient_id: input.patientId,
      name: input.name,
      tooth_ref: input.toothRef?.trim() || 'Geral',
      professional: input.professional?.trim() || null,
      cost: input.cost ?? null,
      origin: 'manual',
      status: 'nao_agendado',
    })
    .select()
    .single()
  if (error) throw error

  await addTimelineEvent({
    patientId: input.patientId,
    title: 'Tratamento criado',
    description: input.name,
    kind: 'Tratamento',
  })

  return data as Treatment
}

export async function updateTreatmentStatus(
  id: string,
  patientId: string,
  status: TreatmentStatus,
  extra?: { scheduled_at?: string | null; progress_pct?: number }
) {
  // Lido antes da alteração para poder desfazer se a consulta for recusada.
  const { data: anterior, error: erroAnterior } = await supabase
    .from('treatments')
    .select('status, scheduled_at, progress_pct')
    .eq('id', id)
    .single()
  if (erroAnterior) throw erroAnterior

  const { data, error } = await supabase
    .from('treatments')
    .update({ status, ...extra })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Agendar um tratamento também deve gerar uma consulta na Agenda.
  if (status === 'em_andamento' && extra?.scheduled_at) {
    const { error: apptError } = await supabase.from('appointments').insert({
      patient_id: patientId,
      scheduled_at: extra.scheduled_at,
      reason: data.name,
    })

    if (apptError) {
      // O tratamento já foi gravado como agendado ali em cima. Sem desfazer,
      // um horário recusado deixaria o tratamento marcado para uma data que
      // não existe na Agenda — e a tela mostraria o erro por cima de uma
      // mudança que ficou gravada.
      await supabase
        .from('treatments')
        .update({ status: anterior.status, scheduled_at: anterior.scheduled_at, progress_pct: anterior.progress_pct })
        .eq('id', id)

      if (ehConflitoDeHorario(apptError)) throw new Error(MENSAGEM_HORARIO_OCUPADO)
      throw apptError
    }
  }

  const labels: Record<TreatmentStatus, string> = {
    aguardando_aprovacao: 'aguardando aprovação',
    nao_agendado: 'aprovado, não agendado',
    em_andamento: 'agendado',
    concluido: 'concluído',
    cancelado: 'cancelado',
  }
  await addTimelineEvent({
    patientId,
    title: 'Tratamento atualizado',
    description: `${data.name}: ${labels[status]}.`,
    kind: 'Tratamento',
  })

  return data as Treatment
}

export interface UpdateTreatmentInput {
  name: string
  toothRef: string
  professional?: string | null
  cost?: number | null
  paymentStatus: Treatment['payment_status']
}

export async function updateTreatment(id: string, patientId: string, input: UpdateTreatmentInput) {
  const { data, error } = await supabase
    .from('treatments')
    .update({
      name: input.name,
      tooth_ref: input.toothRef,
      professional: input.professional ?? null,
      cost: input.cost ?? null,
      payment_status: input.paymentStatus,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await addTimelineEvent({
    patientId,
    title: 'Tratamento editado',
    description: data.name,
    kind: 'Tratamento',
  })

  return data as Treatment
}

export async function deleteTreatment(id: string, patientId: string, name: string) {
  const { error } = await supabase.from('treatments').delete().eq('id', id)
  if (error) throw error
  await addTimelineEvent({ patientId, title: 'Tratamento removido', description: name, kind: 'Tratamento' })
}

export async function addTreatmentSession(params: {
  treatmentId: string
  patientId: string
  treatmentName: string
  sessionDate: string
  note: string
  progressPct: number
}) {
  const { data: session, error } = await supabase
    .from('treatment_sessions')
    .insert({
      treatment_id: params.treatmentId,
      session_date: params.sessionDate,
      note: params.note,
      progress_pct: params.progressPct,
    })
    .select()
    .single()
  if (error) throw error

  const status: TreatmentStatus = params.progressPct >= 100 ? 'concluido' : 'em_andamento'
  await supabase
    .from('treatments')
    .update({ progress_pct: params.progressPct, status })
    .eq('id', params.treatmentId)

  await addTimelineEvent({
    patientId: params.patientId,
    title: 'Sessão registrada',
    description: `${params.treatmentName}: ${params.note}`,
    kind: 'Tratamento',
  })

  return session as TreatmentSession
}