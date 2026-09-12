import { useCallback, useEffect, useState } from 'react'
import { listPatients } from '../api/patients'
import type { Patient } from '../types/database.types'

export function usePatients(enabled = true) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Houve ao menos uma resposta do servidor desde que o hook foi habilitado. */
  const [carregado, setCarregado] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPatients(await listPatients())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pacientes.')
    } finally {
      setCarregado(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      // Trocar de conta não pode deixar a lista da conta anterior na tela.
      setPatients([])
      setError(null)
      setLoading(false)
      setCarregado(false)
      return
    }
    reload()
  }, [enabled, reload])

  /**
   * O efeito acima só roda depois que a tela já foi pintada. No render em que
   * a sessão acabou de chegar, `enabled` virou true mas `reload` ainda não
   * marcou `loading` — e a lista vazia inicial aparecia como "nenhum
   * paciente", com o contador em zero, até a resposta chegar.
   *
   * Enquanto não houve resposta, a única verdade é que ainda não se sabe.
   * Derivar isso do render, em vez de depender do efeito, fecha essa janela.
   */
  const carregando = loading || (enabled && !carregado)

  return { patients, loading: carregando, error, reload }
}
