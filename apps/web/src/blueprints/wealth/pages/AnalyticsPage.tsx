import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { StatCard } from '../components/StatCard'
import { CATEGORY_GROUP_LABELS } from '../types'
import type { NetWorthProjectionPoint } from '../types'
import { formatCurrency } from '@/lib/format'

const GROUP_COLORS: Record<string, string> = {
  fixed: '#2f6d4f',
  variable: '#a15c07',
  adhoc: '#b3261e',
  investments: '#275475',
  new_investments: '#6d4fa1',
  income: '#1f4d38',
}

export function AnalyticsPage() {
  const { analytics, assumptions, loading, error, refresh } = useWealthData()
  const [editingAssumption, setEditingAssumption] = useState(false)
  const [projection, setProjection] = useState<NetWorthProjectionPoint[]>([])
  const [projectionError, setProjectionError] = useState<string | null>(null)

  const activeAssumption = assumptions.find((a) => a.is_active) ?? assumptions[0]

  useEffect(() => {
    if (!activeAssumption) {
      setProjection([])
      return
    }
    api
      .getProjection(activeAssumption.id)
      .then(setProjection)
      .catch((err) => setProjectionError(err instanceof Error ? err.message : 'Could not load projection'))
  }, [activeAssumption])

  if (loading) return <p className="muted">Loading analytics…</p>
  if (error) return <div className="callout callout-error">{error}</div>
  if (!analytics) return null

  const { net_worth: netWorth, liquidity } = analytics
  const groupBreakdown = analytics.category_breakdown
  const cashflow = analytics.cashflow.slice(-3)

  const avgMonthlyNet = cashflow.length > 0 ? cashflow.reduce((s, c) => s + c.net, 0) / cashflow.length : 0

  return (
    <div className="stack">
      <div>
        <h1>Analytics</h1>
        <p className="muted">Net worth projection, liquidity and spending strategy — all computed server-side.</p>
      </div>

      <div className="widget-grid">
        <StatCard label="Net worth" value={formatCurrency(netWorth.total)} />
        <StatCard label="Liquid assets" value={formatCurrency(netWorth.liquid)} />
        <StatCard label="Investments" value={formatCurrency(netWorth.investments)} />
        <StatCard
          label="Liquidity runway"
          value={liquidity.months_of_runway !== null ? `${liquidity.months_of_runway} mo` : '—'}
          sub={`vs ${formatCurrency(liquidity.avg_monthly_essential_spend)}/mo essentials`}
        />
      </div>

      <div className="card">
        <div className="row-between">
          <h3>Net worth projection</h3>
          <button className="btn btn-sm" onClick={() => setEditingAssumption(true)}>
            {activeAssumption ? 'Edit assumptions' : 'Set assumptions'}
          </button>
        </div>
        {projectionError && <div className="callout callout-error">{projectionError}</div>}
        {activeAssumption ? (
          <>
            <p className="stat-sub" style={{ marginBottom: 8 }}>
              {(activeAssumption.annual_return_rate * 100).toFixed(1)}% annual return, {activeAssumption.years_horizon}
              -year horizon, {formatCurrency(avgMonthlyNet)}/mo avg net cashflow reinvested
            </p>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="net_worth" name="Net worth" stroke="#2f6d4f" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="investments" name="Investments" stroke="#275475" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="liquid" name="Liquid" stroke="#a15c07" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="muted">Set a return-rate assumption to see a projection.</p>
        )}
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Spending strategy (this month)</h3>
          {groupBreakdown.length === 0 ? (
            <p className="muted">No expenses recorded yet.</p>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupBreakdown}
                    dataKey="total"
                    nameKey="group"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {groupBreakdown.map((entry) => (
                      <Cell key={entry.group} fill={GROUP_COLORS[entry.group]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend formatter={(value: string) => CATEGORY_GROUP_LABELS[value as keyof typeof CATEGORY_GROUP_LABELS] ?? value} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Cashflow — last 3 months</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="incoming" name="Incoming" fill="#2f6d4f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outgoing" name="Outgoing" fill="#b3261e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {editingAssumption && (
        <AssumptionForm
          current={activeAssumption}
          onClose={() => setEditingAssumption(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function AssumptionForm({
  current,
  onClose,
  onSaved,
}: {
  current: ReturnType<typeof useWealthData>['assumptions'][number] | undefined
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(current?.name ?? 'Base case')
  const [annualReturnRate, setAnnualReturnRate] = useState(String((current?.annual_return_rate ?? 0.07) * 100))
  const [inflationRate, setInflationRate] = useState(String((current?.inflation_rate ?? 0.03) * 100))
  const [yearsHorizon, setYearsHorizon] = useState(String(current?.years_horizon ?? 10))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertForecastAssumption({
        id: current?.id,
        name,
        annual_return_rate: Number(annualReturnRate) / 100,
        inflation_rate: Number(inflationRate) / 100,
        years_horizon: Number(yearsHorizon),
        is_active: true,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 14 }}>Forecast assumptions</h3>
        <form onSubmit={handleSubmit} className="form-grid">
          <label className="span-2">
            Scenario name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Annual return (%)
            <input type="number" step="0.1" value={annualReturnRate} onChange={(e) => setAnnualReturnRate(e.target.value)} />
          </label>
          <label>
            Inflation (%)
            <input type="number" step="0.1" value={inflationRate} onChange={(e) => setInflationRate(e.target.value)} />
          </label>
          <label>
            Years horizon
            <input type="number" min="1" max="50" value={yearsHorizon} onChange={(e) => setYearsHorizon(e.target.value)} />
          </label>
          <div className="span-2 row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
