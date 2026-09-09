import { supabase } from '../lib/supabase'
import type { Clinic, ClinicInvite, ClinicMember, ClinicRole } from '../types/database.types'

export type { Clinic, ClinicInvite, ClinicMember, ClinicRole }

export type Equipe = {
  clinic: Clinic
  membros: ClinicMember[]
  convites: ClinicInvite[]
  meuId: string
  souDono: boolean
}

/**
 * Carrega a equipe da clínica do usuário logado.
 *
 * As três consultas não filtram por clínica: a RLS já limita cada uma ao que
 * o usuário pode ver, e repetir o filtro aqui só criaria um segundo lugar
 * onde a regra poderia divergir.
 */
export async function carregarEquipe(): Promise<Equipe> {
  const { data: sessionData } = await supabase.auth.getSession()
  const meuId = sessionData.session?.user.id
  if (!meuId) throw new Error('Sessão expirada — faça login novamente.')

  const [clinicas, membros, convites] = await Promise.all([
    supabase.from('clinics').select('*').limit(1).single(),
    supabase.from('clinic_members').select('*').order('created_at'),
    supabase.from('clinic_invites').select('*').is('accepted_at', null).order('created_at'),
  ])

  if (clinicas.error) throw clinicas.error
  if (membros.error) throw membros.error
  if (convites.error) throw convites.error

  const lista = (membros.data ?? []) as ClinicMember[]
  return {
    clinic: clinicas.data as Clinic,
    membros: lista,
    convites: (convites.data ?? []) as ClinicInvite[],
    meuId,
    souDono: lista.some((m) => m.user_id === meuId && m.role === 'owner'),
  }
}

/**
 * Pré-autoriza um e-mail. Não envia nada: quem se cadastrar com esse endereço
 * entra nesta clínica em vez de ganhar uma própria. Avisar a pessoa é por
 * fora, e o convite vale por 14 dias.
 */
export async function convidar(clinicId: string, email: string, role: ClinicRole = 'member') {
  const { error } = await supabase.from('clinic_invites').insert({
    clinic_id: clinicId,
    email: email.trim().toLowerCase(),
    role,
  })
  if (error) throw error
}

export async function revogarConvite(id: string) {
  const { error } = await supabase.from('clinic_invites').delete().eq('id', id)
  if (error) throw error
}

/** Remove um colega da clínica. A RLS impede remover a si mesmo. */
export async function removerMembro(clinicId: string, userId: string) {
  const { error } = await supabase
    .from('clinic_members')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
  if (error) throw error
}
