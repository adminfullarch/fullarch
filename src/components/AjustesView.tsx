import { useCallback, useEffect, useState } from 'react'
import {
  carregarEquipe,
  convidar,
  removerMembro,
  renomearClinica,
  revogarConvite,
  type Equipe,
} from '../api/team'

export function AjustesView() {
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  async function handleRenomear() {
    if (!equipe) return
    setSalvandoNome(true)
    setErro(null)
    try {
      const clinica = await renomearClinica(equipe.clinic.id, nome)
      setEquipe({ ...equipe, clinic: clinica })
      setEditandoNome(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível renomear a clínica.')
    } finally {
      setSalvandoNome(false)
    }
  }

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
            <div className="section-label">Clínica</div>
            {editandoNome ? (
              <div className="field-row" style={{ alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                  <label className="field-label">Nome da clínica</label>
                  <input
                    className="field-input"
                    type="text"
                    value={nome}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenomear()
                      if (e.key === 'Escape') setEditandoNome(false)
                    }}
                  />
                </div>
                <button className="btn btn-ghost" onClick={() => setEditandoNome(false)} disabled={salvandoNome} style={{ minHeight: 38 }}>
                  Cancelar
                </button>
                <button className="btn btn-solid" onClick={handleRenomear} disabled={salvandoNome || !nome.trim()} style={{ minHeight: 38 }}>
                  {salvandoNome ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            ) : (
              <div className="treat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="treat-name">{equipe.clinic.name}</div>
                  <div className="treat-meta">O nome que a sua equipe vê ao entrar no sistema.</div>
                </div>
                {equipe.souDono && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setNome(equipe.clinic.name)
                      setEditandoNome(true)
                    }}
                  >
                    Renomear
                  </button>
                )}
              </div>
            )}

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
                <div className="aviso-convite">
                  <strong>O sistema não envia e-mail.</strong> Depois de convidar, avise a pessoa
                  para se cadastrar em <strong>fullarch.vercel.app</strong> com exatamente este
                  e-mail, deixando o nome da clínica em branco — ela entra direto aqui. O convite
                  vale por 14 dias.
                </div>
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
