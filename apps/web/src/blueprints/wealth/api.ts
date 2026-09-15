import { apiClient } from '@/lib/apiClient'
import type {
  AgentInfo,
  AgentRunResult,
  AnalyticsSummary,
  Insight,
  NetWorthProjectionPoint,
  WealthAccount,
  WealthBudget,
  WealthCategory,
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

/* ---------------- categories ---------------- */

export async function listCategories(): Promise<WealthCategory[]> {
  return apiClient.get('/wealth/categories')
}

export async function upsertCategory(
  category: Partial<WealthCategory> & {
    name: string
    group: WealthCategory['group']
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
  budget: Partial<WealthBudget> & { category_id: string; monthly_amount: number },
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

