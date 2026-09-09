import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ANAMNESE_GROUPS,
  DADOS_CLINICOS,
  SEXTANTES,
  type AnamneseField,
  type AnamneseSection,
} from '../data/anamnese'
import { listQuestionnaireResponses, setQuestionnaireValue } from '../api/questionnaire'

const PREFIXO = 'anamnese:'

/** Checkboxes gravam esta marca como valor, para caber no mesmo formato de resposta. */
const MARCADO = 'sim'

type Respostas = Record<string, string>

export function AnamneseTab({ patientId }: { patientId: string }) {
  const [respostas, setRespostas] = useState<Respostas>({})
  const [grupo, setGrupo] = useState(ANAMNESE_GROUPS[0].id)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(0)

  useEffect(() => {
    let ativo = true
    setLoading(true)
    setError(null)
    listQuestionnaireResponses(patientId, PREFIXO)
      .then((rows) => {
        if (!ativo) return
        const mapa: Respostas = {}
        for (const r of rows) mapa[r.item] = r.value ?? MARCADO
        setRespostas(mapa)
      })
      .catch((err) => {
        if (ativo) setError(err instanceof Error ? err.message : 'Erro ao carregar a anamnese.')
      })
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [patientId])

  async function salvar(id: string, valor: string) {
    setRespostas((prev) => {
      const proximo = { ...prev }
      if (valor === '') delete proximo[id]
      else proximo[id] = valor
      return proximo
    })
    setSalvando((n) => n + 1)
    try {
      await setQuestionnaireValue(patientId, id, valor === '' ? null : valor)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a resposta.')
    } finally {
      setSalvando((n) => n - 1)
    }
  }

  const grupoAtivo = ANAMNESE_GROUPS.find((g) => g.id === grupo) ?? ANAMNESE_GROUPS[0]

  /** Quantas respostas cada grupo já tem, para sinalizar o progresso na navegação. */
  const preenchidos = useMemo(() => {
    const contagem: Record<string, number> = {}
    for (const g of ANAMNESE_GROUPS) {
      const ids = new Set<string>()
      for (const s of g.sections) {
        for (const f of s.fields) ids.add(f.id)
        if (s.kind === 'periograma') for (const sx of SEXTANTES) ids.add(sx.id)
      }
      contagem[g.id] = Object.keys(respostas).filter((id) => ids.has(id)).length
    }
    return contagem
  }, [respostas])

  if (loading) {
    return (
      <div className="empty">
        <p>Carregando anamnese…</p>
      </div>
    )
  }

  return (
    <div className="anamnese">
      <div className="anamnese-top">
        <div className="section-label">Anamnese odontológica</div>
        <div className="anamnese-status">
          {salvando > 0 ? 'Salvando…' : error ? <span className="anamnese-error">{error}</span> : 'Salvo automaticamente'}
        </div>
      </div>

      <div className="anamnese-dados">
        {DADOS_CLINICOS.map((f) => (
          <Campo key={f.id} field={f} value={respostas[f.id] ?? ''} onSave={salvar} />
        ))}
      </div>

      <div className="anamnese-nav">
        {ANAMNESE_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`anamnese-nav-btn ${grupo === g.id ? 'active' : ''}`}
            onClick={() => setGrupo(g.id)}
          >
            {g.label}
            {preenchidos[g.id] > 0 && <span className="anamnese-count">{preenchidos[g.id]}</span>}
          </button>
        ))}
      </div>

      {grupoAtivo.intro && <p className="anamnese-intro">{grupoAtivo.intro}</p>}

      {grupoAtivo.sections.map((s) => (
        <Secao key={s.id} section={s} respostas={respostas} onSave={salvar} />
      ))}
    </div>
  )
}

