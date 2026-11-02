import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from './api'
import type {
  AdminService,
  AdminStaff,
  Appointment,
  AppointmentStatus,
  Availability,
  BusinessInfo,
  Dashboard,
  DayAvailability,
  MyAppointments,
  Paged,
  Schedule,
  Service,
  Staff,
  WorkingHours,
} from './types'

// Public data is keyed under 'public' so logging out keeps it cached.
export const keys = {
  business: ['public', 'business'] as const,
  services: ['public', 'services'] as const,
  staff: (serviceId?: string) => ['public', 'staff', serviceId ?? 'all'] as const,
  availability: (serviceId: string, staffId: string | null, date: string) => ['public', 'availability', serviceId, staffId ?? 'any', date] as const,
  availabilityDays: (serviceId: string, staffId: string | null, from: string) => ['public', 'availability-days', serviceId, staffId ?? 'any', from] as const,
  myAppointments: ['me', 'appointments'] as const,
  mySchedule: (from: string, to: string) => ['me', 'schedule', from, to] as const,
  dashboard: (days: number) => ['admin', 'dashboard', days] as const,
  calendar: (from: string, to: string) => ['admin', 'calendar', from, to] as const,
  adminAppointments: (filters: AppointmentFilters) => ['admin', 'appointments', filters] as const,
  adminServices: ['admin', 'services'] as const,
  adminStaff: ['admin', 'staff'] as const,
}

export const useBusiness = () =>
  useQuery({ queryKey: keys.business, queryFn: () => api.get<BusinessInfo>('/api/business'), staleTime: 5 * 60_000 })

export const useServices = () =>
  useQuery({ queryKey: keys.services, queryFn: () => api.get<Service[]>('/api/services'), staleTime: 5 * 60_000 })

export const useStaff = (serviceId?: string) =>
  useQuery({
    queryKey: keys.staff(serviceId),
    queryFn: () => api.get<Staff[]>(`/api/staff${qs({ serviceId })}`),
    staleTime: 5 * 60_000,
  })

export const useAvailability = (serviceId: string | null, staffId: string | null, date: string | null) =>
  useQuery({
    queryKey: keys.availability(serviceId ?? '', staffId, date ?? ''),
    queryFn: () => api.get<Availability>(`/api/availability${qs({ serviceId, staffId, date })}`),
    enabled: Boolean(serviceId && date),
    staleTime: 15_000,
    refetchInterval: 60_000,
  })

export const useAvailabilityDays = (serviceId: string | null, staffId: string | null, from: string | null, days = 14) =>
  useQuery({
    queryKey: keys.availabilityDays(serviceId ?? '', staffId, from ?? ''),
    queryFn: () => api.get<DayAvailability[]>(`/api/availability/days${qs({ serviceId, staffId, from, days })}`),
    enabled: Boolean(serviceId && from),
    staleTime: 30_000,
  })

export function useCreateAppointment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { serviceId: string; staffId: string | null; startUtc: string; notes: string | null }) =>
      api.post<Appointment>('/api/appointments', body),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['public', 'availability'] })
      void client.invalidateQueries({ queryKey: ['public', 'availability-days'] })
      void client.invalidateQueries({ queryKey: keys.myAppointments })
      void client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export const useMyAppointments = (enabled = true) =>
  useQuery({ queryKey: keys.myAppointments, queryFn: () => api.get<MyAppointments>('/api/me/appointments'), enabled })

export function useCancelAppointment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Appointment>(`/api/appointments/${id}/cancel`),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.myAppointments })
      void client.invalidateQueries({ queryKey: ['admin'] })
      void client.invalidateQueries({ queryKey: ['me', 'schedule'] })
      void client.invalidateQueries({ queryKey: ['public', 'availability'] })
    },
  })
}

export const useMySchedule = (from: string, to: string) =>
  useQuery({
    queryKey: keys.mySchedule(from, to),
    queryFn: () => api.get<Schedule>(`/api/me/schedule${qs({ from, to })}`),
    placeholderData: keepPreviousData,
  })

export const useDashboard = (days: number) =>
  useQuery({
    queryKey: keys.dashboard(days),
    queryFn: () => api.get<Dashboard>(`/api/admin/dashboard${qs({ days })}`),
    placeholderData: keepPreviousData,
  })

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: keys.calendar(from, to),
    queryFn: () => api.get<Schedule>(`/api/admin/calendar${qs({ from, to })}`),
    placeholderData: keepPreviousData,
  })

export interface AppointmentFilters {
  from: string
  to: string
  staffId: string
  serviceId: string
  status: AppointmentStatus | ''
  search: string
  page: number
  descending: boolean
}

export const useAdminAppointments = (filters: AppointmentFilters) =>
  useQuery({
    queryKey: keys.adminAppointments(filters),
    queryFn: () =>
      api.get<Paged<Appointment>>(
        `/api/admin/appointments${qs({ ...filters, pageSize: 12, descending: filters.descending || undefined })}`,
      ),
    placeholderData: keepPreviousData,
  })

export function useUpdateAppointmentStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Completed' | 'NoShow' }) =>
      api.patch<Appointment>(`/api/admin/appointments/${id}/status`, { status }),
    onSettled: () => void client.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export const useAdminServices = () =>
  useQuery({ queryKey: keys.adminServices, queryFn: () => api.get<AdminService[]>('/api/admin/services') })

export interface ServiceInput {
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  sortOrder: number
}

export function useSaveService() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ServiceInput }) =>
      id ? api.put<AdminService>(`/api/admin/services/${id}`, body) : api.post<AdminService>('/api/admin/services', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] })
      void client.invalidateQueries({ queryKey: keys.services })
    },
  })
}

export function useDeleteService() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/services/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] })
      void client.invalidateQueries({ queryKey: keys.services })
    },
  })
}

export const useAdminStaff = () =>
  useQuery({ queryKey: keys.adminStaff, queryFn: () => api.get<AdminStaff[]>('/api/admin/staff') })

export interface StaffInput {
  fullName: string
  title: string
  color: string
  bio: string | null
  isActive: boolean
  serviceIds: string[]
  workingHours: WorkingHours[]
  timeOff: { date: string; reason: string | null }[]
}

export function useSaveStaff() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: StaffInput }) =>
      id ? api.put<AdminStaff>(`/api/admin/staff/${id}`, body) : api.post<AdminStaff>('/api/admin/staff', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] })
      void client.invalidateQueries({ queryKey: ['public'] })
    },
  })
}

export function useDeleteStaff() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/staff/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] })
      void client.invalidateQueries({ queryKey: ['public'] })
    },
  })
}
