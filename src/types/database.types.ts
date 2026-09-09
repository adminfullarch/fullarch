// Tipos manuais refletindo supabase/migrations/0001_init.sql.
// Quando o projeto Supabase estiver criado de verdade, troque este arquivo
// pelo gerado automaticamente:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.types.ts

export type PaymentStatus = 'pago' | 'parcial' | 'pendente'
export type TreatmentStatus =
  | 'aguardando_aprovacao'
  | 'nao_agendado'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
export type TreatmentOrigin = 'manual' | 'odontograma'
export type TimelineKind = 'Consulta' | 'Tratamento' | 'Imagem' | 'Documento' | 'Anotação'
export type ConditionType = 'atencao' | 'tratado' | 'ausente'
export type FileKind = 'image' | 'document'
export type AppointmentStatus = 'agendada' | 'concluida' | 'cancelada'
export type FinancialStatus = 'em_dia' | 'parcial' | 'atrasado'

export interface Patient {
  id: string
  /** Clinica dona do registro. Preenchida por trigger a partir de quem esta autenticado. */
  clinic_id: string
  name: string
  age: number | null
  phone: string | null
  plan: string
  financial_status: FinancialStatus
  financial_note: string | null
  created_at: string
  updated_at: string
}

export interface Treatment {
  id: string
  patient_id: string
  name: string
  tooth_ref: string
  origin: TreatmentOrigin
  professional: string | null
  cost: number | null
  payment_status: PaymentStatus
  progress_pct: number
  status: TreatmentStatus
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentSession {
  id: string
  treatment_id: string
  session_date: string
  note: string
  progress_pct: number | null
  created_at: string
}

export interface TimelineEvent {
  id: string
  patient_id: string
  event_date: string
  title: string
  description: string | null
  kind: TimelineKind
  muted: boolean
  created_at: string
}

export interface ToothCondition {
  id: string
  patient_id: string
  tooth_number: number
  condition_name: string
  condition_type: ConditionType
  created_at: string
}

export interface QuestionnaireResponse {
  id: string
  patient_id: string
  item: string
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  scheduled_at: string
  reason: string
  status: AppointmentStatus
  created_at: string
}

export interface PatientFile {
  id: string
  patient_id: string
  treatment_id: string | null
  kind: FileKind
  label: string
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

type Table<Row> = {
  Row: Row & Record<string, unknown>
  Insert: Partial<Row> & Record<string, unknown>
  Update: Partial<Row> & Record<string, unknown>
  Relationships: []
}

// Formato mínimo compatível com o client tipado do supabase-js.
// (Se depois você gerar os tipos oficiais, este arquivo é substituído
// e o client em src/lib/supabase.ts continua funcionando sem mudanças.)
export interface Database {
  public: {
    Tables: {
      patients: Table<Patient>
      treatments: Table<Treatment>
      treatment_sessions: Table<TreatmentSession>
      timeline_events: Table<TimelineEvent>
      tooth_conditions: Table<ToothCondition>
      questionnaire_responses: Table<QuestionnaireResponse>
      appointments: Table<Appointment>
      files: Table<PatientFile>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
