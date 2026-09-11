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

---

## MISS-2026-09-11-009 — Recuperacao de senha

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: implementada — **falta configurar o envio de e-mail no Supabase**
- Data: 2026-09-11
- Problema: a tela de login oferecia apenas entrar ou criar usuario. Quem
  esquecesse a senha nao tinha saida senao criar outra conta — que, com o
  isolamento por clinica, nasceria numa clinica vazia, sem os pacientes da
  conta antiga.
- O que foi feito: fluxo padrao do Auth do Supabase, em `7371863`.
  - `resetPasswordForEmail` no link "Esqueci minha senha" da tela de login.
  - `RedefinirSenha.tsx` recebe a pessoa de volta e chama `updateUser`.
  - `lib/authRecovery.ts` le a marca `type=recovery` do fragmento da URL **no
    carregamento do modulo**, antes de o cliente do Supabase consumir e apagar
    esse fragmento. Sem isso o app veria so uma sessao valida e abriria direto
    no sistema, sem nunca oferecer a troca.
  - `App.tsx` checa a recuperacao **antes** da sessao, pelo mesmo motivo.
- Decisao de seguranca: a confirmacao do envio e a mesma para e-mail cadastrado
  ou nao. Dizer "esse e-mail nao existe" entregaria a lista de quem tem acesso
  a clinica a quem estivesse adivinhando.
- Pendencia que impede o uso real: o Supabase so envia e-mail pelo servico
  embutido, limitado a poucas mensagens por hora e destinado a teste. Antes de
  a clinica usar isso de verdade, configurar SMTP proprio em
  Authentication > Emails > SMTP Settings.
- A verificar tambem: `Authentication > URL Configuration` precisa ter
  `https://fullarch.vercel.app` como Site URL e nos Redirect URLs, senao o link
  do e-mail leva para o lugar errado.

---

## MISS-2026-09-11-010 — Corrigir ressalvas de integridade, segurança e operação

- Criada por: GitHub Copilot, a pedido do usuario
- Responsavel: GitHub Copilot na aplicacao; Claude Code no banco, Storage e
  configuracao do Supabase
- Status: aguardando
- Data: 2026-09-11
- Prioridade: alta
- Objetivo: transformar a auditoria atual em correcoes verificaveis antes de o
  sistema ser usado com uma base real maior, sem repetir a frente de CRM que
  continua aguardando decisao de produto.
- Arquivos e areas envolvidos:
  - Aplicacao: `src/api/patients.ts`, `src/api/appointments.ts`, fluxo de
    upload e telas relacionadas
  - Banco e Storage: politicas de `storage.objects`, consistencia entre
    cadastro e timeline, e garantia contra conflito de agenda
  - Supabase: protecao contra senhas vazadas, SMTP e URL Configuration
- Escopo da correcao:
  1. Fazer o cadastro de paciente tratar falha ao criar o evento da timeline,
     evitando cadastro parcialmente concluido.
  2. Garantir no banco ou em uma operacao atomica que duas sessoes nao criem
     consultas conflitantes; a checagem atual no cliente nao basta.
  3. Restringir leitura, envio e exclusao de arquivos ao pertencimento da
     clinica, mantendo o bucket privado.
  4. Adicionar limite de tamanho e validacao de tipo no upload.
  5. Remover ou reduzir logs de consultas que exibem dados de paciente no
     console do navegador.
  6. Configurar SMTP, URLs de redirecionamento e protecao contra senhas
     vazadas no projeto Supabase; testar recuperacao de senha em producao.
  7. Exercitar pelo navegador upload de documento, exclusao, tipo proibido,
     convite de colega e fluxo de recuperacao de senha.
- Fora desta missao: definir o novo proposito do CRM, implementar parcelas no
  Financeiro ou retomar a frente de equipe/times como produto. Esses assuntos
  permanecem pendentes separadamente.
- Validacao esperada: build aprovado; testes de erro confirmam que falhas nao
  deixam cadastro orfao; duas tentativas simultaneas de agenda nao geram
  conflito; usuario de outra clinica nao acessa arquivos; upload invalido e
  recusado; recuperacao e convite funcionam ponta a ponta; nenhum dado de
  paciente aparece em logs de producao.
- Resultado: ressalvas registradas; nenhuma correcao de codigo iniciada nesta
  missao.
- Proxima acao: Claude Code deve assumir banco, Storage e configuracao do
  Supabase; GitHub Copilot pode assumir `src/api/patients.ts` e
  `src/api/appointments.ts` somente quando esses arquivos estiverem parados.

---

## MISS-2026-09-11-011 — Ressalvas rapidas da auditoria MISS-010

- Criada por: Claude Code, a pedido do usuario
- Responsavel: Claude Code
- Status: concluida (itens rapidos); o restante da MISS-010 segue aberto
- Data: 2026-09-11
- Verificacao da MISS-010 antes de corrigir: **dois dos sete itens ja estavam
  feitos** e foram confirmados contra o banco, nao contra o relato.
  - Isolamento do Storage (item 3): as tres politicas de `storage.objects`
    filtram por `private.meus_pacientes()` e o bucket `patient-files` tem
    `public = false`. Feito na migration `20260909192718`.
  - Validacao de upload (item 4): `src/data/uploadRules.ts` no navegador, e no
    bucket `file_size_limit` de 25 MB com 13 tipos MIME permitidos. SVG e HTML
    ficam de fora de proposito.
- Corrigido agora:
  1. **Dados de paciente no console (item 5).** `src/api/appointments.ts`
     imprimia a linha inteira da consulta, com o nome do paciente, no console
     do navegador em producao, alem de dois outros logs de depuracao. Removidos.
  2. **Cadastro pela metade (item 1).** `createPatient` inseria o evento de
     timeline sem checar o erro. Agora, se a insercao falha, o paciente recem
     criado e apagado e o erro sobe. Sem transacao no PostgREST as duas
     insercoes sao independentes; desfazer e preferivel ao estado silencioso.
- **Conflito de agenda (item 2): confirmado e NAO corrigido.** As unicas
  restricoes em `appointments` sao a chave primaria e a estrangeira; a
  checagem vive so no cliente, entao duas telas abertas criam consultas
  sobrepostas. A solucao boa e uma *exclusion constraint*, e ela esbarra no
  multi-clinica: `appointments` nao tem `clinic_id`, a clinica vem pelo
  paciente. Impedir sobreposicao dentro de cada clinica exige desnormalizar a
  coluna ou usar um gatilho. Fica para decisao a parte.
- **Protecao contra senhas vazadas: adiada por decisao do usuario.** O recurso
  exige plano Pro do Supabase, e o usuario decidiu so contratar quando comecar
  a vender o produto. Deixa de ser pendencia aberta e passa a pre-requisito de
  lancamento. A mitigacao gratuita equivalente e aumentar o comprimento minimo
  de senha, hoje em 6 caracteres, em Authentication > Policies.
- Continua com o usuario: SMTP proprio e URL Configuration, sem os quais a
  recuperacao de senha nao funciona de verdade.
- Continua aberto: exercitar pelo navegador upload, exclusao, tipo proibido,
  convite de colega e recuperacao de senha (item 7 da MISS-010) — validado no
  banco, nunca por uma pessoa.
