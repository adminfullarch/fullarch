import { isAuthWeakPasswordError } from '@supabase/supabase-js'

/**
 * Regra unica de senha para cadastro e redefinicao. O mesmo criterio precisa
 * estar ligado no painel do Supabase (Authentication > Policies), senao o
 * servidor aceita o que a tela recusaria.
 */
export const SENHA_MINIMO = 8

export const MENSAGEM_SENHA_FRACA = `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres, com letras e números.`

/** Texto curto para mostrar abaixo do campo. */
export const DICA_SENHA = `Mínimo de ${SENHA_MINIMO} caracteres, com letras e números.`

/** Devolve null quando a senha serve, ou a mensagem para mostrar na tela. */
export function validarSenha(senha: string): string | null {
  // \p{L} aceita letras acentuadas (ç, ã, é) como letras
  if (senha.length < SENHA_MINIMO || !/\p{L}/u.test(senha) || !/\d/.test(senha)) {
    return MENSAGEM_SENHA_FRACA
  }
  return null
}

/** Reconhece a recusa do Supabase por senha fraca, que vem em ingles. */
export function ehErroDeSenhaFraca(err: unknown): boolean {
  if (isAuthWeakPasswordError(err)) return true
  if (!err || typeof err !== 'object') return false
  const { code, message } = err as { code?: unknown; message?: unknown }
  if (code === 'weak_password') return true
  return (
    typeof message === 'string' &&
    /password/i.test(message) &&
    /at least|should contain|too weak|weak/i.test(message)
  )
}
