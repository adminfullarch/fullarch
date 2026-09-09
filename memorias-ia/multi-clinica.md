# Isolamento por clinica (multi-tenant)

- **Data:** 2026-09-09
- **Escopo:** RLS de todas as tabelas, Storage e cadastro de usuarios
- **Status:** vigente

## Contexto

O produto sera vendido para varias clinicas. Ate esta mudanca, toda politica
RLS dizia apenas `auth.role() = 'authenticated'`, e o app expunha cadastro
publico via `supabase.auth.signUp` sem restricao.

Somadas, as duas coisas significavam que **qualquer pessoa podia criar uma
conta em `fullarch.vercel.app` e ler, editar e apagar todos os prontuarios**.
Confirmar o e-mail nao era obstaculo, porque o visitante e dono da propria
caixa de entrada. Nenhuma conta indevida chegou a ser criada: no momento da
correcao existiam apenas os dois usuarios legitimos, ambos de 5 de setembro.

## Decisao

O pertencimento a uma clinica passa a ser a base de todo acesso. Isso atende ao
modelo de negocio e resolve a exposicao como efeito colateral: com isolamento,
**o cadastro publico deixa de ser risco e vira autoatendimento** — quem se
inscreve cai numa clinica propria e vazia, e testa o produto sem alcancar dado
de ninguem.

### A clinica mora so em `patients`

`clinic_id` existe apenas em `patients`. As demais tabelas herdam pelo vinculo
com o paciente. Foi decisao consciente nao repetir `clinic_id` em cada tabela:
uma copia desatualizada numa tabela filha seria exatamente o vazamento entre
clinicas que se quer evitar. `treatment_sessions` e o unico caso indireto, pois
liga por `treatment_id`, e tem funcao propria.

### Helpers SECURITY DEFINER, no schema `private`

`minhas_clinicas()`, `meus_pacientes()` e `meus_tratamentos()` sao
`SECURITY DEFINER` **de proposito**. As politicas precisam consultar
`clinic_members` e `patients` sem disparar a RLS dessas mesmas tabelas — sem
isso haveria recursao infinita. Todas tem `search_path` fixado.

Elas vivem no schema **`private`**, e nao em `public`. Na primeira versao
ficaram em `public`, e o PostgREST as expos como endpoints em
`/rest/v1/rpc/<nome>` — os advisors saltaram de 1 para 11 avisos. Nao vazavam
dados (filtram por `auth.uid()`, nulo sem sessao; testado chamando como `anon`,
que recebeu zero em todas), mas eram superficie de API desnecessaria.

**Revogar `EXECUTE` nao resolveria**: as expressoes das politicas RLS sao
avaliadas com os privilegios de quem faz a consulta, entao revogar quebraria o
acesso legitimo. Mover para um schema que o PostgREST nao expoe e o caminho
correto. Corrigido em `0007` e `0008`.

**As politicas do Storage precisam de migration separada.** Aplicar as
politicas de `storage.objects` na mesma transacao que as das tabelas disputa
lock com o servico de storage e gera deadlock — aconteceu, e a transacao
inteira voltou atras. Por isso `0008` existe.

### Triggers

`criar_clinica_ao_cadastrar` em `auth.users` cria uma clinica e torna o novo
usuario `owner` dela. Aceita `clinic_name` em `raw_user_meta_data`; sem isso,
usa "Minha clinica".

`definir_clinica_paciente` em `patients` preenche `clinic_id` a partir de quem
esta autenticado. Por isso **o app nao precisou mudar** para criar pacientes:
`createPatient` continua inserindo sem saber de clinica.

## Validacao

Testado no banco real simulando sessoes autenticadas via
`set_config('request.jwt.claims', ...)` e `set local role authenticated`.

- **Estranho** (conta autenticada sem clinica): 0 pacientes, 0 tratamentos,
  0 eventos de timeline, 0 respostas de anamnese, 0 agendamentos, 0 clinicas.
  Reexecutado apos a mudanca para o schema `private`, com o mesmo resultado.
- **Membro legitimo** (diogodeolliveira): 2 pacientes, 1 tratamento, 8 eventos,
  1 resposta, 1 agendamento, 1 condicao de dente, 1 clinica, 2 colegas.
- **Cadastro novo**, testado dentro de transacao desfeita por excecao: clinica
  criada automaticamente com o nome vindo dos metadados, usuario vinculado como
  owner, e **0 pacientes visiveis nela**. Rollback confirmado depois.
- Backfill: 1 clinica "Fullarch", 2 membros, 2 pacientes, nenhum orfao.
- `npm run build` aprovado.

## Pendencias e riscos

- **Nao ha convite de colegas.** Um segundo usuario da mesma clinica so entra
  por insercao manual em `clinic_members`. Enquanto isso nao existir, cada
  cadastro novo e uma clinica separada, mesmo que seja a mesma equipe.
- `definir_clinica_do_paciente` usa `limit 1`. Se um usuario pertencer a mais de
  uma clinica, o paciente cai numa delas de forma arbitraria. Hoje ninguem esta
  em duas clinicas.
- A tela de cadastro nao pergunta o nome da clinica, entao toda conta nova
  nasce como "Minha clinica". Passar `clinic_name` em `options.data` no
  `signUp` resolveria. **`Login.tsx` esta sob responsabilidade do Copilot**,
  entao a mudanca nao foi feita aqui para nao conflitar.
- Nao ha nocao de plano, assinatura ou cobranca — isolamento e o alicerce, nao
  o produto vendavel completo.
- Os papeis em `clinic_members` (`owner`, `member`) existem mas nenhuma
  politica os diferencia ainda: todo membro tem acesso total dentro da clinica.
- Os dois pacientes cadastrados ("teste" e "Rayssa") sao **ficticios**,
  confirmado pelo usuario em 2026-09-09. Nao ha dado real de paciente no banco,
  entao o cadastro aberto para experimentacao nao expoe ninguem.
