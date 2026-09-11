# Anamnese odontologica multiespecialidade

- **Data:** 2026-09-09
- **Escopo:** aba Anamnese no prontuario do paciente
- **Status:** vigente

## Contexto

O dentista precisava registrar a anamnese completa dentro do prontuario. O
ponto de partida foi um esboco standalone em `anamnese.html`, com 9 abas por
especialidade, escrito com identidade visual propria (azul `#0b3b5c`, Segoe
UI, emojis, cantos de 20px) que conflitava com o design system do app.

O esboco tambem duplicava o cabecalho do paciente que o perfil ja exibe, e
seus campos `(  ) Sim  (  ) Nao` eram texto decorativo, sem gravar resposta.

## Decisao ou regra

A anamnese vive como uma aba do perfil do paciente, entre Tratamentos e
Odontograma, e nao como item proprio da sidebar. Assim reaproveita o
cabecalho, o nome e os dados do paciente que o perfil ja carrega.

As perguntas sao **dados, nao JSX**. Ficam em `src/data/anamnese.ts`, no mesmo
padrao de `src/data/odontograma.ts`, e o componente apenas renderiza. Alterar
o questionario significa editar esse arquivo, nunca o componente.

O `id` de cada campo e a chave gravada no banco: **renomear um id descarta as
respostas ja salvas**. Todos usam o prefixo `anamnese:` para nao colidir com o
mini questionario do odontograma, que grava na mesma tabela.

Campos de detalhe usam `showIf` e so aparecem quando a pergunta que os motiva
e respondida, em vez de ficarem sempre visiveis como no esboco.

## Salvar e editar, em vez de autosave

A pedido do usuario em 2026-09-09, a aba deixou de gravar a cada clique e
passou a ter **rascunho com botao Salvar**. O dentista preenche a vontade e,
ao terminar, clica em Salvar: os campos ficam **protegidos** e so voltam a ser
editaveis pelo botao Editar. Evita alterar um prontuario fechado por um clique
sem querer.

Ganho colateral: antes cada caixa marcada era uma requisicao ao Supabase, em um
formulario de quase 200 campos. Agora e uma gravacao por sessao de
preenchimento, enviando apenas os campos que mudaram.

Uma anamnese em branco abre destravada, pronta para preencher; uma que ja tem
respostas abre protegida.

**Risco assumido:** sem autosave, fechar a aba no meio do preenchimento perde o
que nao foi salvo. Ha um aviso do navegador (`beforeunload`) quando existem
alteracoes pendentes, e o cabecalho mostra quantas sao. Se isso se mostrar
insuficiente na pratica, o proximo passo seria guardar o rascunho em
`localStorage`.

O texto digitado continua subindo para o rascunho no blur, e nao a cada tecla:
com quase 200 campos, propagar por tecla faria a aba inteira renderizar de novo
durante a digitacao.

## Pediatria escondida para adultos

O grupo Pediatria deixa de ser oferecido para pacientes acima de 12 anos — o
mesmo limite que o texto de introducao da secao ja declarava. O limite e
**dado, nao codigo**: o campo `idadeMaxima` no grupo, em `src/data/anamnese.ts`.
Qualquer outro grupo pode ganhar um limite da mesma forma.

Tres regras evitam que isso vire perda de informacao:

- Um grupo escondido que **ja tenha resposta** continua aparecendo. Se alguem
  preencheu Pediatria e depois a idade do paciente mudou, o que foi preenchido
  nao some da vista.
- Paciente **sem idade cadastrada** ve todos os grupos, porque esconder por uma
  informacao que nao existe seria um palpite.
- A navegacao sempre mostra quantas secoes foram escondidas e oferece exibi-las.

Nada e apagado do banco em nenhuma dessas situacoes.

## Impressao

Um botao Imprimir chama `window.print()` sobre um bloco proprio, que fica no
DOM mas nao aparece na tela. A decisao que define esse bloco: ele imprime
**apenas o que foi respondido**, e todas as especialidades de uma vez. Levar as
quase 200 perguntas em branco ao papel daria varias folhas em que praticamente
nada se le.

O documento traz cabecalho com a marca, nome e idade do paciente, data de
emissao, e linha de assinatura com CRO ao final. Se houver alteracao nao salva
no momento da impressao, o cabecalho diz isso — o papel nao finge ser o
prontuario gravado.

No CSS, a impressao esconde o resto da pagina por `visibility`, e nao por
`display`: mexer em `display` brigaria com a arvore que o React controla. As
secoes usam `break-inside: avoid` para uma especialidade nao comecar no pe de
uma folha e continuar na outra.

## Fatos confirmados

