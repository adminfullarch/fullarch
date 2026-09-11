import { useState } from 'react'
import { usePatientDetail } from '../hooks/usePatientDetail'
import { addTimelineEvent } from '../api/timeline'
import { deletePatient } from '../api/patients'
import { financialLabel } from '../utils/patientStatus'
import { FilesTab } from './FilesTab'
import { OdontogramaTab } from './OdontogramaTab'
import { TreatmentsTab } from './TreatmentsTab'
import { AnamneseTab } from './AnamneseTab'
import { supabase } from '../lib/supabase'

type Tab = 'timeline' | 'tratamentos' | 'anamnese' | 'odontograma' | 'imagens' | 'documentos'

const TABS: { key: Tab; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'tratamentos', label: 'Tratamentos' },
  { key: 'anamnese', label: 'Anamnese' },
  { key: 'odontograma', label: 'Odontograma' },
  { key: 'imagens', label: 'Imagens' },
  { key: 'documentos', label: 'Documentos' },
]

export function PatientProfile({ patientId, onDeleted }: { patientId: string; onDeleted: () => void }) {
  const { patient, treatments, timeline, status, loading, error, reload } = usePatientDetail(patientId)
  const [tab, setTab] = useState<Tab>('timeline')
  const [deleting, setDeleting] = useState(false)

  if (loading && !patient) return <div className="panel-body">Carregando prontuário…</div>
  if (error) return <div className="panel-body">{error}</div>
  if (!patient) return null

  const activeTreatment = treatments.find((t) => t.status === 'em_andamento')

  return (
    <div className="main">
      <div className="profile-header">
        <div className="ph-top">
          <div>
            <div className="ph-name">{patient.name}</div>
            <div className="ph-sub">
              <span>{patient.age ? `${patient.age} anos` : '—'}</span>
              <span>{patient.phone ?? '—'}</span>
              <span>{patient.plan}</span>
            </div>
          </div>
          <div className="ph-actions">
            <button
              className="patient-delete-btn"
              title="Excluir paciente"
              aria-label="Excluir paciente"
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm(`Excluir ${patient.name}? Esta ação não pode ser desfeita.`)) return
                setDeleting(true)
                try {
                  await deletePatient(patient.id)
                  onDeleted()
                } finally {
                  setDeleting(false)
                }
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body">
        <div className="facts-row">
          <Fact label="Status" value={status?.nextStep ?? '—'} attention={status?.tag === 'attention'} />
          <Fact
            label="Tratamento ativo"
            value={activeTreatment?.name ?? 'Nenhum'}
            attention={false}
          />
          <Fact
            label="Situação financeira"
            value={financialLabel(patient.financial_status)}
            attention={patient.financial_status === 'atrasado'}
          />
          <Fact label="Tratamentos" value={String(treatments.length)} attention={false} />
        </div>

        {tab === 'timeline' && <TimelineTab events={timeline} />}
        {tab === 'tratamentos' && (
          <TreatmentsTab
            patientId={patient.id}
            treatments={treatments}
            onChanged={reload}
            onGoToTooth={() => setTab('odontograma')}
          />
        )}
        {tab === 'anamnese' && (
          <AnamneseTab patientId={patient.id} patientName={patient.name} patientAge={patient.age} />
        )}
        {tab === 'odontograma' && <OdontogramaTab patientId={patient.id} onChanged={reload} />}
        {tab === 'imagens' && (
          <FilesTab patientId={patient.id} patientName={patient.name} kind="image" onChanged={reload} />
        )}
        {tab === 'documentos' && (
          <FilesTab patientId={patient.id} patientName={patient.name} kind="document" onChanged={reload} />
        )}
      </div>

    </div>
  )
}

function Fact({ label, value, attention }: { label: string; value: string; attention: boolean }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className={`fact-value ${attention ? 'attention' : ''}`}>{value}</div>
    </div>
  )
}

function TimelineTab({ events }: { events: import('../types/database.types').TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="empty">
        <p>Nenhum evento na timeline ainda.</p>
      </div>
    )
  }
  return (
    <div className="timeline">
      {events.map((ev) => (
        <div key={ev.id} className={`tl-item ${ev.muted ? 'muted' : ''}`}>
          <div className="tl-dot" />
          <div className="tl-date">{new Date(ev.event_date).toLocaleDateString('pt-BR')}</div>
          <div className="tl-card">
            <div className="tl-title">{ev.title}</div>
            {ev.description && <div className="tl-desc">{ev.description}</div>}
            <span className="tl-kind">{ev.kind}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function NoteModal({ onClose, onSave }: { onClose: () => void; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="modal-overlay visible" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">Nova anotação clínica</div>
        <label className="field-label">Anotação</label>
        <textarea className="field-textarea" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-solid"
            disabled={!text.trim() || saving}
            onClick={async () => {
              setSaving(true)
              await onSave(text.trim())
              setSaving(false)
            }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduleModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (date: string, time: string, reason: string) => Promise<void>
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="modal-overlay visible" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">Agendar consulta</div>
        <div className="field-row">
          <div>
            <label className="field-label">Data</label>
            <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Horário</label>
            <input className="field-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="field-label">Motivo</label>
        <input className="field-input" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-solid"
            disabled={!date || saving}
            onClick={async () => {
              setSaving(true)
              await onSave(date, time, reason.trim() || 'Consulta')
              setSaving(false)
            }}
          >
            {saving ? 'Agendando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
