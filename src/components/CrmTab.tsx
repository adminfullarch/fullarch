const CRM_FACTS = [
  { label: 'Pacientes ativos', value: '128', tone: 'neutral' },
  { label: 'Em tratamento', value: '42', tone: 'positive' },
  { label: 'Pendentes', value: '09', tone: 'warning' },
  { label: 'Consultas hoje', value: '14', tone: 'neutral' },
]

const CRM_PIPELINE = [
  { name: 'Marina Costa', stage: 'Avaliação final', due: 'Hoje · 09:40', status: 'em andamento' },
  { name: 'João Vitor', stage: 'Prótese', due: 'Hoje · 11:20', status: 'em andamento' },
  { name: 'Cecília Melo', stage: 'Ortodontia', due: 'Amanhã · 08:30', status: 'pendente' },
  { name: 'Rafael Nunes', stage: 'Implante', due: 'Qua · 14:10', status: 'atencao' },
]

const CRM_PRIORITY = [
  { name: 'Ana Beatriz', note: 'Reagendar retorno da limpeza', tag: 'Urgente' },
  { name: 'Pedro Alves', note: 'Falta aprovação de plano', tag: 'Aguardando' },
  { name: 'Letícia Rocha', note: 'Próximo passo pendente', tag: 'Atenção' },
]

const CRM_ACTIONS = [
  'Revisar prontuários de hoje',
  'Confirmar tratamentos em andamento',
  'Preparar materiais de cirurgia',
  'Reagendar consultas faltantes',
]

function statusClass(status: string) {
  if (status === 'pendente') return 'crm-status crm-status-pending'
  if (status === 'atencao') return 'crm-status crm-status-alert'
  return 'crm-status crm-status-ok'
}

export function CrmTab() {
  return (
    <div className="main module-main visible">
      <div className="module-header">
        <div className="module-title">CRM</div>
        <div className="module-sub">Visão operacional do consultório e do cuidado em andamento.</div>
      </div>

      <div className="crm-grid facts-grid">
        {CRM_FACTS.map((fact) => (
          <div key={fact.label} className="crm-card fact-card">
            <div className="fact-label">{fact.label}</div>
            <div className={`dash-num ${fact.tone === 'warning' ? 'attention' : ''}`}>{fact.value}</div>
          </div>
        ))}
      </div>

      <div className="crm-layout">
        <div className="crm-panel">
          <div className="section-label">Pipeline do atendimento</div>
          <div className="crm-list">
            {CRM_PIPELINE.map((item) => (
              <div key={item.name} className="crm-item">
                <div>
                  <div className="crm-name">{item.name}</div>
                  <div className="crm-meta">{item.stage}</div>
                </div>
                <div className="crm-side">
                  <span className="crm-time">{item.due}</span>
                  <span className={statusClass(item.status)}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="crm-panel">
          <div className="section-label">Atenção do dia</div>
          <div className="crm-list compact">
            {CRM_PRIORITY.map((item) => (
              <div key={item.name} className="crm-priority-item">
                <div>
                  <div className="crm-name">{item.name}</div>
                  <div className="crm-meta">{item.note}</div>
                </div>
                <span className="crm-tag">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="crm-panel wide-panel">
        <div className="section-label">Ações rápidas</div>
        <div className="crm-actions-grid">
          {CRM_ACTIONS.map((action) => (
            <button key={action} className="crm-action">
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
