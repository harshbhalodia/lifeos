import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Settings2, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { CategoryGroupBadge } from '../components/CategoryGroupBadge'
import type { EntryType, WealthCategory, WealthCategoryGroup } from '../types'

export function CategoriesPage() {
  const { categories, categoryGroups, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthCategory | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [manageGroups, setManageGroups] = useState(false)

  const groupById = new Map(categoryGroups.map((g) => [g.id, g]))

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Entries using it will become uncategorized.')) return
    await api.deleteCategory(id)
    await refresh()
  }

  const groupsSorted = [...categoryGroups].sort((a, b) => a.sort_order - b.sort_order)
  const grouped = [
    ...groupsSorted.map((group) => ({ group, items: categories.filter((c) => c.group_id === group.id) })),
    { group: null, items: categories.filter((c) => !c.group_id || !groupById.has(c.group_id)) },
  ].filter((g) => g.items.length > 0)

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Categories</h1>
          <p className="muted">Group expense and income categories the way your budget is structured.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setManageGroups(true)}>
            <Settings2 size={14} /> Manage groups
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={categoryGroups.length === 0}
          >
            <Plus size={14} /> Add category
          </button>
        </div>
      </div>

      <div className="callout callout-info">
        A category's <strong>group</strong> controls two things: it's how spending is bucketed in the Analytics
        breakdown chart, and if the group is marked <strong>essential</strong>, its spend counts toward the
        liquidity runway estimate (months of expenses your liquid balance can cover). Manage groups above to
        add your own (e.g. split "Fixed" into "Insurance" and "Housing") or mark/unmark them as essential.
      </div>

      {error && <div className="callout callout-error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && categoryGroups.length === 0 && (
        <div className="callout callout-info">No category groups yet — create one under "Manage groups" first.</div>
      )}

      {grouped.map(({ group, items }) => (
        <div key={group?.id ?? 'uncategorized'} className="card">
          <div className="card-header">
            <CategoryGroupBadge group={group} />
            {group?.is_essential && <span className="badge muted">Essential spend</span>}
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
          groups={groupsSorted}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      )}

      {manageGroups && <CategoryGroupsManager onClose={() => setManageGroups(false)} onSaved={refresh} />}
    </div>
  )
}

function CategoryForm({
  category,
  groups,
  onClose,
  onSaved,
}: {
  category: WealthCategory | null
  groups: WealthCategoryGroup[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [groupId, setGroupId] = useState(category?.group_id ?? groups[0]?.id ?? '')
  const [kind, setKind] = useState<EntryType>(category?.kind ?? 'expense')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertCategory({ id: category?.id, name, group_id: groupId, kind })
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
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
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

function CategoryGroupsManager({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const { categoryGroups, categories, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthCategoryGroup | 'new' | null>(null)

  async function handleDelete(id: string) {
    const inUse = categories.some((c) => c.group_id === id)
    if (inUse) {
      alert('Reassign categories using this group before deleting it.')
      return
    }
    if (!confirm('Delete this category group?')) return
    await api.deleteCategoryGroup(id)
    await refresh()
  }

  const groupsSorted = [...categoryGroups].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Modal title="Manage category groups" onClose={onClose}>
      <div className="stack">
        <p className="muted">
          Groups organize categories for the analytics breakdown chart. Mark a group "essential" to include its
          spend in the liquidity runway calculation.
        </p>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Essential</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groupsSorted.map((g) => (
                <tr key={g.id} onClick={() => setEditing(g)} style={{ cursor: 'pointer' }}>
                  <td>
                    <CategoryGroupBadge group={g} />
                  </td>
                  <td className="muted">{g.is_essential ? 'Yes' : 'No'}</td>
                  <td style={{ width: 40 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(g.id)
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
        <button className="btn" onClick={() => setEditing('new')}>
          <Plus size={14} /> Add group
        </button>
      </div>

      {editing && (
        <CategoryGroupForm
          group={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh()
            await onSaved()
          }}
        />
      )}
    </Modal>
  )
}

function CategoryGroupForm({
  group,
  onClose,
  onSaved,
}: {
  group: WealthCategoryGroup | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(group?.name ?? '')
  const [color, setColor] = useState(group?.color ?? '#2f6d4f')
  const [sortOrder, setSortOrder] = useState(String(group?.sort_order ?? 0))
  const [isEssential, setIsEssential] = useState(group?.is_essential ?? false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertCategoryGroup({
        id: group?.id,
        name,
        color,
        sort_order: Number(sortOrder),
        is_essential: isEssential,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={group ? 'Edit group' : 'Add group'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          Sort order
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </label>
        <label className="span-2">
          <input
            type="checkbox"
            checked={isEssential}
            onChange={(e) => setIsEssential(e.target.checked)}
            style={{ marginRight: 8, width: 'auto' }}
          />
          Essential spend (counts toward liquidity runway)
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