function Secao({
  section,
  respostas,
  onSave,
}: {
  section: AnamneseSection
  respostas: Respostas
  onSave: (id: string, valor: string) => void
}) {
  const visiveis = section.fields.filter((f) => campoVisivel(f, respostas))
  return (
    <div className="anamnese-secao">
      <div className="anamnese-secao-head">
        <h3>{section.label}</h3>
        {section.required && <span className="anamnese-badge">Obrigatório</span>}
      </div>
      {section.note && <p className="anamnese-nota">{section.note}</p>}

      {section.kind === 'periograma' && (
        <div className="periograma">
          {SEXTANTES.map((sx) => (
            <div className="sextante" key={sx.id}>
              <div className="sextante-label">{sx.label}</div>
              <div className="sextante-dentes">{sx.dentes}</div>
              <div className="sextante-input">
                <ValorInput
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  placeholder="—"
                  value={respostas[sx.id] ?? ''}
                  onSave={(v) => onSave(sx.id, v)}
                />
                <span className="sextante-unidade">mm</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="anamnese-grid">
        {visiveis.map((f) => (
          <Campo key={f.id} field={f} value={respostas[f.id] ?? ''} onSave={onSave} />
        ))}
      </div>
    </div>
  )
}

function campoVisivel(field: AnamneseField, respostas: Respostas) {
  if (!field.showIf) return true
  const pai = respostas[field.showIf]
  if (!pai) return false
  if (field.showIfValue) return pai === field.showIfValue
  return true
}

function Campo({
  field,
  value,
  onSave,
}: {
  field: AnamneseField
  value: string
  onSave: (id: string, valor: string) => void
}) {
  const classe = `anamnese-campo ${field.wide ? 'wide' : ''} ${field.type === 'check' ? 'is-check' : ''}`

  if (field.type === 'check') {
    return (
      <label className={classe}>
        <input
          type="checkbox"
          checked={value !== ''}
          onChange={(e) => onSave(field.id, e.target.checked ? MARCADO : '')}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.type === 'choice') {
    return (
      <div className={classe}>
        <span className="anamnese-label">{field.label}</span>
        <div className="anamnese-opcoes">
          {(field.options ?? []).map((op) => (
            <button
              key={op}
              type="button"
              className={`anamnese-opcao ${value === op ? 'selected' : ''}`}
              onClick={() => onSave(field.id, value === op ? '' : op)}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className={classe}>
        <span className="anamnese-label">{field.label}</span>
        <ValorTextarea placeholder={field.placeholder} value={value} onSave={(v) => onSave(field.id, v)} />
      </div>
    )
  }

  return (
    <div className={classe}>
      <span className="anamnese-label">{field.label}</span>
      <ValorInput
        type={field.type}
        placeholder={field.placeholder}
        value={value}
        onSave={(v) => onSave(field.id, v)}
      />
    </div>
  )
}

/**
 * Campo de texto que mantém o que está sendo digitado em estado local e só
 * grava ao sair do campo — evita uma chamada ao Supabase por tecla.
 */
function ValorInput({
  value,
  onSave,
  ...props
}: { value: string; onSave: (valor: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [rascunho, setRascunho] = useState(value)
  const ultimoSalvo = useRef(value)

  useEffect(() => {
    if (value !== ultimoSalvo.current) {
      ultimoSalvo.current = value
      setRascunho(value)
    }
  }, [value])

  return (
    <input
      {...props}
      className="field-input"
      value={rascunho}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => {
        const limpo = rascunho.trim()
        if (limpo === ultimoSalvo.current) return
        ultimoSalvo.current = limpo
        onSave(limpo)
      }}
    />
  )
}

function ValorTextarea({
  value,
  onSave,
  placeholder,
}: {
  value: string
  onSave: (valor: string) => void
  placeholder?: string
}) {
  const [rascunho, setRascunho] = useState(value)
  const ultimoSalvo = useRef(value)

  useEffect(() => {
    if (value !== ultimoSalvo.current) {
      ultimoSalvo.current = value
      setRascunho(value)
    }
  }, [value])

  return (
    <textarea
      className="field-textarea"
      placeholder={placeholder}
      value={rascunho}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => {
        const limpo = rascunho.trim()
        if (limpo === ultimoSalvo.current) return
        ultimoSalvo.current = limpo
        onSave(limpo)
      }}
    />
  )
}
