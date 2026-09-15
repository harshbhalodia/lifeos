import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/core/auth/AuthContext'
import { RequireAuth } from '@/core/auth/RequireAuth'
import { LoginPage } from '@/core/auth/LoginPage'
import { AppShell } from '@/core/layout/AppShell'
import { DashboardPage } from '@/core/dashboard/DashboardPage'
import { BlueprintsPage } from '@/core/blueprints/BlueprintsPage'
import { SettingsPage } from '@/core/settings/SettingsPage'
import { blueprints } from '@/core/blueprints/registry'

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/blueprints" element={<BlueprintsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {blueprints.map((bp) =>
              bp.routes.map((route) => (
                <Route
                  key={`${bp.id}-${route.path}`}
                  path={`/life/${bp.basePath}/${route.path}`.replace(/\/+$/, '') || `/life/${bp.basePath}`}
                  element={route.element}
                />
              )),
            )}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
