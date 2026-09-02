import { AppRoutes } from './routes/index.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

export function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}