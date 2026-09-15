import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWealthData } from '../hooks'
import { StatCard } from '../components/StatCard'
import { formatCurrency } from '@/lib/format'

export function WealthOverviewPage() {
  const { goals, analytics, loading, error } = useWealthData()

  if (loading) return <p className="muted">Loading wealth data…</p>
  if (error) return <div className="callout callout-error">{error}</div>
  if (!analytics) return null

  const { net_worth: netWorth, liquidity, budget_statuses: statuses } = analytics
  const cashflow = analytics.cashflow.slice(-6)
  const attention = statuses.filter((s) => s.status !== 'ok')

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Wealth</h1>
          <p className="muted">Accounts, budgets and forecasts, all in one place.</p>
        </div>
        <div className="row">
          <Link className="btn" to="/life/wealth/entries">
            Add entry
          </Link>
          <Link className="btn btn-primary" to="/life/wealth/analytics">
            View analytics
          </Link>
        </div>
      </div>

      <div className="widget-grid">
        <StatCard label="Net worth" value={formatCurrency(netWorth.total)} />
        <StatCard label="Liquid" value={formatCurrency(netWorth.liquid)} />
        <StatCard label="Investments" value={formatCurrency(netWorth.investments)} />
        <StatCard
          label="Runway"
          value={liquidity.months_of_runway !== null ? `${liquidity.months_of_runway} mo` : '—'}
          sub={`Avg essential spend ${formatCurrency(liquidity.avg_monthly_essential_spend)}/mo`}
        />
      </div>

      <div className="card">
        <h3>Cashflow — last 6 months</h3>
        <div style={{ height: 220, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflow}>
              <defs>
                <linearGradient id="incoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6d4f" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2f6d4f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b3261e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#b3261e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="incoming" stroke="#2f6d4f" fill="url(#incoming)" strokeWidth={2} />
              <Area type="monotone" dataKey="outgoing" stroke="#b3261e" fill="url(#outgoing)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Budgets needing attention</h3>
          {attention.length === 0 ? (
            <p className="muted">All budgets are within range.</p>
          ) : (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {attention.map((s) => (
                <li key={s.budget_id} style={{ marginBottom: 6 }}>
                  <strong>{s.category_name}</strong> — {s.percent}% of budget (
                  {formatCurrency(s.spent)} / {formatCurrency(s.monthly_amount)})
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Goals</h3>
          {goals.length === 0 ? (
            <p className="muted">No goals yet. Add one to start tracking progress.</p>
          ) : (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {goals.slice(0, 5).map((g) => (
                <li key={g.id} style={{ marginBottom: 6 }}>
                  <strong>{g.name}</strong> — {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
