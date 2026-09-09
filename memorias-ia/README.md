# Memorias das IAs

Esta pasta concentra o contexto persistente usado pelas IAs que trabalham no CRM odontologico.

## Como usar

- Crie um arquivo Markdown por assunto ou decisao relevante.
- Use nomes estaveis e descritivos, por exemplo `arquitetura.md`, `regras-de-negocio.md` ou `pendencias.md`.
- Registre fatos verificaveis, decisoes, restricoes, comandos de validacao e pendencias.
- Atualize a memoria quando uma decisao mudar; nao mantenha instrucoes contraditorias.
- Nao inclua senhas, tokens, chaves privadas, dados de pacientes ou qualquer segredo.
- Use `_modelo-memoria.md` como ponto de partida.

## Indice atual

- [`avaliacao-inicial.md`](avaliacao-inicial.md): avaliacao tecnica inicial do estado do projeto.
- [`colaboracao-agentes.md`](colaboracao-agentes.md): responsabilidades do GitHub Copilot e do Claude Code.
- [`anamnese.md`](anamnese.md): aba de anamnese multiespecialidade no prontuario.
- [`armazenamento-de-arquivos.md`](armazenamento-de-arquivos.md): decisao de usar Supabase Storage no lugar do Google Drive.
- [`_modelo-memoria.md`](_modelo-memoria.md): modelo para novas memorias.

## Organizacao sugerida

- `arquitetura.md`: limites entre componentes, hooks, APIs e Supabase.
- `regras-de-negocio.md`: comportamentos clinicos e operacionais confirmados.
- `pendencias.md`: trabalho aberto, riscos e proximos passos.
- `decisoes/AAAA-MM-DD-nome.md`: decisoes que alteram a direcao tecnica.