- 9 especialidades: Medico, Periodontia, Endodontia, Cirurgia, DTM,
  Ortodontia, Implantes, Pediatria e Avaliacao & Exames.
- Persistencia em `questionnaire_responses`, que ganhou a coluna `value text`
  (nullable). Checkbox continua sendo linha com marcacao; os demais tipos
  gravam o valor em `value`.
- O upsert depende da constraint `UNIQUE (patient_id, item)`, que ja existia
  desde `20260831085900_init.sql`.
- As funcoes antigas `listQuestionnaireItems` e `toggleQuestionnaireItem`
  seguem intactas, entao o odontograma nao quebrou.
- Salvamento automatico: checkbox e escolha gravam no clique; texto grava no
  blur, para nao chamar o Supabase a cada tecla.
- Do esboco sobraram apenas sexo, peso, altura e profissao como dados
  clinicos; o resto do cabecalho foi descartado por duplicacao.

## Evidencias

- [`src/data/anamnese.ts`](../src/data/anamnese.ts): estrutura das perguntas.
- [`src/components/AnamneseTab.tsx`](../src/components/AnamneseTab.tsx): render e autosave.
- [`src/api/questionnaire.ts`](../src/api/questionnaire.ts): leitura e gravacao com valor.
- [`supabase/migrations/20260909165417_anamnese_questionnaire_value.sql`](../supabase/migrations/20260909165417_anamnese_questionnaire_value.sql): coluna `value`.
- `src/styles.css`, secao `/* ---------- ANAMNESE ---------- */`.
- [`anamnese.html`](../anamnese.html): esboco original, mantido como referencia.

## Pendencias e riscos

- O historico de migrations do Supabase esta incompleto: `list_migrations`
  voltou vazio antes desta mudanca, ou seja, `20260831085900_init.sql` foi aplicado a mao
  e o banco nao sabe que ele rodou. Recriar o banco do zero pelas migrations
  nao funcionaria ainda.
- A aba Pediatria nao e escondida automaticamente para pacientes adultos; o
  esboco pedia "ate 12 anos", hoje isso e apenas um aviso em texto.
- Nao ha exportacao ou impressao da anamnese; o esboco tinha um botao de
  imprimir que nao foi transportado.

## Ambiente de publicacao

O projeto correto no Vercel e `vercel.com/fullarch/fullarch`, publicado em
**https://fullarch.vercel.app**.

Existia um projeto duplicado servindo `fullarch-puce.vercel.app`. O sufixo
`-puce` e o que o Vercel acrescenta quando o nome ja esta ocupado, ou seja,
aquele era o duplicado. Ele continua servindo um bundle antigo
(`index-GkTyFz-7.js`) e nao recebe mais deploys, entao **nao use esse endereco
para validar mudancas**. Recomendado apagar o projeto duplicado.

## Validacao

- Comando executado: `npm run build`
- Resultado: sucesso, 97 modulos transformados.
- Migration `anamnese_questionnaire_value` aplicada ao projeto BD_Odonto
  (`cccukpzwbdaycdwmvdyp`) via MCP do Supabase. Coluna `value` confirmada por
  consulta a `information_schema.columns`.
- Upsert testado no banco real: insercao seguida de sobrescrita resultou em
  uma unica linha; a linha de teste foi removida em seguida.
- Publicacao confirmada em `https://fullarch.vercel.app`: o bundle servido
  (`index-DIlbquyV.js`) tem o mesmo hash do build local e contem a aba
  Anamnese.

## Validado em producao

Em 2026-09-10 uma dentista testou a aba, como parte de uma rodada de testes de
funcionalidade para dar retorno, e o usuario confirmou que esta funcionando
corretamente. O sistema segue em desenvolvimento, sem uso real. Evidencia no banco: a resposta
`anamnese:med.cardio.hipertensao` = `sim` gravada as 00:44 UTC, pelo fluxo de
preencher, clicar em Salvar e a tela ficar protegida.

A dentista tambem elogiou a distribuicao dos dados por especialidade, e pediu
um campo livre para descrever quais exames laboratoriais foram feitos — o que
originou `anamnese:av.lab.quais`.

## Ainda nao exercitado

- So um checkbox foi gravado. **Campos de texto, escolha e o periograma ainda
  nao passaram pela interface em producao** — em 2026-09-10 nao havia nenhuma
  resposta com valor diferente de `sim`. O caminho de escrita desses tipos foi
  provado em SQL, mas nao pela tela.
- O botao Editar, que destrava uma anamnese ja salva, nao foi observado em uso.
- Comportamento em telas estreitas nao foi testado em dispositivo real.
