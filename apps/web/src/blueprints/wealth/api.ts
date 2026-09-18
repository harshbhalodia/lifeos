import { apiClient } from '@/lib/apiClient'
import type {
  AgentInfo,
  AgentRunResult,
  AnalyticsSummary,
  Insight,
  NetWorthProjectionPoint,
  ParsedStatementTransaction,
  ScenarioProjectionPoint,
  WealthAccount,
  WealthAsset,
  WealthBudget,
  WealthCategory,
  WealthCategoryGroup,
  WealthCategoryRule,
  WealthEntry,
  WealthForecastAssumption,
  WealthGoal,
  WealthScenario,
  WealthTopic,
  WealthWatchlistItem,
} from './types'

/* ---------------- accounts ---------------- */

export async function listAccounts(): Promise<WealthAccount[]> {
  return apiClient.get('/wealth/accounts')
}

export async function upsertAccount(
  account: Partial<WealthAccount> & { name: string; type: WealthAccount['type'] },
): Promise<WealthAccount> {
  return apiClient.put('/wealth/accounts', account)
}

export async function deleteAccount(id: string): Promise<void> {
  return apiClient.delete(`/wealth/accounts/${id}`)
}

/* ---------------- assets ---------------- */

export async function listAssets(): Promise<WealthAsset[]> {
  return apiClient.get('/wealth/assets')
}

export async function upsertAsset(
  asset: Partial<WealthAsset> & { name: string; asset_type: WealthAsset['asset_type']; purchase_value: number; current_value: number },
): Promise<WealthAsset> {
  return apiClient.put('/wealth/assets', asset)
}

export async function sellAsset(id: string, soldValue: number, soldDate?: string): Promise<WealthAsset> {
  return apiClient.post(`/wealth/assets/${id}/sell`, { sold_value: soldValue, sold_date: soldDate ?? null })
}

export async function reopenAsset(id: string): Promise<WealthAsset> {
  return apiClient.post(`/wealth/assets/${id}/reopen`)
}

export async function deleteAsset(id: string): Promise<void> {
  return apiClient.delete(`/wealth/assets/${id}`)
}

/* ---------------- category groups ---------------- */

export async function listCategoryGroups(): Promise<WealthCategoryGroup[]> {
  return apiClient.get('/wealth/category-groups')
}

export async function upsertCategoryGroup(
  group: Partial<WealthCategoryGroup> & { name: string },
): Promise<WealthCategoryGroup> {
  return apiClient.put('/wealth/category-groups', group)
}

export async function deleteCategoryGroup(id: string): Promise<void> {
  return apiClient.delete(`/wealth/category-groups/${id}`)
}

/* ---------------- categories ---------------- */

export async function listCategories(): Promise<WealthCategory[]> {
  return apiClient.get('/wealth/categories')
}

export async function upsertCategory(
  category: Partial<WealthCategory> & {
    name: string
    group_id: string
    kind: WealthCategory['kind']
  },
): Promise<WealthCategory> {
  return apiClient.put('/wealth/categories', category)
}

export async function deleteCategory(id: string): Promise<void> {
  return apiClient.delete(`/wealth/categories/${id}`)
}

/* ---------------- category rules ---------------- */

export async function listCategoryRules(): Promise<WealthCategoryRule[]> {
  return apiClient.get('/wealth/category-rules')
}

export async function upsertCategoryRule(
  rule: Partial<WealthCategoryRule> & { keyword: string; category_id: string },
): Promise<WealthCategoryRule> {
  return apiClient.put('/wealth/category-rules', rule)
}

export async function deleteCategoryRule(id: string): Promise<void> {
  return apiClient.delete(`/wealth/category-rules/${id}`)
}

/* ---------------- statement import ---------------- */

export async function parseStatementPdf(file: File): Promise<{ transactions: ParsedStatementTransaction[] }> {
  const form = new FormData()
  form.append('file', file)
  return apiClient.postForm('/wealth/statements/parse-pdf', form)
}

/* ---------------- entries ---------------- */

export async function listEntries(): Promise<WealthEntry[]> {
  return apiClient.get('/wealth/entries')
}

export async function upsertEntry(
  entry: Partial<WealthEntry> & { type: WealthEntry['type']; amount: number; entry_date: string },
): Promise<WealthEntry> {
  return apiClient.put('/wealth/entries', entry)
}

