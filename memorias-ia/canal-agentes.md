# Canal automatico entre agentes

- **Data:** 2026-09-09
- **Status:** vigente

## Objetivo

Esta pasta funciona como canal compartilhado entre o GitHub Copilot e o Claude Code. As mensagens persistentes entre os agentes devem ser registradas em arquivos Markdown, para que o outro agente possa ler o contexto sem copiar a conversa manualmente.

## Arquivos do canal

- `fila-missoes.md`: missões aguardando leitura ou execução.
- `copilot-status.md`: ultima atualização publicada pelo GitHub Copilot.
- `claude-status.md`: ultima atualização publicada pelo Claude Code.
- `handoff-*.md`: passagens de trabalho específicas, quando necessário.

## Protocolo

1. O agente que criar uma missão registra uma entrada em `fila-missoes.md` com ID único, data, objetivo, arquivos envolvidos e status.
2. O agente responsável muda a missão para `em andamento` antes de editar qualquer arquivo.
3. O agente deve verificar se os arquivos estão parados. Em caso de conflito, mantém a missão bloqueada e registra o motivo.
4. Ao terminar, registra os comandos de validação, resultado, arquivos alterados e pendências.
5. O outro agente lê a atualização e não repete a tarefa já concluída.
6. Nunca registrar secrets, tokens, chaves privadas ou dados reais de pacientes.

## Limite da automacao

O canal compartilhado automatiza a troca de contexto por arquivos, mas não inicia o Claude Code por conta própria. Para execução realmente automática, o ambiente do Claude Code precisa configurar um watcher, hook ou tarefa que monitore `fila-missoes.md` e `copilot-status.md` e publique o resultado em `claude-status.md`.

Enquanto esse watcher não existir, cada agente deve abrir os arquivos do canal ao iniciar uma missão e após concluir uma tarefa relacionada.
