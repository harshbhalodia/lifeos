import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { user, signInWithPassword } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await signInWithPassword(email, password)
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Sparkles size={20} />
          <span>LifeOS</span>
        </div>
        <p className="auth-tagline">Your self-hosted personal life operating system.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <div className="callout callout-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Sign in
          </button>
        </form>

        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Accounts are provisioned by the administrator via <code>config/config.yaml</code> — there is no
          self-service sign-up.
        </p>
      </div>
    </div>
  )
}
