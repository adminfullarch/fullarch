-- ============================================================
-- CRM Odontológico — Missão 03 — Schema inicial (single-tenant)
-- ============================================================
-- Modelo: uma clínica só por enquanto. Qualquer usuário autenticado
-- (equipe da clínica) tem acesso total via Supabase Auth.
-- Multi-tenant (isolamento por clínica) fica para uma migration futura —
-- basta adicionar clinic_id + ajustar as policies quando for a hora.

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type payment_status as enum ('pago','parcial','pendente');
create type treatment_status as enum ('aguardando_aprovacao','nao_agendado','em_andamento','concluido','cancelado');
create type treatment_origin as enum ('manual','odontograma');
create type timeline_kind as enum ('Consulta','Tratamento','Imagem','Documento','Anotação');
create type condition_type as enum ('atencao','tratado','ausente');
create type file_kind as enum ('image','document');
create type appointment_status as enum ('agendada','concluida','cancelada');
create type financial_status as enum ('em_dia','parcial','atrasado');

-- ---------- PACIENTES ----------
create table patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  phone text,
  plan text not null default 'Particular',
  financial_status financial_status not null default 'em_dia',
  financial_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- TRATAMENTOS ----------
create table treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  tooth_ref text not null default 'Geral',
  origin treatment_origin not null default 'manual',
  professional text,
  cost numeric(10,2),
  payment_status payment_status not null default 'pendente',
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  status treatment_status not null default 'nao_agendado',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table treatment_sessions (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  session_date date not null,
  note text not null,
  progress_pct int,
  created_at timestamptz not null default now()
);

-- ---------- TIMELINE (o elemento central do produto) ----------
create table timeline_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  event_date date not null default current_date,
  title text not null,
  description text,
  kind timeline_kind not null,
  muted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ODONTOGRAMA ----------
create table tooth_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  tooth_number int not null check (tooth_number between 11 and 48),
  condition_name text not null,
  condition_type condition_type not null,
  created_at timestamptz not null default now(),
  unique (patient_id, tooth_number, condition_name)
);

-- ---------- MINI QUESTIONÁRIO ----------
create table questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  item text not null,
  created_at timestamptz not null default now(),
  unique (patient_id, item)
);

-- ---------- AGENDA ----------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  scheduled_at timestamptz not null,
  reason text not null default 'Consulta',
  status appointment_status not null default 'agendada',
  created_at timestamptz not null default now()
);

-- ---------- ARQUIVOS (metadado — o binário vive no Google Drive) ----------
create table files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  treatment_id uuid references treatments(id) on delete set null,
  kind file_kind not null,
  label text not null,
  google_drive_file_id text not null,
  google_drive_url text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- updated_at automático ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_patients_updated_at before update on patients
  for each row execute function set_updated_at();
create trigger trg_treatments_updated_at before update on treatments
  for each row execute function set_updated_at();

-- ---------- ÍNDICES ----------
create index idx_treatments_patient on treatments(patient_id);
create index idx_treatment_sessions_treatment on treatment_sessions(treatment_id);
create index idx_timeline_patient_date on timeline_events(patient_id, event_date desc);
create index idx_tooth_conditions_patient on tooth_conditions(patient_id);
create index idx_appointments_patient on appointments(patient_id);
create index idx_appointments_scheduled on appointments(scheduled_at);
create index idx_files_patient on files(patient_id);

-- ============================================================
-- RLS — single-tenant: qualquer usuário autenticado da clínica
-- tem acesso total. Quando virar multi-tenant, trocar essas
-- policies por checagem de clinic_id.
-- ============================================================
alter table patients enable row level security;
alter table treatments enable row level security;
alter table treatment_sessions enable row level security;
alter table timeline_events enable row level security;
alter table tooth_conditions enable row level security;
alter table questionnaire_responses enable row level security;
alter table appointments enable row level security;
alter table files enable row level security;

create policy "staff_full_access" on patients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on treatments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on treatment_sessions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on timeline_events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on tooth_conditions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on questionnaire_responses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "staff_full_access" on appointments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- files: leitura para qualquer autenticado; escrita normalmente acontece
-- via Edge Function (service role, que ignora RLS), mas deixamos liberado
-- para autenticados também, caso o app precise editar/apagar metadados direto.
create policy "staff_full_access" on files
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
