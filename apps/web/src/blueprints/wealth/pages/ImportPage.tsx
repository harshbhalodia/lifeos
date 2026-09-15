import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { UploadCloud } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import type { EntryType, WealthEntry } from '../types'
import { formatCurrency } from '@/lib/format'

interface ParsedRow {
  raw: Record<string, string>
  entryDate: string | null
  amount: number | null
  payee: string
  type: EntryType
  categoryId: string | null
  isDuplicate: boolean
}

const TARGET_FIELDS = ['entry_date', 'amount', 'payee', 'category'] as const
type TargetField = (typeof TARGET_FIELDS)[number]

export function ImportPage() {
  const { categories, entries, refresh } = useWealthData()
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<TargetField, string>>>({})
  const [defaultType, setDefaultType] = useState<EntryType>('expense')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setHeaders(res.meta.fields ?? [])
        setRows(res.data)
        setResult(null)

        // best-effort auto-mapping by common header names
        const guess: Partial<Record<TargetField, string>> = {}
        for (const h of res.meta.fields ?? []) {
          const lower = h.toLowerCase()
          if (!guess.entry_date && /date/.test(lower)) guess.entry_date = h
          if (!guess.amount && /amount|value/.test(lower)) guess.amount = h
          if (!guess.payee && /desc|merchant|payee|memo/.test(lower)) guess.payee = h
          if (!guess.category && /category/.test(lower)) guess.category = h
        }
        setMapping(guess)
      },
    })
  }

  const existingKeys = useMemo(
    () => new Set(entries.map((e) => `${e.entry_date}|${e.amount}|${(e.payee ?? '').toLowerCase()}`)),
    [entries],
  )

  const categoryByName = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c.id])),
    [categories],
  )

  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!mapping.entry_date || !mapping.amount) return []
    return rows.map((raw) => {
      const rawDate = mapping.entry_date ? raw[mapping.entry_date] : ''
      const rawAmount = mapping.amount ? raw[mapping.amount] : ''
      const payee = mapping.payee ? raw[mapping.payee] ?? '' : ''
      const categoryName = mapping.category ? raw[mapping.category] ?? '' : ''

      const entryDate = normalizeDate(rawDate)
      const numericAmount = parseFloat((rawAmount ?? '').replace(/[^0-9.-]/g, ''))
      const amount = Number.isFinite(numericAmount) ? Math.abs(numericAmount) : null
      const type: EntryType = numericAmount < 0 ? 'expense' : numericAmount > 0 ? 'income' : defaultType

      const key = `${entryDate}|${amount}|${payee.toLowerCase()}`

      return {
        raw,
        entryDate,
        amount,
        payee,
        type,
        categoryId: categoryByName.get(categoryName.toLowerCase()) ?? null,
        isDuplicate: existingKeys.has(key),
      }
    })
  }, [rows, mapping, categoryByName, existingKeys, defaultType])

  const validRows = parsedRows.filter((r) => r.entryDate && r.amount !== null && !r.isDuplicate)
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length

  async function handleImport() {
    setImporting(true)
    setResult(null)
    try {
      const batch: Array<Partial<WealthEntry> & { type: EntryType; amount: number; entry_date: string }> =
        validRows.map((r) => ({
          type: r.type,
          amount: r.amount as number,
          entry_date: r.entryDate as string,
          payee: r.payee || null,
          category_id: r.categoryId,
        }))
      await api.bulkInsertEntries(batch)
      await refresh()
      setResult(`Imported ${batch.length} entries. Skipped ${duplicateCount} likely duplicate(s).`)
      setRows([])
      setHeaders([])
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Import CSV</h1>
        <p className="muted">Map your bank/export columns to LifeOS fields. Duplicates are detected automatically.</p>
      </div>

      <div className="card">
        <label className="btn" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          <UploadCloud size={14} /> Choose CSV file
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
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
              Description / payee column
              <select value={mapping.payee ?? ''} onChange={(e) => setMapping({ ...mapping, payee: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Category column (optional)
              <select value={mapping.category ?? ''} onChange={(e) => setMapping({ ...mapping, category: e.target.value })}>
                <option value="">—</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Default type (when amount sign is ambiguous)
              <select value={defaultType} onChange={(e) => setDefaultType(e.target.value as EntryType)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="card">
          <div className="row-between">
            <h3>
              Preview ({parsedRows.length} rows, {duplicateCount} possible duplicates)
            </h3>
            <button className="btn btn-primary" onClick={() => void handleImport()} disabled={importing || validRows.length === 0}>
              {importing ? 'Importing…' : `Import ${validRows.length} entries`}
            </button>
          </div>
          <div className="table-wrap" style={{ marginTop: 10, maxHeight: 320, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td className="muted">{r.entryDate ?? 'invalid'}</td>
                    <td>{r.payee || '—'}</td>
                    <td className="muted">{r.type}</td>
                    <td className={r.type === 'income' ? 'amount-income' : 'amount-expense'}>
                      {r.amount !== null ? formatCurrency(r.amount) : '—'}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && <div className="callout callout-info">{result}</div>}
    </div>
  )
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
