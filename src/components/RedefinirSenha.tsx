import { FormEvent, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const MINIMO = 6

export function RedefinirSenha({ onConcluido }: { onConcluido: () => void }) {
  const { updatePassword, signOut } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senha.length < MINIMO) {
      setErro(`A senha precisa ter pelo menos ${MINIMO} caracteres.`)
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }

    setSalvando(true)
    try {
      await updatePassword(senha)
      onConcluido()
    } catch (err) {
      const bruto = err instanceof Error ? err.message : ''
      // O link vale por pouco tempo e so pode ser usado uma vez. Quando ja
      // venceu, o Supabase responde que nao ha sessao — o que nao ajuda em
      // nada quem esta lendo a tela.
      setErro(
        /session|expired|invalid|token/i.test(bruto)
          ? 'Este link não vale mais. Peça um novo na tela de login.'
          : bruto || 'Não foi possível alterar a senha.'
      )
      setSalvando(false)
    }
  }

  async function cancelar() {
    await signOut()
    onConcluido()
  }

  return (
    <div className="login-page">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />
      <form onSubmit={handleSubmit} className="login-card">
        <div className="login-mascot" aria-hidden="true">
          <img className="mascot-image" src="/mascote-dentinho.png" alt="Mascote dentinho Fullarch" />
        </div>
        <div className="login-brand">
          Full<span>arch</span>
        </div>
        <div className="modal-title">Definir nova senha</div>
        <div className="modal-sub">Escolha uma senha para voltar a acessar o sistema.</div>

        <label className="field-label">Nova senha</label>
        <input
          className="field-input"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={MINIMO}
          autoFocus
          required
        />

        <label className="field-label">Confirmar nova senha</label>
        <input
          className="field-input"
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          minLength={MINIMO}
          required
        />

        {erro && <p className="login-erro">{erro}</p>}

        <div className="modal-actions">
          <button className="btn btn-solid" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
        <button type="button" className="login-link" onClick={cancelar}>
          Cancelar e voltar ao login
        </button>
      </form>
    </div>
  )
}
