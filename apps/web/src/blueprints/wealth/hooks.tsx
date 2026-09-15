import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as api from './api'
import type {
  AnalyticsSummary,
  WealthAccount,
  WealthBudget,
  WealthCategory,
  WealthEntry,
  WealthForecastAssumption,
  WealthGoal,
} from './types'

interface WealthDataValue {
  accounts: WealthAccount[]
  categories: WealthCategory[]
  entries: WealthEntry[]
  budgets: WealthBudget[]
  goals: WealthGoal[]
  assumptions: WealthForecastAssumption[]
  analytics: AnalyticsSummary | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const WealthDataContext = createContext<WealthDataValue | undefined>(undefined)

export function WealthDataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<WealthAccount[]>([])
  const [categories, setCategories] = useState<WealthCategory[]>([])
  const [entries, setEntries] = useState<WealthEntry[]>([])
  const [budgets, setBudgets] = useState<WealthBudget[]>([])
  const [goals, setGoals] = useState<WealthGoal[]>([])
  const [assumptions, setAssumptions] = useState<WealthForecastAssumption[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, c, e, b, g, f, s] = await Promise.all([
        api.listAccounts(),
        api.listCategories(),
        api.listEntries(),
        api.listBudgets(),
        api.listGoals(),
        api.listForecastAssumptions(),
        api.getAnalyticsSummary(),
      ])
      setAccounts(a)
      setCategories(c)
      setEntries(e)
      setBudgets(b)
      setGoals(g)
      setAssumptions(f)
      setAnalytics(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wealth data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<WealthDataValue>(
    () => ({ accounts, categories, entries, budgets, goals, assumptions, analytics, loading, error, refresh }),
    [accounts, categories, entries, budgets, goals, assumptions, analytics, loading, error, refresh],
  )

  return <WealthDataContext.Provider value={value}>{children}</WealthDataContext.Provider>
}

export function useWealthData(): WealthDataValue {
  const ctx = useContext(WealthDataContext)
  if (!ctx) throw new Error('useWealthData must be used within WealthDataProvider')
  return ctx
}
