/**
 * Estrutura da anamnese odontológica multiespecialidade.
 *
 * Cada campo tem um `id` estável — ele é gravado como `item` na tabela
 * questionnaire_responses, então renomear um id descarta as respostas já
 * salvas. O prefixo `anamnese:` separa estes itens do mini questionário do
 * odontograma, que grava na mesma tabela.
 */

export type AnamneseFieldType = 'check' | 'text' | 'number' | 'date' | 'choice' | 'textarea'

export type AnamneseField = {
  id: string
  label: string
  type: AnamneseFieldType
  options?: string[]
  placeholder?: string
  /** Ocupa a linha inteira da grade. */
  wide?: boolean
  /** Só aparece quando o campo indicado tiver resposta. */
  showIf?: string
  /** Junto de showIf, exige um valor específico. */
  showIfValue?: string
}

export type AnamneseSection = {
  id: string
  label: string
  note?: string
  /** Seção obrigatória antes de qualquer procedimento. */
  required?: boolean
  /** Seções com layout próprio. */
  kind?: 'periograma'
  fields: AnamneseField[]
}

export type AnamneseGroup = {
  id: string
  label: string
  intro?: string
  /**
   * Faixa etária em que o grupo é oferecido. Serve para não empurrar as
   * perguntas de odontopediatria ao dentista que atende um adulto, nem as de
   * implante a quem atende uma criança. Não apaga nada: um grupo escondido
   * que já tenha respostas continua aparecendo, e a aba oferece mostrar os
   * escondidos.
   */
  idadeMaxima?: number
  /** Idade abaixo da qual o grupo deixa de ser oferecido. */
  idadeMinima?: number
  sections: AnamneseSection[]
}

const SIM_NAO = ['Sim', 'Não']
const SIM_NAO_NAOSEI = ['Sim', 'Não', 'Não sei']
const LADO = ['Direito', 'Esquerdo', 'Ambos']

export const SEXTANTES = [
  { id: 'anamnese:perio.sextante.1', label: 'Sextante 1', dentes: '18 — 14' },
  { id: 'anamnese:perio.sextante.2', label: 'Sextante 2', dentes: '13 — 23' },
  { id: 'anamnese:perio.sextante.3', label: 'Sextante 3', dentes: '24 — 28' },
  { id: 'anamnese:perio.sextante.4', label: 'Sextante 4', dentes: '38 — 34' },
  { id: 'anamnese:perio.sextante.5', label: 'Sextante 5', dentes: '33 — 43' },
  { id: 'anamnese:perio.sextante.6', label: 'Sextante 6', dentes: '44 — 48' },
]

/** Dados clínicos que ainda não existem no cadastro do paciente. */
export const DADOS_CLINICOS: AnamneseField[] = [
  { id: 'anamnese:dados.sexo', label: 'Sexo', type: 'choice', options: ['Masculino', 'Feminino', 'Outro'] },
  { id: 'anamnese:dados.peso', label: 'Peso (kg)', type: 'number', placeholder: 'ex: 72.5' },
  { id: 'anamnese:dados.altura', label: 'Altura (m)', type: 'number', placeholder: 'ex: 1.75' },
  { id: 'anamnese:dados.profissao', label: 'Profissão', type: 'text', placeholder: 'Profissão' },
]

