-- Anamnese: permite guardar o valor da resposta, e nao apenas se o item foi marcado.
-- Itens de checkbox continuam sendo linhas com value nulo (compatibilidade com o
-- mini questionario do odontograma).
alter table questionnaire_responses add column if not exists value text;
