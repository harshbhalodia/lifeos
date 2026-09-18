import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FlaskConical, Plus, Star, Trash2, X } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { ACCOUNT_TYPE_LABELS, ASSET_TYPE_LABELS, SCENARIO_TYPE_LABELS, SCENARIO_TYPE_PRESETS } from '../types'
import type { ScenarioAccountConfig, ScenarioAssetConfig, ScenarioIncomeSource, ScenarioProjectionPoint, ScenarioType, WealthScenario } from '../types'
import { formatCurrency } from '@/lib/format'

const SCENARIO_TYPES = Object.keys(SCENARIO_TYPE_LABELS) as ScenarioType[]
const COMPARISON_COLORS = ['#2f6d4f', '#275475', '#a15c07', '#8a4b7c', '#b3261e', '#6b6255']

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<WealthScenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<WealthScenario | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<Record<string, ScenarioProjectionPoint[]>>({})
  const [comparisonLoading, setComparisonLoading] = useState(false)

  async function loadScenarios() {
    setLoading(true)
    setError(null)
    try {
      setScenarios(await api.listScenarios())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadScenarios()
  }, [])

  useEffect(() => {
    if (selectedIds.length === 0) {
      setComparison({})
      return
    }
    setComparisonLoading(true)
    Promise.all(selectedIds.map((id) => api.getScenarioProjection(id).then((points) => [id, points] as const)))
      .then((results) => setComparison(Object.fromEntries(results)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load projection'))
      .finally(() => setComparisonLoading(false))
  }, [selectedIds])

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft scenario? This never affects your real accounts or assets.')) return
    await api.deleteScenario(id)
    setSelectedIds((prev) => prev.filter((x) => x !== id))
    await loadScenarios()
  }

  async function handleAdopt(scenario: WealthScenario) {
    await api.upsertScenario({ ...scenario, is_adopted: !scenario.is_adopted })
    await loadScenarios()
  }

  const chartData = buildChartData(selectedIds, scenarios, comparison)

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Scenarios</h1>
          <p className="muted">
            Sandbox drafts for "what if" wealth strategies — best case, worst case, or fully custom. These only
            read your current net worth as a starting point and never write back to real accounts, assets or
            entries. Save as many drafts as you like, compare them, and star the one you're adopting as your plan.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New draft
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      {selectedIds.length > 0 && (
        <div className="card">
          <h3>Comparison — net worth by year</h3>
          {comparisonLoading ? (
            <p className="muted">Loading projections…</p>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e2da" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  {selectedIds.map((id, i) => {
                    const scenario = scenarios.find((s) => s.id === id)
                    if (!scenario) return null
                    return (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        name={scenario.name}
                        stroke={COMPARISON_COLORS[i % COMPARISON_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {!loading && scenarios.length === 0 && (
        <p className="muted">No draft scenarios yet — create one to sandbox a wealth strategy.</p>
      )}

      <div className="card-grid">
        {scenarios.map((s) => (
          <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEditing(s)}>
            <div className="card-header">
              <FlaskConical size={16} />
              <h3>{s.name}</h3>
              <span className="badge" style={{ marginLeft: 'auto' }}>
                {SCENARIO_TYPE_LABELS[s.scenario_type]}
              </span>
            </div>
            {s.description && <p className="muted">{s.description}</p>}
            <p className="stat-sub">
              {(s.investment_return_rate * 100).toFixed(1)}% investment return, {(s.personal_asset_growth_rate * 100).toFixed(1)}%
              asset growth, {s.years_horizon}-year horizon
            </p>
            <p className="stat-sub">
              {s.monthly_contribution_override !== null
                ? `${formatCurrency(s.monthly_contribution_override)}/mo assumed contribution`
                : 'Uses your actual avg net cashflow'}
            </p>
            {s.is_adopted && (
              <span className="badge badge-success" style={{ marginTop: 8 }}>
                Adopted plan
              </span>
            )}
            <div className="row" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              <label className="row" style={{ gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelected(s.id)} />
                <span className="muted" style={{ fontSize: 13 }}>
                  Compare
                </span>
              </label>
              <button className="btn btn-ghost btn-sm" onClick={() => void handleAdopt(s)}>
                <Star size={14} fill={s.is_adopted ? 'currentColor' : 'none'} /> {s.is_adopted ? 'Unadopt' : 'Adopt'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => void handleDelete(s.id)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showForm || editing) && (
        <ScenarioForm
          scenario={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={loadScenarios}
        />
      )}
    </div>
  )
}

function buildChartData(
  selectedIds: string[],
  scenarios: WealthScenario[],
  comparison: Record<string, ScenarioProjectionPoint[]>,
): Array<Record<string, number>> {
  const years = new Set<number>()
  for (const id of selectedIds) {
    for (const point of comparison[id] ?? []) years.add(point.year)
  }
  const sortedYears = [...years].sort((a, b) => a - b)

  return sortedYears.map((year) => {
    const row: Record<string, number> = { year }
    for (const id of selectedIds) {
      const scenario = scenarios.find((s) => s.id === id)
      if (!scenario) continue
      const point = (comparison[id] ?? []).find((p) => p.year === year)
      if (point) row[id] = point.net_worth
    }
    return row
  })
}

function ScenarioForm({
  scenario,
  onClose,
  onSaved,
}: {
  scenario: WealthScenario | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(scenario?.name ?? '')
  const [description, setDescription] = useState(scenario?.description ?? '')
  const [scenarioType, setScenarioType] = useState<ScenarioType>(scenario?.scenario_type ?? 'custom')
  const [yearsHorizon, setYearsHorizon] = useState(String(scenario?.years_horizon ?? 10))
  const [investmentReturnRate, setInvestmentReturnRate] = useState(
    String((scenario?.investment_return_rate ?? SCENARIO_TYPE_PRESETS.custom.investment_return_rate) * 100),
  )
  const [personalAssetGrowthRate, setPersonalAssetGrowthRate] = useState(
    String((scenario?.personal_asset_growth_rate ?? SCENARIO_TYPE_PRESETS.custom.personal_asset_growth_rate) * 100),
  )
  const [incomeGrowthRate, setIncomeGrowthRate] = useState(
    String((scenario?.income_growth_rate ?? SCENARIO_TYPE_PRESETS.custom.income_growth_rate) * 100),
  )
  const [monthlyContributionOverride, setMonthlyContributionOverride] = useState(
    scenario?.monthly_contribution_override !== null && scenario?.monthly_contribution_override !== undefined
      ? String(scenario.monthly_contribution_override)
      : '',
  )
  const { accounts, assets } = useWealthData()
  const holdingAssets = assets.filter((a) => a.status === 'holding')

  type Override = { growth_rate: string; include_in_growth: boolean }
  const defaultOverride: Override = { growth_rate: '', include_in_growth: true }

  const [accountOverrides, setAccountOverrides] = useState<Record<string, Override>>(() =>
    Object.fromEntries(
      (scenario?.account_configs ?? []).map((c) => [
        c.account_id,
        { growth_rate: c.growth_rate === null ? '' : String(c.growth_rate * 100), include_in_growth: c.include_in_growth },
      ]),
    ),
  )
  const [assetOverrides, setAssetOverrides] = useState<Record<string, Override>>(() =>
    Object.fromEntries(
      (scenario?.asset_configs ?? []).map((c) => [
        c.asset_id,
        { growth_rate: c.growth_rate === null ? '' : String(c.growth_rate * 100), include_in_growth: c.include_in_growth },
      ]),
    ),
  )
  const [incomeSources, setIncomeSources] = useState<Array<{ name: string; monthly_amount: string; growth_rate: string }>>(
    (scenario?.income_sources ?? []).map((s) => ({
      name: s.name,
      monthly_amount: String(s.monthly_amount),
      growth_rate: String(s.growth_rate * 100),
    })),
  )
  const [saving, setSaving] = useState(false)

  function getAccountOverride(id: string): Override {
    return accountOverrides[id] ?? defaultOverride
  }
  function updateAccountOverride(id: string, patch: Partial<Override>) {
    setAccountOverrides((prev) => ({ ...prev, [id]: { ...getAccountOverride(id), ...patch } }))
  }
  function getAssetOverride(id: string): Override {
    return assetOverrides[id] ?? defaultOverride
  }
  function updateAssetOverride(id: string, patch: Partial<Override>) {
    setAssetOverrides((prev) => ({ ...prev, [id]: { ...getAssetOverride(id), ...patch } }))
  }
  function addIncomeSource() {
    setIncomeSources((prev) => [...prev, { name: '', monthly_amount: '', growth_rate: '0' }])
  }
  function updateIncomeSource(index: number, patch: Partial<{ name: string; monthly_amount: string; growth_rate: string }>) {
    setIncomeSources((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }
  function removeIncomeSource(index: number) {
    setIncomeSources((prev) => prev.filter((_, i) => i !== index))
  }

  function handleTypeChange(type: ScenarioType) {
    setScenarioType(type)
    const preset = SCENARIO_TYPE_PRESETS[type]
    setInvestmentReturnRate(String(preset.investment_return_rate * 100))
    setPersonalAssetGrowthRate(String(preset.personal_asset_growth_rate * 100))
    setIncomeGrowthRate(String(preset.income_growth_rate * 100))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const account_configs: ScenarioAccountConfig[] = accounts
        .filter((a) => {
          const cfg = getAccountOverride(a.id)
          return cfg.growth_rate !== '' || !cfg.include_in_growth
        })
        .map((a) => {
          const cfg = getAccountOverride(a.id)
          return {
            account_id: a.id,
            growth_rate: cfg.growth_rate === '' ? null : Number(cfg.growth_rate) / 100,
            include_in_growth: cfg.include_in_growth,
          }
        })
      const asset_configs: ScenarioAssetConfig[] = holdingAssets
        .filter((a) => {
          const cfg = getAssetOverride(a.id)
          return cfg.growth_rate !== '' || !cfg.include_in_growth
        })
        .map((a) => {
          const cfg = getAssetOverride(a.id)
          return {
            asset_id: a.id,
            growth_rate: cfg.growth_rate === '' ? null : Number(cfg.growth_rate) / 100,
            include_in_growth: cfg.include_in_growth,
          }
        })
      const income_sources: ScenarioIncomeSource[] = incomeSources
        .filter((s) => s.name.trim() !== '')
        .map((s) => ({
          name: s.name,
          monthly_amount: Number(s.monthly_amount || 0),
          growth_rate: Number(s.growth_rate || 0) / 100,
        }))

      await api.upsertScenario({
        id: scenario?.id,
        name,
        description: description || null,
        scenario_type: scenarioType,
        years_horizon: Number(yearsHorizon),
        investment_return_rate: Number(investmentReturnRate) / 100,
        personal_asset_growth_rate: Number(personalAssetGrowthRate) / 100,
        income_growth_rate: Number(incomeGrowthRate) / 100,
        monthly_contribution_override: monthlyContributionOverride === '' ? null : Number(monthlyContributionOverride),
        is_adopted: scenario?.is_adopted ?? false,
        account_configs,
        asset_configs,
        income_sources,
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={scenario ? 'Edit draft' : 'New draft scenario'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="span-2">
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes about this draft" />
        </label>
        <label>
          Scenario type
          <select value={scenarioType} onChange={(e) => handleTypeChange(e.target.value as ScenarioType)}>
            {SCENARIO_TYPES.map((t) => (
              <option key={t} value={t}>
                {SCENARIO_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Years horizon
          <input type="number" min="1" max="50" value={yearsHorizon} onChange={(e) => setYearsHorizon(e.target.value)} />
        </label>
        <label>
          Investment return (%/yr)
          <input type="number" step="0.1" value={investmentReturnRate} onChange={(e) => setInvestmentReturnRate(e.target.value)} />
        </label>
        <label>
          Asset appreciation (%/yr)
          <input
            type="number"
            step="0.1"
            value={personalAssetGrowthRate}
            onChange={(e) => setPersonalAssetGrowthRate(e.target.value)}
          />
        </label>
        <label>
          Contribution growth (%/yr)
          <input type="number" step="0.1" value={incomeGrowthRate} onChange={(e) => setIncomeGrowthRate(e.target.value)} />
        </label>
        <label>
          Monthly contribution override
          <input
            type="number"
            step="0.01"
            value={monthlyContributionOverride}
            onChange={(e) => setMonthlyContributionOverride(e.target.value)}
            placeholder="Uses actual avg net cashflow"
          />
        </label>

        {accounts.length > 0 && (
          <div className="span-2">
            <h4 style={{ marginBottom: 2 }}>Account growth overrides</h4>
            <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
              Investment/retirement accounts grow at the rate above by default; every other account stays flat
              unless you set a rate here — not everything you own generates returns.
            </p>
            <div className="stack" style={{ gap: 6 }}>
              {accounts.map((a) => {
                const cfg = getAccountOverride(a.id)
                return (
                  <div key={a.id} className="row" style={{ alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>
                      {a.name} <span className="muted">({ACCOUNT_TYPE_LABELS[a.type]})</span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="auto"
                      value={cfg.growth_rate}
                      onChange={(e) => updateAccountOverride(a.id, { growth_rate: e.target.value })}
                      style={{ width: 70 }}
                      disabled={!cfg.include_in_growth}
                    />
                    <label className="row" style={{ gap: 4, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={cfg.include_in_growth}
                        onChange={(e) => updateAccountOverride(a.id, { include_in_growth: e.target.checked })}
                      />
                      Grows
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {holdingAssets.length > 0 && (
          <div className="span-2">
            <h4 style={{ marginBottom: 2 }}>Asset growth overrides</h4>
            <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
              Overrides the asset appreciation rate above for one asset — e.g. a car depreciating while a home
              appreciates.
            </p>
            <div className="stack" style={{ gap: 6 }}>
              {holdingAssets.map((a) => {
                const cfg = getAssetOverride(a.id)
                return (
                  <div key={a.id} className="row" style={{ alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>
                      {a.name} <span className="muted">({ASSET_TYPE_LABELS[a.asset_type]})</span>
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="auto"
                      value={cfg.growth_rate}
                      onChange={(e) => updateAssetOverride(a.id, { growth_rate: e.target.value })}
                      style={{ width: 70 }}
                      disabled={!cfg.include_in_growth}
                    />
                    <label className="row" style={{ gap: 4, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={cfg.include_in_growth}
                        onChange={(e) => updateAssetOverride(a.id, { include_in_growth: e.target.checked })}
                      />
                      Grows
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="span-2">
          <h4 style={{ marginBottom: 2 }}>Extra income sources</h4>
          <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
            Model a raise, side hustle or rental income on top of the base contribution, each with its own growth
            rate.
          </p>
          <div className="stack" style={{ gap: 6 }}>
            {incomeSources.map((src, i) => (
              <div key={i} className="row" style={{ alignItems: 'center', gap: 8 }}>
                <input
                  placeholder="Name"
                  value={src.name}
                  onChange={(e) => updateIncomeSource(i, { name: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="$/mo"
                  value={src.monthly_amount}
                  onChange={(e) => updateIncomeSource(i, { monthly_amount: e.target.value })}
                  style={{ width: 90 }}
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="%/yr"
                  value={src.growth_rate}
                  onChange={(e) => updateIncomeSource(i, { growth_rate: e.target.value })}
                  style={{ width: 70 }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeIncomeSource(i)}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addIncomeSource}>
              <Plus size={14} /> Add income source
            </button>
          </div>
        </div>

        <div className="span-2 row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
