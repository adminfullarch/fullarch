import { useCallback, useEffect, useState } from 'react'
import {
  carregarEquipe,
  convidar,
  removerMembro,
  revogarConvite,
  type Equipe,
} from '../api/team'

export function AjustesView() {
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)

  const recarregar = useCallback(async () => {
    setLoading(true)
    try {
      setEquipe(await carregarEquipe())
      setErro(null)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar a equipe.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  async function handleConvidar() {
    if (!equipe) return
    const endereco = email.trim()
    if (!endereco.includes('@')) {
      setErro('Informe um e-mail válido.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await convidar(equipe.clinic.id, endereco)
      setEmail('')
      await recarregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível convidar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="main module-main visible">
      <div className="module-header">
        <div className="module-title">Ajustes</div>
        <div className="module-sub">
          {equipe ? `Clínica ${equipe.clinic.name}` : 'Equipe e acesso ao sistema'}
        </div>
      </div>

      <div className="panel-body">
        {erro && <p style={{ color: '#9C4A3C', fontSize: 12.5, marginBottom: 12 }}>{erro}</p>}

        {loading ? (
          <div className="empty">
            <p>Carregando equipe…</p>
          </div>
        ) : !equipe ? (
          <div className="empty">
            <p>Não foi possível carregar a equipe.</p>
          </div>
        ) : (
          <>
            <div className="section-label">Equipe</div>
            {equipe.membros.map((m) => (
              <div className="treat-card" key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="treat-name">{m.email ?? 'Sem e-mail'}</div>
                  <div className="treat-meta">
                    {m.role === 'owner' ? 'Responsável' : 'Membro'}
                    {m.user_id === equipe.meuId && ' · você'}
                  </div>
                </div>
                {equipe.souDono && m.user_id !== equipe.meuId && (
                  <button
                    className="btn btn-ghost"
                    onClick={async () => {
                      if (!window.confirm(`Remover ${m.email} da clínica? Ela perde o acesso aos prontuários.`)) return
                      try {
                        await removerMembro(m.clinic_id, m.user_id)
                        await recarregar()
                      } catch (err) {
                        setErro(err instanceof Error ? err.message : 'Falha ao remover.')
                      }
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}

            {equipe.souDono && (
              <>
                <div className="section-label" style={{ marginTop: 24 }}>
                  Convidar colega
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
                  O convite libera o endereço, mas não envia e-mail. Avise a pessoa para se
                  cadastrar em <strong>fullarch.vercel.app</strong> usando exatamente este e-mail —
                  ela entra direto nesta clínica. O convite vale por 14 dias.
                </p>
                <div className="field-row" style={{ alignItems: 'flex-end' }}>
                  <div>
                    <label className="field-label">E-mail do colega</label>
                    <input
                      className="field-input"
                      type="email"
                      placeholder="colega@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConvidar()}
                    />
                  </div>
                  <button
                    className="btn btn-solid"
                    disabled={salvando || !email.trim()}
                    onClick={handleConvidar}
                    style={{ minHeight: 38 }}
                  >
                    {salvando ? 'Convidando…' : 'Convidar'}
                  </button>
                </div>

                <div className="section-label" style={{ marginTop: 24 }}>
                  Convites pendentes
                </div>
                {equipe.convites.length === 0 ? (
                  <div className="empty">
                    <p>Nenhum convite aguardando cadastro.</p>
                  </div>
                ) : (
                  equipe.convites.map((c) => (
                    <div className="treat-card" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="treat-name">{c.email}</div>
                        <div className="treat-meta">
                          Expira em {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={async () => {
                          try {
                            await revogarConvite(c.id)
                            await recarregar()
                          } catch (err) {
                            setErro(err instanceof Error ? err.message : 'Falha ao revogar.')
                          }
                        }}
                      >
                        Revogar
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {!equipe.souDono && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 20 }}>
                Apenas o responsável pela clínica pode convidar ou remover pessoas.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