export const ANAMNESE_GROUPS: AnamneseGroup[] = [
  {
    id: 'medico',
    label: 'Médico',
    intro:
      'Seção obrigatória antes de qualquer procedimento. Respostas afirmativas devem ser detalhadas e, se necessário, exigem parecer médico prévio.',
    sections: [
      {
        id: 'med.cardio',
        label: 'Cardiovascular',
        required: true,
        fields: [
          { id: 'anamnese:med.cardio.hipertensao', label: 'Hipertensão (pressão alta)', type: 'check' },
          { id: 'anamnese:med.cardio.infarto', label: 'Infarto / Angina / Insuficiência cardíaca', type: 'check' },
          { id: 'anamnese:med.cardio.arritmia', label: 'Arritmias / palpitações', type: 'check' },
          { id: 'anamnese:med.cardio.marcapasso', label: 'Marcapasso', type: 'check' },
          { id: 'anamnese:med.cardio.cirurgia', label: 'Cirurgia cardíaca prévia', type: 'check' },
          { id: 'anamnese:med.cardio.varizes', label: 'Varizes / Trombose / Aneurisma', type: 'check' },
          { id: 'anamnese:med.cardio.anticoag', label: 'Uso de anticoagulantes', type: 'check' },
          {
            id: 'anamnese:med.cardio.anticoag.quais',
            label: 'Quais anticoagulantes',
            type: 'text',
            placeholder: 'AAS, Warfarin, Clopidogrel…',
            wide: true,
            showIf: 'anamnese:med.cardio.anticoag',
          },
        ],
      },
      {
        id: 'med.resp',
        label: 'Respiratório',
        fields: [
          { id: 'anamnese:med.resp.asma', label: 'Asma / Bronquite', type: 'check' },
          { id: 'anamnese:med.resp.dpoc', label: 'Enfisema / DPOC', type: 'check' },
          { id: 'anamnese:med.resp.apneia', label: 'Apneia do sono', type: 'check' },
          { id: 'anamnese:med.resp.tuberculose', label: 'Tuberculose (ativa ou tratada)', type: 'check' },
          { id: 'anamnese:med.resp.covid', label: 'Covid-19', type: 'check' },
          { id: 'anamnese:med.resp.covid.data', label: 'Data da Covid-19', type: 'date', showIf: 'anamnese:med.resp.covid' },
          {
            id: 'anamnese:med.resp.covid.sequelas',
            label: 'Sequelas da Covid-19',
            type: 'choice',
            options: SIM_NAO,
            showIf: 'anamnese:med.resp.covid',
          },
        ],
      },
      {
        id: 'med.endocrino',
        label: 'Endócrino / Metabólico',
        fields: [
          { id: 'anamnese:med.endo.diabetes', label: 'Diabetes (tipo 1 ou 2)', type: 'check' },
          {
            id: 'anamnese:med.endo.diabetes.glicemia',
            label: 'Última glicemia',
            type: 'text',
            placeholder: 'mg/dL',
            showIf: 'anamnese:med.endo.diabetes',
          },
          { id: 'anamnese:med.endo.tireoide', label: 'Hipotireoidismo / Hipertireoidismo', type: 'check' },
          { id: 'anamnese:med.endo.cushing', label: 'Doença de Cushing / Addison', type: 'check' },
          { id: 'anamnese:med.endo.osteoporose', label: 'Osteoporose', type: 'check' },
          {
            id: 'anamnese:med.endo.bisfosfonatos',
            label: 'Bisfosfonatos em uso',
            type: 'text',
            placeholder: 'Qual medicamento',
            showIf: 'anamnese:med.endo.osteoporose',
          },
          {
            id: 'anamnese:med.endo.bisfosfonatos.tempo',
            label: 'Há quanto tempo',
            type: 'text',
            placeholder: 'ex: 3 anos',
            showIf: 'anamnese:med.endo.osteoporose',
          },
        ],
      },
      {
        id: 'med.gastro',
        label: 'Gastrointestinal / Hepático',
        fields: [
          { id: 'anamnese:med.gastro.refluxo', label: 'Refluxo gastroesofágico', type: 'check' },
          { id: 'anamnese:med.gastro.ulcera', label: 'Úlcera gástrica / duodenal', type: 'check' },
          { id: 'anamnese:med.gastro.hepatite', label: 'Hepatite (A, B, C) ou cirrose', type: 'check' },
          { id: 'anamnese:med.gastro.inflamatoria', label: 'Doença inflamatória (Crohn, Colite)', type: 'check' },
        ],
      },
      {
        id: 'med.renal',
        label: 'Renal / Urinário',
        fields: [
          { id: 'anamnese:med.renal.insuficiencia', label: 'Insuficiência renal', type: 'check' },
          {
            id: 'anamnese:med.renal.dialise',
            label: 'Faz diálise',
            type: 'choice',
            options: SIM_NAO,
            showIf: 'anamnese:med.renal.insuficiencia',
          },
          { id: 'anamnese:med.renal.calculo', label: 'Cálculo renal (litíase)', type: 'check' },
          { id: 'anamnese:med.renal.infeccoes', label: 'Infecções urinárias de repetição', type: 'check' },
        ],
      },
      {
        id: 'med.neuro',
        label: 'Neurológico / Psiquiátrico',
        fields: [
          { id: 'anamnese:med.neuro.epilepsia', label: 'Epilepsia / convulsões', type: 'check' },
          { id: 'anamnese:med.neuro.avc', label: 'AVC (derrame)', type: 'check' },
          { id: 'anamnese:med.neuro.avc.tempo', label: 'Há quanto tempo', type: 'text', placeholder: 'ex: 2 anos', showIf: 'anamnese:med.neuro.avc' },
          { id: 'anamnese:med.neuro.avc.sequelas', label: 'Sequelas', type: 'text', placeholder: 'Quais sequelas', showIf: 'anamnese:med.neuro.avc' },
          { id: 'anamnese:med.neuro.degenerativa', label: 'Alzheimer / Parkinson', type: 'check' },
          { id: 'anamnese:med.neuro.depressao', label: 'Depressão / Ansiedade / Pânico', type: 'check' },
          { id: 'anamnese:med.neuro.bipolar', label: 'Esquizofrenia / Bipolaridade', type: 'check' },
          {
            id: 'anamnese:med.neuro.psicotropicos',
            label: 'Benzodiazepínicos ou antidepressivos em uso',
            type: 'text',
            placeholder: 'Quais medicamentos',
            wide: true,
          },
        ],
      },
      {
        id: 'med.reuma',
        label: 'Reumatológico / Autoimune',
        fields: [
          { id: 'anamnese:med.reuma.artrite', label: 'Artrite reumatoide', type: 'check' },
          { id: 'anamnese:med.reuma.lupus', label: 'Lúpus eritematoso sistêmico', type: 'check' },
          { id: 'anamnese:med.reuma.esclerodermia', label: 'Esclerodermia', type: 'check' },
          { id: 'anamnese:med.reuma.sjogren', label: 'Síndrome de Sjögren', type: 'check' },
          { id: 'anamnese:med.reuma.fibromialgia', label: 'Fibromialgia', type: 'check' },
        ],
      },
      {
        id: 'med.hemato',
        label: 'Hematológico / Coagulação',
        fields: [
          { id: 'anamnese:med.hemato.anemia', label: 'Anemia (ferropriva, falciforme, etc.)', type: 'check' },
          { id: 'anamnese:med.hemato.hemofilia', label: 'Hemofilia / Von Willebrand', type: 'check' },
          { id: 'anamnese:med.hemato.leucemia', label: 'Leucemia / Linfoma', type: 'check' },
          { id: 'anamnese:med.hemato.transfusao', label: 'Transfusão sanguínea', type: 'check' },
          { id: 'anamnese:med.hemato.transfusao.data', label: 'Data da transfusão', type: 'date', showIf: 'anamnese:med.hemato.transfusao' },
        ],
      },
      {
        id: 'med.alergias',
        label: 'Alergias / Reações adversas',
        required: true,
        fields: [
          { id: 'anamnese:med.alergia.medicamentos', label: 'Alergia a medicamentos', type: 'check' },
          { id: 'anamnese:med.alergia.medicamentos.quais', label: 'Quais medicamentos', type: 'text', placeholder: 'Quais', showIf: 'anamnese:med.alergia.medicamentos' },
          { id: 'anamnese:med.alergia.anestesico', label: 'Alergia a anestésico local', type: 'check' },
          { id: 'anamnese:med.alergia.anestesico.qual', label: 'Qual anestésico', type: 'text', placeholder: 'Qual', showIf: 'anamnese:med.alergia.anestesico' },
          { id: 'anamnese:med.alergia.latex', label: 'Alergia a látex / borracha', type: 'check' },
          { id: 'anamnese:med.alergia.metais', label: 'Alergia a metais (níquel, cromo, etc.)', type: 'check' },
          { id: 'anamnese:med.alergia.alimentar', label: 'Alergia alimentar', type: 'check' },
          { id: 'anamnese:med.alergia.alimentar.quais', label: 'Quais alimentos', type: 'text', placeholder: 'Quais', wide: true, showIf: 'anamnese:med.alergia.alimentar' },
        ],
      },
      {
        id: 'med.habitos',
        label: 'Hábitos e estilo de vida',
        fields: [
          { id: 'anamnese:med.habito.tabagista', label: 'Tabagista', type: 'check' },
          { id: 'anamnese:med.habito.tabagista.tempo', label: 'Há quanto tempo', type: 'text', placeholder: 'ex: 10 anos', showIf: 'anamnese:med.habito.tabagista' },
          { id: 'anamnese:med.habito.tabagista.qtd', label: 'Cigarros por dia', type: 'number', placeholder: 'ex: 20', showIf: 'anamnese:med.habito.tabagista' },
          { id: 'anamnese:med.habito.etilista', label: 'Etilista', type: 'check' },
          { id: 'anamnese:med.habito.etilista.freq', label: 'Frequência', type: 'text', placeholder: 'ex: 2x/semana', showIf: 'anamnese:med.habito.etilista' },
          { id: 'anamnese:med.habito.drogas', label: 'Uso de drogas ilícitas', type: 'check' },
          { id: 'anamnese:med.habito.drogas.quais', label: 'Quais', type: 'text', placeholder: 'Quais', showIf: 'anamnese:med.habito.drogas' },
          { id: 'anamnese:med.habito.atividade', label: 'Pratica atividade física', type: 'choice', options: SIM_NAO },
          {
            id: 'anamnese:med.habito.atividade.freq',
            label: 'Frequência',
            type: 'text',
            placeholder: 'ex: 3x/semana',
            showIf: 'anamnese:med.habito.atividade',
            showIfValue: 'Sim',
          },
          { id: 'anamnese:med.habito.alimentacao', label: 'Alimentação equilibrada', type: 'choice', options: SIM_NAO, wide: true },
        ],
      },
      {
        id: 'med.medicamentos',
        label: 'Medicamentos em uso contínuo',
        fields: [
          {
            id: 'anamnese:med.medicamentos.lista',
            label: 'Listar todos',
            type: 'textarea',
            placeholder: 'Ex: Losartana 50mg, Metformina 850mg…',
            wide: true,
          },
        ],
      },
      {
        id: 'med.cirurgias',
        label: 'Cirurgias prévias / Internações',
        fields: [
          {
            id: 'anamnese:med.cirurgias.lista',
            label: 'Descreva cirurgias, motivos e datas',
            type: 'textarea',
            placeholder: 'Cirurgias, motivos e datas',
            wide: true,
          },
        ],
      },
    ],
  },
  {
    id: 'periodontia',
    label: 'Periodontia',
    intro: 'Gengivas e estruturas de suporte.',
    sections: [
      {
        id: 'perio.anamnese',
        label: 'Anamnese periodontal',
        fields: [
          { id: 'anamnese:perio.sangramento', label: 'Sangramento ao escovar ou usar fio', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.sangramento.tempo', label: 'Há quanto tempo', type: 'text', placeholder: 'ex: 6 meses', showIf: 'anamnese:perio.sangramento', showIfValue: 'Sim' },
          { id: 'anamnese:perio.gengiva.inflamada', label: 'Gengivas vermelhas, inchadas ou doloridas', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.gengiva.inflamada.local', label: 'Local', type: 'text', placeholder: 'Onde', showIf: 'anamnese:perio.gengiva.inflamada', showIfValue: 'Sim' },
          { id: 'anamnese:perio.retracao', label: 'Sensação de retração gengival', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.retracao.dentes', label: 'Quais dentes', type: 'text', placeholder: 'ex: 13, 23', showIf: 'anamnese:perio.retracao', showIfValue: 'Sim' },
          { id: 'anamnese:perio.raizes', label: 'Raízes expostas (dentes parecem mais longos)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.mobilidade', label: 'Dentes com mobilidade ou que mudaram de posição', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.mobilidade.dentes', label: 'Quais dentes', type: 'text', placeholder: 'Quais', showIf: 'anamnese:perio.mobilidade', showIfValue: 'Sim' },
          { id: 'anamnese:perio.halitose', label: 'Mau hálito constante', type: 'choice', options: ['Não', 'Leve', 'Moderado', 'Intenso'] },
          { id: 'anamnese:perio.raspagem', label: 'Já fez raspagem / profilaxia periodontal', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.raspagem.data', label: 'Última raspagem', type: 'date', showIf: 'anamnese:perio.raspagem', showIfValue: 'Sim' },
          { id: 'anamnese:perio.familiar', label: 'Histórico familiar de doença periodontal', type: 'choice', options: SIM_NAO_NAOSEI },
          { id: 'anamnese:perio.bolsas', label: 'Espaços ou bolsas entre dentes e gengiva', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:perio.bolsas.local', label: 'Onde', type: 'text', placeholder: 'Local', showIf: 'anamnese:perio.bolsas', showIfValue: 'Sim' },
          { id: 'anamnese:perio.dor.mastigar', label: 'Dor ao mastigar alimentos duros', type: 'choice', options: SIM_NAO },
        ],
      },
      {
        id: 'perio.periograma',
        label: 'Periograma resumido por sextantes',
        kind: 'periograma',
        note: 'Profundidade de sondagem em milímetros. Use a média ou o valor mais representativo do sextante.',
        fields: [
          {
            id: 'anamnese:perio.diagnostico',
            label: 'Resumo / diagnóstico periodontal',
            type: 'textarea',
            placeholder: 'Ex: Periodontite generalizada estágio II, grau B. Gengivite localizada no sextante 1.',
            wide: true,
          },
        ],
      },
    ],
  },
  {
    id: 'endodontia',
    label: 'Endodontia',
    intro: 'Canal e polpa dentária.',
    sections: [
      {
        id: 'endo.geral',
        label: 'Avaliação endodôntica',
        fields: [
          { id: 'anamnese:endo.dor.espontanea', label: 'Dor espontânea (sem estímulo)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.dor.espontanea.desc', label: 'Característica da dor', type: 'text', placeholder: 'contínua / pulsátil / aguda', showIf: 'anamnese:endo.dor.espontanea', showIfValue: 'Sim' },
          { id: 'anamnese:endo.dor.noite', label: 'Dor piora à noite ou ao deitar', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.dor.termica', label: 'Dor prolongada (mais de 30s) após frio ou calor', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.dor.morder', label: 'Dor ao morder ou pressionar um dente', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.dor.morder.dente', label: 'Qual dente', type: 'text', placeholder: 'ex: 46', showIf: 'anamnese:endo.dor.morder', showIfValue: 'Sim' },
          { id: 'anamnese:endo.abscesso', label: 'Abscesso ou fístula na gengiva', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.abscesso.local', label: 'Local', type: 'text', placeholder: 'Local', showIf: 'anamnese:endo.abscesso', showIfValue: 'Sim' },
          { id: 'anamnese:endo.abscesso.data', label: 'Data', type: 'date', showIf: 'anamnese:endo.abscesso', showIfValue: 'Sim' },
          { id: 'anamnese:endo.canal', label: 'Já fez tratamento de canal', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.canal.dentes', label: 'Quais dentes', type: 'text', placeholder: 'ex: 14, 26, 34', showIf: 'anamnese:endo.canal', showIfValue: 'Sim' },
          { id: 'anamnese:endo.canal.dor', label: 'Dentes com canal apresentam dor atual', type: 'choice', options: SIM_NAO, showIf: 'anamnese:endo.canal', showIfValue: 'Sim' },
          { id: 'anamnese:endo.canal.dor.dentes', label: 'Quais dentes doem', type: 'text', placeholder: 'Quais', showIf: 'anamnese:endo.canal.dor', showIfValue: 'Sim' },
          { id: 'anamnese:endo.caries', label: 'Cáries profundas não tratadas', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.caries.dentes', label: 'Quais dentes', type: 'text', placeholder: 'Quais', showIf: 'anamnese:endo.caries', showIfValue: 'Sim' },
          { id: 'anamnese:endo.trauma', label: 'Histórico de trauma dental', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:endo.trauma.data', label: 'Data do trauma', type: 'date', showIf: 'anamnese:endo.trauma', showIfValue: 'Sim' },
          { id: 'anamnese:endo.trauma.dentes', label: 'Dentes envolvidos', type: 'text', placeholder: 'Quais', showIf: 'anamnese:endo.trauma', showIfValue: 'Sim' },
          { id: 'anamnese:endo.elevado', label: 'Sensação de dente elevado ou deslocado', type: 'choice', options: SIM_NAO },
        ],
      },
    ],
  },
  {
    id: 'cirurgia',
    label: 'Cirurgia',
    intro: 'Cirurgia e traumatologia bucomaxilofacial.',
    sections: [
      {
        id: 'cir.geral',
        label: 'Avaliação cirúrgica',
        fields: [
          { id: 'anamnese:cir.previa', label: 'Já fez cirurgia bucal (extração, biópsia, enxerto)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.previa.quais', label: 'Quais cirurgias', type: 'text', placeholder: 'Quais', showIf: 'anamnese:cir.previa', showIfValue: 'Sim' },
          { id: 'anamnese:cir.siso', label: 'Sisos (terceiros molares) não nascidos', type: 'choice', options: SIM_NAO_NAOSEI },
          { id: 'anamnese:cir.siso.rx', label: 'Já fez radiografia dos sisos', type: 'choice', options: SIM_NAO, showIf: 'anamnese:cir.siso', showIfValue: 'Sim' },
          { id: 'anamnese:cir.dor.posterior', label: 'Dor ou inchaço na região posterior da boca', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.dor.posterior.lado', label: 'Lado', type: 'choice', options: LADO, showIf: 'anamnese:cir.dor.posterior', showIfValue: 'Sim' },
          { id: 'anamnese:cir.lesao', label: 'Diagnóstico de cisto, tumor ou lesão na boca ou face', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.lesao.qual', label: 'Qual lesão', type: 'text', placeholder: 'Qual', showIf: 'anamnese:cir.lesao', showIfValue: 'Sim' },
          { id: 'anamnese:cir.fratura', label: 'Fratura facial (maxila, mandíbula, zigomático)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.fratura.data', label: 'Data da fratura', type: 'date', showIf: 'anamnese:cir.fratura', showIfValue: 'Sim' },
          { id: 'anamnese:cir.atm', label: 'Dor ou estalos na ATM', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.atm.lado', label: 'Lado', type: 'choice', options: LADO, showIf: 'anamnese:cir.atm', showIfValue: 'Sim' },
          { id: 'anamnese:cir.abertura', label: 'Limitação para abrir a boca', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.abertura.medida', label: 'Abertura aproximada', type: 'text', placeholder: 'cm ou dedos', showIf: 'anamnese:cir.abertura', showIfValue: 'Sim' },
          { id: 'anamnese:cir.cicatrizacao', label: 'Feridas ou manchas sem cicatrizar há mais de 15 dias', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.cicatrizacao.local', label: 'Local', type: 'text', placeholder: 'Local', showIf: 'anamnese:cir.cicatrizacao', showIfValue: 'Sim' },
          { id: 'anamnese:cir.parestesia', label: 'Dormência ou formigamento na face ou lábios', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.parestesia.local', label: 'Onde', type: 'text', placeholder: 'Local', showIf: 'anamnese:cir.parestesia', showIfValue: 'Sim' },
          { id: 'anamnese:cir.bisfosfonatos', label: 'Uso de bisfosfonatos (osteoporose ou oncológico)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:cir.bisfosfonatos.qual', label: 'Qual medicamento', type: 'text', placeholder: 'Qual', showIf: 'anamnese:cir.bisfosfonatos', showIfValue: 'Sim' },
        ],
      },
    ],
  },
  {
    id: 'dtm',
    label: 'DTM',
    intro: 'Disfunção temporomandibular e dor orofacial.',
    sections: [
      {
        id: 'dtm.geral',
        label: 'Avaliação de DTM',
        fields: [
          { id: 'anamnese:dtm.dor', label: 'Dor na face, têmpora, mandíbula ou pescoço', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.dor.local', label: 'Local da dor', type: 'text', placeholder: 'Local', showIf: 'anamnese:dtm.dor', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.dor.funcao', label: 'Dor piora ao mastigar, falar ou bocejar', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.estalo', label: 'Mandíbula estala, clica ou travou', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.estalo.desc', label: 'Descrição', type: 'text', placeholder: 'Descreva', showIf: 'anamnese:dtm.estalo', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.abertura', label: 'Limitação ou desvio na abertura da boca', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.abertura.medida', label: 'Abertura', type: 'text', placeholder: 'cm', showIf: 'anamnese:dtm.abertura', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.abertura.desvio', label: 'Desvio para', type: 'choice', options: ['Direito', 'Esquerdo'], showIf: 'anamnese:dtm.abertura', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.ouvido', label: 'Zumbido, tontura ou ouvido tampado', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.ouvido.lado', label: 'Lado', type: 'choice', options: LADO, showIf: 'anamnese:dtm.ouvido', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.cefaleia', label: 'Dores de cabeça frequentes, principalmente ao acordar', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.cefaleia.freq', label: 'Frequência', type: 'text', placeholder: 'ex: 3x/semana', showIf: 'anamnese:dtm.cefaleia', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.bruxismo', label: 'Range ou aperta os dentes (bruxismo)', type: 'choice', options: ['Diurno', 'Noturno', 'Ambos', 'Não', 'Não sei'] },
          { id: 'anamnese:dtm.fadiga', label: 'Acorda com dor ou fadiga na face', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.placa', label: 'Já usou placa miorrelaxante ou tratou DTM', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:dtm.placa.qual', label: 'Qual tratamento', type: 'text', placeholder: 'Qual', showIf: 'anamnese:dtm.placa', showIfValue: 'Sim' },
          { id: 'anamnese:dtm.estresse', label: 'Relação das dores com estresse ou ansiedade', type: 'choice', options: SIM_NAO_NAOSEI, wide: true },
        ],
      },
    ],
  },
  {
    id: 'ortodontia',
    label: 'Ortodontia',
    intro: 'Ortodontia e ortopedia facial.',
    sections: [
      {
        id: 'orto.geral',
        label: 'Avaliação ortodôntica',
        fields: [
          { id: 'anamnese:orto.apinhamento', label: 'Dentes tortos, apinhados ou com espaços excessivos', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.apinhamento.desc', label: 'Descrição', type: 'text', placeholder: 'Descreva', showIf: 'anamnese:orto.apinhamento', showIfValue: 'Sim' },
          { id: 'anamnese:orto.aparelho', label: 'Já usou aparelho ortodôntico', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.aparelho.tempo', label: 'Há quanto tempo', type: 'text', placeholder: 'ex: 5 anos', showIf: 'anamnese:orto.aparelho', showIfValue: 'Sim' },
          { id: 'anamnese:orto.mastigacao', label: 'Dificuldade para mastigar por causa da mordida', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.respiracao', label: 'Respira mais pela boca do que pelo nariz', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.succao', label: 'Hábitos de sucção (dedo, chupeta, morder objetos)', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.succao.qual', label: 'Qual hábito', type: 'text', placeholder: 'Qual', showIf: 'anamnese:orto.succao', showIfValue: 'Sim' },
          { id: 'anamnese:orto.assimetria', label: 'Rosto assimétrico ou queixo deslocado', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.labios', label: 'Dificuldade para fechar os lábios naturalmente', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.ortognatica', label: 'Já foi orientado a fazer cirurgia ortognática', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:orto.ortognatica.motivo', label: 'Motivo', type: 'text', placeholder: 'Motivo', wide: true, showIf: 'anamnese:orto.ortognatica', showIfValue: 'Sim' },
        ],
      },
    ],
  },
  {
    id: 'implantes',
    label: 'Implantes',
    // Implante em paciente com osso ainda em crescimento não se coloca, então
    // as perguntas não cabem na consulta de uma criança.
    idadeMinima: 18,
    intro: 'Implantodontia e reabilitação oral.',
    sections: [
      {
        id: 'impl.geral',
        label: 'Avaliação reabilitadora',
        fields: [
          { id: 'anamnese:impl.perdidos', label: 'Dentes perdidos sem reposição', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:impl.perdidos.qtd', label: 'Quantos', type: 'number', placeholder: 'Quantidade', showIf: 'anamnese:impl.perdidos', showIfValue: 'Sim' },
          { id: 'anamnese:impl.protese', label: 'Usa prótese', type: 'choice', options: ['Total', 'Parcial', 'Coroa / Ponte', 'Não usa'] },
          { id: 'anamnese:impl.protese.adaptacao', label: 'Prótese causa dor ou lesão', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:impl.protese.adaptacao.desc', label: 'Descrição', type: 'text', placeholder: 'Descreva', showIf: 'anamnese:impl.protese.adaptacao', showIfValue: 'Sim' },
          { id: 'anamnese:impl.implantes', label: 'Já fez implantes', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:impl.implantes.qtd', label: 'Quantos', type: 'number', placeholder: 'Quantidade', showIf: 'anamnese:impl.implantes', showIfValue: 'Sim' },
          { id: 'anamnese:impl.implantes.data', label: 'Data', type: 'date', showIf: 'anamnese:impl.implantes', showIfValue: 'Sim' },
          { id: 'anamnese:impl.implantes.problema', label: 'Implantes com dor, mobilidade ou infecção', type: 'choice', options: SIM_NAO, showIf: 'anamnese:impl.implantes', showIfValue: 'Sim' },
          { id: 'anamnese:impl.mastigacao', label: 'Dificuldade para mastigar ou saborear alimentos', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:impl.interesse', label: 'Interesse em reabilitar com implantes ou próteses', type: 'choice', options: ['Sim', 'Não', 'Em dúvida'], wide: true },
        ],
      },
    ],
  },
  {
    id: 'pediatria',
    label: 'Pediatria',
    idadeMaxima: 12,
    intro: 'Preencher apenas para pacientes com menos de 12 anos ou em acompanhamento infantil.',
    sections: [
      {
        id: 'ped.geral',
        label: 'Odontopediatria',
        fields: [
          { id: 'anamnese:ped.dentista', label: 'Já foi ao dentista antes', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:ped.dentista.idade', label: 'Idade na primeira consulta', type: 'text', placeholder: 'meses ou anos', showIf: 'anamnese:ped.dentista', showIfValue: 'Sim' },
          { id: 'anamnese:ped.aleitamento', label: 'Aleitamento materno até qual idade', type: 'text', placeholder: 'meses' },
          { id: 'anamnese:ped.mamadeira', label: 'Uso de mamadeira ou chupeta', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:ped.mamadeira.idade', label: 'Até qual idade', type: 'text', placeholder: 'idade', showIf: 'anamnese:ped.mamadeira', showIfValue: 'Sim' },
          { id: 'anamnese:ped.escovacao', label: 'Escovação supervisionada por adulto', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:ped.medo', label: 'Medo ou dor ao escovar ou ir ao dentista', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:ped.manchas', label: 'Manchas brancas ou cáries visíveis', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:ped.bruxismo', label: 'Range os dentes durante o sono', type: 'choice', options: SIM_NAO },
        ],
      },
    ],
  },
  {
    id: 'avaliacao',
    label: 'Avaliação & Exames',
    sections: [
      {
        id: 'av.autoavaliacao',
        label: 'Autoavaliação da saúde bucal',
        fields: [
          { id: 'anamnese:av.saude', label: 'Como classifica a própria saúde bucal', type: 'choice', options: ['Excelente', 'Boa', 'Regular', 'Ruim', 'Péssima'], wide: true },
          { id: 'anamnese:av.autoestima', label: 'O problema bucal afeta autoestima ou vida social', type: 'choice', options: ['Sim', 'Não', 'Um pouco'] },
          { id: 'anamnese:av.sorrir', label: 'Evita sorrir ou falar em público por causa dos dentes', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:av.dor.sono', label: 'Dor ou desconforto que interfere no sono ou trabalho', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:av.dor.sono.freq', label: 'Frequência', type: 'text', placeholder: 'ex: toda noite', showIf: 'anamnese:av.dor.sono', showIfValue: 'Sim' },
        ],
      },
      {
        id: 'av.exames',
        label: 'Exames complementares e radiográficos',
        fields: [
          { id: 'anamnese:av.checkup', label: 'Data do último check-up', type: 'date' },
          { id: 'anamnese:av.rx', label: 'Radiografias disponíveis', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:av.rx.data', label: 'Data das radiografias', type: 'date', showIf: 'anamnese:av.rx', showIfValue: 'Sim' },
          { id: 'anamnese:av.tomografia', label: 'Tomografia de face ou ATM', type: 'choice', options: SIM_NAO },
          { id: 'anamnese:av.lab', label: 'Exames laboratoriais recentes', type: 'choice', options: SIM_NAO },
          {
            id: 'anamnese:av.lab.quais',
            label: 'Quais exames',
            type: 'text',
            placeholder: 'Ex: hemograma completo, coagulograma, vitamina D',
            wide: true,
            showIf: 'anamnese:av.lab',
            showIfValue: 'Sim',
          },
          { id: 'anamnese:av.lab.data', label: 'Data dos exames', type: 'date', showIf: 'anamnese:av.lab', showIfValue: 'Sim' },
          { id: 'anamnese:av.lab.hemograma', label: 'Hemograma', type: 'text', placeholder: 'valor', showIf: 'anamnese:av.lab', showIfValue: 'Sim' },
          { id: 'anamnese:av.lab.glicemia', label: 'Glicemia', type: 'text', placeholder: 'mg/dL', showIf: 'anamnese:av.lab', showIfValue: 'Sim' },
          { id: 'anamnese:av.lab.plaquetas', label: 'Plaquetas', type: 'text', placeholder: 'valor', showIf: 'anamnese:av.lab', showIfValue: 'Sim' },
          { id: 'anamnese:av.lab.inr', label: 'INR / TAP', type: 'text', placeholder: 'valor', showIf: 'anamnese:av.lab', showIfValue: 'Sim' },
        ],
      },
      {
        id: 'av.diagnostico',
        label: 'Hipótese diagnóstica preliminar',
        note: 'Impressões diagnósticas iniciais com base na anamnese e nos exames.',
        fields: [
          {
            id: 'anamnese:av.diagnostico.texto',
            label: 'Hipótese diagnóstica',
            type: 'textarea',
            placeholder:
              'Ex: Suspeita de lesão cariosa profunda no dente 46 com comprometimento pulpar. Periodontite generalizada estágio II. DTM com estalos bilaterais e bruxismo noturno.',
            wide: true,
          },
        ],
      },
      {
        id: 'av.conduta',
        label: 'Conduta planejada / Encaminhamentos',
        fields: [
          { id: 'anamnese:av.conduta.perio', label: 'Periodontia', type: 'check' },
          { id: 'anamnese:av.conduta.endo', label: 'Endodontia', type: 'check' },
          { id: 'anamnese:av.conduta.cirurgia', label: 'Cirurgia / Traumatologia', type: 'check' },
          { id: 'anamnese:av.conduta.dtm', label: 'DTM / Dor orofacial', type: 'check' },
          { id: 'anamnese:av.conduta.orto', label: 'Ortodontia', type: 'check' },
          { id: 'anamnese:av.conduta.implante', label: 'Implantodontia / Reabilitação', type: 'check' },
          { id: 'anamnese:av.conduta.pediatria', label: 'Odontopediatria', type: 'check' },
          { id: 'anamnese:av.conduta.clinica', label: 'Clínica geral (dentística restauradora)', type: 'check' },
          { id: 'anamnese:av.conduta.outro', label: 'Outro encaminhamento', type: 'text', placeholder: 'Especificar', wide: true },
          { id: 'anamnese:av.conduta.obs', label: 'Observações sobre a conduta', type: 'textarea', placeholder: 'Detalhes do plano de tratamento', wide: true },
        ],
      },
      {
        id: 'av.assinatura',
        label: 'Responsável técnico',
        fields: [
          { id: 'anamnese:av.cd.nome', label: 'Cirurgião-dentista', type: 'text', placeholder: 'Nome do profissional' },
          { id: 'anamnese:av.cd.cro', label: 'CRO', type: 'text', placeholder: 'Nº CRO' },
          { id: 'anamnese:av.cd.data', label: 'Data', type: 'date' },
        ],
      },
    ],
  },
]
