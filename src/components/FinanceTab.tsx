const FINANCE_FACTS = [
  { label: 'Faturamento do mês', value: 'R$ 34.820', tone: 'positive' },
  { label: 'Em aberto', value: 'R$ 8.460', tone: 'warning' },
  { label: 'Recebido', value: 'R$ 26.360', tone: 'neutral' },
  { label: 'Vencendo hoje', value: '06', tone: 'neutral' },
]

const FINANCE_UPCOMING = [
  { patient: 'Marina Costa', value: 'R$ 1.260', due: 'Hoje · 15:00', status: 'pago' },
  { patient: 'João Vitor', value: 'R$ 980', due: 'Hoje · 18:30', status: 'pendente' },
  { patient: 'Cecília Melo', value: 'R$ 1.520', due: 'Amanhã · 10:00', status: 'pendente' },
  { patient: 'Rafael Nunes', value: 'R$ 740', due: 'Qua · 11:20', status: 'atrasado' },
]

const FINANCE_TREATMENTS = [
  { name: 'Ortodontia', patient: 'Cecília Melo', status: 'Aguardando aprovação', value: 'R$ 2.400' },
  { name: 'Prótese', patient: 'João Vitor', status: 'Parcialmente pago', value: 'R$ 1.850' },
  { name: 'Implante', patient: 'Rafael Nunes', status: 'Em aberto', value: 'R$ 3.200' },
]

const FINANCE_ACTIONS = [
  'Confirmar recebimentos de hoje',
  'Revisar parcelas em atraso',
  'Enviar boleto para aprovação',
  'Mapear contratos do mês',
]

function paymentClass(status: string) {
  if (status === 'pago') return 'finance-tag finance-tag-paid'
  if (status === 'atrasado') return 'finance-tag finance-tag-late'
  return 'finance-tag finance-tag-pending'
}

export function FinanceTab() {
  return (
    <div className="main module-main visible">
      <div className="module-header">
        <div className="module-title">Financeiro</div>
        <div className="module-sub">Resumo financeiro da clínica e acompanhamento de recebimentos.</div>
      </div>

      <div className="crm-grid facts-grid">
        {FINANCE_FACTS.map((fact) => (
          <div key={fact.label} className="crm-card fact-card">
            <div className="fact-label">{fact.label}</div>
            <div className={`dash-num ${fact.tone === 'warning' ? 'attention' : ''}`}>{fact.value}</div>
          </div>
        ))}
      </div>

      <div className="crm-layout">
        <div className="crm-panel">
          <div className="section-label">Recebimentos</div>
          <div className="finance-list">
            {FINANCE_UPCOMING.map((item) => (
              <div key={item.patient} className="finance-row">
                <div>
                  <div className="crm-name">{item.patient}</div>
                  <div className="crm-meta">{item.due}</div>
                </div>
                <div className="finance-side">
                  <strong>{item.value}</strong>
                  <span className={paymentClass(item.status)}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="crm-panel">
          <div className="section-label">Resumo por tratamento</div>
          <div className="finance-list compact">
            {FINANCE_TREATMENTS.map((item) => (
              <div key={`${item.name}-${item.patient}`} className="finance-treatment">
                <div>
                  <div className="crm-name">{item.name}</div>
                  <div className="crm-meta">{item.patient}</div>
                </div>
                <div className="finance-side treatment-side">
                  <strong>{item.value}</strong>
                  <span className="finance-substatus">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="crm-panel wide-panel">
        <div className="section-label">Ações rápidas</div>
        <div className="crm-actions-grid">
          {FINANCE_ACTIONS.map((action) => (
            <button key={action} className="crm-action">
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
