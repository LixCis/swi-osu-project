export const Role = {
  WORKER: 'WORKER',
  ADMIN: 'ADMIN'
} as const

export type Role = typeof Role[keyof typeof Role]

export const RegistrationStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const

export type RegistrationStatus = typeof RegistrationStatus[keyof typeof RegistrationStatus]

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string
  role: Role
}

export interface Event {
  id: string
  name: string
  description: string
  location: string
  startDate: string
  endDate: string
}

export interface Position {
  id: string
  name: string
  capacity: number
  hourlyRate: number
  eventId: string
  date: string
  startTime: string
  endTime: string
}

export interface Registration {
  id: string
  workerId: string
  positionId: string
  status: RegistrationStatus
  createdAt: string
  eventName?: string
  positionName?: string
  positionDate?: string
  positionStartTime?: string
  positionEndTime?: string
}

export interface BreakRecord {
  id: string
  startTime: string
  endTime: string | null
}

export interface TimeRecord {
  id: string
  workerId: string
  workerName: string
  registrationId: string
  positionName: string
  eventName: string
  clockIn: string
  clockOut: string | null
  onBreak: boolean
  computedHours: number
  breaks: BreakRecord[]
}

export interface TimeRecordAdmin {
  id: string
  workerId: string
  workerName: string
  workerEmail: string
  registrationId: string
  positionName: string
  eventName: string
  clockIn: string
  clockOut: string | null
  computedHours: number
  hourlyRate: number
  totalAmount: number
  breaks: BreakRecord[]
}

export interface WorkerSummary {
  workerId: string
  workerName: string
  workerEmail: string
  positionName: string
  hours: number
  hourlyRate: number
  cost: number
  timeRecords: TimeRecordAdmin[]
}

export interface DashboardData {
  totalWorkers: number
  totalHours: number
  totalCost: number
  workers: WorkerSummary[]
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string, phone: string, dateOfBirth: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}
