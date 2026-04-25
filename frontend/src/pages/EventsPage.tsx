import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState } from '../components/EmptyState'
import type { Event } from '../types'

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await api.get('/events')
      setEvents(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading events..." fullScreen />

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Events</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState title="No events yet" message="Check back later for upcoming events." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition"
            >
              <h2 className="text-xl font-bold mb-2">{event.name}</h2>
              <p className="text-gray-600 mb-1">📍 {event.location}</p>
              <p className="text-gray-600 mb-4">
                📅 {event.startDate} – {event.endDate}
              </p>
              <Link
                to={`/events/${event.id}`}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
