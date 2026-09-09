type LandingPageProps = {
  onLogin: () => void
}

const features = [
  {
    number: '01',
    title: 'Prontuario vivo',
    text: 'Historico clinico, anotacoes e informacoes importantes reunidos no contexto de cada paciente.',
  },
  {
    number: '02',
    title: 'Agenda sem atrito',
    text: 'Acompanhe consultas e proximos passos sem perder o fio do tratamento.',
  },
  {
    number: '03',
    title: 'Plano de tratamento',
    text: 'Visualize tratamentos, evolucao, situacao financeira e prioridades em uma unica tela.',
  },
  {
    number: '04',
    title: 'Arquivos protegidos',
    text: 'Imagens e documentos organizados por paciente, com armazenamento integrado ao Google Drive.',
  },
]

const workflow = [
  { step: '01', title: 'Encontre', text: 'O prontuario certo em poucos segundos.' },
  { step: '02', title: 'Entenda', text: 'Veja historico, tratamento e proximos passos.' },
  { step: '03', title: 'Cuide', text: 'Registre o atendimento e siga em frente.' },
]

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Navegacao principal">
        <a className="landing-logo" href="#inicio" aria-label="Fullarch inicio">
          Full<span>arch</span>
        </a>
        <div className="landing-nav-links">
          <a href="#recursos">Recursos</a>
          <a href="#visao">Visao do sistema</a>
        </div>
        <button className="landing-login" onClick={onLogin}>
          Entrar no sistema <span aria-hidden="true">↗</span>
        </button>
      </nav>

      <section className="landing-hero" id="inicio">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Gestao odontologica com clareza</p>
          <h1>Mais tempo para cuidar. <em>Menos tempo procurando.</em></h1>
          <p className="landing-lead">
            O Fullarch organiza o dia a dia clinico para que o dentista encontre o que importa,
            acompanhe cada tratamento e conduza cada atendimento com mais presenca.
          </p>
          <div className="landing-actions">
            <button className="landing-primary" onClick={onLogin}>
              Acessar meu sistema <span aria-hidden="true">→</span>
            </button>
            <a className="landing-secondary" href="#recursos">Conhecer recursos</a>
          </div>
          <div className="landing-proof">
            <span className="landing-proof-dot" />
            <span>Um prontuario mais humano para uma rotina mais inteligente.</span>
          </div>
        </div>
        <div className="landing-hero-art" aria-label="Mascote do Fullarch">
          <div className="landing-art-ring landing-art-ring-one" />
          <div className="landing-art-ring landing-art-ring-two" />
          <div className="landing-art-note landing-art-note-top">visao do paciente</div>
          <div className="landing-dashboard-card landing-dashboard-card-top">
            <div className="landing-dashboard-label">Hoje, 09:42</div>
            <strong>3 consultas</strong>
            <span className="landing-dashboard-line"><i style={{ width: '68%' }} /></span>
          </div>
          <img src="/mascote-dentinho.png" alt="Mascote dentinho Fullarch" />
          <div className="landing-dashboard-card landing-dashboard-card-bottom">
            <span className="landing-mini-avatar">MC</span>
            <div><strong>Marina Costa</strong><small>Tratamento em andamento</small></div>
            <b>→</b>
          </div>
          <div className="landing-art-note landing-art-note-bottom">cuidado em cada detalhe</div>
        </div>
      </section>

      <section className="landing-signal" aria-label="Visao geral do sistema">
        <div className="landing-signal-heading">
          <span className="landing-eyebrow">Tudo no seu campo de visao</span>
          <strong>Uma rotina que respira junto com o consultorio.</strong>
        </div>
        <div className="landing-signal-stat"><b>24</b><span>pacientes ativos</span></div>
        <div className="landing-signal-stat"><b>08</b><span>tratamentos em curso</span></div>
        <div className="landing-signal-stat"><b>96%</b><span>historico organizado</span></div>
      </section>

      <section className="landing-intro" id="visao">
        <p className="landing-eyebrow">Feito para o consultorio real</p>
        <h2>O cuidado continua depois que a consulta termina.</h2>
        <p>
          Do primeiro registro ao acompanhamento de longo prazo, o Fullarch transforma informacao
          espalhada em uma visao continua do paciente.
        </p>
      </section>

      <section className="landing-features" id="recursos">
        {features.map((feature) => (
          <article className="landing-feature" key={feature.number}>
            <span className="landing-feature-number">{feature.number}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="landing-workflow">
        <div className="landing-workflow-copy">
          <p className="landing-eyebrow">Um fluxo mais natural</p>
          <h2>Da primeira busca ao proximo cuidado.</h2>
          <p>Menos cliques entre uma informacao e outra. Mais espaco mental para decidir, explicar e cuidar.</p>
        </div>
        <div className="landing-workflow-list">
          {workflow.map((item) => (
            <div className="landing-workflow-item" key={item.step}>
              <span>{item.step}</span>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
              <b aria-hidden="true">↗</b>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-closing">
        <div>
          <p className="landing-eyebrow">Seu proximo atendimento comeca aqui</p>
          <h2>Uma visao melhor do seu trabalho.</h2>
        </div>
        <button className="landing-primary" onClick={onLogin}>
          Entrar no Fullarch <span aria-hidden="true">↗</span>
        </button>
      </section>

      <footer className="landing-footer">
        <span>Full<span>arch</span></span>
        <span>CRM odontologico para quem cuida de perto.</span>
      </footer>
    </main>
  )
}
