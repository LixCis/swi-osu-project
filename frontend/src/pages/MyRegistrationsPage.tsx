import { useState, useEffect } from 'react'
import api from '../api/axios'
import { TimeTracker } from '../components/TimeTracker'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState } from '../components/EmptyState'
import { SearchFilter } from '../components/SearchFilter'
import { useSearchFilters } from '../hooks/useSearchFilters'
import { RegistrationStatus } from '../types'
import { formatStatus, formatDate } from '../utils/formatting'
import type { Registration } from '../types'

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { state, setField, clear } = useSearchFilters({ search: '', status: '' })

  useEffect(() => {
    loadRegistrations()
  }, [state.status, state.search])

  const loadRegistrations = async () => {
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (state.status) params.status = state.status
      if (state.search) params.search = state.search
      const response = await api.get('/registrations/my', { params })
      setRegistrations(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load registrations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading registrations..." fullScreen />

  const statusColors = {
    [RegistrationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RegistrationStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RegistrationStatus.REJECTED]: 'bg-red-100 text-red-800'
  }

  const quickFilters = [
    { key: 'pending', label: 'Pending', field: 'status', value: 'PENDING' },
    { key: 'approved', label: 'Approved', field: 'status', value: 'APPROVED' },
    { key: 'rejected', label: 'Rejected', field: 'status', value: 'REJECTED' }
  ]

  const groupedByEvent = registrations.reduce((acc, reg) => {
    const eventName = reg.eventName || 'Event'
    if (!acc[eventName]) {
      acc[eventName] = []
    }
    acc[eventName].push(reg)
    return acc
  }, {} as Record<string, Registration[]>)

  const eventNames = Object.keys(groupedByEvent).sort((a, b) => {
    const aLatest = groupedByEvent[a].reduce((max, reg) => {
      const date = new Date(reg.positionDate).getTime()
      return date > max ? date : max
    }, 0)
    const bLatest = groupedByEvent[b].reduce((max, reg) => {
      const date = new Date(reg.positionDate).getTime()
      return date > max ? date : max
    }, 0)
    return bLatest - aLatest
  })

  Object.keys(groupedByEvent).forEach((eventName) => {
    groupedByEvent[eventName].sort((a, b) => {
      return new Date(b.positionDate).getTime() - new Date(a.positionDate).getTime()
    })
  })

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">My Registrations</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <SearchFilter
        search={state.search}
        onSearchChange={(v) => setField('search', v)}
        quickFilters={quickFilters}
        activeFilters={{ status: state.status }}
        onFilterToggle={(field, value) => setField(field, value)}
        resultCount={registrations.length}
        onClear={clear}
      />

      {registrations.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          message="Browse available events and register for positions."
          actionLabel="Browse Events"
          actionTo="/events"
        />
      ) : (
        <div className="space-y-8">
          {eventNames.map((eventName) => (
            <div key={eventName}>
              <h2 className="text-2xl font-bold mb-4">{eventName}</h2>
              <div className="space-y-4">
                {groupedByEvent[eventName].map((reg) => (
                  <div key={reg.id} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-gray-800 font-semibold mb-2">
                          {reg.positionName || 'Position'}
                        </p>
                        <p className="text-gray-600 mb-1">
                          <strong>Date:</strong> {formatDate(reg.positionDate || '')}
                        </p>
                        <p className="text-gray-600">
                          <strong>Time:</strong> {reg.positionStartTime} – {reg.positionEndTime}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusColors[reg.status]}`}>
                        {formatStatus(reg.status)}
                      </span>
                    </div>

                    {reg.status === RegistrationStatus.APPROVED && (
                      <div className="mt-6 pt-6 border-t">
                        <TimeTracker
                          registrationId={reg.id}
                          onStateChange={loadRegistrations}
                          positionDate={reg.positionDate}
                          positionStartTime={reg.positionStartTime}
                          positionEndTime={reg.positionEndTime}
                        />
                      </div>
                    )}
                    {reg.status === RegistrationStatus.PENDING && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        Waiting for admin approval. Once approved, you can start tracking time.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
