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

## MISS-2026-09-09-003 — Tirar os helpers do schema exposto

- Criada por: Claude Code
- Responsavel: Claude Code
- Status: concluida
- Data: 2026-09-09
- Objetivo: corrigir efeito colateral da MISS-002. As cinco funcoes auxiliares
  ficaram no schema `public` e o PostgREST as expos como RPC, levando os
  advisors de 1 para 11 avisos.
- Arquivos envolvidos: `supabase/migrations/0007_helpers_privados.sql`,
  `supabase/migrations/0008_helpers_privados_storage.sql`.
- Validacao esperada: advisors de volta a 1 aviso; isolamento preservado nas
  duas direcoes; `npm run build` aprovado.
- Resultado: **confirmado.** Advisors voltaram a 1 aviso, restando apenas a
  protecao contra senhas vazadas, que depende do painel. Estranho autenticado
  ve 0 em todas as tabelas; membro legitimo ve 2 pacientes, 1 tratamento,
  8 eventos, 1 agendamento, 1 clinica e 2 colegas. Build aprovado.
  Antes da correcao, foi verificado que as funcoes expostas nao vazavam dados:
  chamadas como `anon`, retornaram zero em todas.
- Proxima acao: nenhuma. Ficou registrado que politicas de `storage.objects`
  precisam de migration separada das politicas de tabelas, sob pena de deadlock
  com o servico de storage.

## MISS-2026-09-09-004 — Convite de colegas para a mesma clinica

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: concluida (falta apenas a rota, ver MISS-005)
- Data: 2026-09-09
- Objetivo: permitir que uma clinica tenha mais de uma pessoa. Antes disso,
  cada cadastro novo virava uma clinica separada, mesmo sendo a mesma equipe.
- Mecanismo escolhido: **e-mail pre-autorizado**, nao link com token. O dono
  libera o endereco; quem se cadastrar com ele entra na clinica que convidou.
  Dispensa SMTP, Edge Function, token e tela de aceite, e reaproveita o trigger
  de cadastro ja existente. Avisar a pessoa e por fora.
- Arquivos: `supabase/migrations/0009_convite_de_colegas.sql`,
  `src/api/team.ts`, `src/components/AjustesView.tsx`,
  `src/types/database.types.ts`.
- Resultado: **validado no banco real**, em transacao desfeita por excecao.
  Convidado entrou na clinica existente com papel `member`, enxergando os
  2 pacientes dela; convite marcado como aceito; quem se cadastrou sem convite
  caiu em clinica separada; total de clinicas subiu de 1 para 2, so a do
  estranho. O casamento de e-mail ignora maiusculas (convite gravado como
  `Colega@Exemplo.Invalido`, cadastro feito com `colega@exemplo.invalido`).
  `npm run build` aprovado, 99 modulos.
- Proxima acao: MISS-005, abaixo.

## MISS-2026-09-09-005 — Rotear a tela de Ajustes

- Criada por: Claude Code
- Responsavel: **GitHub Copilot**
- Status: aguardando
- Data: 2026-09-09
- Objetivo: ligar a rota da tela de Ajustes, onde vive a gestao de equipe.
  O componente esta pronto e testado; falta apenas renderiza-lo.
- Contexto: `App.tsx` e sua frente de trabalho, e nao quis editar para nao
  repetir o atropelo do commit `a4100a4`.
- O que fazer, em `src/App.tsx`:
  1. `import { AjustesView } from './components/AjustesView'`
  2. antes do bloco de fallback que hoje mostra "Este modulo ainda segue como
     stub", acrescentar: `{view === 'ajustes' && <AjustesView />}`
  3. incluir `'ajustes'` na condicao desse fallback, para ele parar de
     aparecer junto.
- Validacao esperada: clicar em Ajustes na barra lateral abre a tela de equipe
  com a clinica, os membros e o formulario de convite; `npm run build`
  aprovado.
- Resultado: a preencher.
- Proxima acao: ao concluir, avisar em `copilot-status.md`.
