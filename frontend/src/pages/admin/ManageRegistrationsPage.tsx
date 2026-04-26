import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { formatStatus, formatDate } from '../../utils/formatting'
import { RegistrationStatus } from '../../types'
import type { Event } from '../../types'

interface RegistrationDetail {
  id: string
  workerId: string
  positionId: string
  status: RegistrationStatus
  createdAt: string
  workerName?: string
  workerEmail?: string
  positionName?: string
  positionDate?: string
  positionStartTime?: string
  positionEndTime?: string
}

export function ManageRegistrationsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await api.get('/events/my')
      setEvents(response.data)
      if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEventId) {
      loadRegistrations()
    }
  }, [selectedEventId])

  const loadRegistrations = async () => {
    try {
      const response = await api.get(`/events/${selectedEventId}/registrations`)
      setRegistrations(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load registrations')
    }
  }

  const handleApprove = async (registrationId: string) => {
    try {
      await api.put(`/registrations/${registrationId}/approve`)
      loadRegistrations()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve registration')
    }
  }

  const handleReject = async (registrationId: string, isApproved: boolean) => {
    const msg = isApproved
      ? 'Cancel this approved registration? The worker will lose access to this position.'
      : 'Reject this registration?'
    if (!confirm(msg)) return
    try {
      await api.put(`/registrations/${registrationId}/reject`)
      loadRegistrations()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update registration')
    }
  }

  const handleDelete = async (registrationId: string) => {
    if (!confirm('Permanently delete this registration and all related time records?')) return
    try {
      await api.delete(`/registrations/${registrationId}`)
      loadRegistrations()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete registration')
    }
  }

  if (loading) return <LoadingSpinner message="Loading registrations..." fullScreen />

  if (events.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Manage Registrations</h1>
        <EmptyState
          title="No events yet"
          message="Create an event first to manage registrations."
          actionLabel="Manage Events"
          actionTo="/admin/manage-events"
        />
      </div>
    )
  }

  const statusColors = {
    [RegistrationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RegistrationStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RegistrationStatus.REJECTED]: 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Manage Registrations</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Event
        </label>
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          No registrations for this event yet.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Worker</th>
                <th className="px-6 py-3 text-left font-semibold">Position</th>
                <th className="px-6 py-3 text-left font-semibold">Date & Time</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Applied</th>
                <th className="px-6 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registrations.map((reg) => {
                const isApproved = reg.status === RegistrationStatus.APPROVED
                const isPending = reg.status === RegistrationStatus.PENDING
                return (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium">{reg.workerName || 'Worker'}</div>
                      {reg.workerEmail && (
                        <div className="text-xs text-gray-500">{reg.workerEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">{reg.positionName || 'Position'}</td>
                    <td className="px-6 py-4 text-sm">
                      {reg.positionDate && reg.positionStartTime && reg.positionEndTime
                        ? <>{reg.positionDate}<br/>{reg.positionStartTime}–{reg.positionEndTime}</>
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[reg.status]}`}>
                        {formatStatus(reg.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDate(reg.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(reg.id)}
                              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(reg.id, false)}
                              className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <button
                            onClick={() => handleReject(reg.id, true)}
                            className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 text-sm font-medium"
                          >
                            Cancel Approval
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(reg.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
