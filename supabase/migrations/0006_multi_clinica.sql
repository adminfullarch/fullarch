-- Isolamento por clinica.
--
-- Ate aqui, toda politica RLS dizia apenas "auth.role() = 'authenticated'":
-- qualquer conta criada via cadastro publico enxergava todos os prontuarios.
-- Como o produto sera vendido para varias clinicas, o pertencimento a uma
-- clinica passa a ser a base de todo acesso.
--
-- A clinica e gravada apenas em `patients`. As demais tabelas herdam pelo
-- vinculo com o paciente, em vez de repetir `clinic_id` em cada uma: uma copia
-- desatualizada em tabela filha seria justamente um vazamento entre clinicas.

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists clinic_members (
  clinic_id uuid not null references clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index if not exists clinic_members_user_idx on clinic_members(user_id);

alter table patients add column if not exists clinic_id uuid references clinics(id) on delete cascade;
create index if not exists patients_clinic_idx on patients(clinic_id);

-- ---------- BACKFILL ----------
-- Os dois usuarios existentes e os pacientes ja cadastrados pertencem a mesma
-- clinica, criada aqui uma unica vez.
do $$
declare v_clinic uuid;
begin
  if not exists (select 1 from clinics) then
    insert into clinics (name) values ('Fullarch') returning id into v_clinic;
    insert into clinic_members (clinic_id, user_id, role)
      select v_clinic, id, 'owner' from auth.users;
    update patients set clinic_id = v_clinic where clinic_id is null;
  end if;
end $$;

alter table patients alter column clinic_id set not null;

-- ---------- HELPERS ----------
-- SECURITY DEFINER de proposito: as politicas precisam consultar
-- clinic_members e patients sem disparar a RLS dessas mesmas tabelas, o que
-- causaria recursao infinita.

create or replace function public.minhas_clinicas()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select clinic_id from clinic_members where user_id = auth.uid()
$$;

create or replace function public.meus_pacientes()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select p.id from patients p
  where p.clinic_id in (select clinic_id from clinic_members where user_id = auth.uid())
$$;

create or replace function public.meus_tratamentos()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select t.id from treatments t
  where t.patient_id in (
    select p.id from patients p
    where p.clinic_id in (select clinic_id from clinic_members where user_id = auth.uid())
  )
$$;

-- ---------- CADASTRO ----------
-- Cada novo cadastro nasce dono da propria clinica, vazia. E isso que torna o
-- cadastro publico seguro: quem se inscreve para testar nao alcanca dado de
-- ninguem.
create or replace function public.criar_clinica_do_novo_usuario()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_clinic uuid;
begin
  insert into clinics (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'clinic_name', ''), 'Minha clinica'))
    returning id into v_clinic;
  insert into clinic_members (clinic_id, user_id, role) values (v_clinic, new.id, 'owner');
  return new;
end $$;

drop trigger if exists criar_clinica_ao_cadastrar on auth.users;
create trigger criar_clinica_ao_cadastrar
  after insert on auth.users
  for each row execute function public.criar_clinica_do_novo_usuario();

-- O app nao precisa saber de clinica ao criar paciente: o vinculo e resolvido
-- aqui, a partir de quem esta autenticado.
create or replace function public.definir_clinica_do_paciente()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.clinic_id is null then
    select clinic_id into new.clinic_id
      from clinic_members where user_id = auth.uid() limit 1;
  end if;
  return new;
end $$;

drop trigger if exists definir_clinica_paciente on patients;
create trigger definir_clinica_paciente
  before insert on patients
  for each row execute function public.definir_clinica_do_paciente();

-- ---------- POLITICAS ----------
alter table clinics enable row level security;
alter table clinic_members enable row level security;

drop policy if exists "membros_veem_a_clinica" on clinics;
create policy "membros_veem_a_clinica" on clinics
  for select using (id in (select minhas_clinicas()));

drop policy if exists "membros_veem_os_colegas" on clinic_members;
create policy "membros_veem_os_colegas" on clinic_members
  for select using (clinic_id in (select minhas_clinicas()));

drop policy if exists "staff_full_access" on patients;
create policy "acesso_por_clinica" on patients
  for all using (clinic_id in (select minhas_clinicas()))
  with check (clinic_id in (select minhas_clinicas()));

drop policy if exists "staff_full_access" on treatments;
create policy "acesso_por_clinica" on treatments
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on timeline_events;
create policy "acesso_por_clinica" on timeline_events
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on tooth_conditions;
create policy "acesso_por_clinica" on tooth_conditions
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on questionnaire_responses;
create policy "acesso_por_clinica" on questionnaire_responses
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on appointments;
create policy "acesso_por_clinica" on appointments
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on files;
create policy "acesso_por_clinica" on files
  for all using (patient_id in (select meus_pacientes()))
  with check (patient_id in (select meus_pacientes()));

drop policy if exists "staff_full_access" on treatment_sessions;
create policy "acesso_por_clinica" on treatment_sessions
  for all using (treatment_id in (select meus_tratamentos()))
  with check (treatment_id in (select meus_tratamentos()));

-- ---------- STORAGE ----------
-- O caminho do objeto comeca pelo patientId, entao o recorte por clinica sai
-- do mesmo vinculo. Comparamos como texto para nao converter para uuid um
-- nome de pasta arbitrario, o que lancaria erro.
drop policy if exists "staff_read_patient_files" on storage.objects;
create policy "arquivos_da_clinica_leitura" on storage.objects
  for select using (
    bucket_id = 'patient-files'
    and exists (select 1 from meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );

drop policy if exists "staff_insert_patient_files" on storage.objects;
create policy "arquivos_da_clinica_insercao" on storage.objects
  for insert with check (
    bucket_id = 'patient-files'
    and exists (select 1 from meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );

drop policy if exists "staff_delete_patient_files" on storage.objects;
create policy "arquivos_da_clinica_exclusao" on storage.objects
  for delete using (
    bucket_id = 'patient-files'
    and exists (select 1 from meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );
