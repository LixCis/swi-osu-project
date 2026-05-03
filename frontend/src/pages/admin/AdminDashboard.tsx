import { useState, useEffect, useCallback } from 'react'
import api from '../../api/axios'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { formatHours, formatDateTime } from '../../utils/formatting'
import { getErrorMessage } from '../../utils/errors'
import type { DashboardData, WorkerSummary, TimeRecordAdmin } from '../../types'
import { useLiveDashboard } from '../../hooks/useLiveDashboard'
import { useMyEvents } from '../../hooks/useMyEvents'
import { LiveKanban } from '../../components/LiveKanban'

export function AdminDashboard() {
  const { events, selectedEventId, setSelectedEventId, loading, error, setError } = useMyEvents()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    if (!selectedEventId) return
    try {
      const response = await api.get<DashboardData>(`/dashboard/event/${selectedEventId}`)
      setDashboardData(response.data)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard data'))
    }
  }, [selectedEventId, setError])

  const { workers: liveWorkers, connected, setInitial } = useLiveDashboard(selectedEventId, loadDashboardData)

  const [prevSelectedId, setPrevSelectedId] = useState(selectedEventId)
  if (prevSelectedId !== selectedEventId) {
    setPrevSelectedId(selectedEventId)
    setExpandedWorker(null)
    setDashboardData(null)
  }

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    api.get<DashboardData>(`/dashboard/event/${selectedEventId}`)
      .then((res) => {
        if (cancelled) return
        setDashboardData(res.data)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Failed to load dashboard data'))
      })
    return () => { cancelled = true }
  }, [selectedEventId, setError])

  useEffect(() => {
    if (dashboardData?.liveWorkers) {
      setInitial(dashboardData.liveWorkers)
    }
  }, [dashboardData, setInitial])

  if (loading) return <LoadingSpinner message="Loading dashboard..." fullScreen />

  if (events.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
        <EmptyState
          title="No events yet"
          message="Create an event to see its dashboard here."
          actionLabel="Manage Events"
          actionTo="/admin/manage-events"
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

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

      {dashboardData && (
        <>
          {selectedEventId && (
            <LiveKanban workers={Array.from(liveWorkers.values())} connected={connected} />
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm text-gray-500 mb-2">Total Workers</h3>
              <p className="text-4xl font-bold text-blue-600">
                {dashboardData.totalWorkers}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm text-gray-500 mb-2">Total Hours</h3>
              <p className="text-4xl font-bold font-mono text-green-600">
                {formatHours(dashboardData.totalHours)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm text-gray-500 mb-2">Total Cost</h3>
              <p className="text-4xl font-bold text-red-600">
                {(dashboardData.totalCost ?? 0).toFixed(2)} <span className="text-xl">CZK</span>
              </p>
            </div>
          </div>

          {dashboardData.workers && dashboardData.workers.length > 0 ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Workers</h2>
              <p className="text-sm text-gray-500 mb-3">Click a worker to see their full audit trail.</p>
              <div className="space-y-3">
                {dashboardData.workers.map((worker: WorkerSummary) => {
                  const isExpanded = expandedWorker === String(worker.workerId)
                  return (
                    <div key={worker.workerId} className="bg-white rounded-lg shadow overflow-hidden">
                      <button
                        type="button"
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 text-left"
                        onClick={() => setExpandedWorker(isExpanded ? null : String(worker.workerId))}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          <div>
                            <p className="font-bold text-lg">{worker.workerName}</p>
                            <p className="text-sm text-gray-500">{worker.workerEmail}</p>
                            <p className="text-sm text-gray-600">Position: {worker.positionName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-green-700">
                            {formatHours(worker.hours)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {(worker.cost ?? 0).toFixed(2)} CZK
                          </p>
                        </div>
                      </button>

                      {isExpanded && worker.timeRecords && (
                        <div className="border-t p-4 bg-gray-50">
                          <h4 className="font-semibold mb-3">Time Records</h4>
                          <div className="space-y-3">
                            {worker.timeRecords.map((tr: TimeRecordAdmin) => (
                              <div key={tr.id} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium">{tr.positionName}</span>
                                  <span className="font-mono font-bold">
                                    {tr.clockOut ? formatHours(tr.computedHours) : 'In progress'}
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2 bg-green-50 p-2 rounded">
                                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                    <span className="font-medium text-green-800 w-24">Clock In:</span>
                                    <span>{formatDateTime(tr.clockIn)}</span>
                                  </div>
                                  {tr.breaks && tr.breaks.map((b, i) => (
                                    <div key={i}>
                                      <div className="flex items-center gap-2 bg-orange-50 p-2 rounded">
                                        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                                        <span className="font-medium text-orange-800 w-24">Break Start:</span>
                                        <span>{formatDateTime(b.startTime)}</span>
                                      </div>
                                      {b.endTime && (
                                        <div className="flex items-center gap-2 bg-orange-50 p-2 rounded">
                                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                                          <span className="font-medium text-orange-800 w-24">Break End:</span>
                                          <span>{formatDateTime(b.endTime)}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {tr.clockOut && (
                                    <div className="flex items-center gap-2 bg-red-50 p-2 rounded">
                                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                      <span className="font-medium text-red-800 w-24">Clock Out:</span>
                                      <span>{formatDateTime(tr.clockOut)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-gray-500 text-right">
                                  {tr.hourlyRate} CZK/h → {(tr.totalAmount ?? 0).toFixed(2)} CZK
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No time records for this event yet.
            </div>
          )}
        </>
      )}
    </div>
  )
}
