import { useMemo, useRef, useState } from 'react'
import type { AgeGroup, Patient } from '../types/database.types'
import { createPatient } from '../api/patients'
import { AGE_GROUP_LABEL, ageGroupFromAge } from '../data/anamnese'

const FAIXAS: AgeGroup[] = ['crianca', 'adulto']

export function PatientList({
  patients,
  activeId,
  loading,
  error,
  onSelect,
  onCreated,
  onRetry,
}: {
  patients: Patient[]
  activeId: string | null
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
  onCreated: (id: string) => void
  onRetry: () => void
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients

    const normalize = (value: string | number | null | undefined) =>
      String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    return patients.filter((p) => {
      const haystack = [p.name, p.phone, p.plan, p.age ? String(p.age) : '']
      return haystack.some((value) => normalize(value).includes(normalize(q)))
    })
  }, [patients, query])

  return (
    <div className="list-col">
      <div className="search-wrap">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome, telefone, plano ou idade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="list-header">
        <h2>Pacientes</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="list-count">{loading ? '…' : filtered.length}</span>
          <button className="add-patient-btn" onClick={() => setModalOpen(true)} title="Adicionar paciente">
            +
          </button>
        </div>
      </div>
      <div className="patient-list">
        {error && (
          <div className="search-empty">
            {error}
            <br />
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={onRetry}>
              Tentar de novo
            </button>
          </div>
        )}
        {/* Antes da primeira resposta não se sabe se a clínica tem pacientes.
            Dizer "nenhum paciente" aqui seria afirmar algo ainda não sabido. */}
        {!error && loading && <div className="search-empty">Carregando pacientes…</div>}
        {!error && !loading && filtered.length === 0 && (
          <div className="search-empty">Nenhum paciente encontrado.</div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            className={`patient-card ${p.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="avatar">{initials(p.name)}</div>
            <div className="patient-info">
              <div className="patient-name">{p.name}</div>
              <div className="patient-meta">
                {p.age ? `${p.age} anos · ` : ''}
                {p.age_group ? `${AGE_GROUP_LABEL[p.age_group]} · ` : ''}
                {p.plan}
              </div>
            </div>
          </button>
        ))}
      </div>

      {modalOpen && (
        <NewPatientModal
          onClose={() => setModalOpen(false)}
          onCreated={(id) => {
            setModalOpen(false)
            onCreated(id)
          }}
        />
      )}
    </div>
  )
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''

  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 3) return `(${ddd}) ${rest}`
  if (digits.length <= 7) return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1)}`
  if (digits.length <= 11) return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5)}`

  return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5, 9)}`
}

function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  /** Depois que a pessoa escolhe a faixa, a idade digitada não a altera mais. */
  const [faixaManual, setFaixaManual] = useState(false)
  const [phone, setPhone] = useState('')
  const [plan, setPlan] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAgeChange(value: string) {
    setAge(value)
    // Só sugere enquanto a faixa não foi escolhida à mão. Entre 13 e 17 anos a
    // sugestão é nenhuma: quem decide é a dentista.
    if (!faixaManual) setAgeGroup(ageGroupFromAge(value === '' ? null : Number(value)))
  }

  function chooseAgeGroup(value: AgeGroup) {
    setAgeGroup(value)
    setFaixaManual(true)
  }

  async function handleSave() {
    if (!name.trim() || !ageGroup) return
    setSaving(true)
    setError(null)
    try {
      const patient = await createPatient({
        name: name.trim(),
        age: age ? Number(age) : null,
        age_group: ageGroup,
        phone: phone.replace(/\D/g, '') || null,
        plan: plan.trim() || undefined,
        reason: reason.trim() || undefined,
      })
      onCreated(patient.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar paciente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay visible" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">Novo paciente</div>
        <div className="modal-sub">Cadastro rápido — o restante se constrói com o uso.</div>
        <label className="field-label">Nome completo *</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="field-row">
          <div>
            <label className="field-label">Idade</label>
            <input
              className="field-input"
              type="number"
              value={age}
              onChange={(e) => handleAgeChange(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Telefone</label>
            <input
              className="field-input"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(41) 9 9999-9999"
            />
          </div>
        </div>
        <span className="field-label" id="nova-faixa-label">
          Faixa etária *
        </span>
        <AgeGroupRadio labelledBy="nova-faixa-label" value={ageGroup} onChange={chooseAgeGroup} />
        <label className="field-label">Convênio / Plano</label>
        <input className="field-input" value={plan} onChange={(e) => setPlan(e.target.value)} />
        <label className="field-label">Motivo da primeira consulta</label>
        <textarea
          className="field-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p style={{ color: '#9C4A3C', fontSize: 12.5 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-solid" onClick={handleSave} disabled={saving || !name.trim() || !ageGroup}>
            {saving ? 'Criando…' : 'Criar prontuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Escolha exclusiva entre Criança e Adulto, com semântica de radio: Tab entra
 * no grupo pela opção marcada (ou pela primeira) e as setas trocam a escolha.
 */
function AgeGroupRadio({
  labelledBy,
  value,
  onChange,
}: {
  labelledBy: string
  value: AgeGroup | null
  onChange: (value: AgeGroup) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focavel = value ? FAIXAS.indexOf(value) : 0

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % FAIXAS.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + FAIXAS.length) % FAIXAS.length
    if (next == null) return
    e.preventDefault()
    onChange(FAIXAS[next])
    refs.current[next]?.focus()
  }

  return (
    <div className="anamnese-opcoes faixa-opcoes" role="radiogroup" aria-labelledby={labelledBy} aria-required="true">
      {FAIXAS.map((f, i) => (
        <button
          key={f}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={value === f}
          tabIndex={i === focavel ? 0 : -1}
          className={`anamnese-opcao ${value === f ? 'selected' : ''}`}
          onClick={() => onChange(f)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {AGE_GROUP_LABEL[f]}
        </button>
      ))}
    </div>
  )
}
