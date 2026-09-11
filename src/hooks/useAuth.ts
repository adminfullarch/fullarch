import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { chegouPorLinkDeRecuperacao } from '../lib/authRecovery'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  // O link de recuperacao cria uma sessao valida. Sem esta marca o app abriria
  // direto no sistema e a pessoa nunca chegaria a trocar a senha.
  const [recuperandoSenha, setRecuperandoSenha] = useState(chegouPorLinkDeRecuperacao)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  }

  /** Dispara o e-mail com o link de redefinicao. */
  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  /** Só funciona com a sessão temporária criada pelo link do e-mail. */
  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    session,
    loading,
    recuperandoSenha,
    encerrarRecuperacao: () => setRecuperandoSenha(false),
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signOut,
  }
}
