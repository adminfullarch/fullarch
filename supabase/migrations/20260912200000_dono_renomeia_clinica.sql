-- O dono pode renomear a propria clinica.
--
-- Ate a tela de cadastro perguntar o nome, toda conta nasceu como "Minha
-- clinica". Sem esta politica nao havia como corrigir: `clinics` so tinha
-- politica de leitura, e um update do cliente passava em silencio afetando
-- zero linhas — o PostgREST nao devolve erro quando a RLS filtra tudo.
--
-- So o nome e alteravel. O `id` nao muda porque tudo aponta para ele, e
-- `created_at` e historico.

drop policy if exists "dono_renomeia_clinica" on public.clinics;
create policy "dono_renomeia_clinica" on public.clinics
  for update
  using (private.sou_dono(id))
  with check (private.sou_dono(id));

-- Nome vazio deixaria a clinica sem identificacao na tela e nos documentos.
alter table public.clinics
  drop constraint if exists clinics_nome_nao_vazio;
alter table public.clinics
  add constraint clinics_nome_nao_vazio check (length(trim(name)) between 1 and 80);
