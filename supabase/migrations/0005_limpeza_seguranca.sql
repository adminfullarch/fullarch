-- Limpeza das funcoes remanescentes de uma tentativa anterior de autenticacao
-- propria, paralela ao Supabase Auth. Nenhuma delas e usada pelo app, e as
-- tabelas que consultavam (public.usuarios, public.perfis) nao existem em
-- schema algum.
--
-- O problema nao era so codigo morto: sendo SECURITY DEFINER e vivendo no
-- schema public, elas ficavam chamaveis por qualquer visitante em
-- /rest/v1/rpc/<nome>, executando com os privilegios de quem as criou.
-- registrar_usuario, em especial, tentava criar usuario ja confirmado; hoje
-- falha porque auth.admin_create_user nao existe neste projeto, mas seria uma
-- porta de entrada se essa API voltasse a existir.

-- 1) Autenticacao propria abandonada.
drop function if exists public.login_usuario(text, text);
drop function if exists public.registrar_usuario(text, text, text);
drop function if exists public.set_user_id();

-- 2) Trigger que inseria em `perfis`, tabela que nunca existiu. Rodava a cada
--    cadastro sem fazer nada.
drop trigger if exists trigger_criar_perfil on auth.users;
drop function if exists public.criar_perfil_automatico();

-- 3) Duplicatas de set_updated_at, sem trigger algum apontando para elas.
drop function if exists public.update_updated_at();
drop function if exists public.update_updated_at_column();

-- 4) Validacao de paciente que nunca chegou a ser ligada a um trigger.
drop function if exists public.validar_paciente();

-- 5) set_updated_at fica: e usada por trg_patients_updated_at e
--    trg_treatments_updated_at. Fixar o search_path evita que um schema
--    malicioso no caminho de busca sequestre a resolucao dos nomes.
alter function public.set_updated_at() set search_path = public, pg_temp;
