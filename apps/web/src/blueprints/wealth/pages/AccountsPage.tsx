import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { ACCOUNT_TYPE_LABELS } from '../types'
import type { AccountType, WealthAccount } from '../types'
import { formatCurrency } from '@/lib/format'

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]

export function AccountsPage() {
  const { accounts, loading, error, refresh } = useWealthData()
  const [editing, setEditing] = useState<WealthAccount | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function handleDelete(id: string) {
    if (!confirm('Delete this account? Entries linked to it will keep their history.')) return
    await api.deleteAccount(id)
    await refresh()
  }

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Accounts</h1>
          <p className="muted">Checking, savings, credit, investment and retirement accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add account
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Institution</th>
              <th>Liquid</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="muted">
                  Loading…
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No accounts yet.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id} onClick={() => setEditing(a)} style={{ cursor: 'pointer' }}>
                  <td>{a.name}</td>
                  <td>{ACCOUNT_TYPE_LABELS[a.type]}</td>
                  <td className="muted">{a.institution || '—'}</td>
                  <td className="muted">{a.is_liquid ? 'Yes' : 'No'}</td>
                  <td>{formatCurrency(a.current_balance, a.currency)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(a.id)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <AccountForm
          account={editing}
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

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: WealthAccount | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  const [institution, setInstitution] = useState(account?.institution ?? '')
  const [currency, setCurrency] = useState(account?.currency ?? 'USD')
  const [openingBalance, setOpeningBalance] = useState(String(account?.opening_balance ?? 0))
  const [currentBalance, setCurrentBalance] = useState(String(account?.current_balance ?? 0))
  const [isLiquid, setIsLiquid] = useState(account?.is_liquid ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertAccount({
        id: account?.id,
        name,
        type,
        institution: institution || null,
        currency,
        opening_balance: Number(openingBalance),
        current_balance: Number(currentBalance),
        is_liquid: isLiquid,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={account ? 'Edit account' : 'Add account'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Institution
          <input value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </label>
        <label>
          Currency
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
        </label>
        <label>
          Liquid asset
          <select value={isLiquid ? 'yes' : 'no'} onChange={(e) => setIsLiquid(e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label>
          Opening balance
          <input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        </label>
        <label>
          Current balance
          <input type="number" step="0.01" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} />
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
