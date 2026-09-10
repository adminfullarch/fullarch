import { supabase } from '../lib/supabase'
import type { TreatmentStatus } from '../types/database.types'

export type ItemPipeline = {
  id: string
  paciente: string
  tratamento: string
  status: TreatmentStatus
  agendadoPara: string | null
  progresso: number
}

export type ItemAtencao = {
  id: string
  paciente: string
  motivo: string
}

export type ResumoCrm = {
  pacientes: number
  emTratamento: number
  aguardandoAprovacao: number
  consultasHoje: number
  pipeline: ItemPipeline[]
  atencao: ItemAtencao[]
}

type LinhaTratamento = {
  id: string
  name: string
  status: TreatmentStatus
  scheduled_at: string | null
  progress_pct: number | null
  patient_id: string
  patients: { name: string; financial_status: string } | null
}

export async function carregarResumoCrm(): Promise<ResumoCrm> {
  const inicioDoDia = new Date()
  inicioDoDia.setHours(0, 0, 0, 0)
  const fimDoDia = new Date(inicioDoDia)
  fimDoDia.setDate(fimDoDia.getDate() + 1)

  const [pacientes, tratamentos, consultas] = await Promise.all([
    supabase.from('patients').select('id, name, financial_status'),
    supabase
      .from('treatments')
      .select('id, name, status, scheduled_at, progress_pct, patient_id, patients(name, financial_status)')
      .neq('status', 'cancelado')
      .order('scheduled_at', { nullsFirst: false }),
    supabase
      .from('appointments')
      .select('id')
      .eq('status', 'agendada')
      .gte('scheduled_at', inicioDoDia.toISOString())
      .lt('scheduled_at', fimDoDia.toISOString()),
  ])

  if (pacientes.error) throw pacientes.error
  if (tratamentos.error) throw tratamentos.error
  if (consultas.error) throw consultas.error

  const linhas = (tratamentos.data ?? []) as unknown as LinhaTratamento[]
  const emAndamento = linhas.filter((l) => l.status === 'em_andamento')

  const atencao: ItemAtencao[] = []
  // A ordem espelha a prioridade de computePatientStatus: o que trava o
  // tratamento vem antes do que trava o pagamento.
  for (const l of linhas) {
    if (l.status === 'aguardando_aprovacao') {
      atencao.push({ id: l.id, paciente: l.patients?.name ?? '—', motivo: `Aprovar ${l.name}` })
    } else if (l.status === 'nao_agendado') {
      atencao.push({ id: l.id, paciente: l.patients?.name ?? '—', motivo: `Agendar ${l.name}` })
    }
  }
  for (const p of pacientes.data ?? []) {
    if (p.financial_status === 'atrasado') {
      atencao.push({ id: p.id, paciente: p.name, motivo: 'Parcelas em atraso' })
    }
  }

  return {
    pacientes: (pacientes.data ?? []).length,
    emTratamento: new Set(emAndamento.map((l) => l.patient_id)).size,
    aguardandoAprovacao: linhas.filter((l) => l.status === 'aguardando_aprovacao').length,
    consultasHoje: (consultas.data ?? []).length,
    pipeline: emAndamento.map((l) => ({
      id: l.id,
      paciente: l.patients?.name ?? 'Paciente removido',
      tratamento: l.name,
      status: l.status,
      agendadoPara: l.scheduled_at,
      progresso: l.progress_pct ?? 0,
    })),
    atencao,
  }
}
