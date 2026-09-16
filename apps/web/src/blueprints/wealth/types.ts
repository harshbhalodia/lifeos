/** Wealth blueprint domain types — mirror the FastAPI backend's Pydantic schemas. */

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
export type BudgetPeriod = 'monthly' | 'yearly'
export type AssetType = 'property' | 'vehicle' | 'jewelry' | 'collectible' | 'other'
export type AssetStatus = 'holding' | 'sold'

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

/** User-defined category bucket (e.g. Fixed, Variable, Adhoc) — fully configurable per user. */
export interface WealthCategoryGroup {
  id: string
  name: string
  color: string | null
  sort_order: number
  /** Counts toward the liquidity/runway "essential spend" calculation. */
  is_essential: boolean
  created_at: string
}

export interface WealthCategory {
  id: string
  name: string
  group_id: string | null
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
  /** Links this entry as a contribution towards a goal; goal.current_amount is derived from these. */
  goal_id: string | null
  is_recurring: boolean
  recurrence_interval: RecurrenceInterval
  notes: string | null
  import_batch_id: string | null
  created_at: string
}

export interface WealthBudget {
  id: string
  category_id: string
  period: BudgetPeriod
  amount: number
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
  achieved_at: string | null
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

/** Physical/personal asset held outside financial accounts, e.g. a home or car. */
export interface WealthAsset {
  id: string
  name: string
  asset_type: AssetType
  purchase_value: number
  purchase_date: string | null
  current_value: number
  current_value_updated_at: string | null
  status: AssetStatus
  sold_value: number | null
  sold_date: string | null
  notes: string | null
  created_at: string
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

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  property: 'Property',
  vehicle: 'Vehicle',
  jewelry: 'Jewelry',
  collectible: 'Collectible',
  other: 'Other',
}

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* ---------------- server-computed analytics (see backend app/services/analytics.py) ---------------- */

export interface NetWorthSummary {
  total: number
  liquid: number
  illiquid: number
  investments: number
  /** Held (non-sold) physical assets like property/vehicles — already included in `illiquid`. */
  personal_assets: number
}

export interface CashflowPoint {
  month: string
  label: string
  incoming: number
  outgoing: number
  net: number
}

export interface CategoryGroupTotal {
  group_id: string | null
  group_name: string
  color: string | null
  total: number
}

export interface BudgetStatus {
  budget_id: string
  category_id: string
  category_name: string
  period: BudgetPeriod
  amount: number
  spent: number
  percent: number
  status: 'ok' | 'warning' | 'critical'
  projected_period_end: number
}

export interface LiquidityInfo {
  liquid_balance: number
  avg_monthly_essential_spend: number
  months_of_runway: number | null
}

export interface AssetPerformance {
  asset_id: string
  name: string
  asset_type: string
  status: string
  purchase_value: number
  current_value: number
  gain_loss: number
  gain_loss_percent: number | null
  holding_period_days: number | null
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
  asset_performance: AssetPerformance[]
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
