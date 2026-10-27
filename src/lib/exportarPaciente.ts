import { supabase } from './supabase'
import { getPatient } from '../api/patients'
import { listTreatments, listSessions } from '../api/treatments'
import { listTimeline } from '../api/timeline'
import { listToothConditions } from '../api/toothConditions'
import { listQuestionnaireResponses } from '../api/questionnaire'
import { listAppointmentsByPatient } from '../api/appointments'
import { listPatientFiles } from '../api/files'

/**
 * Exportacao LGPD (direito de acesso / portabilidade): reune TODOS os dados de
 * um paciente num unico JSON. So faz leitura e reaproveita os modulos de src/api,
 * que ja aplicam a RLS por clinica — nenhum endpoint ou mudanca de banco novo.
 *
 * Os arquivos entram apenas como metadados (rotulo, caminho, tipo); o conteudo
 * binario nao vai no export.
 */

/** Dados da clinica/usuario no momento da exportacao, quando disponiveis. */
interface ContextoExport {
  usuario: string | null
  clinica: string | null
}

export interface PacienteExportado {
  /** Momento em que o arquivo foi gerado. */
  exportadoEm: string
  contexto: ContextoExport
  paciente: unknown
  tratamentos: unknown[]
  /** Sessoes de todos os tratamentos, agrupadas por tratamento. */
  sessoesPorTratamento: { tratamentoId: string; sessoes: unknown[] }[]
  timeline: unknown[]
  condicoesDentarias: unknown[]
  anamnese: unknown[]
  consultas: unknown[]
  /** Apenas metadados dos arquivos (rotulo/caminho), nao o conteudo binario. */
  arquivos: unknown[]
}

/** Le o contexto da sessao sem quebrar a exportacao se algo faltar. */
async function lerContexto(): Promise<ContextoExport> {
  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user
    return {
      usuario: user?.email ?? null,
      clinica: (user?.user_metadata?.clinic_name as string | undefined) ?? null,
    }
  } catch {
    return { usuario: null, clinica: null }
  }
}

/** Monta o objeto completo de exportacao de um paciente. */
export async function montarExportacaoPaciente(patientId: string): Promise<PacienteExportado> {
  const [contexto, paciente, tratamentos, timeline, condicoesDentarias, anamnese, consultas, arquivos] =
    await Promise.all([
      lerContexto(),
      getPatient(patientId),
      listTreatments(patientId),
      listTimeline(patientId),
      listToothConditions(patientId),
      listQuestionnaireResponses(patientId),
      listAppointmentsByPatient(patientId),
      listPatientFiles(patientId),
    ])

  // As sessoes sao carregadas por tratamento; buscamos todas em paralelo.
  const sessoesPorTratamento = await Promise.all(
    tratamentos.map(async (t) => ({
      tratamentoId: t.id,
      sessoes: await listSessions(t.id),
    })),
  )

  return {
    exportadoEm: new Date().toISOString(),
    contexto,
    paciente,
    tratamentos,
    sessoesPorTratamento,
    timeline,
    condicoesDentarias,
    anamnese,
    consultas,
    arquivos,
  }
}

/** Reduz o nome a um trecho seguro para nome de arquivo. */
function sanitizarNome(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // tira acentos
      .replace(/[^a-zA-Z0-9]+/g, '-') // troca o resto por hifen
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'paciente'
  )
}

/** Dispara o download do JSON no navegador via Blob, sem dependencia externa. */
function baixarJson(conteudo: unknown, nomeArquivo: string) {
  const blob = new Blob([JSON.stringify(conteudo, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta e baixa os dados do paciente. Lanca em caso de erro de leitura,
 * para a tela mostrar a mensagem.
 */
export async function exportarPaciente(patientId: string, patientName: string): Promise<void> {
  const dados = await montarExportacaoPaciente(patientId)
  const data = new Date().toISOString().slice(0, 10) // AAAA-MM-DD
  baixarJson(dados, `paciente-${sanitizarNome(patientName)}-${data}.json`)
}
