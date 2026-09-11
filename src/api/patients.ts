import { supabase } from '../lib/supabase'
import type { Patient } from '../types/database.types'

export async function listPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('name')
  if (error) throw error
  return data as Patient[]
}

export async function getPatient(id: string) {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) throw error
  return data as Patient
}

export async function deletePatient(id: string) {
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw error
}

export interface NewPatientInput {
  name: string
  age?: number | null
  phone?: string | null
  plan?: string
  reason?: string // motivo da primeira consulta — vira o primeiro evento da timeline
}

export async function createPatient(input: NewPatientInput) {
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      name: input.name,
      age: input.age ?? null,
      phone: input.phone ?? null,
      plan: input.plan?.trim() || 'Particular',
    })
    .select()
    .single()
  if (error) throw error

  // Espelha a regra da Missão 02: cadastro novo já nasce com um evento na timeline.
  const { error: erroTimeline } = await supabase.from('timeline_events').insert({
    patient_id: patient.id,
    title: 'Paciente cadastrado',
    description: input.reason?.trim() || 'Primeira consulta agendada.',
    kind: 'Consulta',
  })

  // Sem transação no PostgREST, as duas inserções são independentes. Se a
  // segunda falha e nada é feito, o paciente fica cadastrado sem o primeiro
  // evento e ninguém percebe. Desfazer o cadastro é preferível a esse estado
  // silencioso: a pessoa vê o erro e cadastra de novo, em vez de descobrir o
  // buraco na timeline semanas depois.
  if (erroTimeline) {
    await supabase.from('patients').delete().eq('id', patient.id)
    throw erroTimeline
  }

  return patient as Patient
}

export async function updatePatientFinancial(
  id: string,
  financial_status: Patient['financial_status'],
  financial_note?: string | null
) {
  const { data, error } = await supabase
    .from('patients')
    .update({ financial_status, financial_note: financial_note ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Patient
}
