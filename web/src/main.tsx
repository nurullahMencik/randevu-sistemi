import './fonts.css'
import './index.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from './app/queryClient'
import { router } from './app/router'
import { ServerWakeGate } from './components/ServerWakeGate'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './lib/auth'
import { I18nProvider } from './lib/i18n/I18nProvider'
import { ThemeProvider } from './lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>
              <ServerWakeGate>
                <RouterProvider router={router} />
              </ServerWakeGate>
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
