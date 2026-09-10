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

function IconeSalvar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}

function IconeEditar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconeCadeado() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function AnamneseTab({ patientId }: { patientId: string }) {
  /** O que está gravado no banco. */
  const [salvas, setSalvas] = useState<Respostas>({})
  /** O que está na tela, ainda podendo divergir do banco. */
  const [rascunho, setRascunho] = useState<Respostas>({})
  const [bloqueado, setBloqueado] = useState(true)
  const [grupo, setGrupo] = useState(ANAMNESE_GROUPS[0].id)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    setLoading(true)
    setError(null)
    listQuestionnaireResponses(patientId, PREFIXO)
      .then((rows) => {
        if (!ativo) return
        const mapa: Respostas = {}
        for (const r of rows) mapa[r.item] = r.value ?? MARCADO
        setSalvas(mapa)
        setRascunho(mapa)
        // Anamnese em branco já abre pronta para preencher; uma que já existe
        // abre protegida, para não ser alterada por um clique sem querer.
        setBloqueado(Object.keys(mapa).length > 0)
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

  /** Campos que mudaram desde a última gravação. */
  const pendentes = useMemo(() => {
    const ids = new Set([...Object.keys(salvas), ...Object.keys(rascunho)])
    return [...ids].filter((id) => (salvas[id] ?? '') !== (rascunho[id] ?? ''))
  }, [salvas, rascunho])

  // Sem autosave, fechar a aba no meio do preenchimento perderia tudo.
  useEffect(() => {
    if (pendentes.length === 0) return
    function avisar(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [pendentes.length])

  function alterar(id: string, valor: string) {
    setRascunho((prev) => {
      const proximo = { ...prev }
      if (valor === '') delete proximo[id]
      else proximo[id] = valor
      return proximo
    })
  }

  async function salvar() {
    if (pendentes.length === 0) {
      setBloqueado(true)
      return
    }
    setSalvando(true)
    setError(null)
    try {
      await Promise.all(
        pendentes.map((id) => setQuestionnaireValue(patientId, id, rascunho[id] ?? null))
      )
      setSalvas(rascunho)
      setBloqueado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Nada foi perdido — tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  function descartar() {
    if (pendentes.length > 0 && !window.confirm('Descartar as alterações não salvas?')) return
    setRascunho(salvas)
    setBloqueado(true)
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
      contagem[g.id] = Object.keys(rascunho).filter((id) => ids.has(id)).length
    }
    return contagem
  }, [rascunho])

  if (loading) {
    return (
      <div className="empty">
        <p>Carregando anamnese…</p>
      </div>
    )
  }

  return (
    <div className={`anamnese ${bloqueado ? 'bloqueada' : ''}`}>
      <div className="anamnese-top">
        <div className="section-label" style={{ marginBottom: 0 }}>
          Anamnese odontológica
        </div>
        <div className="anamnese-acoes">
          {bloqueado ? (
            <>
              <span className="anamnese-status">
                <IconeCadeado />
                Protegida
              </span>
              <button className="btn btn-solid" onClick={() => setBloqueado(false)}>
                <IconeEditar />
                Editar
              </button>
            </>
          ) : (
            <>
              <span className="anamnese-status">
                {pendentes.length === 0
                  ? 'Sem alterações'
                  : `${pendentes.length} ${pendentes.length === 1 ? 'alteração' : 'alterações'} não salva${pendentes.length === 1 ? '' : 's'}`}
              </span>
              <button className="btn btn-ghost" onClick={descartar} disabled={salvando}>
                Cancelar
              </button>
              <button className="btn btn-solid" onClick={salvar} disabled={salvando}>
                <IconeSalvar />
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="anamnese-erro">{error}</p>}

      <div className="anamnese-dados">
        {DADOS_CLINICOS.map((f) => (
          <Campo key={f.id} field={f} value={rascunho[f.id] ?? ''} onChange={alterar} bloqueado={bloqueado} />
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
        <Secao key={s.id} section={s} respostas={rascunho} onChange={alterar} bloqueado={bloqueado} />
      ))}
    </div>
  )
}

function Secao({
  section,
  respostas,
  onChange,
  bloqueado,
}: {
  section: AnamneseSection
  respostas: Respostas
  onChange: (id: string, valor: string) => void
  bloqueado: boolean
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
                  disabled={bloqueado}
                  value={respostas[sx.id] ?? ''}
                  onCommit={(v) => onChange(sx.id, v)}
                />
                <span className="sextante-unidade">mm</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="anamnese-grid">
        {visiveis.map((f) => (
          <Campo key={f.id} field={f} value={respostas[f.id] ?? ''} onChange={onChange} bloqueado={bloqueado} />
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
  onChange,
  bloqueado,
}: {
  field: AnamneseField
  value: string
  onChange: (id: string, valor: string) => void
  bloqueado: boolean
}) {
  const classe = `anamnese-campo ${field.wide ? 'wide' : ''} ${field.type === 'check' ? 'is-check' : ''}`

  if (field.type === 'check') {
    return (
      <label className={classe}>
        <input
          type="checkbox"
          checked={value !== ''}
          disabled={bloqueado}
          onChange={(e) => onChange(field.id, e.target.checked ? MARCADO : '')}
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
              disabled={bloqueado}
              onClick={() => onChange(field.id, value === op ? '' : op)}
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
        <ValorTextarea
          placeholder={field.placeholder}
          value={value}
          disabled={bloqueado}
          onCommit={(v) => onChange(field.id, v)}
        />
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
        disabled={bloqueado}
        onCommit={(v) => onChange(field.id, v)}
      />
    </div>
  )
}

/**
 * O texto digitado fica em estado local e só sobe para o rascunho ao sair do
 * campo. São quase 200 campos na tela: propagar a cada tecla faria a aba
 * inteira renderizar de novo enquanto o dentista digita.
 */
function ValorInput({
  value,
  onCommit,
  ...props
}: { value: string; onCommit: (valor: string) => void } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [local, setLocal] = useState(value)
  const ultimo = useRef(value)

  useEffect(() => {
    if (value !== ultimo.current) {
      ultimo.current = value
      setLocal(value)
    }
  }, [value])

  return (
    <input
      {...props}
      className="field-input"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const limpo = local.trim()
        if (limpo === ultimo.current) return
        ultimo.current = limpo
        onCommit(limpo)
      }}
    />
  )
}

function ValorTextarea({
  value,
  onCommit,
  placeholder,
  disabled,
}: {
  value: string
  onCommit: (valor: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [local, setLocal] = useState(value)
  const ultimo = useRef(value)

  useEffect(() => {
    if (value !== ultimo.current) {
      ultimo.current = value
      setLocal(value)
    }
  }, [value])

  return (
    <textarea
      className="field-textarea"
      placeholder={placeholder}
      disabled={disabled}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const limpo = local.trim()
        if (limpo === ultimo.current) return
        ultimo.current = limpo
        onCommit(limpo)
      }}
    />
  )
}
