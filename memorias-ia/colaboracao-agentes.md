# Colaboracao entre agentes

- **Data:** 2026-09-09
- **Status:** vigente

## Responsabilidades

O GitHub Copilot atua como agente de acompanhamento do projeto, em trabalho conjunto com o Claude Code.

Sua responsabilidade principal e manter a equipe atualizada sobre as missoes do projeto, incluindo:

- status atual de cada missao;
- entregas concluidas;
- tarefas em andamento;
- pendencias, riscos e bloqueios;
- proximos passos recomendados;
- validacoes executadas e seus resultados.

O Claude Code pode executar implementacoes e outras tarefas do projeto em colaboracao com este agente. As atualizacoes devem ser registradas nas memorias da pasta `memorias-ia` quando representarem uma decisao, mudanca de escopo, progresso relevante ou pendencia duradoura.

## Regra de comunicacao

Toda atualizacao de missao deve ser objetiva, baseada no estado real dos arquivos e comandos verificados. Nao considerar uma tarefa concluida sem indicar a evidencia ou a validacao correspondente.

## Regra de integracao entre agentes

- Nunca duplicar assuntos, tarefas, memorias ou implementacoes que ja existam.
- Nunca editar arquivos que estejam sendo trabalhados por outro agente ou pela equipe.
- Editar somente arquivos parados, sem trabalho ativo identificado, ou arquivos explicitamente liberados pelo responsavel.
- Antes de editar, verificar o estado atual do arquivo e procurar sinais de trabalho em andamento.
- Quando houver conflito ou duvida sobre quem esta trabalhando em um arquivo, nao editar; registrar a pendencia e comunicar a equipe.
