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
- Arquivos envolvidos: `supabase/migrations/20260909182046_limpeza_seguranca_funcoes_orfas.sql`.
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
- Arquivos envolvidos: `supabase/migrations/20260909184029_multi_clinica_isolamento.sql`,
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
- Arquivos envolvidos: `supabase/migrations/20260909192705_helpers_em_schema_privado_parte1.sql`,
  `supabase/migrations/20260909192718_helpers_em_schema_privado_parte2_storage.sql`.
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
- Arquivos: `supabase/migrations/20260909194305_convite_de_colegas.sql`,
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
- Status: feita localmente, **nao commitada**
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
- Resultado: as tres alteracoes foram feitas corretamente em `src/App.tsx`
  (import na linha 11, `{view === 'ajustes' && <AjustesView />}` na 82, e
  `view !== 'ajustes'` acrescentado ao fallback na 84). `npm run build`
  aprovado, bundle de 458 KB para 463 KB.
- **Pendencia:** as mudancas estao apenas no working tree. `origin/main` ainda
  esta em `b0cb284`, entao **a tela nao esta publicada**. Falta commitar
  `src/App.tsx` e `memorias-ia/copilot-status.md` e dar push.

---

# FRENTE PAUSADA: equipe e times

Em 2026-09-09 o usuario decidiu **deixar a frente de equipe/times para depois**.
Nenhuma missao nova deve ser aberta nela ate que ele retome.

## O que ja existe e esta em producao

Atencao: pausada nao quer dizer inexistente. As migrations **ja foram aplicadas
no banco de producao** e nao foram revertidas:

- `0006` a `0008`: isolamento por clinica. **Isto e a base de seguranca do
  sistema e nao deve ser desfeito** — sem ele, qualquer cadastro publico volta
  a enxergar todos os prontuarios.
- `0009`: tabela `clinic_invites`, coluna `email` em `clinic_members`, funcao
  `private.sou_dono`, trigger que faz o convidado cair na clinica certa, e as
  politicas que restringem convite e remocao ao dono.

No codigo, ja commitados e no `main`: `src/api/team.ts`,
`src/components/AjustesView.tsx` e os tipos correspondentes.

## O que falta para a frente ficar completa

1. Commitar e publicar a rota de Ajustes (MISS-005 acima). Enquanto isso nao
   acontecer, a tela existe mas e inalcancavel pelo menu.
2. Exercitar o fluxo de convite ponta a ponta pelo navegador. Ele foi validado
   no banco, em transacao desfeita, mas nunca por uma pessoa de verdade.
3. A tela de cadastro nao pergunta o nome da clinica: toda conta nova nasce
   como "Minha clinica". Basta passar `clinic_name` em `options.data` no
   `signUp` — o trigger ja le esse campo. `Login.tsx` e do Copilot.
4. Nao ha plano, assinatura nem cobranca.
5. `private.definir_clinica_do_paciente` usa `limit 1`: se alguem pertencer a
   duas clinicas, o paciente cai numa delas de forma arbitraria.

---

## MISS-2026-09-10-006 — Sanear o historico de migrations

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: concluida
- Data: 2026-09-10
- Objetivo: tornar o banco reproduzivel a partir dos arquivos, o que estava
  quebrado em duas frentes: o schema inicial nao constava como aplicado, e os
  nomes dos arquivos nao correspondiam ao que o banco registrava.
- O que foi feito:
  1. Os nove arquivos foram renomeados com `git mv` para a convencao do CLI,
     `<timestamp>_<nome>.sql`, usando **as mesmas versoes ja gravadas** em
     `schema_migrations`.
  2. `0001_init.sql` virou `20260831085900_init.sql`, com o carimbo da data em
     que foi escrito, e a linha correspondente foi inserida no registro. O SQL
     **nao foi executado**: as tabelas ja existiam desde agosto.
  3. As referencias aos nomes antigos nas memorias foram atualizadas.
- Impacto em dados: **nenhum**. A unica escrita no banco foi um `insert` de uma
  linha em `supabase_migrations.schema_migrations`, tabela de controle.
- Validacao: as duas listas conferidas lado a lado, 9 arquivos e 9 registros,
  identicas linha por linha. Contagens antes e depois: 2 pacientes,
  2 tratamentos, 14 eventos de timeline, 2 respostas de questionario,
  1 arquivo, 1 objeto no bucket, 1 clinica, 2 membros, 2 usuarios.
- Proxima acao: com o historico integro, ja e possivel clonar o banco para um
  ambiente de teste — o que permitiria a dentista testar sem tocar no banco
  onde amanha havera paciente real.

---

## MISS-2026-09-10-008 — Definir o proposito da tela de CRM

- Criada por: Claude Code, a partir de observacao do usuario
- Responsavel: em aberto
- Status: **em espera — aguardando decisao do produto**
- Data: 2026-09-10
- Problema: ligada aos dados reais, a tela de CRM ficou muito parecida com a de
  Inicio. Das quatro metricas do topo, tres tem equivalente direto no Inicio
  (pacientes, consultas hoje, pendencias), e os dois paineis repetem, com outro
  recorte, o que o Inicio ja mostra. Enquanto os numeros eram de mockup a
  duplicidade nao aparecia; com dados reais, aparece.
- Causa: a tela veio de um layout, sem uma pergunta definida para responder.
- Direcao provavel: o Inicio responde "como esta hoje". Para nao repeti-lo, o
  CRM precisa responder algo em outra escala de tempo — retencao e conversao,
  em semanas e meses. Duas leituras possiveis, uma delas viavel sem mexer no
  banco (pacientes sem consulta ha meses, orcamentos parados, aprovados sem
  agendamento) e outra que exigiria uma tabela de leads.
- Decisao: **o usuario ainda nao definiu o que quer nessa tela.** Nao construir
  nada aqui por conta propria; a tela atual fica como esta ate haver uma
  definicao vinda da rotina da clinica.
