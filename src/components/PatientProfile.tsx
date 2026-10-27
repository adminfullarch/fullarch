import { useState } from 'react'
import { usePatientDetail } from '../hooks/usePatientDetail'
import { addTimelineEvent } from '../api/timeline'
import { deletePatient } from '../api/patients'
import { exportarPaciente } from '../lib/exportarPaciente'
import { financialLabel } from '../utils/patientStatus'
import { FilesTab } from './FilesTab'
import { OdontogramaTab } from './OdontogramaTab'
import { TreatmentsTab } from './TreatmentsTab'
import { AnamneseTab } from './AnamneseTab'
import { AGE_GROUP_LABEL } from '../data/anamnese'
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

export function PatientProfile({
  patientId,
  onDeleted,
  onPatientChanged,
}: {
  patientId: string
  onDeleted: () => void
  /** Avisa quem mantém a lista de pacientes que o cadastro mudou. */
  onPatientChanged?: () => void
}) {
  const { patient, treatments, timeline, status, loading, error, reload } = usePatientDetail(patientId)
  const [tab, setTab] = useState<Tab>('timeline')
  const [deleting, setDeleting] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [erroExport, setErroExport] = useState<string | null>(null)

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
              <span>{patient.age_group ? AGE_GROUP_LABEL[patient.age_group] : '—'}</span>
              <span>{patient.phone ?? '—'}</span>
              <span>{patient.plan}</span>
            </div>
          </div>
          <div className="ph-actions">
            <button
              className="btn btn-ghost"
              title="Exportar todos os dados do paciente (LGPD)"
              disabled={exportando}
              onClick={async () => {
                setErroExport(null)
                setExportando(true)
                try {
                  await exportarPaciente(patient.id, patient.name)
                } catch {
                  setErroExport('Não foi possível exportar os dados. Tente novamente.')
                } finally {
                  setExportando(false)
                }
              }}
            >
              {exportando ? 'Exportando…' : 'Exportar dados (LGPD)'}
            </button>
            <button
              className="patient-delete-btn"
              title="Excluir paciente"
              aria-label="Excluir paciente"
              disabled={deleting}
              onClick={() => setConfirmandoExclusao(true)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </div>
        </div>
        {erroExport && <div className="anamnese-erro">{erroExport}</div>}
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
          <AnamneseTab
            patientId={patient.id}
            patientName={patient.name}
            patientAge={patient.age}
            patientAgeGroup={patient.age_group}
            onPatientChanged={async () => {
              // A faixa aparece no perfil e na lista: os dois recarregam.
              onPatientChanged?.()
              await reload()
            }}
          />
        )}
        {tab === 'odontograma' && <OdontogramaTab patientId={patient.id} onChanged={reload} />}
        {tab === 'imagens' && (
          <FilesTab patientId={patient.id} patientName={patient.name} kind="image" onChanged={reload} />
        )}
        {tab === 'documentos' && (
          <FilesTab patientId={patient.id} patientName={patient.name} kind="document" onChanged={reload} />
        )}
      </div>

      {confirmandoExclusao && (
        <ConfirmarExclusaoModal
          patientName={patient.name}
          deleting={deleting}
          onClose={() => {
            if (!deleting) setConfirmandoExclusao(false)
          }}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deletePatient(patient.id)
              onDeleted()
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
    </div>
  )
}

/**
 * Confirmacao do direito de exclusao (LGPD). Deixa claro que a acao e
 * permanente e remove TODOS os dados e arquivos do paciente. So libera o
 * botao depois que o usuario digita EXCLUIR.
 */
function ConfirmarExclusaoModal({
  patientName,
  deleting,
  onClose,
  onConfirm,
}: {
  patientName: string
  deleting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [texto, setTexto] = useState('')
  const confirmado = texto.trim().toUpperCase() === 'EXCLUIR'
  return (
    <div className="modal-overlay visible" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">Excluir paciente</div>
        <p className="field-label">
          Esta ação é permanente e não pode ser desfeita. Serão apagados definitivamente todos os dados de{' '}
          <strong>{patientName}</strong>: tratamentos, sessões, timeline, odontograma, anamnese, consultas e todos os
          arquivos (imagens e documentos).
        </p>
        <label className="field-label">Para confirmar, digite EXCLUIR</label>
        <input
          className="field-input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="EXCLUIR"
          autoFocus
        />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={deleting}>
            Cancelar
          </button>
          <button className="btn btn-solid" disabled={!confirmado || deleting} onClick={onConfirm}>
            {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
          </button>
        </div>
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
