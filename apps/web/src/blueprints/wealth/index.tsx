import { BarChart3, Bot, CreditCard, Home, Landmark, PiggyBank, Receipt, Tags, Target, UploadCloud, Wallet } from 'lucide-react'
import type { Blueprint } from '@/core/blueprints/types'
import { WealthDataProvider } from './hooks'
import { WealthDashboardWidget } from './components/WealthDashboardWidget'
import { WealthOverviewPage } from './pages/WealthOverviewPage'
import { AccountsPage } from './pages/AccountsPage'
import { AssetsPage } from './pages/AssetsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { EntriesPage } from './pages/EntriesPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { GoalsPage } from './pages/GoalsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ImportPage } from './pages/ImportPage'
import { StatementImportPage } from './pages/StatementImportPage'
import { InsightsPage } from './pages/InsightsPage'

function withData(children: React.ReactNode) {
  return <WealthDataProvider>{children}</WealthDataProvider>
}

export const wealthBlueprint: Blueprint = {
  id: 'wealth',
  name: 'Wealth',
  description: 'Accounts, budgets, goals and deterministic financial forecasting.',
  version: '0.1.0',
  icon: Wallet,
  basePath: 'wealth',
  navItems: [
    { path: '', label: 'Overview', icon: Wallet, end: true },
    { path: 'accounts', label: 'Accounts', icon: Landmark },
    { path: 'assets', label: 'Assets', icon: Home },
    { path: 'categories', label: 'Categories', icon: Tags },
    { path: 'entries', label: 'Entries', icon: Receipt },
    { path: 'budgets', label: 'Budgets', icon: PiggyBank },
    { path: 'goals', label: 'Goals', icon: Target },
    { path: 'analytics', label: 'Analytics', icon: BarChart3 },
    { path: 'insights', label: 'Insights', icon: Bot },
    { path: 'import', label: 'Import CSV', icon: UploadCloud },
    { path: 'statement-import', label: 'Card Statement', icon: CreditCard },
  ],
  routes: [
    { path: '', element: withData(<WealthOverviewPage />) },
    { path: 'accounts', element: withData(<AccountsPage />) },
    { path: 'assets', element: withData(<AssetsPage />) },
    { path: 'categories', element: withData(<CategoriesPage />) },
    { path: 'entries', element: withData(<EntriesPage />) },
    { path: 'budgets', element: withData(<BudgetsPage />) },
    { path: 'goals', element: withData(<GoalsPage />) },
    { path: 'analytics', element: withData(<AnalyticsPage />) },
    { path: 'insights', element: withData(<InsightsPage />) },
    { path: 'import', element: withData(<ImportPage />) },
    { path: 'statement-import', element: withData(<StatementImportPage />) },
  ],
  DashboardWidget: (props) => withData(<WealthDashboardWidget {...props} />),
}
