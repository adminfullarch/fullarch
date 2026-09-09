import { supabase } from '../lib/supabase'

export type QuestionnaireResponse = { item: string; value: string | null }

export async function listQuestionnaireItems(patientId: string) {
  const { data, error } = await supabase
    .from('questionnaire_responses')
    .select('item')
    .eq('patient_id', patientId)
  if (error) throw error
  return (data ?? []).map((r) => r.item as string)
}

export async function toggleQuestionnaireItem(patientId: string, item: string, selected: boolean) {
  if (selected) {
    const { error } = await supabase.from('questionnaire_responses').insert({ patient_id: patientId, item })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('questionnaire_responses')
      .delete()
      .eq('patient_id', patientId)
      .eq('item', item)
    if (error) throw error
  }
}

/** Respostas com valor, usadas pela anamnese. */
export async function listQuestionnaireResponses(patientId: string, prefix?: string) {
  let query = supabase.from('questionnaire_responses').select('item, value').eq('patient_id', patientId)
  if (prefix) query = query.like('item', `${prefix}%`)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as QuestionnaireResponse[]
}

/** Grava o valor de um item. Valor vazio remove a resposta. */
export async function setQuestionnaireValue(patientId: string, item: string, value: string | null) {
  if (value === null || value === '') {
    const { error } = await supabase
      .from('questionnaire_responses')
      .delete()
      .eq('patient_id', patientId)
      .eq('item', item)
    if (error) throw error
    return
  }
  const { error } = await supabase
    .from('questionnaire_responses')
    .upsert({ patient_id: patientId, item, value }, { onConflict: 'patient_id,item' })
  if (error) throw error
}
