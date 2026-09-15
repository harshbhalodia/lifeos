/** Wealth blueprint domain types — mirror the FastAPI backend's Pydantic schemas. */

export type CategoryGroup = 'fixed' | 'variable' | 'adhoc' | 'investments' | 'new_investments' | 'income'
export type EntryType = 'income' | 'expense'
export type RecurrenceInterval = 'weekly' | 'monthly' | 'yearly' | null
export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit'
  | 'investment'
  | 'retirement'
  | 'loan'
  | 'other'
export type GoalType =
  | 'emergency_fund'
  | 'savings'
  | 'debt_repayment'
  | 'investment'
  | 'major_purchase'
  | 'other'

export interface WealthAccount {
  id: string
  name: string
  type: AccountType
  institution: string | null
  currency: string
  opening_balance: number
  current_balance: number
  is_liquid: boolean
  created_at: string
}

export interface WealthCategory {
  id: string
  name: string
  group: CategoryGroup
  kind: EntryType
  color: string | null
  is_archived: boolean
  created_at: string
}

export interface WealthEntry {
  id: string
  type: EntryType
  amount: number
  entry_date: string
  payee: string | null
  category_id: string | null
  account_id: string | null
  is_recurring: boolean
  recurrence_interval: RecurrenceInterval
  notes: string | null
  import_batch_id: string | null
  created_at: string
}

export interface WealthBudget {
  id: string
  category_id: string
  monthly_amount: number
  warning_threshold: number
  critical_threshold: number
  created_at: string
}

export interface WealthGoal {
  id: string
  name: string
  goal_type: GoalType
  target_amount: number
  current_amount: number
  target_date: string | null
  created_at: string
}

export interface WealthForecastAssumption {
  id: string
  name: string
  annual_return_rate: number
  inflation_rate: number
  years_horizon: number
  is_active: boolean
  created_at: string
}

export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  fixed: 'Fixed',
  variable: 'Variable',
  adhoc: 'Adhoc',
  investments: 'Investments',
  new_investments: 'New Investments',
  income: 'Income',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
  retirement: 'Retirement',
  loan: 'Loan',
  other: 'Other',
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  emergency_fund: 'Emergency Fund',
  savings: 'Savings',
  debt_repayment: 'Debt Repayment',
  investment: 'Investment',
  major_purchase: 'Major Purchase',
  other: 'Other',
}

/* ---------------- server-computed analytics (see backend app/services/analytics.py) ---------------- */

export interface NetWorthSummary {
  total: number
  liquid: number
  illiquid: number
  investments: number
}

export interface CashflowPoint {
  month: string
  label: string
  incoming: number
  outgoing: number
  net: number
}

export interface CategoryGroupTotal {
  group: CategoryGroup
  total: number
}

export interface BudgetStatus {
  budget_id: string
  category_id: string
  category_name: string
  monthly_amount: number
  spent: number
  percent: number
  status: 'ok' | 'warning' | 'critical'
  projected_month_end: number
}

export interface LiquidityInfo {
  liquid_balance: number
  avg_monthly_essential_spend: number
  months_of_runway: number | null
}

export interface NetWorthProjectionPoint {
  year: number
  liquid: number
  investments: number
  illiquid: number
  net_worth: number
}

export interface AnalyticsSummary {
  net_worth: NetWorthSummary
  liquidity: LiquidityInfo
  cashflow: CashflowPoint[]
  category_breakdown: CategoryGroupTotal[]
  budget_statuses: BudgetStatus[]
}

/* ---------------- agents & insights ---------------- */

export interface AgentInfo {
  id: string
  name: string
  version: string
  description: string
  reads: string[]
  writes: string[]
}

export interface AgentRunResult {
  agent_id: string
  status: 'ok' | 'error'
  summary?: string | null
  facts?: Record<string, unknown> | null
  error?: string | null
}

export interface Insight {
  id: string
  agent_id: string
  severity: string
  summary: string
  facts_json: string
  created_at: string
}
