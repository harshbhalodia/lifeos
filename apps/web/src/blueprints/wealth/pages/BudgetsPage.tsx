import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import type { BudgetPeriod, WealthBudget } from '../types'
import { formatCurrency } from '@/lib/format'

export function BudgetsPage() {
  const { budgets, categories, analytics, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthBudget | null>(null)
  const [showForm, setShowForm] = useState(false)

  const statuses = analytics?.budget_statuses ?? []
  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  async function handleDelete(id: string) {
    if (!confirm('Delete this budget?')) return
    await api.deleteBudget(id)
    await refresh()
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Budgets</h1>
          <p className="muted">
            Monthly limits, or yearly limits for once-a-year costs like car insurance or mortgage escrow, per
            category — with warning and critical thresholds.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={expenseCategories.length === 0}>
          <Plus size={14} /> Add budget
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}
      {!loading && expenseCategories.length === 0 && (
        <div className="callout callout-info">Create an expense category first.</div>
      )}

      <div className="card-grid">
        {statuses.map((s) => {
          const budget = budgets.find((b) => b.id === s.budget_id)
          if (!budget) return null
          return (
            <div key={s.budget_id} className="card" onClick={() => setEditing(budget)} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <h3>{s.category_name}</h3>
                <span className={`badge ${s.status === 'ok' ? 'badge-success' : s.status === 'warning' ? 'badge-warning' : 'badge-danger'}`}>
                  {s.percent}%
                </span>
              </div>
              <p className="stat-sub" style={{ marginBottom: 4 }}>{s.period === 'yearly' ? 'Yearly (financial year)' : 'Monthly'}</p>
              <div className="progress-track" style={{ marginBottom: 8 }}>
                <div
                  className={`progress-fill ${s.status === 'warning' ? 'warning' : s.status === 'critical' ? 'danger' : ''}`}
                  style={{ width: `${Math.min(s.percent, 100)}%` }}
                />
              </div>
              <p className="muted">
                {formatCurrency(s.spent)} of {formatCurrency(s.amount)} spent
              </p>
              <p className="stat-sub">Projected period-end: {formatCurrency(s.projected_period_end)}</p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete(s.budget_id)
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )
        })}
      </div>

      {!loading && budgets.length === 0 && expenseCategories.length > 0 && (
        <p className="muted">No budgets yet.</p>
      )}

      {(showForm || editing) && (
        <BudgetForm
          budget={editing}
          categories={expenseCategories}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function BudgetForm({
  budget,
  categories,
  onClose,
  onSaved,
}: {
  budget: WealthBudget | null
  categories: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? categories[0]?.id ?? '')
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? 'monthly')
  const [amount, setAmount] = useState(String(budget?.amount ?? ''))
  const [warningThreshold, setWarningThreshold] = useState(String(budget?.warning_threshold ?? 80))
  const [criticalThreshold, setCriticalThreshold] = useState(String(budget?.critical_threshold ?? 100))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertBudget({
        id: budget?.id,
        category_id: categoryId,
        period,
        amount: Number(amount),
        warning_threshold: Number(warningThreshold),
        critical_threshold: Number(criticalThreshold),
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={budget ? 'Edit budget' : 'Add budget'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly (financial year)</option>
          </select>
        </label>
        <label>
          {period === 'yearly' ? 'Yearly amount' : 'Monthly amount'}
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        {period === 'yearly' && (
          <p className="muted span-2" style={{ marginTop: -4 }}>
            Spend is tracked over your financial year (set in Settings), useful for once-a-year costs like car
            insurance premiums or annual mortgage escrow top-ups.
          </p>
        )}
        <label>
          Warning at (%)
          <input type="number" min="0" max="200" value={warningThreshold} onChange={(e) => setWarningThreshold(e.target.value)} />
        </label>
        <label>
          Critical at (%)
          <input type="number" min="0" max="300" value={criticalThreshold} onChange={(e) => setCriticalThreshold(e.target.value)} />
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
    </Modal>
  )
}
