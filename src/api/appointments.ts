import { supabase } from '../lib/supabase'
import { addTimelineEvent } from './timeline'
import type { Appointment, AppointmentStatus } from '../types/database.types'


export interface AppointmentWithPatient extends Appointment {
  patient_name: string
}

/** Lista consultas com nome do paciente já resolvido, num intervalo [startISO, endISO). */
export async function listAppointmentsByRange(startISO: string, endISO: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(name)')
    .gte('scheduled_at', startISO)
    .lt('scheduled_at', endISO)
    .order('scheduled_at')
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patients?.name ?? 'Paciente',
  })) as AppointmentWithPatient[]
}

export interface NewAppointmentInput {
  patientId: string
  scheduledAt: string // ISO
  reason?: string
}

/** Duração assumida de uma consulta/slot, em minutos — mesma granularidade da grade da Agenda (08h, 09h, 10h...). */
export const APPOINTMENT_SLOT_MINUTES = 60

/**
 * Retorna a consulta já existente (não cancelada) que sobrepõe o horário
 * pedido, se houver. Duas consultas sobrepõem quando a diferença entre
 * seus horários é menor que a duração do slot — não precisa ser o
 * exato mesmo minuto.
 */
export async function checkAppointmentConflict(scheduledAt: string) {
  const target = new Date(scheduledAt).getTime()
  const windowMs = (APPOINTMENT_SLOT_MINUTES - 1) * 60_000
  const rangeStart = new Date(target - windowMs).toISOString()
  const rangeEnd = new Date(target + windowMs).toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(name)')
    .gte('scheduled_at', rangeStart)
    .lte('scheduled_at', rangeEnd)
    .neq('status', 'cancelada')
    .order('scheduled_at')
    .limit(1)
  if (error) throw error
  const row = data?.[0] as any
  if (!row) return null
  return { ...row, patient_name: row.patients?.name ?? 'Paciente' } as AppointmentWithPatient
}

export async function createAppointment(input: NewAppointmentInput) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: input.patientId,
      scheduled_at: input.scheduledAt,
      reason: input.reason?.trim() || 'Consulta',
    })
    .select()
    .single()
  if (error) throw error

  await addTimelineEvent({
    patientId: input.patientId,
    title: 'Consulta agendada',
    description: `${data.reason} marcada para ${new Date(data.scheduled_at).toLocaleString('pt-BR')}.`,
    kind: 'Consulta',
  })

  return data as Appointment
}

/**
 * Próximas consultas agendadas a partir de agora (qualquer dia), pra o
 * card "Próximas consultas" do Dashboard — um atalho, não a Agenda inteira.
 */
export async function listUpcomingAppointments(limit = 5) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(name)')
    .eq('status', 'agendada')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patients?.name ?? 'Paciente',
  })) as AppointmentWithPatient[]
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Appointment
}