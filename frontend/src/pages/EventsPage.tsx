import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState } from '../components/EmptyState'
import { SearchFilter } from '../components/SearchFilter'
import { useSearchFilters } from '../hooks/useSearchFilters'
import type { Event } from '../types'

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { state, setField, clear } = useSearchFilters({ search: '', dateFrom: '', dateTo: '', upcoming: '', past: '' })

  useEffect(() => {
    loadEvents()
  }, [state.search, state.dateFrom, state.dateTo, state.upcoming, state.past])

  const loadEvents = async () => {
    try {
      const params: Record<string, string> = {}
      if (state.search) params.search = state.search
      if (state.upcoming === 'true') params.dateFrom = new Date().toISOString().split('T')[0]
      if (state.past === 'true') params.dateTo = new Date().toISOString().split('T')[0]
      if (state.dateFrom) params.dateFrom = state.dateFrom
      if (state.dateTo) params.dateTo = state.dateTo

      const response = await api.get('/events', { params })
      setEvents(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading events..." fullScreen />

  const quickFilters = [
    { key: 'upcoming', label: 'Upcoming', field: 'upcoming', value: 'true' },
    { key: 'past', label: 'Past', field: 'past', value: 'true' }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Events</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <SearchFilter
        searchPlaceholder="Hledat akci podle názvu nebo místa…"
        search={state.search}
        onSearchChange={(v) => setField('search', v)}
        quickFilters={quickFilters}
        activeFilters={{ upcoming: state.upcoming, past: state.past }}
        onFilterToggle={(field, value) => setField(field, value)}
        resultCount={events.length}
        onClear={clear}
      />

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
