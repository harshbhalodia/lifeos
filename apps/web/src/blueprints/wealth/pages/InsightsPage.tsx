import { useEffect, useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import * as api from '../api'
import type { AgentInfo, Insight } from '../types'
import { formatDate } from '@/lib/format'

export function InsightsPage() {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [runningId, setRunningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    try {
      const [a, i] = await Promise.all([api.listAgents(), api.listInsights()])
      setAgents(a)
      setInsights(i)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  async function handleRun(agentId: string) {
    setRunningId(agentId)
    setError(null)
    try {
      const result = await api.runAgent(agentId)
      if (result.status === 'error') {
        setError(result.error ?? 'Agent run failed')
      } else {
        await loadAll()
      }
    } finally {
      setRunningId(null)
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Insights</h1>
        <p className="muted">
          Agents read only pre-computed, trusted numbers and explain them in plain language — they never
          invent or recompute a figure. Fully optional; enable AI under Settings to use them.
        </p>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="card-grid">
        {agents.map((agent) => (
          <div key={agent.id} className="card">
            <div className="card-header">
              <Bot size={16} />
              <h3>{agent.name}</h3>
            </div>
            <p className="muted">{agent.description}</p>
            <p className="stat-sub">Reads: {agent.reads.join(', ')}</p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: 8 }}
              disabled={runningId === agent.id}
              onClick={() => void handleRun(agent.id)}
            >
              {runningId === agent.id ? 'Running…' : 'Run'}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Recent insights</h3>
        {!loading && insights.length === 0 && <p className="muted">No insights yet — run an agent above.</p>}
        <ul style={{ margin: '10px 0 0', paddingLeft: 0, listStyle: 'none' }}>
          {insights.map((insight) => (
            <li key={insight.id} className="card" style={{ marginBottom: 10 }}>
              <div className="card-header">
                <Sparkles size={14} />
                <strong>{insight.agent_id}</strong>
                <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {formatDate(insight.created_at)}
                </span>
              </div>
              <p>{insight.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
