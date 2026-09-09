import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileKind, PatientFile } from '../types/database.types'
import { deletePatientFile, listPatientFiles, signedUrlFor, signedUrlsFor, uploadPatientFile } from '../api/files'
import { REGRAS } from '../data/uploadRules'

export function FilesTab({
  patientId,
  patientName,
  kind,
  onChanged,
}: {
  patientId: string
  patientName: string
  kind: FileKind
  onChanged?: () => void
}) {
  const [files, setFiles] = useState<PatientFile[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await listPatientFiles(patientId, kind)
      setFiles(lista)
      // Miniaturas só fazem sentido para imagens; documentos assinam ao clicar.
      setUrls(kind === 'image' ? await signedUrlsFor(lista.map((f) => f.storage_path)) : {})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar arquivos.')
    } finally {
      setLoading(false)
    }
  }, [patientId, kind])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleFileChosen(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadPatientFile({ file, patientId, patientName, kind })
      await reload()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(file: PatientFile) {
    if (!window.confirm(`Excluir ${file.label}? Esta ação não pode ser desfeita.`)) return
    setError(null)
    try {
      await deletePatientFile(file)
      await reload()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir arquivo.')
    }
  }

  /** O link expira, então é gerado no clique e não guardado na página. */
  async function abrir(file: PatientFile) {
    try {
      window.open(await signedUrlFor(file.storage_path), '_blank', 'noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir o arquivo.')
    }
  }

  const emptyLabel = kind === 'image' ? 'Nenhuma imagem neste prontuário ainda.' : 'Nenhum documento anexado ainda.'

  return (
    <div>
      <div className="section-label">{kind === 'image' ? 'Imagens' : 'Documentos'}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '5px 12px' }}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Enviando…' : kind === 'image' ? 'Adicionar foto' : 'Adicionar documento'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={REGRAS[kind].accept}
          style={{ display: 'none' }}
          onChange={(e) => handleFileChosen(e.target.files)}
        />
        <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--ink-faint)' }}>
          {REGRAS[kind].descricao} · até {Math.round(REGRAS[kind].tamanhoMaximo / (1024 * 1024))} MB
        </span>
      </div>

      {error && <p style={{ color: '#9C4A3C', fontSize: 12.5, marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <div className="empty">
          <p>Carregando…</p>
        </div>
      ) : files.length === 0 ? (
        <div className="empty">
          <p>{emptyLabel}</p>
        </div>
      ) : kind === 'image' ? (
        <div className="img-grid">
          {files.map((f) => (
            <div key={f.id}>
              <button className="img-card" data-label={f.label} onClick={() => abrir(f)} title={f.label}>
                {urls[f.storage_path] && <img src={urls[f.storage_path]} alt={f.label} />}
              </button>
              <button className="btn btn-ghost" onClick={() => handleDelete(f)} style={{ marginTop: 6 }}>
                Excluir
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {files.map((f) => (
            <div key={f.id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => abrir(f)}
                className="treat-card"
                style={{ display: 'block', width: '100%', textAlign: 'left' }}
              >
                <div className="treat-name">{f.label}</div>
                <div className="treat-meta">{new Date(f.created_at).toLocaleDateString('pt-BR')}</div>
              </button>
              <button className="btn btn-ghost" onClick={() => handleDelete(f)} style={{ marginTop: 6 }}>
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
