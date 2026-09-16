import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { GOAL_TYPE_LABELS } from '../types'
import type { GoalType, WealthGoal } from '../types'
import { formatCurrency, formatDate } from '@/lib/format'

const GOAL_TYPES = Object.keys(GOAL_TYPE_LABELS) as GoalType[]

export function GoalsPage() {
  const { goals, entries, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthGoal | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return
    await api.deleteGoal(id)
    await refresh()
  }

  async function handleAchieve(id: string) {
    await api.achieveGoal(id)
    await refresh()
  }

  async function handleReopen(id: string) {
    await api.reopenGoal(id)
    await refresh()
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Goals</h1>
          <p className="muted">Emergency fund, savings, debt repayment, investment and major purchase targets.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add goal
        </button>
      </div>

      <div className="callout callout-info">
        Link entries to a goal (from the entry's "Contributes to goal" field) and its progress is calculated
        automatically from those entries — a goal is marked <strong>achieved</strong> as soon as the linked
        total reaches the target. You can also mark a goal achieved manually at any time, or reopen it.
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="card-grid">
        {goals.map((g) => {
          const percent = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
          const linkedCount = entries.filter((e) => e.goal_id === g.id).length
          const achieved = g.achieved_at !== null
          return (
            <div key={g.id} className="card" onClick={() => setEditing(g)} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <h3>{g.name}</h3>
                <span className="badge">{GOAL_TYPE_LABELS[g.goal_type]}</span>
              </div>
              {achieved && <span className="badge badge-success" style={{ marginBottom: 8 }}>Achieved {formatDate(g.achieved_at!)}</span>}
              <div className="progress-track" style={{ marginBottom: 8 }}>
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="muted">
                {formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)} ({Math.round(percent)}%)
              </p>
              {g.target_date && <p className="stat-sub">Target: {formatDate(g.target_date)}</p>}
              <p className="stat-sub">
                {linkedCount > 0 ? `${linkedCount} linked entr${linkedCount === 1 ? 'y' : 'ies'}` : 'No linked entries — amount set manually'}
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                {achieved ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleReopen(g.id)
                    }}
                  >
                    <RotateCcw size={14} /> Reopen
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleAchieve(g.id)
                    }}
                  >
                    <CheckCircle2 size={14} /> Mark achieved
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDelete(g.id)
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && goals.length === 0 && <p className="muted">No goals yet.</p>}

      {(showForm || editing) && (
        <GoalForm
          goal={editing}
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

function GoalForm({
  goal,
  onClose,
  onSaved,
}: {
  goal: WealthGoal | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { entries } = useWealthData()
  const hasLinkedEntries = goal ? entries.some((e) => e.goal_id === goal.id) : false
  const [name, setName] = useState(goal?.name ?? '')
  const [goalType, setGoalType] = useState<GoalType>(goal?.goal_type ?? 'savings')
  const [targetAmount, setTargetAmount] = useState(String(goal?.target_amount ?? ''))
  const [currentAmount, setCurrentAmount] = useState(String(goal?.current_amount ?? 0))
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertGoal({
        id: goal?.id,
        name,
        goal_type: goalType,
        target_amount: Number(targetAmount),
        current_amount: Number(currentAmount),
        target_date: targetDate || null,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={goal ? 'Edit goal' : 'Add goal'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
            {GOAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {GOAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target date
          <input type="date" value={targetDate ?? ''} onChange={(e) => setTargetDate(e.target.value)} />
        </label>
        <label>
          Target amount
          <input type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
        </label>
        <label>
          Current amount
          <input
            type="number"
            step="0.01"
            min="0"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            disabled={hasLinkedEntries}
            title={hasLinkedEntries ? 'Derived from linked entries — unlink them to edit manually' : undefined}
          />
        </label>
        {hasLinkedEntries && (
          <p className="muted span-2" style={{ marginTop: -4 }}>
            This amount is calculated from entries linked to this goal (see Entries page).
          </p>
        )}
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
