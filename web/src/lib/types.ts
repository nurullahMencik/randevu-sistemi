// Mirrors the API contracts (camelCase JSON, enums as strings, dates as ISO strings).

export type UserRole = 'Customer' | 'Staff' | 'Admin'
export type AppointmentStatus = 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow'
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

export interface User {
  id: string
  email: string
  fullName: string
  phone: string | null
  role: UserRole
  staffId: string | null
}

export interface AuthResponse {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: User
}

export interface BusinessInfo {
  name: string
  branch: string
  address: string
  phone: string
  timeZone: string
  openDays: DayOfWeek[]
  openingTime: string
  closingTime: string
  slotStepMinutes: number
  cancellationNoticeHours: number
  bookingHorizonDays: number
  today: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
}

export interface Staff {
  id: string
  fullName: string
  title: string
  color: string
  bio: string | null
  serviceIds: string[]
  workingDays: DayOfWeek[]
}

export interface Slot {
  startUtc: string
  endUtc: string
  localTime: string
  staffIds: string[]
}

export interface Availability {
  date: string
  serviceId: string
  staffId: string | null
  timeZone: string
  slots: Slot[]
}

export interface DayAvailability {
  date: string
  isOpen: boolean
  availableSlots: number
}

export interface Appointment {
  id: string
  startUtc: string
  endUtc: string
  status: AppointmentStatus
  price: number
  notes: string | null
  service: { id: string; name: string; durationMinutes: number }
  staff: { id: string; fullName: string; color: string }
  customer: { id: string; fullName: string; email: string; phone: string | null } | null
  canCancel: boolean
  cancellationDeadlineUtc: string
  createdAtUtc: string
}

export interface MyAppointments {
  upcoming: Appointment[]
  past: Appointment[]
}

export interface WorkingHours {
  dayOfWeek: DayOfWeek
  start: string
  end: string
  breakStart: string | null
  breakEnd: string | null
}

export interface TimeOff {
  date: string
  reason: string | null
}

export interface CalendarStaff {
  id: string
  fullName: string
  title: string
  color: string
  workingHours: WorkingHours[]
  timeOff: TimeOff[]
}

export interface Schedule {
  from: string
  to: string
  timeZone: string
  openingTime: string
  closingTime: string
  openDays: DayOfWeek[]
  staff: CalendarStaff[]
  appointments: Appointment[]
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface Kpi {
  value: number
  previous: number
  changePercent: number | null
}

export interface Dashboard {
  rangeDays: number
  from: string
  to: string
  today: string
  revenue: Kpi
  appointments: Kpi
  occupancy: Kpi
  averageTicket: Kpi
  popularService: { serviceId: string; name: string; count: number; share: number } | null
  cancellationRate: number
  todayAppointments: number
  nextSevenDaysAppointments: number
  nextSevenDaysRevenue: number
  staff: {
    staffId: string
    fullName: string
    color: string
    appointments: number
    revenue: number
    bookedMinutes: number
    availableMinutes: number
    occupancy: number
  }[]
  services: { serviceId: string; name: string; count: number; revenue: number }[]
  daily: {
    date: string
    isOpen: boolean
    isFuture: boolean
    revenue: number
    appointments: number
    cancelled: number
    occupancy: number
  }[]
}

export interface AdminService {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  sortOrder: number
  staffCount: number
  upcomingAppointments: number
}

export interface AdminStaff {
  id: string
  fullName: string
  title: string
  color: string
  bio: string | null
  isActive: boolean
  email: string | null
  serviceIds: string[]
  workingHours: WorkingHours[]
  timeOff: TimeOff[]
  upcomingAppointments: number
}

export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  code?: string
  traceId?: string
  errors?: Record<string, string[]>
}
