import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useWealthData } from '../hooks'
import { formatCurrency } from '@/lib/format'

export function WealthDashboardWidget({ className }: { className?: string }) {
  const { budgets, analytics, loading } = useWealthData()

  if (loading || !analytics) {
    return (
      <div className={`card ${className ?? ''}`}>
        <div className="card-header">
          <TrendingUp size={16} />
          <h3>Wealth</h3>
        </div>
        <p className="muted">Loading…</p>
      </div>
    )
  }

  const overBudget = analytics.budget_statuses.filter((s) => s.status !== 'ok').length

  return (
    <Link to="/life/wealth" className={`card ${className ?? ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card-header">
        <TrendingUp size={16} />
        <h3>Wealth</h3>
      </div>
      <div className="stat-label">Net Worth</div>
      <div className="stat-value">{formatCurrency(analytics.net_worth.total)}</div>
      <p className="stat-sub">
        {budgets.length > 0
          ? overBudget > 0
            ? `${overBudget} budget${overBudget > 1 ? 's' : ''} need attention`
            : 'All budgets on track'
          : 'No budgets set yet'}
      </p>
    </Link>
  )
}
