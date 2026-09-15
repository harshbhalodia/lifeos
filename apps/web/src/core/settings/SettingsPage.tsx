import { useEffect, useState } from 'react'
import { useAuth } from '@/core/auth/AuthContext'
import { apiClient } from '@/lib/apiClient'

interface AiStatus {
  enabled: boolean
  provider: string | null
  model: string | null
  style: string | null
  endpoint: string | null
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const [backendUp, setBackendUp] = useState<boolean | null>(null)
  const [ai, setAi] = useState<AiStatus | null>(null)

  useEffect(() => {
    apiClient
      .get<{ status: string }>('/health')
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false))

    apiClient
      .get<AiStatus>('/ai/status')
      .then(setAi)
      .catch(() => setAi(null))
  }, [])

  return (
    <div className="stack">
      <div>
        <h1>Settings</h1>
        <p className="muted">Account, backend connection, and AI configuration.</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3>Account</h3>
        <dl className="kv-list">
          <dt>Signed in as</dt>
          <dd>{user?.email}</dd>
          <dt>User ID</dt>
          <dd className="mono">{user?.id}</dd>
        </dl>
        <button className="btn btn-ghost" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3>Backend connection</h3>
        <dl className="kv-list">
          <dt>API</dt>
          <dd>
            {backendUp === null && <span className="badge">Checking…</span>}
            {backendUp === true && <span className="badge badge-success">Connected</span>}
            {backendUp === false && <span className="badge badge-danger">Unreachable</span>}
          </dd>
        </dl>
        <p className="muted">
          LifeOS is entirely self-hosted. All data lives in a local SQLite database managed by the FastAPI
          backend — nothing is sent to any third party.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3>AI inference &amp; review</h3>
        <dl className="kv-list">
          <dt>Status</dt>
          <dd>
            {ai?.enabled ? (
              <span className="badge badge-success">Enabled</span>
            ) : (
              <span className="badge badge-warning">Disabled</span>
            )}
          </dd>
          <dt>Model</dt>
          <dd className="mono">{ai?.model ?? '—'}</dd>
          <dt>Endpoint</dt>
          <dd className="mono">{ai?.endpoint ?? '—'}</dd>
        </dl>
        <p className="muted">
          AI is entirely optional — every calculation in LifeOS is deterministic and works without it. Enable
          it, and point it at your local model server, by editing <code>ai:</code> in{' '}
          <code>config/config.yaml</code> on the backend. Agents only explain numbers that have already been
          computed; they never invent or recompute figures.
        </p>
      </div>
    </div>
  )
}
