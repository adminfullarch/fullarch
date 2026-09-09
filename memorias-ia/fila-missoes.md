# Fila de missoes

Formato de cada entrada:

```text
## MISS-AAAA-MM-DD-NNN — Titulo
- Criada por:
- Responsavel:
- Status: aguardando | em andamento | bloqueada | concluida
- Data:
- Objetivo:
- Arquivos envolvidos:
- Validacao esperada:
- Resultado:
- Proxima acao:
```

## MISS-2026-09-09-001 — Limpeza de seguranca do banco

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: concluida
- Data: 2026-09-09
- Objetivo: remover funcoes orfas expostas via RPC, corrigir `search_path` das
  que ficam, e ligar a protecao contra senhas vazadas. Origem: advisors de
  seguranca do Supabase apontaram 15 avisos.
- Arquivos envolvidos: `supabase/migrations/0005_limpeza_seguranca.sql`.
- Validacao esperada: `get_advisors` sem os avisos de SECURITY DEFINER
  executavel por `anon`; triggers em uso preservados; `npm run build` aprovado.
- Resultado: advisors de seguranca cairam de **15 avisos para 1**. Foram
  removidas 7 funcoes orfas (`login_usuario`, `registrar_usuario`,
  `set_user_id`, `criar_perfil_automatico` e seu trigger em `auth.users`,
  `update_updated_at`, `update_updated_at_column`, `validar_paciente`).
  `set_updated_at` foi mantida, por ser usada por dois triggers, com
  `search_path` fixado. Dados conferidos apos a mudanca: 2 usuarios em
  `auth.users`, 2 pacientes, 1 tratamento, e os dois triggers de `updated_at`
  seguem ativos. `npm run build` aprovado.
- Proxima acao: **pendente com o usuario** — ligar a protecao contra senhas
  vazadas em Authentication > Policies no painel do Supabase. E a unica
  configuracao restante e nao pode ser feita por SQL.

## MISS-2026-09-09-002 — Isolamento por clinica (multi-tenant)

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: concluida
- Data: 2026-09-09
- Prioridade: alta
- Objetivo: fazer o acesso depender do pertencimento a uma clinica, base do
  modelo de venda do software e correcao da exposicao dos prontuarios a
  qualquer conta criada pelo cadastro publico.
- Arquivos envolvidos: `supabase/migrations/0006_multi_clinica.sql`,
  `src/types/database.types.ts`.
- Validacao esperada: um usuario autenticado sem clinica nao enxerga nada; um
  membro legitimo continua enxergando tudo; cadastro novo nasce em clinica
  vazia; `npm run build` aprovado.
- Resultado: **tudo confirmado no banco real.** Estranho ve 0 em todas as
  tabelas; membro legitimo ve 2 pacientes, 1 tratamento, 8 eventos, 1 resposta
  de anamnese, 1 agendamento e 1 condicao de dente; cadastro novo recebe
  clinica propria com 0 pacientes, testado em transacao desfeita. Backfill:
  clinica "Fullarch" com 2 membros e 2 pacientes. Build aprovado.
- Proxima acao: criar convite de colegas para a mesma clinica. Hoje um segundo
  usuario da mesma equipe so entra por insercao manual em `clinic_members`, e
  cada cadastro novo vira uma clinica separada.
