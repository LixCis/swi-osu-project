import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { SearchFilter } from '../../components/SearchFilter'
import { useSearchFilters } from '../../hooks/useSearchFilters'
import type { Event, Position } from '../../types'

export function ManageEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: '',
    endDate: ''
  })
  const { state, setField, clear } = useSearchFilters({ search: '', dateFrom: '', dateTo: '' })

  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [showPositionForm, setShowPositionForm] = useState(false)
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null)
  const [positionForm, setPositionForm] = useState({ name: '', capacity: '', hourlyRate: '', date: '', startTime: '', endTime: '' })

  useEffect(() => {
    loadEvents()
  }, [state.search, state.dateFrom, state.dateTo])

  const loadEvents = async () => {
    try {
      const params: Record<string, string> = {}
      if (state.search) params.search = state.search
      if (state.dateFrom) params.dateFrom = state.dateFrom
      if (state.dateTo) params.dateTo = state.dateTo
      const response = await api.get('/events/my', { params })
      setEvents(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const loadPositions = async (eventId: string) => {
    try {
      const response = await api.get(`/events/${eventId}/positions`)
      setPositions(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load positions')
    }
  }

  const togglePositions = async (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null)
      setShowPositionForm(false)
      setEditingPositionId(null)
    } else {
      setExpandedEvent(eventId)
      setShowPositionForm(false)
      setEditingPositionId(null)
      await loadPositions(eventId)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, formData)
      } else {
        await api.post('/events', formData)
      }
      setFormData({ name: '', description: '', location: '', startDate: '', endDate: '' })
      setShowForm(false)
      setEditingId(null)
      loadEvents()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save event')
    }
  }

  const handleEdit = (event: Event) => {
    setFormData(event)
    setEditingId(event.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete event "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/events/${id}`)
      loadEvents()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete event')
    }
  }

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expandedEvent) return
    try {
      const payload = {
        name: positionForm.name,
        capacity: parseInt(positionForm.capacity),
        hourlyRate: parseFloat(positionForm.hourlyRate),
        date: positionForm.date,
        startTime: positionForm.startTime,
        endTime: positionForm.endTime
      }
      if (editingPositionId) {
        await api.put(`/positions/${editingPositionId}`, payload)
      } else {
        await api.post(`/events/${expandedEvent}/positions`, payload)
      }
      setPositionForm({ name: '', capacity: '', hourlyRate: '', date: '', startTime: '', endTime: '' })
      setShowPositionForm(false)
      setEditingPositionId(null)
      await loadPositions(expandedEvent)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save position')
    }
  }

  const handleEditPosition = (pos: Position) => {
    setPositionForm({
      name: pos.name,
      capacity: String(pos.capacity),
      hourlyRate: String(pos.hourlyRate),
      date: pos.date,
      startTime: pos.startTime?.substring(0, 5),
      endTime: pos.endTime?.substring(0, 5)
    })
    setEditingPositionId(pos.id)
    setShowPositionForm(true)
  }

  const handleDeletePosition = async (posId: string, name: string) => {
    if (!confirm(`Delete position "${name}"?`)) return
    if (!expandedEvent) return
    try {
      await api.delete(`/positions/${posId}`)
      await loadPositions(expandedEvent)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete position')
    }
  }

  const cancelEventForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', description: '', location: '', startDate: '', endDate: '' })
  }

  const cancelPositionForm = () => {
    setShowPositionForm(false)
    setEditingPositionId(null)
    setPositionForm({ name: '', capacity: '', hourlyRate: '', date: '', startTime: '', endTime: '' })
  }

  if (loading) return <LoadingSpinner message="Loading events..." fullScreen />

  const editingEvent = editingId ? events.find(e => e.id === editingId) : null

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manage Events</h1>
        <button
          onClick={() => showForm ? cancelEventForm() : setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <SearchFilter
        searchPlaceholder="Hledat akci…"
        search={state.search}
        onSearchChange={(v) => setField('search', v)}
        resultCount={events.length}
        onClear={clear}
      />

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {editingEvent ? `Edit: ${editingEvent.name}` : 'Add New Event'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-medium"
            >
              {editingId ? 'Save Changes' : 'Create Event'}
            </button>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No events yet</h3>
          <p className="text-gray-500">Click "+ Add Event" to create your first event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                <p className="text-gray-600 mb-2">{event.description}</p>
                <p className="text-gray-600 mb-1">📍 {event.location}</p>
                <p className="text-gray-600 mb-4">
                  📅 {event.startDate} – {event.endDate}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleEdit(event)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id, event.name)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => togglePositions(event.id)}
                    className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium"
                  >
                    {expandedEvent === event.id ? '▼ Hide Positions' : '▶ Manage Positions'}
                  </button>
                </div>
              </div>

              {expandedEvent === event.id && (
                <div className="border-t p-6 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold">Positions</h4>
                    <button
                      onClick={() => showPositionForm ? cancelPositionForm() : setShowPositionForm(true)}
                      className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700 font-medium"
                    >
                      {showPositionForm ? 'Cancel' : '+ Add Position'}
                    </button>
                  </div>

                  {showPositionForm && (
                    <form onSubmit={handlePositionSubmit} className="mb-4 p-4 bg-white rounded border space-y-3">
                      <h5 className="font-semibold text-gray-700">
                        {editingPositionId ? 'Edit Position' : 'New Position'}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Position Name</label>
                          <input
                            type="text"
                            value={positionForm.name}
                            onChange={(e) => setPositionForm((p) => ({ ...p, name: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Capacity</label>
                          <input
                            type="number"
                            min="1"
                            value={positionForm.capacity}
                            onChange={(e) => setPositionForm((p) => ({ ...p, capacity: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Hourly Rate (CZK)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={positionForm.hourlyRate}
                            onChange={(e) => setPositionForm((p) => ({ ...p, hourlyRate: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Date</label>
                          <input
                            type="date"
                            value={positionForm.date}
                            onChange={(e) => setPositionForm((p) => ({ ...p, date: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Start Time</label>
                          <input
                            type="time"
                            value={positionForm.startTime}
                            onChange={(e) => setPositionForm((p) => ({ ...p, startTime: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">End Time</label>
                          <input
                            type="time"
                            value={positionForm.endTime}
                            onChange={(e) => setPositionForm((p) => ({ ...p, endTime: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-medium"
                      >
                        {editingPositionId ? 'Save Changes' : 'Add Position'}
                      </button>
                    </form>
                  )}

                  {positions.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No positions yet. Click "+ Add Position" to create one.</p>
                  ) : (
                    <div className="space-y-2">
                      {positions.map((pos) => (
                        <div key={pos.id} className="flex justify-between items-center bg-white p-4 rounded border hover:shadow transition">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                            <div>
                              <p className="text-xs text-gray-500">Position</p>
                              <p className="font-semibold">{pos.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Date</p>
                              <p>{pos.date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Time</p>
                              <p>{pos.startTime?.substring(0,5)} – {pos.endTime?.substring(0,5)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Capacity</p>
                              <p>{pos.capacity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Rate</p>
                              <p>{pos.hourlyRate} CZK/h</p>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditPosition(pos)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePosition(pos.id, pos.name)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
