-- Impede duas consultas sobrepostas na mesma clinica.
--
-- Ate aqui a checagem vivia so no navegador, em checkAppointmentConflict. Ela
-- consulta, decide e insere em dois passos: duas telas abertas ao mesmo tempo
-- passam pela consulta antes de qualquer uma inserir, e as duas gravam. Um
-- gatilho que fizesse a mesma consulta teria o mesmo furo, porque em READ
-- COMMITTED nenhuma das transacoes enxerga a linha ainda nao confirmada da
-- outra.
--
-- A unica construcao que resolve isso de verdade e uma exclusion constraint:
-- o proprio indice serializa as duas insercoes e recusa a segunda.

create extension if not exists btree_gist with schema extensions;

-- A clinica de uma consulta hoje so existe pelo caminho do paciente, e uma
-- exclusion constraint nao atravessa tabelas. Por isso a coluna e copiada
-- aqui — e mantida por gatilho, nunca preenchida pela aplicacao.
alter table public.appointments
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;

update public.appointments a
   set clinic_id = p.clinic_id
  from public.patients p
 where p.id = a.patient_id
   and a.clinic_id is distinct from p.clinic_id;

create or replace function private.definir_clinica_da_consulta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.clinic_id into new.clinic_id
    from public.patients p
   where p.id = new.patient_id;

  if new.clinic_id is null then
    raise exception 'Paciente % nao pertence a nenhuma clinica.', new.patient_id;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_define_clinica on public.appointments;
create trigger appointments_define_clinica
  before insert or update of patient_id on public.appointments
  for each row execute function private.definir_clinica_da_consulta();

alter table public.appointments alter column clinic_id set not null;

-- Somar um intervalo a timestamptz e STABLE, nao IMMUTABLE — o resultado pode
-- depender do fuso quando o intervalo tem dias ou meses. Indice exige
-- IMMUTABLE, entao a janela vira uma funcao propria. Com intervalo de minutos
-- ela e de fato imutavel, e a declaracao nao esta mentindo.
--
-- A duracao de 60 minutos espelha APPOINTMENT_SLOT_MINUTES, em
-- src/api/appointments.ts, e a grade de horarios da Agenda. Mudar la exige
-- mudar aqui.
create or replace function private.janela_da_consulta(inicio timestamptz)
returns tstzrange
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.tstzrange(inicio, inicio + pg_catalog.interval '60 minutes')
$$;

-- Consultas canceladas ficam de fora: o horario volta a ficar livre.
alter table public.appointments
  add constraint appointments_sem_sobreposicao
  exclude using gist (
    clinic_id with =,
    private.janela_da_consulta(scheduled_at) with &&
  ) where (status <> 'cancelada');
