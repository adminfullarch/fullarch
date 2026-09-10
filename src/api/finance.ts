import { supabase } from '../lib/supabase'
import type { PaymentStatus, TreatmentStatus } from '../types/database.types'

export type ItemFinanceiro = {
  id: string
  tratamento: string
  paciente: string
  valor: number | null
  pagamento: PaymentStatus
  status: TreatmentStatus
  agendadoPara: string | null
}

export type ResumoFinanceiro = {
  /** Soma dos tratamentos com valor definido, exceto cancelados. */
  contratado: number
  recebido: number
  emAberto: number
  /**
   * Tratamentos marcados como parcialmente pagos. O banco guarda o status, mas
   * não quanto já foi pago, então este valor é o total desses tratamentos —
   * não o que falta receber. É mostrado à parte para não inflar "recebido"
   * nem "em aberto" com um palpite.
   */
  parcial: number
  /** Quantos tratamentos ainda não têm valor lançado. */
  semValor: number
  itens: ItemFinanceiro[]
  pacientesEmAtraso: { id: string; name: string }[]
}

type LinhaTratamento = {
  id: string
  name: string
  cost: number | null
  payment_status: PaymentStatus
  status: TreatmentStatus
  scheduled_at: string | null
  patients: { name: string } | null
}

export async function carregarResumoFinanceiro(): Promise<ResumoFinanceiro> {
  const [tratamentos, atrasados] = await Promise.all([
    supabase
      .from('treatments')
      .select('id, name, cost, payment_status, status, scheduled_at, patients(name)')
      .neq('status', 'cancelado')
      .order('scheduled_at', { nullsFirst: false }),
    supabase.from('patients').select('id, name').eq('financial_status', 'atrasado').order('name'),
  ])

  if (tratamentos.error) throw tratamentos.error
  if (atrasados.error) throw atrasados.error

  const linhas = (tratamentos.data ?? []) as unknown as LinhaTratamento[]

  let contratado = 0
  let recebido = 0
  let emAberto = 0
  let parcial = 0
  let semValor = 0

  for (const l of linhas) {
    if (l.cost == null) {
      semValor += 1
      continue
    }
    contratado += Number(l.cost)
    if (l.payment_status === 'pago') recebido += Number(l.cost)
    else if (l.payment_status === 'parcial') parcial += Number(l.cost)
    else emAberto += Number(l.cost)
  }

  return {
    contratado,
    recebido,
    emAberto,
    parcial,
    semValor,
    itens: linhas.map((l) => ({
      id: l.id,
      tratamento: l.name,
      paciente: l.patients?.name ?? 'Paciente removido',
      valor: l.cost == null ? null : Number(l.cost),
      pagamento: l.payment_status,
      status: l.status,
      agendadoPara: l.scheduled_at,
    })),
    pacientesEmAtraso: atrasados.data ?? [],
  }
}

export function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
