-- Faixa etaria explicita do paciente, escolhida no cadastro.
--
-- A anamnese usa esse valor para decidir quais secoes mostrar: Odontopediatria
-- so para criancas, Implantes so para adultos. A idade numerica (`age`) nao
-- serve para isso — e opcional, fica desatualizada e o corte entre crianca e
-- adulto e decisao clinica, nao aritmetica.
--
-- Coluna anulavel, sem default e sem preenchimento retroativo: pacientes ja
-- cadastrados ficam com NULL ("nao informado") ate alguem da clinica escolher.
-- A aplicacao deve tratar NULL mostrando todas as secoes.
--
-- A RLS de `patients` ("acesso_por_clinica") e por linha e vale para todas as
-- colunas, entao nao precisa mudar.

alter table public.patients
  add column if not exists age_group text;

alter table public.patients
  drop constraint if exists patients_age_group_check;

alter table public.patients
  add constraint patients_age_group_check
  check (age_group in ('crianca', 'adulto'));

comment on column public.patients.age_group is
  'Faixa etaria escolhida no cadastro: ''crianca'' ou ''adulto''. Define quais secoes da anamnese aparecem (Odontopediatria so para crianca, Implantes so para adulto). NULL = nao informado.';
