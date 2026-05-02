import { useState, useEffect, useRef } from 'react'
import api from '../../api/axios'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { SearchFilter } from '../../components/SearchFilter'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useSearchFilters } from '../../hooks/useSearchFilters'
import { formatStatus, formatDate } from '../../utils/formatting'
import { RegistrationStatus } from '../../types'
import type { Event, BulkConflict } from '../../types'

interface RegistrationDetail {
  id: string
  workerId: string
  positionId: string
  status: RegistrationStatus
  createdAt: string
  workerName?: string
  workerEmail?: string
  workerPhone?: string
  workerDateOfBirth?: string
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [conflicts, setConflicts] = useState<BulkConflict[] | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; action: () => void | Promise<void>; title: string; message: string; variant?: 'danger' | 'warning' } | null>(null)
  const { state, setField, clear } = useSearchFilters({ search: '', status: '' })
  const selectAllRef = useRef<HTMLInputElement>(null)

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
  }, [selectedEventId, state.search, state.status])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < registrations.length
    }
  }, [selectedIds, registrations])

  const loadRegistrations = async () => {
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (state.search) params.search = state.search
      if (state.status) params.status = state.status
      const response = await api.get(`/events/${selectedEventId}/registrations`, { params })
      const sorted = [...response.data].sort((a, b) => new Date(b.positionDate || '').getTime() - new Date(a.positionDate || '').getTime())
      setRegistrations(sorted)
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

  const handleReject = (registrationId: string, isApproved: boolean) => {
    const title = isApproved ? 'Cancel Approval' : 'Reject Registration'
    const message = isApproved
      ? 'Cancel this approved registration? The worker will lose access to this position.'
      : 'Reject this registration?'
    setConfirmState({
      open: true,
      title,
      message,
      variant: 'warning',
      action: async () => {
        try {
          await api.put(`/registrations/${registrationId}/reject`)
          loadRegistrations()
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to update registration')
        }
      }
    })
  }

  const handleDelete = (registrationId: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Registration',
      message: 'Permanently delete this registration and all related time records?',
      variant: 'danger',
      action: async () => {
        try {
          await api.delete(`/registrations/${registrationId}`)
          loadRegistrations()
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete registration')
        }
      }
    })
  }

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setConfirmState({
      open: true,
      title: 'Approve Registrations',
      message: `Approve ${ids.length} registration(s)?`,
      action: async () => {
        setBulkLoading(true)
        try {
          await api.post('/registrations/bulk-approve', { ids })
          await loadRegistrations()
          setSelectedIds(new Set())
        } catch (e: any) {
          if (e.response?.status === 400 && e.response?.data?.conflicts) {
            setConflicts(e.response.data.conflicts)
          } else {
            setError(e.response?.data?.message || 'Bulk approve failed')
            setSelectedIds(new Set())
          }
        } finally {
          setBulkLoading(false)
        }
      }
    })
  }

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setConfirmState({
      open: true,
      title: 'Reject Registrations',
      message: `Reject ${ids.length} registration(s)?`,
      variant: 'warning',
      action: async () => {
        setBulkLoading(true)
        try {
          await api.post('/registrations/bulk-reject', { ids })
          await loadRegistrations()
          setSelectedIds(new Set())
        } catch (e: any) {
          setError(e.response?.data?.message || 'Bulk reject failed')
          setSelectedIds(new Set())
        } finally {
          setBulkLoading(false)
        }
      }
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setConfirmState({
      open: true,
      title: 'Delete Registrations',
      message: `Delete ${ids.length} registration(s)? This action cannot be undone.`,
      variant: 'danger',
      action: async () => {
        setBulkLoading(true)
        try {
          await api.post('/registrations/bulk-delete', { ids })
          await loadRegistrations()
          setSelectedIds(new Set())
        } catch (e: any) {
          setError(e.response?.data?.message || 'Bulk delete failed')
          setSelectedIds(new Set())
        } finally {
          setBulkLoading(false)
        }
      }
    })
  }

  const handleApproveAllPending = () => {
    const pendingIds = registrations
      .filter((r) => r.status === 'PENDING')
      .map((r) => r.id)
    if (pendingIds.length === 0) return
    setConfirmState({
      open: true,
      title: 'Approve All Pending',
      message: `Approve all ${pendingIds.length} pending registration(s)?`,
      action: async () => {
        try {
          await api.post('/registrations/bulk-approve', { ids: pendingIds })
          await loadRegistrations()
          setSelectedIds(new Set())
        } catch (e: any) {
          if (e.response?.status === 400 && e.response?.data?.conflicts) {
            setConflicts(e.response.data.conflicts)
          } else {
            setError(e.response?.data?.message || 'Approve all pending failed')
            setSelectedIds(new Set())
          }
        }
      }
    })
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
      <ConfirmDialog
        open={confirmState?.open ?? false}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        onConfirm={async () => { await confirmState?.action(); setConfirmState(null); }}
        onCancel={() => setConfirmState(null)}
        variant={confirmState?.variant}
      />
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
          onChange={(e) => { setSelectedEventId(e.target.value); setSelectedIds(new Set()); }}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      <SearchFilter
        searchPlaceholder="Search workers…"
        search={state.search}
        onSearchChange={(v) => setField('search', v)}
        quickFilters={[
          { key: 'pending', label: 'Pending', field: 'status', value: 'PENDING' },
          { key: 'approved', label: 'Approved', field: 'status', value: 'APPROVED' },
          { key: 'rejected', label: 'Rejected', field: 'status', value: 'REJECTED' }
        ]}
        activeFilters={{ status: state.status }}
        onFilterToggle={(field, value) => setField(field, value)}
        resultCount={registrations.length}
        onClear={clear}
      />

      {registrations.length > 0 && (() => {
        const selectedEvent = events.find((e) => e.id === selectedEventId)
        const pendingCount = registrations.filter((r) => r.status === 'PENDING').length
        return (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg mb-0">
            <div className="flex items-center justify-between mb-2">
              <strong>{selectedEvent?.name}</strong>
              {pendingCount > 0 && (
                <button
                  onClick={handleApproveAllPending}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                >
                  ⚡ Approve all pending ({pendingCount})
                </button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2 items-center text-sm">
                <span className="text-slate-600">{selectedIds.size} of {registrations.length} selected</span>
                <button onClick={handleBulkApprove} disabled={bulkLoading} className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Approve</button>
                <button onClick={handleBulkReject} disabled={bulkLoading} className="px-2.5 py-1 bg-amber-500 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Reject</button>
                <button onClick={handleBulkDelete} disabled={bulkLoading} className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed">Delete</button>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-500">Clear</button>
              </div>
            )}
          </div>
        )
      })()}

      {registrations.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          {state.search || state.status
            ? 'No registrations match the current filter.'
            : 'No registrations for this event yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="w-8 p-2">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={registrations.length > 0 && selectedIds.size === registrations.length}
                    onChange={() => {
                      if (selectedIds.size === registrations.length) {
                        setSelectedIds(new Set())
                      } else {
                        setSelectedIds(new Set(registrations.map((r) => r.id)))
                      }
                    }}
                  />
                </th>
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
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(reg.id)}
                        onChange={() => {
                          const next = new Set(selectedIds)
                          if (next.has(reg.id)) next.delete(reg.id)
                          else next.add(reg.id)
                          setSelectedIds(next)
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{reg.workerName || 'Worker'}</div>
                      {reg.workerEmail && (
                        <div className="text-xs text-gray-500">{reg.workerEmail}</div>
                      )}
                      {reg.workerPhone && (
                        <div className="text-xs text-gray-500">{reg.workerPhone}</div>
                      )}
                      {reg.workerDateOfBirth && (
                        <div className="text-xs text-gray-500">{formatDate(reg.workerDateOfBirth)}</div>
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

      {conflicts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setConflicts(null); }}>
          <div className="bg-white rounded-lg max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-red-600 mb-2">Capacity exceeded</h3>
            <p className="text-sm text-slate-600 mb-3">
              Cannot approve these registrations as they would exceed position capacity. No registrations were changed.
            </p>
            <ul className="space-y-2 mb-4">
              {conflicts.map((c) => (
                <li key={c.registrationId} className="text-sm border border-slate-200 rounded p-2">
                  <div className="font-semibold">{c.positionName}</div>
                  <div className="text-xs text-slate-500">Currently approved {c.currentApprovedCount} of {c.capacity}</div>
                </li>
              ))}
            </ul>
            <button onClick={() => { setConflicts(null); }} className="w-full py-2 bg-slate-800 text-white rounded font-semibold">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
