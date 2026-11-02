import { createBrowserRouter } from 'react-router'
import { BookingPage } from '../features/booking/BookingPage'
import { RequireRole } from './guards'
import { NotFound } from './NotFound'
import { RootLayout, RouteFallback } from './RootLayout'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: RootLayout,
      HydrateFallback: RouteFallback,
      children: [
        { index: true, Component: BookingPage },
        { path: 'login', lazy: async () => ({ Component: (await import('../features/auth/LoginPage')).LoginPage }) },
        { path: 'register', lazy: async () => ({ Component: (await import('../features/auth/RegisterPage')).RegisterPage }) },
        {
          path: 'appointments',
          lazy: async () => {
            const { MyAppointmentsPage } = await import('../features/appointments/MyAppointmentsPage')
            return {
              Component: () => (
                <RequireRole roles={['Customer']}>
                  <MyAppointmentsPage />
                </RequireRole>
              ),
            }
          },
        },
        {
          path: 'staff',
          lazy: async () => {
            const { StaffSchedulePage } = await import('../features/staff/StaffSchedulePage')
            return {
              Component: () => (
                <RequireRole roles={['Staff']}>
                  <StaffSchedulePage />
                </RequireRole>
              ),
            }
          },
        },
        {
          path: 'admin',
          lazy: async () => {
            const { AdminLayout } = await import('../features/admin/AdminLayout')
            return {
              Component: () => (
                <RequireRole roles={['Admin']}>
                  <AdminLayout />
                </RequireRole>
              ),
            }
          },
          children: [
            { index: true, lazy: async () => ({ Component: (await import('../features/admin/DashboardPage')).DashboardPage }) },
            { path: 'calendar', lazy: async () => ({ Component: (await import('../features/admin/CalendarPage')).CalendarPage }) },
            { path: 'appointments', lazy: async () => ({ Component: (await import('../features/admin/AppointmentsPage')).AppointmentsPage }) },
            { path: 'services', lazy: async () => ({ Component: (await import('../features/admin/ServicesPage')).ServicesPage }) },
            { path: 'staff', lazy: async () => ({ Component: (await import('../features/admin/StaffPage')).StaffPage }) },
          ],
        },
        { path: '*', Component: NotFound },
      ],
    },
  ],
  { basename },
)
