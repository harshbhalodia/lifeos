import { apiClient } from '@/lib/apiClient'
import type {
  AgentInfo,
  AgentRunResult,
  AnalyticsSummary,
  Insight,
  NetWorthProjectionPoint,
  WealthAccount,
  WealthAsset,
  WealthBudget,
  WealthCategory,
  WealthCategoryGroup,
  WealthEntry,
  WealthForecastAssumption,
  WealthGoal,
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

