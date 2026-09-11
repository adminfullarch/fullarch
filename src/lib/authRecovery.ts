/**
 * O link de recuperação que chega por e-mail traz os tokens no fragmento da
 * URL (`#access_token=...&type=recovery`). O cliente do Supabase consome esse
 * fragmento e o apaga da barra de endereços logo no início, então a leitura
 * precisa acontecer antes disso — por isso este módulo é importado por
 * `lib/supabase.ts` antes de o cliente ser criado, e a leitura roda uma única
 * vez, no carregamento.
 *
 * Sem essa marca o app veria apenas uma sessão válida e abriria direto no
 * sistema, sem nunca oferecer a troca de senha.
 */
function leiaMarcaDeRecuperacao(): boolean {
  if (typeof window === 'undefined') return false
  const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (fragmento.get('type') === 'recovery') return true
  // Um link expirado ou ja usado volta como erro, e nao como sessao. Ainda
  // assim veio de uma recuperacao, e a pessoa precisa ver a explicacao.
  if (fragmento.get('error_code') && window.location.hash.includes('recovery')) return true
  return new URLSearchParams(window.location.search).get('type') === 'recovery'
}

export const chegouPorLinkDeRecuperacao = leiaMarcaDeRecuperacao()
