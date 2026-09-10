-- Parte 2 de 0007: politicas do Storage apontando para as funcoes em `private`,
-- e remocao das funcoes que ficaram no schema exposto.
--
-- Separado de proposito: aplicar isto junto com 0007 na mesma transacao
-- disputava lock com o servico de storage e gerou deadlock.

drop policy if exists "arquivos_da_clinica_leitura" on storage.objects;
create policy "arquivos_da_clinica_leitura" on storage.objects
  for select using (
    bucket_id = 'patient-files'
    and exists (select 1 from private.meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );

drop policy if exists "arquivos_da_clinica_insercao" on storage.objects;
create policy "arquivos_da_clinica_insercao" on storage.objects
  for insert with check (
    bucket_id = 'patient-files'
    and exists (select 1 from private.meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );

drop policy if exists "arquivos_da_clinica_exclusao" on storage.objects;
create policy "arquivos_da_clinica_exclusao" on storage.objects
  for delete using (
    bucket_id = 'patient-files'
    and exists (select 1 from private.meus_pacientes() mp where mp::text = (storage.foldername(name))[1])
  );

drop function if exists public.minhas_clinicas();
drop function if exists public.meus_pacientes();
drop function if exists public.meus_tratamentos();
drop function if exists public.criar_clinica_do_novo_usuario();
drop function if exists public.definir_clinica_do_paciente();