export async function bulkInsertEntries(
  entries: Array<Partial<WealthEntry> & { type: WealthEntry['type']; amount: number; entry_date: string }>,
): Promise<WealthEntry[]> {
  return apiClient.post('/wealth/entries/bulk', entries)
}

export async function deleteEntry(id: string): Promise<void> {
  return apiClient.delete(`/wealth/entries/${id}`)
}

/* ---------------- budgets ---------------- */

export async function listBudgets(): Promise<WealthBudget[]> {
  return apiClient.get('/wealth/budgets')
}

export async function upsertBudget(
  budget: Partial<WealthBudget> & { category_id: string; amount: number },
): Promise<WealthBudget> {
  return apiClient.put('/wealth/budgets', budget)
}

export async function deleteBudget(id: string): Promise<void> {
  return apiClient.delete(`/wealth/budgets/${id}`)
}

/* ---------------- goals ---------------- */

export async function listGoals(): Promise<WealthGoal[]> {
  return apiClient.get('/wealth/goals')
}

export async function upsertGoal(
  goal: Partial<WealthGoal> & { name: string; goal_type: WealthGoal['goal_type']; target_amount: number },
): Promise<WealthGoal> {
  return apiClient.put('/wealth/goals', goal)
}

export async function deleteGoal(id: string): Promise<void> {
  return apiClient.delete(`/wealth/goals/${id}`)
}

export async function achieveGoal(id: string): Promise<WealthGoal> {
  return apiClient.post(`/wealth/goals/${id}/achieve`)
}

export async function reopenGoal(id: string): Promise<WealthGoal> {
  return apiClient.post(`/wealth/goals/${id}/reopen`)
}

/* ---------------- forecast assumptions ---------------- */

export async function listForecastAssumptions(): Promise<WealthForecastAssumption[]> {
  return apiClient.get('/wealth/assumptions')
}

export async function upsertForecastAssumption(
  assumption: Partial<WealthForecastAssumption> & { name: string; annual_return_rate: number },
): Promise<WealthForecastAssumption> {
  return apiClient.put('/wealth/assumptions', assumption)
}

/* ---------------- scenarios (sandbox what-if drafts) ---------------- */

export async function listScenarios(): Promise<WealthScenario[]> {
  return apiClient.get('/wealth/scenarios')
}

export async function upsertScenario(
  scenario: Partial<WealthScenario> & { name: string },
): Promise<WealthScenario> {
  return apiClient.put('/wealth/scenarios', scenario)
}

export async function deleteScenario(id: string): Promise<void> {
  return apiClient.delete(`/wealth/scenarios/${id}`)
}

export async function getScenarioProjection(id: string): Promise<ScenarioProjectionPoint[]> {
  return apiClient.get(`/wealth/scenarios/${id}/projection`)
}

/* ---------------- watchlist ---------------- */

export async function listWatchlist(): Promise<WealthWatchlistItem[]> {
  return apiClient.get('/wealth/watchlist')
}

export async function upsertWatchlistItem(
  item: Partial<WealthWatchlistItem> & { name: string; item_type: WealthWatchlistItem['item_type'] },
): Promise<WealthWatchlistItem> {
  return apiClient.put('/wealth/watchlist', item)
}

export async function deleteWatchlistItem(id: string): Promise<void> {
  return apiClient.delete(`/wealth/watchlist/${id}`)
}

/* ---------------- topics ---------------- */

export async function listTopics(): Promise<WealthTopic[]> {
  return apiClient.get('/wealth/topics')
}

export async function upsertTopic(
  topic: Partial<WealthTopic> & { title: string; description: string },
): Promise<WealthTopic> {
  return apiClient.put('/wealth/topics', topic)
}

export async function deleteTopic(id: string): Promise<void> {
  return apiClient.delete(`/wealth/topics/${id}`)
}

/* ---------------- analytics (computed server-side) ---------------- */

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return apiClient.get('/wealth/analytics/summary')
}

export async function getProjection(assumptionId?: string): Promise<NetWorthProjectionPoint[]> {
  const query = assumptionId ? `?assumption_id=${assumptionId}` : ''
  return apiClient.get(`/wealth/analytics/projection${query}`)
}

/* ---------------- agents & insights ---------------- */

export async function listAgents(): Promise<AgentInfo[]> {
  return apiClient.get('/agents')
}

export async function runAgent(agentId: string): Promise<AgentRunResult> {
  return apiClient.post(`/agents/${agentId}/run`)
}

export async function listInsights(): Promise<Insight[]> {
  return apiClient.get('/wealth/insights')
}

