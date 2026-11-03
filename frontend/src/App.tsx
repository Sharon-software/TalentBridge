import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { roleSlugs } from './auth/roles'
import { RequireAuth } from './auth/RequireAuth'
import { ToastProvider } from './components/Toast'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RoleDashboardPage } from './pages/RoleDashboardPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<HomeRedirect />} />
                  <Route path=":role/:section?" element={<RoleDashboardPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function HomeRedirect() {
  const { user } = useAuth()
  return user ? <Navigate to={`/${roleSlugs[user.role]}/dashboard`} replace /> : <Outlet />
}

export default App