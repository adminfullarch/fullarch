import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePatients } from './hooks/usePatients'
import { Login } from './components/Login'
import { LandingPage } from './components/LandingPage'
import { Sidebar, ViewName } from './components/Sidebar'
import { PatientList } from './components/PatientList'
import { PatientProfile } from './components/PatientProfile'
import { AgendaTab } from './components/AgendaTab'
import { DashboardTab } from './components/DashboardTab'
import { AjustesView } from './components/AjustesView'
import { CrmTab } from './components/CrmTab'
import { FinanceTab } from './components/FinanceTab'

export default function App() {
  const { session, loading, signOut } = useAuth()
  const { patients, loading: patientsLoading, error: patientsError, reload } = usePatients(Boolean(session))
  const [view, setView] = useState<ViewName>('dashboard')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)

  if (loading) return <div style={{ padding: 40 }}>Carregando…</div>
  if (!session) return showLogin ? <Login onBack={() => setShowLogin(false)} /> : <LandingPage onLogin={() => setShowLogin(true)} />

  return (
    <div className={`app ${view !== 'pacientes' ? 'full' : ''}`}>
      <Sidebar active={view} onChange={setView} onSignOut={signOut} />

      {view === 'pacientes' && (
        <>
          <PatientList
            patients={patients}
            activeId={activeId}
            loading={patientsLoading}
            error={patientsError}
            onSelect={setActiveId}
            onCreated={(id) => {
              reload()
              setActiveId(id)
            }}
          />
          {activeId ? (
            <PatientProfile
              patientId={activeId}
              onDeleted={() => {
                setActiveId(null)
                reload()
              }}
            />
          ) : (
            <div className="main">
              <div className="panel-body">
                <div className="empty">
                  <p>Selecione um paciente na lista, ou crie um novo com o botão “+”.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'agenda' && (
        <AgendaTab
          patients={patients}
          onOpenPatient={(id) => {
            setActiveId(id)
            setView('pacientes')
          }}
        />
      )}

      {view === 'dashboard' && (
        <DashboardTab
          patientCount={patients.length}
          patientsLoading={patientsLoading}
          onNavigate={setView}
          onOpenPatient={(id) => {
            setActiveId(id)
            setView('pacientes')
          }}
        />
      )}

      {view === 'ajustes' && <AjustesView />}
      {view === 'crm' && <CrmTab />}
      {view === 'financeiro' && <FinanceTab />}

      {view !== 'pacientes' && view !== 'agenda' && view !== 'dashboard' && view !== 'ajustes' && view !== 'crm' && view !== 'financeiro' && (
        <div className="main module-main visible">
          <div className="module-header">
            <div className="module-title">{view}</div>
            <div className="module-sub">
              Este módulo ainda segue como stub — próxima etapa da migração (mesmo padrão: tabela
              Supabase + hook + componente).
            </div>
          </div>
        </div>
      )}
    </div>
  )
}