import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Trash2, UploadCloud } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import type { EntryType, WealthCategory, WealthEntry } from '../types'

const TARGET_FIELDS = ['entry_date', 'amount', 'payee'] as const
type TargetField = (typeof TARGET_FIELDS)[number]

interface ReviewRow {
  key: number
  entryDate: string | null
  amount: number | null
  payee: string
  type: EntryType
  categoryId: string | null
  goalId: string | null
  accountId: string | null
  isDuplicate: boolean
}

export function StatementImportPage() {
  const { accounts, categories, goals, entries, refresh } = useWealthData()

  // step 1: file + column mapping + paid-by account
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<TargetField, string>>>({})
  const [paidByAccountId, setPaidByAccountId] = useState('')
  const [statementMonth, setStatementMonth] = useState('')

  // step 2: editable review rows, built once so user edits aren't clobbered by re-parsing
  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [parsingPdf, setParsingPdf] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const existingKeys = useMemo(
    () => new Set(entries.map((e) => `${e.entry_date}|${e.amount}|${(e.payee ?? '').toLowerCase()}`)),
    [entries],
  )

  // best-effort auto-categorization from prior entries with a similar payee, falling back to category name matches
  const payeeCategoryMap = useMemo(() => buildPayeeCategoryMap(entries), [entries])

  function handleFile(file: File) {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      void handlePdfUpload(file)
      return
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields ?? []
        setHeaders(fields)
        setRawRows(res.data)
        setReviewRows(null)
        setResult(null)

        const guess: Partial<Record<TargetField, string>> = {}
        for (const h of fields) {
          const lower = h.toLowerCase()
          if (!guess.entry_date && /date/.test(lower)) guess.entry_date = h
          if (!guess.amount && /amount|value/.test(lower)) guess.amount = h
          if (!guess.payee && /desc|merchant|payee|memo/.test(lower)) guess.payee = h
        }
        setMapping(guess)
      },
    })
  }

  async function handlePdfUpload(file: File) {
    if (!paidByAccountId) {
      setResult('Pick the paid-by account above before uploading a PDF statement.')
      return
    }
    setParsingPdf(true)
    setResult(null)
    setHeaders([])
    setRawRows([])
    try {
      const { transactions } = await api.parseStatementPdf(file)
      const built: ReviewRow[] = transactions.map((t, i) => {
        const key = `${t.entry_date}|${t.amount}|${(t.payee ?? '').toLowerCase()}`
        return {
          key: i,
          entryDate: t.entry_date,
          amount: t.amount,
          payee: t.payee ?? '',
          type: t.type,
          categoryId: t.category_id ?? guessCategoryId(t.payee ?? '', payeeCategoryMap, categories),
          goalId: null,
          accountId: paidByAccountId,
          isDuplicate: existingKeys.has(key),
        }
      })
      setReviewRows(built)
      setStatementMonth(deriveStatementMonth(built))
      if (built.length === 0) setResult('The AI could not find any transactions in this PDF.')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Could not parse PDF statement')
    } finally {
      setParsingPdf(false)
    }
  }

  function buildReview() {
    if (!mapping.entry_date || !mapping.amount || !paidByAccountId) return

    const built: ReviewRow[] = rawRows.map((raw, i) => {
      const rawDate = raw[mapping.entry_date as string]
      const rawAmount = raw[mapping.amount as string]
      const payee = mapping.payee ? raw[mapping.payee] ?? '' : ''

      const entryDate = normalizeDate(rawDate)
      const numericAmount = parseFloat((rawAmount ?? '').replace(/[^0-9.-]/g, ''))
      const amount = Number.isFinite(numericAmount) ? Math.abs(numericAmount) : null
      // credit card statements typically list purchases as positive and payments/credits as negative
      const type: EntryType = numericAmount < 0 ? 'income' : 'expense'
      const key = `${entryDate}|${amount}|${payee.toLowerCase()}`

      return {
        key: i,
        entryDate,
        amount,
        payee,
        type,
        categoryId: guessCategoryId(payee, payeeCategoryMap, categories),
        goalId: null,
        accountId: paidByAccountId,
        isDuplicate: existingKeys.has(key),
      }
    })

    setReviewRows(built)
    setStatementMonth(deriveStatementMonth(built))
  }

  function updateRow(key: number, patch: Partial<ReviewRow>) {
    setReviewRows((rows) => (rows ? rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) : rows))
  }

  function deleteRow(key: number) {
    setReviewRows((rows) => (rows ? rows.filter((r) => r.key !== key) : rows))
  }

  const validRows = (reviewRows ?? []).filter((r) => r.entryDate && r.amount !== null && !r.isDuplicate)
  const duplicateCount = (reviewRows ?? []).filter((r) => r.isDuplicate).length

  async function handleSubmit() {
    if (!reviewRows) return
    setSubmitting(true)
    setResult(null)
    try {
      const batchId = `stmt-${paidByAccountId}-${statementMonth || 'unknown'}-${Date.now()}`
      const batch: Array<Partial<WealthEntry> & { type: EntryType; amount: number; entry_date: string }> =
        validRows.map((r) => ({
          type: r.type,
          amount: r.amount as number,
          entry_date: r.entryDate as string,
          payee: r.payee || null,
          category_id: r.categoryId,
          account_id: r.accountId,
          goal_id: r.goalId,
          import_batch_id: batchId,
        }))
      await api.bulkInsertEntries(batch)
      await refresh()
      setResult(`Imported ${batch.length} entries for ${statementMonth || 'this statement'}. Skipped ${duplicateCount} likely duplicate(s).`)
      setHeaders([])
      setRawRows([])
      setReviewRows(null)
      setMapping({})
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Credit card statement</h1>
        <p className="muted">
          Upload a statement export, pick the account it was paid from, then review and categorize every line on one screen
          before creating the entries.
        </p>
      </div>

      <div className="card">
        <div className="form-grid">
          <label>
            Paid by account
            <select value={paidByAccountId} onChange={(e) => setPaidByAccountId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Statement file
            <label className="btn" style={{ display: 'inline-flex', cursor: 'pointer', marginTop: 4 }}>
              <UploadCloud size={14} /> Choose CSV or PDF
              <input
                type="file"
                accept=".csv,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            <span className="muted" style={{ display: 'block', marginTop: 4 }}>
              PDF statements are read by your local AI model — a category mapping rule always overrides its guess.
            </span>
          </label>
        </div>
        {parsingPdf && (
          <p className="muted" style={{ marginTop: 10 }}>
            Reading PDF with your AI model… reasoning models can take several minutes on a full statement, please wait.
          </p>
        )}
      </div>

      {headers.length > 0 && (
        <div className="card">
          <h3>Column mapping</h3>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <label>
              Date column
              <select value={mapping.entry_date ?? ''} onChange={(e) => setMapping({ ...mapping, entry_date: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount column
              <select value={mapping.amount ?? ''} onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description column
              <select value={mapping.payee ?? ''} onChange={(e) => setMapping({ ...mapping, payee: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              className="btn btn-primary"
              onClick={buildReview}
              disabled={!mapping.entry_date || !mapping.amount || !paidByAccountId}
            >
              Read entries
            </button>
            {!paidByAccountId && <span className="muted">Pick the paid-by account above first.</span>}
          </div>
        </div>
      )}

      {reviewRows && reviewRows.length > 0 && (
        <div className="card">
          <div className="row-between">
            <h3>
              Review ({reviewRows.length} rows, {duplicateCount} possible duplicates) — {statementMonth || 'mixed month'}
            </h3>
            <button className="btn btn-primary" onClick={() => void handleSubmit()} disabled={submitting || validRows.length === 0}>
              {submitting ? 'Importing…' : `Import ${validRows.length} entries`}
            </button>
          </div>
          <div className="table-wrap" style={{ marginTop: 10, maxHeight: 480, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Goal contribution</th>
                  <th>Paid by</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((r) => {
                  const availableCategories = categories.filter((c) => c.kind === r.type)
                  return (
                    <tr key={r.key}>
                      <td>
                        <input
                          type="date"
                          value={r.entryDate ?? ''}
                          onChange={(e) => updateRow(r.key, { entryDate: e.target.value || null })}
                          style={{ minWidth: 140 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={r.payee}
                          onChange={(e) => updateRow(r.key, { payee: e.target.value })}
                          style={{ minWidth: 160 }}
                        />
                      </td>
                      <td>
                        <select value={r.type} onChange={(e) => updateRow(r.key, { type: e.target.value as EntryType, categoryId: null })}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={r.type === 'income' ? 'amount-income' : 'amount-expense'}
                          value={r.amount ?? ''}
                          onChange={(e) => updateRow(r.key, { amount: e.target.value === '' ? null : Number(e.target.value) })}
                          style={{ width: 100 }}
                        />
                      </td>
                      <td>
                        <select
                          value={r.categoryId ?? ''}
                          onChange={(e) => updateRow(r.key, { categoryId: e.target.value || null })}
                        >
                          <option value="">Uncategorized</option>
                          {availableCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={r.goalId ?? ''} onChange={(e) => updateRow(r.key, { goalId: e.target.value || null })}>
                          <option value="">No contribution</option>
                          {goals.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={r.accountId ?? ''} onChange={(e) => updateRow(r.key, { accountId: e.target.value || null })}>
                          <option value="">None</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {r.isDuplicate ? (
                          <span className="badge badge-warning">Duplicate</span>
                        ) : r.entryDate && r.amount !== null ? (
                          <span className="badge badge-success">Ready</span>
                        ) : (
                          <span className="badge badge-danger">Invalid</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteRow(r.key)} title="Remove this row">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && <div className="callout callout-info">{result}</div>}
    </div>
  )
}

/** Derives the most common year-month among valid rows, used to tag the import batch. */
function deriveStatementMonth(rows: ReviewRow[]): string {
  const monthCounts = new Map<string, number>()
  for (const r of rows) {
    if (!r.entryDate) continue
    const ym = r.entryDate.slice(0, 7)
    monthCounts.set(ym, (monthCounts.get(ym) ?? 0) + 1)
  }
  let bestMonth = ''
  let bestCount = 0
  for (const [ym, count] of monthCounts) {
    if (count > bestCount) {
      bestMonth = ym
      bestCount = count
    }
  }
  return bestMonth
}

/** Groups prior entries by a normalized payee and picks the most-used category for each, for auto-suggesting categories. */
function buildPayeeCategoryMap(entries: WealthEntry[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>()
  for (const e of entries) {
    if (!e.payee || !e.category_id) continue
    const key = normalizePayee(e.payee)
    if (!key) continue
    const inner = counts.get(key) ?? new Map<string, number>()
    inner.set(e.category_id, (inner.get(e.category_id) ?? 0) + 1)
    counts.set(key, inner)
  }
  const result = new Map<string, string>()
  for (const [key, inner] of counts) {
    let best: string | null = null
    let bestCount = 0
    for (const [catId, count] of inner) {
      if (count > bestCount) {
        best = catId
        bestCount = count
      }
    }
    if (best) result.set(key, best)
  }
  return result
}

function normalizePayee(payee: string): string {
  return payee.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function guessCategoryId(payee: string, payeeMap: Map<string, string>, categories: WealthCategory[]): string | null {
  const norm = normalizePayee(payee)
  if (!norm) return null
  const exact = payeeMap.get(norm)
  if (exact) return exact

  for (const [key, categoryId] of payeeMap) {
    if (key.length >= 4 && (norm.includes(key) || key.includes(norm))) return categoryId
  }

  const nameMatch = categories.find((c) => norm.includes(c.name.toLowerCase()))
  return nameMatch?.id ?? null
}

function normalizeDate(value: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) return direct.toISOString().slice(0, 10)

  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (match) {
    const [, m, d, y] = match
    const year = y.length === 2 ? `20${y}` : y
    const date = new Date(Number(year), Number(m) - 1, Number(d))
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }
  return null
}
