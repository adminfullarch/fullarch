import { useEffect, useState } from 'react'
import { carregarResumoFinanceiro, moeda, type ResumoFinanceiro } from '../api/finance'
import type { PaymentStatus } from '../types/database.types'

const PAGAMENTO_LABEL: Record<PaymentStatus, string> = {
  pago: 'pago',
  parcial: 'parcial',
  pendente: 'em aberto',
}

function classePagamento(status: PaymentStatus) {
  if (status === 'pago') return 'finance-tag finance-tag-paid'
  if (status === 'parcial') return 'finance-tag finance-tag-pending'
  return 'finance-tag finance-tag-late'
}

function quando(iso: string | null) {
  if (!iso) return 'Sem data'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function FinanceTab() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    carregarResumoFinanceiro()
      .then((r) => ativo && setResumo(r))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Erro ao carregar o financeiro.'))
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [])

  const pendentes = resumo?.itens.filter((i) => i.pagamento !== 'pago' && i.valor != null) ?? []
  const semValor = resumo?.itens.filter((i) => i.valor == null) ?? []

  return (
    <div className="main module-main visible">
      <div className="module-header">
        <div className="module-title">Financeiro</div>
        <div className="module-sub">Resumo financeiro da clínica e acompanhamento de recebimentos.</div>
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
              <div className="fact-label">Total contratado</div>
              <div className="dash-num">{moeda(resumo.contratado)}</div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Em aberto</div>
              <div className={`dash-num ${resumo.emAberto > 0 ? 'attention' : ''}`}>{moeda(resumo.emAberto)}</div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Recebido</div>
              <div className="dash-num">{moeda(resumo.recebido)}</div>
            </div>
            <div className="crm-card fact-card">
              <div className="fact-label">Pagamento parcial</div>
              <div className="dash-num">{moeda(resumo.parcial)}</div>
            </div>
          </div>

          {resumo.contratado === 0 && (
            <p className="finance-aviso">
              Nenhum tratamento tem valor lançado ainda. O valor e a situação de pagamento são
              definidos na aba Tratamentos, dentro do prontuário do paciente.
            </p>
          )}

          {resumo.parcial > 0 && (
            <p className="finance-aviso">
              "Pagamento parcial" mostra o total dos tratamentos nessa situação, não o quanto falta
              receber — o sistema ainda não registra parcelas individuais.
            </p>
          )}

          <div className="crm-layout">
            <div className="crm-panel">
              <div className="section-label">A receber</div>
              {pendentes.length === 0 ? (
                <div className="empty">
                  <p>Nada em aberto.</p>
                </div>
              ) : (
                <div className="finance-list">
                  {pendentes.map((item) => (
                    <div key={item.id} className="finance-row">
                      <div>
                        <div className="crm-name">{item.paciente}</div>
                        <div className="crm-meta">
                          {item.tratamento} · {quando(item.agendadoPara)}
                        </div>
                      </div>
                      <div className="finance-side">
                        <strong>{moeda(item.valor ?? 0)}</strong>
                        <span className={classePagamento(item.pagamento)}>
                          {PAGAMENTO_LABEL[item.pagamento]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="crm-panel">
              <div className="section-label">Precisa de atenção</div>
              {resumo.pacientesEmAtraso.length === 0 && semValor.length === 0 ? (
                <div className="empty">
                  <p>Nada pendente.</p>
                </div>
              ) : (
                <div className="finance-list compact">
                  {resumo.pacientesEmAtraso.map((p) => (
                    <div key={p.id} className="finance-treatment">
                      <div>
                        <div className="crm-name">{p.name}</div>
                        <div className="crm-meta">Parcelas em atraso</div>
                      </div>
                      <span className="finance-tag finance-tag-late">atrasado</span>
                    </div>
                  ))}
                  {semValor.map((item) => (
                    <div key={item.id} className="finance-treatment">
                      <div>
                        <div className="crm-name">{item.paciente}</div>
                        <div className="crm-meta">{item.tratamento}</div>
                      </div>
                      <span className="finance-substatus">sem valor lançado</span>
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
