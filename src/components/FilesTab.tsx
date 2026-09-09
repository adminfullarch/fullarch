import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileKind, PatientFile } from '../types/database.types'
import { deletePatientFile, listPatientFiles, uploadPatientFile } from '../api/files'

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
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setFiles(await listPatientFiles(patientId, kind))
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
      setError(err instanceof Error ? err.message : 'Falha no upload para o Google Drive.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(file: PatientFile) {
    if (!window.confirm(`Excluir ${file.label}? Esta ação também remove o arquivo do Google Drive.`)) return
    setError(null)
    try {
      await deletePatientFile(file.id)
      await reload()
      onChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir arquivo.')
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
          accept={kind === 'image' ? 'image/*' : undefined}
          style={{ display: 'none' }}
          onChange={(e) => handleFileChosen(e.target.files)}
        />
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
              <a
                className="img-card"
                data-label={f.label}
                href={f.google_drive_url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block' }}
              />
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
              <a
                href={f.google_drive_url}
                target="_blank"
                rel="noreferrer"
                className="treat-card"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="treat-name">{f.label}</div>
                <div className="treat-meta">{new Date(f.created_at).toLocaleDateString('pt-BR')} · Google Drive</div>
              </a>
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
