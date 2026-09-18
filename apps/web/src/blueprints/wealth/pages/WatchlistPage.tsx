import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { WATCHLIST_STATUS_LABELS, WATCHLIST_TYPE_LABELS } from '../types'
import type { WatchlistItemType, WatchlistStatus, WealthWatchlistItem } from '../types'
import { formatCurrency } from '@/lib/format'

const WATCHLIST_TYPES = Object.keys(WATCHLIST_TYPE_LABELS) as WatchlistItemType[]
const WATCHLIST_STATUSES = Object.keys(WATCHLIST_STATUS_LABELS) as WatchlistStatus[]

const STATUS_BADGE_CLASS: Record<WatchlistStatus, string> = {
  watching: 'badge',
  researching: 'badge badge-warning',
  decided_in: 'badge badge-success',
  decided_out: 'badge badge-danger',
}

export function WatchlistPage() {
  const [items, setItems] = useState<WealthWatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<WealthWatchlistItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | WatchlistStatus>('all')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setItems(await api.listWatchlist())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Remove this watchlist item?')) return
    await api.deleteWatchlistItem(id)
    await load()
  }

  const filtered = items.filter((i) => statusFilter === 'all' || i.status === statusFilter)

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Investment Watchlist</h1>
          <p className="muted">
            Stocks, funds, crypto, real estate or products you're considering — purely informational, never
            counted in net worth until you actually buy it. Feeds the Research Advisor agent for guidance.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add to watchlist
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="row">
        {(['all', ...WATCHLIST_STATUSES] as const).map((s) => (
          <button
            key={s}
            className="btn btn-sm"
            style={statusFilter === s ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' } : undefined}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : WATCHLIST_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && <p className="muted">Nothing here yet.</p>}

      <div className="card-grid">
        {filtered.map((item) => (
          <div key={item.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEditing(item)}>
            <div className="card-header">
              <h3>{item.name}</h3>
              <span className="badge" style={{ marginLeft: 'auto' }}>
                {WATCHLIST_TYPE_LABELS[item.item_type]}
              </span>
            </div>
            {item.symbol && <p className="muted">{item.symbol}</p>}
            {(item.target_price !== null || item.current_price !== null) && (
              <p className="stat-sub">
                {item.current_price !== null && `Current: ${formatCurrency(item.current_price, item.currency)}`}
                {item.target_price !== null && ` · Target: ${formatCurrency(item.target_price, item.currency)}`}
              </p>
            )}
            {item.thesis && <p className="muted">{item.thesis}</p>}
            <div className="row-between" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              <span className={STATUS_BADGE_CLASS[item.status]}>{WATCHLIST_STATUS_LABELS[item.status]}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => void handleDelete(item.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showForm || editing) && (
        <WatchlistItemForm
          item={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={load}
        />
      )}
    </div>
  )
}

function WatchlistItemForm({
  item,
  onClose,
  onSaved,
}: {
  item: WealthWatchlistItem | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [itemType, setItemType] = useState<WatchlistItemType>(item?.item_type ?? 'stock')
  const [symbol, setSymbol] = useState(item?.symbol ?? '')
  const [status, setStatus] = useState<WatchlistStatus>(item?.status ?? 'watching')
  const [targetPrice, setTargetPrice] = useState(item?.target_price !== null && item?.target_price !== undefined ? String(item.target_price) : '')
  const [currentPrice, setCurrentPrice] = useState(item?.current_price !== null && item?.current_price !== undefined ? String(item.current_price) : '')
  const [currency, setCurrency] = useState(item?.currency ?? 'USD')
  const [thesis, setThesis] = useState(item?.thesis ?? '')
  const [url, setUrl] = useState(item?.url ?? '')
  const [priority, setPriority] = useState(String(item?.priority ?? 0))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertWatchlistItem({
        id: item?.id,
        name,
        item_type: itemType,
        symbol: symbol || null,
        status,
        target_price: targetPrice === '' ? null : Number(targetPrice),
        current_price: currentPrice === '' ? null : Number(currentPrice),
        currency,
        thesis: thesis || null,
        url: url || null,
        priority: Number(priority),
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={item ? 'Edit watchlist item' : 'Add to watchlist'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={itemType} onChange={(e) => setItemType(e.target.value as WatchlistItemType)}>
            {WATCHLIST_TYPES.map((t) => (
              <option key={t} value={t}>
                {WATCHLIST_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Symbol / ticker
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as WatchlistStatus)}>
            {WATCHLIST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {WATCHLIST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </label>
        <label>
          Current price
          <input type="number" step="0.01" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
        </label>
        <label>
          Target price
          <input type="number" step="0.01" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
        </label>
        <label>
          Currency
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
        </label>
        <label className="span-2">
          Link
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Optional" />
        </label>
        <label className="span-2">
          Thesis / notes
          <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={3} placeholder="Why are you watching this?" />
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
