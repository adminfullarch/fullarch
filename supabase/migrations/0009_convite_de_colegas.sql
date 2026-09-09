-- Convite de colegas para a mesma clinica.
--
-- Sem envio de e-mail, SMTP ou token: o dono pre-autoriza um endereco, e quem
-- se cadastrar com ele entra na clinica que o convidou em vez de ganhar uma
-- propria. Aproveita o trigger de cadastro que ja existe.

create table if not exists clinic_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner','member')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);

-- Um convite pendente por e-mail em cada clinica.
create unique index if not exists clinic_invites_pendente_idx
  on clinic_invites (clinic_id, lower(email)) where accepted_at is null;
create index if not exists clinic_invites_email_idx
  on clinic_invites (lower(email)) where accepted_at is null;

-- O e-mail do colega e copiado para clinic_members. A alternativa seria uma
-- funcao SECURITY DEFINER lendo auth.users, mas isso recriaria justamente a
-- superficie de RPC que a migration 0007 removeu. Aqui a copia e segura: um
-- e-mail desatualizado e um incomodo visual, nao um vazamento — diferente do
-- clinic_id, que por isso nunca foi duplicado.
alter table clinic_members add column if not exists email text;

update clinic_members m
set email = u.email
from auth.users u
where u.id = m.user_id and m.email is null;

-- ---------- PAPEIS ----------
-- Ate aqui `owner` e `member` existiam sem significado. Convidar e remover
-- passam a ser exclusividade do dono.
create or replace function private.sou_dono(p_clinic uuid)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from clinic_members
    where clinic_id = p_clinic and user_id = auth.uid() and role = 'owner'
  )
$$;
grant execute on function private.sou_dono(uuid) to authenticated;

-- ---------- CADASTRO ----------
create or replace function private.criar_clinica_do_novo_usuario()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_clinic uuid;
  v_convite clinic_invites%rowtype;
begin
  select * into v_convite from clinic_invites
   where lower(email) = lower(new.email)
     and accepted_at is null
     and expires_at > now()
   order by created_at
   limit 1;

  if found then
    insert into clinic_members (clinic_id, user_id, role, email)
      values (v_convite.clinic_id, new.id, v_convite.role, new.email)
      on conflict (clinic_id, user_id) do nothing;
    update clinic_invites set accepted_at = now() where id = v_convite.id;
    return new;
  end if;

  insert into clinics (name)
    values (coalesce(nullif(new.raw_user_meta_data->>'clinic_name', ''), 'Minha clinica'))
    returning id into v_clinic;
  insert into clinic_members (clinic_id, user_id, role, email)
    values (v_clinic, new.id, 'owner', new.email);
  return new;
end $$;

-- Mantem a copia do e-mail em dia quando o usuario troca de endereco.
create or replace function private.sincronizar_email_do_membro()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  update clinic_members set email = new.email where user_id = new.id;
  return new;
end $$;

drop trigger if exists sincronizar_email_membro on auth.users;
create trigger sincronizar_email_membro
  after update of email on auth.users
  for each row execute function private.sincronizar_email_do_membro();

-- ---------- POLITICAS ----------
alter table clinic_invites enable row level security;

drop policy if exists "membros_veem_convites" on clinic_invites;
create policy "membros_veem_convites" on clinic_invites
  for select using (clinic_id in (select private.minhas_clinicas()));

drop policy if exists "dono_convida" on clinic_invites;
create policy "dono_convida" on clinic_invites
  for insert with check (private.sou_dono(clinic_id));

drop policy if exists "dono_revoga_convite" on clinic_invites;
create policy "dono_revoga_convite" on clinic_invites
  for delete using (private.sou_dono(clinic_id));

-- O dono pode remover colegas, menos a si mesmo: sem isso, uma clinica poderia
-- ficar sem nenhum dono e com pacientes inacessiveis.
drop policy if exists "dono_remove_colega" on clinic_members;
create policy "dono_remove_colega" on clinic_members
  for delete using (private.sou_dono(clinic_id) and user_id <> auth.uid());
