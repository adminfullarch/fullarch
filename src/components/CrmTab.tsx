import { useEffect, useState } from 'react'
import { carregarResumoCrm, type ResumoCrm } from '../api/crm'

function quando(iso: string | null) {
  if (!iso) return 'Sem data'
  const data = new Date(iso)
  const hoje = new Date()
  const mesmoDia =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (mesmoDia) return `Hoje · ${hora}`
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${hora}`
}

export function CrmTab() {
  const [resumo, setResumo] = useState<ResumoCrm | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarResumoCrm()
      .then((r) => ativo && setResumo(r))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Erro ao carregar o CRM.'))
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [])

  return (
    <div className="main module-main visible">
      <div className="module-header">
        <div className="module-title">CRM</div>
        <div className="module-sub">Visão operacional do consultório e do cuidado em andamento.</div>
      </div>

      {loading ? (
        <div className="empty">
          <p>Carregando…</p>
        </div>
      ) : erro ? (
        <div className="empty">
          <p>{erro}</p>
        </div>
      ) : !resumo ? null : (
        <>
          <div className="crm-grid facts-grid">
            <div className="crm-card fact-card">
              <div className="fact-label">Pacientes</div>
              <div className="dash-num">{resumo.pacientes}</div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Em tratamento</div>
              <div className="dash-num">{resumo.emTratamento}</div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Aguardando aprovação</div>
              <div className={`dash-num ${resumo.aguardandoAprovacao > 0 ? 'attention' : ''}`}>
                {resumo.aguardandoAprovacao}
              </div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Consultas hoje</div>
              <div className="dash-num">{resumo.consultasHoje}</div>
            </div>
          </div>

          <div className="crm-layout">
            <div className="crm-panel">
              <div className="section-label">Tratamentos em andamento</div>
              {resumo.pipeline.length === 0 ? (
                <div className="empty">
                  <p>Nenhum tratamento em andamento.</p>
                </div>
              ) : (
                <div className="crm-list">
                  {resumo.pipeline.map((item) => (
                    <div key={item.id} className="crm-item">
                      <div>
                        <div className="crm-name">{item.paciente}</div>
                        <div className="crm-meta">{item.tratamento}</div>
                      </div>
                      <div className="crm-side">
                        <span className="crm-time">{quando(item.agendadoPara)}</span>
                        <span className="crm-status crm-status-ok">{item.progresso}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="crm-panel">
              <div className="section-label">Atenção do dia</div>
              {resumo.atencao.length === 0 ? (
                <div className="empty">
                  <p>Nada exigindo atenção.</p>
                </div>
              ) : (
                <div className="crm-list compact">
                  {resumo.atencao.map((item) => (
                    <div key={item.id} className="crm-priority-item">
                      <div>
                        <div className="crm-name">{item.paciente}</div>
                        <div className="crm-meta">{item.motivo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
