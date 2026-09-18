/** Wealth blueprint domain types — mirror the FastAPI backend's Pydantic schemas. */

export type EntryType = 'income' | 'expense'
export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null
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
export type BalanceSource = 'manual' | 'computed'
export type WatchlistItemType = 'stock' | 'etf' | 'fund' | 'crypto' | 'real_estate' | 'product' | 'other'
export type WatchlistStatus = 'watching' | 'researching' | 'decided_in' | 'decided_out'
export type TopicStatus = 'exploring' | 'researching' | 'decided' | 'parked'

export interface WealthAccount {
  id: string
  name: string
  type: AccountType
  institution: string | null
  currency: string
  opening_balance: number
  current_balance: number
  is_liquid: boolean
  balance_source: BalanceSource
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

/** User-maintained keyword -> category mapping used to auto-categorize statement imports. */
export interface WealthCategoryRule {
  id: string
  keyword: string
  category_id: string
  created_at: string
}

/** A single transaction extracted from a PDF statement by the AI, before it becomes an entry. */
export interface ParsedStatementTransaction {
  entry_date: string | null
  payee: string | null
  amount: number | null
  type: EntryType
  category_id: string | null
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

export type ScenarioType = 'custom' | 'best_case' | 'expected_case' | 'worst_case'

/** Per-account growth override within one scenario draft; growth_rate null = use the scenario default. */
export interface ScenarioAccountConfig {
  account_id: string
  growth_rate: number | null
  include_in_growth: boolean
}

/** Per-asset growth override within one scenario draft (e.g. a car depreciating). */
export interface ScenarioAssetConfig {
  asset_id: string
  growth_rate: number | null
  include_in_growth: boolean
}

/** An extra modeled income stream (raise, side hustle, rental income) with its own growth rate. */
export interface ScenarioIncomeSource {
  name: string
  monthly_amount: number
  growth_rate: number
}

/** A saved sandbox "what-if" draft — computed on demand from real net worth, never writes back to it. */
export interface WealthScenario {
  id: string
  name: string
  description: string | null
  scenario_type: ScenarioType
  years_horizon: number
  investment_return_rate: number
  personal_asset_growth_rate: number
  monthly_contribution_override: number | null
  income_growth_rate: number
  is_adopted: boolean
  account_configs: ScenarioAccountConfig[]
  asset_configs: ScenarioAssetConfig[]
  income_sources: ScenarioIncomeSource[]
  created_at: string
}

export interface ScenarioProjectionPoint {
  year: number
  liquid: number
  investments: number
  personal_assets: number
  illiquid_other: number
  net_worth: number
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

/** An investment idea being tracked/considered — never counted in net worth until actually bought. */
export interface WealthWatchlistItem {
  id: string
  name: string
  item_type: WatchlistItemType
  symbol: string | null
  status: WatchlistStatus
  target_price: number | null
  current_price: number | null
  currency: string
  thesis: string | null
  url: string | null
  priority: number
  created_at: string
}

/** A research topic/knowledge note the user cares about, feeding the research advisor agent. */
export interface WealthTopic {
  id: string
  title: string
  description: string
  category: string | null
  status: TopicStatus
  related_goal_id: string | null
  priority: number
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

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  custom: 'Custom',
  best_case: 'Best case',
  expected_case: 'Expected case',
  worst_case: 'Worst case',
}

/** Quick-fill rates when picking a scenario type — the user can still tweak every field after. */
export const SCENARIO_TYPE_PRESETS: Record<ScenarioType, { investment_return_rate: number; personal_asset_growth_rate: number; income_growth_rate: number }> = {
  custom: { investment_return_rate: 0.07, personal_asset_growth_rate: 0.02, income_growth_rate: 0 },
  best_case: { investment_return_rate: 0.11, personal_asset_growth_rate: 0.04, income_growth_rate: 0.03 },
  expected_case: { investment_return_rate: 0.07, personal_asset_growth_rate: 0.02, income_growth_rate: 0.02 },
  worst_case: { investment_return_rate: 0.02, personal_asset_growth_rate: 0, income_growth_rate: 0 },
}

export const WATCHLIST_TYPE_LABELS: Record<WatchlistItemType, string> = {
  stock: 'Stock',
  etf: 'ETF',
  fund: 'Fund',
  crypto: 'Crypto',
  real_estate: 'Real Estate',
  product: 'Product',
  other: 'Other',
}

export const WATCHLIST_STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: 'Watching',
  researching: 'Researching',
  decided_in: 'Decided In',
  decided_out: 'Passed',
}

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  exploring: 'Exploring',
  researching: 'Researching',
  decided: 'Decided',
  parked: 'Parked',
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

export interface IncomeForecastPoint {
  month: string
  label: string
  income: number
}

export interface IncomeForecastSummary {
  history: IncomeForecastPoint[]
  forecast: IncomeForecastPoint[]
  avg_monthly_income: number
  recurring_monthly_income: number
  trend_monthly_change: number
}

export interface AllocationSlice {
  label: string
  amount: number
  percent: number
}

export interface DiversificationSummary {
  allocations: AllocationSlice[]
  total_allocatable: number
  largest_holding_label: string | null
  concentration_percent: number
}

export interface GoalFeasibility {
  goal_id: string
  name: string
  goal_type: GoalType
  target_amount: number
  current_amount: number
  remaining_amount: number
  target_date: string | null
  months_remaining: number | null
  required_monthly_contribution: number | null
  status: 'on_track' | 'at_risk' | 'off_track' | 'no_target_date'
}

export interface AnalyticsSummary {
  net_worth: NetWorthSummary
  liquidity: LiquidityInfo
  cashflow: CashflowPoint[]
  category_breakdown: CategoryGroupTotal[]
  budget_statuses: BudgetStatus[]
  asset_performance: AssetPerformance[]
  income_forecast: IncomeForecastSummary
  diversification: DiversificationSummary
  goal_feasibility: GoalFeasibility[]
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
