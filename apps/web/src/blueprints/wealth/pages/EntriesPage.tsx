import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { CategoryGroupBadge } from '../components/CategoryGroupBadge'
import type { EntryType, RecurrenceInterval, WealthEntry } from '../types'
import { formatCurrency, formatDate } from '@/lib/format'

export function EntriesPage() {
  const { entries, categories, categoryGroups, accounts, goals, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthEntry | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<'all' | EntryType>('all')

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const groupById = useMemo(() => new Map(categoryGroups.map((g) => [g.id, g])), [categoryGroups])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals])

  const filtered = entries.filter((e) => filterType === 'all' || e.type === filterType)

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return
    await api.deleteEntry(id)
    await refresh()
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Entries</h1>
          <p className="muted">Income and expenses, each linked to a forecast category for better analysis.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add entry
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="row">
        {(['all', 'income', 'expense'] as const).map((t) => (
          <button
            key={t}
            className="btn btn-sm"
            style={filterType === t ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' } : undefined}
            onClick={() => setFilterType(t)}
          >
            {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th>Category</th>
              <th>Account</th>
              <th>Goal</th>
              <th>Recurring</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  No entries yet.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const category = entry.category_id ? categoryById.get(entry.category_id) : undefined
                const account = entry.account_id ? accountById.get(entry.account_id) : undefined
                const goal = entry.goal_id ? goalById.get(entry.goal_id) : undefined
                return (
                  <tr key={entry.id} onClick={() => setEditing(entry)} style={{ cursor: 'pointer' }}>
                    <td className="muted">{formatDate(entry.entry_date)}</td>
                    <td>{entry.payee || '—'}</td>
                    <td>
                      {category ? <CategoryGroupBadge group={groupById.get(category.group_id ?? '')} /> : '—'} {category?.name}
                    </td>
                    <td className="muted">{account?.name ?? '—'}</td>
                    <td className="muted">{goal?.name ?? '—'}</td>
                    <td className="muted">{entry.is_recurring ? entry.recurrence_interval ?? 'yes' : '—'}</td>
                    <td className={entry.type === 'income' ? 'amount-income' : 'amount-expense'}>
                      {entry.type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(entry.id)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <EntryForm
          entry={editing}
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

function EntryForm({
  entry,
  onClose,
  onSaved,
}: {
  entry: WealthEntry | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { categories, accounts, goals } = useWealthData()
  const [type, setType] = useState<EntryType>(entry?.type ?? 'expense')
  const [amount, setAmount] = useState(String(entry?.amount ?? ''))
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? new Date().toISOString().slice(0, 10))
  const [payee, setPayee] = useState(entry?.payee ?? '')
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? '')
  const [accountId, setAccountId] = useState(entry?.account_id ?? '')
  const [goalId, setGoalId] = useState(entry?.goal_id ?? '')
  const [isRecurring, setIsRecurring] = useState(entry?.is_recurring ?? false)
  const [recurrence, setRecurrence] = useState<RecurrenceInterval>(entry?.recurrence_interval ?? 'monthly')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const availableCategories = categories.filter((c) => c.kind === type)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertEntry({
        id: entry?.id,
        type,
        amount: Number(amount),
        entry_date: entryDate,
        payee: payee || null,
        category_id: categoryId || null,
        account_id: accountId || null,
        goal_id: goalId || null,
        is_recurring: isRecurring,
        recurrence_interval: isRecurring ? recurrence : null,
        notes: notes || null,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={entry ? 'Edit entry' : 'Add entry'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as EntryType)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          Amount
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Date
          <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
        </label>
        <label>
          Payee / source
          <input value={payee} onChange={(e) => setPayee(e.target.value)} />
        </label>
        <label className="span-2">
          Forecast category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Account
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">None</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Contributes to goal
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recurring
          <select value={isRecurring ? 'yes' : 'no'} onChange={(e) => setIsRecurring(e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        {isRecurring && (
          <label>
            Interval
            <select value={recurrence ?? 'monthly'} onChange={(e) => setRecurrence(e.target.value as RecurrenceInterval)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
        )}
        <label className="span-2">
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
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
