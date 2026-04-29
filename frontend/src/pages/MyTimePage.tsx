import { useState, useEffect } from 'react'
import api from '../api/axios'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState } from '../components/EmptyState'
import { formatHours, formatDateTime } from '../utils/formatting'
import type { TimeRecord } from '../types'

export function MyTimePage() {
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTimeRecords()
  }, [])

  const loadTimeRecords = async () => {
    try {
      const response = await api.get('/time/my')
      setTimeRecords(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load hours')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading your hours..." fullScreen />

  const totalHours = timeRecords.reduce((sum, record) => sum + (record.computedHours ?? 0), 0)

  const groupedByEvent = timeRecords.reduce((acc, record) => {
    const eventName = record.eventName || 'Event'
    if (!acc[eventName]) {
      acc[eventName] = []
    }
    acc[eventName].push(record)
    return acc
  }, {} as Record<string, TimeRecord[]>)

  const eventNames = Object.keys(groupedByEvent)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">My Hours</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {timeRecords.length > 0 && (
        <div className="mb-8 p-6 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Hours Worked</p>
          <p className="font-mono text-4xl font-bold text-blue-800">{formatHours(totalHours)}</p>
        </div>
      )}

      {timeRecords.length === 0 ? (
        <EmptyState
          title="No time records yet"
          message="Register for a position and start tracking your hours."
          actionLabel="My Registrations"
          actionTo="/my-registrations"
        />
      ) : (
        <div className="space-y-8">
          {eventNames.map((eventName) => {
            const eventRecords = groupedByEvent[eventName]
            const eventHours = eventRecords.reduce((sum, record) => sum + (record.computedHours ?? 0), 0)

            return (
              <div key={eventName}>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-2xl font-bold">{eventName}</h2>
                  <span className="font-mono text-lg text-gray-700">{formatHours(eventHours)}</span>
                </div>
                <div className="space-y-4">
                  {eventRecords.map((record) => (
                    <div key={record.id} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="p-4 border-l-4 border-green-500">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold text-lg">{record.positionName}</h3>
                          <span className="font-mono text-lg font-bold text-green-700">
                            {formatHours(record.computedHours)}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            <span className="font-medium text-green-800 w-24">Clock In:</span>
                            <span>{formatDateTime(record.clockIn)}</span>
                          </div>

                          {record.breaks && record.breaks.length > 0 && record.breaks.map((b, i) => (
                            <div key={i}>
                              <div className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded">
                                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                                <span className="font-medium text-orange-800 w-24">Break Start:</span>
                                <span>{formatDateTime(b.startTime)}</span>
                              </div>
                              {b.endTime && (
                                <div className="flex items-center gap-2 text-sm bg-orange-50 p-2 rounded">
                                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                                  <span className="font-medium text-orange-800 w-24">Break End:</span>
                                  <span>{formatDateTime(b.endTime)}</span>
                                </div>
                              )}
                            </div>
                          ))}

                          {record.clockOut && (
                            <div className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                              <span className="font-medium text-green-800 w-24">Clock Out:</span>
                              <span>{formatDateTime(record.clockOut)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
