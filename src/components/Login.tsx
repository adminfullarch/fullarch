import { FormEvent, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function Login({ onBack }: { onBack?: () => void }) {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup' | 'recuperar'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      if (mode === 'recuperar') {
        await resetPassword(email)
        // Resposta deliberadamente igual para e-mail cadastrado ou nao: dizer
        // "esse e-mail nao existe" entregaria a quem esta tentando adivinhar a
        // lista de quem tem acesso a clinica.
        setSuccess(
          'Se existir uma conta com esse e-mail, o link para criar uma nova senha chegará em instantes. Ele vale por uma hora.'
        )
      } else if (mode === 'signup') {
        if (password.length < 6) {
          throw new Error('A senha precisa ter pelo menos 6 caracteres.')
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não conferem.')
        }
        const { session } = await signUp(email, password)
        if (!session) {
          setSuccess('Usuário criado. Confira seu e-mail para confirmar o acesso.')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      const padrao =
        mode === 'login'
          ? 'Falha no login.'
          : mode === 'signup'
            ? 'Falha ao criar usuário.'
            : 'Não foi possível enviar o e-mail. Tente de novo em alguns minutos.'
      setError(err instanceof Error ? err.message : padrao)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-orbit login-orbit-one" />
      <div className="login-orbit login-orbit-two" />
      <form onSubmit={handleSubmit} className="login-card">
        {onBack && (
          <button type="button" className="login-back" onClick={onBack}>
            ← Voltar para apresentação
          </button>
        )}
        <div className="login-mascot" aria-hidden="true">
          <img className="mascot-image" src="/mascote-dentinho.png" alt="Mascote dentinho Fullarch" />
        </div>
        <div className="login-brand">Full<span>arch</span></div>
        <div className="login-kicker">Gestão odontológica com cuidado</div>
        <div className="login-switch" role="tablist" aria-label="Acesso à clínica">
          <button
            type="button"
            className={mode === 'login' || mode === 'recuperar' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => { setMode('signup'); setError(null); setSuccess(null) }}
          >
            Criar usuário
          </button>
        </div>
        <div className="modal-title">
          {mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar acesso' : 'Recuperar senha'}
        </div>
        <div className="modal-sub">
          {mode === 'login'
            ? 'Acesso da equipe da clínica.'
            : mode === 'signup'
              ? 'Cadastre seu e-mail para acessar a clínica.'
              : 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.'}
        </div>
        <label className="field-label">E-mail</label>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== 'recuperar' && (
          <>
            <label className="field-label">Senha</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        )}
        {mode === 'signup' && (
          <>
            <label className="field-label">Confirmar senha</label>
            <input
              className="field-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </>
        )}
        {error && <p className="login-erro">{error}</p>}
        {success && (
          <p className="login-success">{success}</p>
        )}
        <div className="modal-actions">
          <button className="btn btn-solid" type="submit" disabled={loading}>
            {loading
              ? mode === 'login'
                ? 'Entrando…'
                : mode === 'signup'
                  ? 'Criando…'
                  : 'Enviando…'
              : mode === 'login'
                ? 'Entrar'
                : mode === 'signup'
                  ? 'Criar usuário'
                  : 'Enviar link'}
          </button>
        </div>
        {mode === 'login' && (
          <button
            type="button"
            className="login-link"
            onClick={() => { setMode('recuperar'); setError(null); setSuccess(null) }}
          >
            Esqueci minha senha
          </button>
        )}
        {mode === 'recuperar' && (
          <button
            type="button"
            className="login-link"
            onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
          >
            Voltar para o login
          </button>
        )}
      </form>
    </div>
  )
}
