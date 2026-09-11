# Memorias das IAs

Esta pasta concentra o contexto persistente usado pelas IAs que trabalham no CRM odontologico.

## Estagio do projeto

O sistema esta **em desenvolvimento**, nao em producao. Ninguem o usa no dia a
dia: a dentista que aparece nos registros fez apenas testes de funcionalidade
para dar retorno ao dono do projeto, e os dois pacientes cadastrados sao
ficticios.

Isso importa ao avaliar risco. Perda de dado, exposicao e ausencia de backup
sao assuntos a resolver **antes do lancamento**, e nao incidentes em curso. Da
mesma forma, tela com dado de maquete e etapa normal de construcao, nao defeito
a corrigir com urgencia.

Quando o sistema entrar em uso real, com paciente de verdade, este paragrafo
deve ser atualizado — e a partir dai o peso dessas questoes muda.

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
- [`acessos-e-deploy.md`](acessos-e-deploy.md): onde ficam GitHub, Vercel e Supabase, e como publicar. Sem credenciais.
- [`anamnese.md`](anamnese.md): aba de anamnese multiespecialidade no prontuario.
- [`armazenamento-de-arquivos.md`](armazenamento-de-arquivos.md): decisao de usar Supabase Storage no lugar do Google Drive.
- [`multi-clinica.md`](multi-clinica.md): isolamento por clinica na RLS, base do modelo de venda do software.
- [`referencias-de-mercado.md`](referencias-de-mercado.md): produtos concorrentes olhados como referencia de posicionamento.
- [`_modelo-memoria.md`](_modelo-memoria.md): modelo para novas memorias.

## Organizacao sugerida

- `arquitetura.md`: limites entre componentes, hooks, APIs e Supabase.
- `regras-de-negocio.md`: comportamentos clinicos e operacionais confirmados.
- `pendencias.md`: trabalho aberto, riscos e proximos passos.
- `decisoes/AAAA-MM-DD-nome.md`: decisoes que alteram a direcao tecnica.
