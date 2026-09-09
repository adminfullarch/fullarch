-- Migra o armazenamento de arquivos do Google Drive para o Supabase Storage.
-- A tabela files estava vazia, entao nao ha dados a converter.

-- Bucket privado: nada e servido por URL publica; o acesso e sempre por
-- URL assinada com prazo de expiracao, adequado a dado de saude.
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

-- Somente usuarios autenticados da clinica leem, enviam e apagam.
drop policy if exists "staff_read_patient_files" on storage.objects;
create policy "staff_read_patient_files" on storage.objects
  for select using (bucket_id = 'patient-files' and auth.role() = 'authenticated');

drop policy if exists "staff_insert_patient_files" on storage.objects;
create policy "staff_insert_patient_files" on storage.objects
  for insert with check (bucket_id = 'patient-files' and auth.role() = 'authenticated');

drop policy if exists "staff_delete_patient_files" on storage.objects;
create policy "staff_delete_patient_files" on storage.objects
  for delete using (bucket_id = 'patient-files' and auth.role() = 'authenticated');

-- files passa a guardar o caminho no bucket no lugar das referencias do Drive.
alter table files add column if not exists storage_path text;
alter table files drop column if exists google_drive_file_id;
alter table files drop column if exists google_drive_url;
alter table files alter column storage_path set not null;
