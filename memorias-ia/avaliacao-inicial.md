# Avaliacao inicial do software

- **Data:** 2026-09-09
- **Status:** vigente, revisar durante a migracao
- **Projeto:** CRM odontologico

## Resumo

Aplicacao web em React 18 + TypeScript + Vite, com Supabase para autenticacao e persistencia e uma Edge Function para upload de arquivos ao Google Drive.

## Objetivo e usuario principal

O sistema e um CRM odontologico para centralizar pacientes, prontuarios, tratamentos, agenda, documentos e acompanhamento clinico em um unico lugar.

O usuario principal e o dentista, que utiliza o sistema para consultar o historico do paciente, registrar informacoes clinicas, acompanhar tratamentos, organizar agendamentos e acessar arquivos relacionados ao atendimento.

As decisoes de produto, linguagem e interface devem priorizar o fluxo de trabalho do dentista durante e entre os atendimentos. Outros membros da equipe da clinica podem ter acesso, mas nao sao o publico principal registrado nesta etapa.

## Pontos fortes

- Arquitetura em camadas reconhecivel: componentes, hooks, APIs e tipos.
- Fluxo vertical funcional documentado: login, pacientes, timeline, tratamentos, arquivos e upload.
- Uso de RLS e Supabase Auth como base de seguranca.
- Binarios enviados ao Google Drive por Edge Function; o banco guarda metadados.
- Build definido por `tsc -b && vite build`, favorecendo validacao automatizada.

## Estado atual

- Pacientes e perfil: fluxo principal implementado.
- Agenda e dashboard: telas existentes, com escopo parcial.
- Tratamentos: leitura implementada; criacao e sessoes ainda precisam de UI.
- Odontograma e mini questionario: schema preparado, componentes/API ainda pendentes conforme `README_MIGRACAO.md`.
- Arquivos e imagens: upload real depende de Supabase, Edge Function, Google Drive e secrets configurados.
- Multi-tenant: ainda nao implementado; o projeto esta documentado como single-tenant.

## Riscos e proximas verificacoes

1. Executar `npm run build` em um terminal com a politica do PowerShell liberada.
2. Validar migrations e RLS em um projeto Supabase de teste.
3. Fazer deploy da Edge Function e testar upload com credenciais de teste.
4. Cobrir com testes os fluxos de autenticacao, paciente, upload e regras de status.
5. Definir a estrategia multi-tenant antes de disponibilizar o sistema para varias clinicas.

## Fonte principal

- [`README_MIGRACAO.md`](../README_MIGRACAO.md)
- [`src/App.tsx`](../src/App.tsx)
