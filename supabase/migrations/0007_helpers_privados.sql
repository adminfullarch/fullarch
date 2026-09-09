-- As funcoes auxiliares da migration 0006 ficaram no schema `public`, que o
-- PostgREST expoe: viraram endpoints em /rest/v1/rpc/<nome>. Elas nao vazam
-- dados (filtram por auth.uid(), que e nulo sem sessao), mas nao deveriam
-- estar na superficie da API.
--
-- Revogar EXECUTE nao serve: as expressoes das politicas RLS sao avaliadas com
-- os privilegios de quem faz a consulta, entao isso quebraria o acesso. A
-- saida e mover as funcoes para um schema que o PostgREST nao expoe.
--
-- Parte 1: schema, funcoes, triggers e politicas das tabelas. As politicas do
-- Storage ficam em 0008, porque mexer nelas na mesma transacao disputava lock
-- com o servico de storage e gerou deadlock. Mantenha os dois arquivos
-- separados por esse motivo.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.minhas_clinicas()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select clinic_id from clinic_members where user_id = auth.uid()
$$;

create or replace function private.meus_pacientes()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select p.id from patients p
  where p.clinic_id in (select clinic_id from clinic_members where user_id = auth.uid())
$$;

create or replace function private.meus_tratamentos()
returns setof uuid language sql stable security definer
set search_path = public, pg_temp as $$
  select t.id from treatments t
  where t.patient_id in (
    select p.id from patients p
    where p.clinic_id in (select clinic_id from clinic_members where user_id = auth.uid())
  )
$$;

create or replace function private.criar_clinica_do_novo_usuario()
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

create or replace function private.definir_clinica_do_paciente()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.clinic_id is null then
    select clinic_id into new.clinic_id
      from clinic_members where user_id = auth.uid() limit 1;
  end if;
  return new;
end $$;

grant execute on function private.minhas_clinicas(), private.meus_pacientes(),
  private.meus_tratamentos() to anon, authenticated;

drop trigger if exists criar_clinica_ao_cadastrar on auth.users;
create trigger criar_clinica_ao_cadastrar
  after insert on auth.users
  for each row execute function private.criar_clinica_do_novo_usuario();

drop trigger if exists definir_clinica_paciente on patients;
create trigger definir_clinica_paciente
  before insert on patients
  for each row execute function private.definir_clinica_do_paciente();

drop policy if exists "membros_veem_a_clinica" on clinics;
create policy "membros_veem_a_clinica" on clinics
  for select using (id in (select private.minhas_clinicas()));

drop policy if exists "membros_veem_os_colegas" on clinic_members;
create policy "membros_veem_os_colegas" on clinic_members
  for select using (clinic_id in (select private.minhas_clinicas()));

drop policy if exists "acesso_por_clinica" on patients;
create policy "acesso_por_clinica" on patients
  for all using (clinic_id in (select private.minhas_clinicas()))
  with check (clinic_id in (select private.minhas_clinicas()));

drop policy if exists "acesso_por_clinica" on treatments;
create policy "acesso_por_clinica" on treatments
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on timeline_events;
create policy "acesso_por_clinica" on timeline_events
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on tooth_conditions;
create policy "acesso_por_clinica" on tooth_conditions
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on questionnaire_responses;
create policy "acesso_por_clinica" on questionnaire_responses
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on appointments;
create policy "acesso_por_clinica" on appointments
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on files;
create policy "acesso_por_clinica" on files
  for all using (patient_id in (select private.meus_pacientes()))
  with check (patient_id in (select private.meus_pacientes()));

drop policy if exists "acesso_por_clinica" on treatment_sessions;
create policy "acesso_por_clinica" on treatment_sessions
  for all using (treatment_id in (select private.meus_tratamentos()))
  with check (treatment_id in (select private.meus_tratamentos()));
