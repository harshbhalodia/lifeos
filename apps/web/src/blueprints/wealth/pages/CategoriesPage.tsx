import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { CategoryGroupBadge } from '../components/CategoryGroupBadge'
import { CATEGORY_GROUP_LABELS } from '../types'
import type { CategoryGroup, EntryType, WealthCategory } from '../types'

const GROUPS = Object.keys(CATEGORY_GROUP_LABELS) as CategoryGroup[]

export function CategoriesPage() {
  const { categories, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthCategory | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Entries using it will become uncategorized.')) return
    await api.deleteCategory(id)
    await refresh()
  }

  const grouped = GROUPS.map((group) => ({
    group,
    items: categories.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Categories</h1>
          <p className="muted">Group expense and income categories the way your budget is structured.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add category
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {grouped.map(({ group, items }) => (
        <div key={group} className="card">
          <div className="card-header">
            <CategoryGroupBadge group={group} />
          </div>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} onClick={() => setEditing(c)} style={{ cursor: 'pointer' }}>
                    <td>{c.name}</td>
                    <td className="muted">{c.kind === 'income' ? 'Income' : 'Expense'}</td>
                    <td style={{ width: 40 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDelete(c.id)
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!loading && categories.length === 0 && <p className="muted">No categories yet.</p>}

      {(showForm || editing) && (
        <CategoryForm
          category={editing}
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

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: WealthCategory | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [group, setGroup] = useState<CategoryGroup>(category?.group ?? 'variable')
  const [kind, setKind] = useState<EntryType>(category?.kind ?? 'expense')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertCategory({ id: category?.id, name, group, kind })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={category ? 'Edit category' : 'Add category'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Group
          <select value={group} onChange={(e) => setGroup(e.target.value as CategoryGroup)}>
            {(Object.keys(CATEGORY_GROUP_LABELS) as CategoryGroup[]).map((g) => (
              <option key={g} value={g}>
                {CATEGORY_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value as EntryType)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
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
