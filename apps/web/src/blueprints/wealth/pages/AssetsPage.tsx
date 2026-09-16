import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, RotateCcw, Tag, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { ASSET_TYPE_LABELS } from '../types'
import type { AssetType, WealthAsset } from '../types'
import { formatCurrency, formatDate } from '@/lib/format'

const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as AssetType[]

export function AssetsPage() {
  const { assets, analytics, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthAsset | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selling, setSelling] = useState<WealthAsset | null>(null)

  const performanceById = new Map((analytics?.asset_performance ?? []).map((p) => [p.asset_id, p]))

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset? This removes its purchase/value history permanently.')) return
    await api.deleteAsset(id)
    await refresh()
  }

  async function handleReopen(id: string) {
    await api.reopenAsset(id)
    await refresh()
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Assets</h1>
          <p className="muted">Property, vehicles and other personal assets you own outright.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add asset
        </button>
      </div>

      <div className="callout callout-info">
        Held assets count toward your <strong>net worth</strong> (as illiquid value) using their current
        value, not what you paid — keep <strong>current value</strong> updated periodically for an accurate
        picture. Purchase value is kept alongside it so the <strong>Asset Advisor</strong> agent (see
        Insights) can compare gain/loss and suggest whether to hold, sell, or buy more — it only explains
        the numbers below, it never invents a value for you. Mark an asset <strong>sold</strong> once you
        dispose of it; it's excluded from net worth after that but its history is kept.
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="card-grid">
        {assets.map((a) => {
          const perf = performanceById.get(a.id)
          const gainLoss = perf?.gain_loss ?? a.current_value - a.purchase_value
          const gainLossPercent = perf?.gain_loss_percent ?? null
          const sold = a.status === 'sold'
          return (
            <div key={a.id} className="card" onClick={() => setEditing(a)} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <h3>{a.name}</h3>
                <span className="badge">{ASSET_TYPE_LABELS[a.asset_type]}</span>
              </div>
              {sold && (
                <span className="badge badge-warning" style={{ marginBottom: 8 }}>
                  Sold {a.sold_date ? formatDate(a.sold_date) : ''}
                </span>
              )}
              <p className="muted">
                Purchased {formatCurrency(a.purchase_value)}
                {a.purchase_date && ` on ${formatDate(a.purchase_date)}`}
              </p>
              <p>
                {sold ? 'Sold for' : 'Current value'}: <strong>{formatCurrency(sold ? a.sold_value ?? 0 : a.current_value)}</strong>
              </p>
              <p className={gainLoss >= 0 ? 'amount-income' : 'amount-expense'}>
                {gainLoss >= 0 ? '+' : ''}
                {formatCurrency(gainLoss)}
                {gainLossPercent !== null && ` (${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent}%)`}
              </p>
              {a.current_value_updated_at && !sold && (
                <p className="stat-sub">Value last updated {formatDate(a.current_value_updated_at)}</p>
              )}
              <div className="row" style={{ marginTop: 8 }}>
                {sold ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleReopen(a.id)
                    }}
                  >
                    <RotateCcw size={14} /> Reopen (still holding)
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelling(a)
                    }}
                  >
                    <Tag size={14} /> Mark sold
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDelete(a.id)
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && assets.length === 0 && <p className="muted">No assets yet.</p>}

      {(showForm || editing) && (
        <AssetForm
          asset={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={refresh}
        />
      )}

      {selling && (
        <SellAssetForm
          asset={selling}
          onClose={() => setSelling(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

function AssetForm({
  asset,
  onClose,
  onSaved,
}: {
  asset: WealthAsset | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(asset?.name ?? '')
  const [assetType, setAssetType] = useState<AssetType>(asset?.asset_type ?? 'property')
  const [purchaseValue, setPurchaseValue] = useState(String(asset?.purchase_value ?? ''))
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchase_date ?? '')
  const [currentValue, setCurrentValue] = useState(String(asset?.current_value ?? ''))
  const [currentValueUpdatedAt, setCurrentValueUpdatedAt] = useState(
    asset?.current_value_updated_at ?? new Date().toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertAsset({
        id: asset?.id,
        name,
        asset_type: assetType,
        purchase_value: Number(purchaseValue),
        purchase_date: purchaseDate || null,
        current_value: Number(currentValue),
        current_value_updated_at: currentValueUpdatedAt || null,
        notes: notes || null,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={asset ? 'Edit asset' : 'Add asset'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family home, Honda Civic" required />
        </label>
        <label>
          Type
          <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Purchase date
          <input type="date" value={purchaseDate ?? ''} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label>
          Purchase (buying) value
          <input type="number" step="0.01" min="0" value={purchaseValue} onChange={(e) => setPurchaseValue(e.target.value)} required />
        </label>
        <label>
          Current value
          <input type="number" step="0.01" min="0" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} required />
        </label>
        <label className="span-2">
          Current value as of
          <input type="date" value={currentValueUpdatedAt ?? ''} onChange={(e) => setCurrentValueUpdatedAt(e.target.value)} />
        </label>
        <label className="span-2">
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

function SellAssetForm({
  asset,
  onClose,
  onSaved,
}: {
  asset: WealthAsset
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [soldValue, setSoldValue] = useState(String(asset.current_value))
  const [soldDate, setSoldDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.sellAsset(asset.id, Number(soldValue), soldDate)
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Mark "${asset.name}" as sold`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Sold for
          <input type="number" step="0.01" min="0" value={soldValue} onChange={(e) => setSoldValue(e.target.value)} required />
        </label>
        <label>
          Sold date
          <input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} required />
        </label>
        <p className="muted span-2" style={{ marginTop: -4 }}>
          This removes it from your net worth going forward, but keeps the purchase/sale history for reference.
        </p>
        <div className="span-2 row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Confirm sale'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
