import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { RegistrationStatus, Role } from '../types'
import { formatStatus } from '../utils/formatting'
import type { Event, Position, Registration } from '../types'

interface PositionWithRegistration extends Position {
  registration?: Registration
  approvedCount?: number
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === Role.ADMIN
  const [event, setEvent] = useState<Event | null>(null)
  const [positions, setPositions] = useState<PositionWithRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadEventData()
  }, [id])

  const loadEventData = async () => {
    try {
      const requests: Promise<any>[] = [
        api.get(`/events/${id}`),
        api.get(`/events/${id}/positions`)
      ]
      if (isAdmin) {
        requests.push(api.get(`/events/${id}/registrations`))
      } else {
        requests.push(api.get('/registrations/my'))
      }
      const results = await Promise.all(requests)
      setEvent(results[0].data)

      const allRegistrations: Registration[] = results[2].data
      const userRegistrationMap = new Map(
        isAdmin ? [] : allRegistrations.map((reg) => [reg.positionId, reg])
      )

      const approvedCountByPosition = new Map<string, number>()
      if (isAdmin) {
        allRegistrations.forEach((reg) => {
          if (reg.status === RegistrationStatus.APPROVED) {
            approvedCountByPosition.set(
              reg.positionId,
              (approvedCountByPosition.get(reg.positionId) || 0) + 1
            )
          }
        })
      }

      const positionsWithReg = results[1].data.map((pos: Position) => ({
        ...pos,
        registration: userRegistrationMap.get(pos.id),
        approvedCount: approvedCountByPosition.get(pos.id)
      }))

      setPositions(positionsWithReg)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (positionId: string) => {
    setRegisteringId(positionId)
    try {
      await api.post('/registrations', { positionId })
      navigate('/my-registrations')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register')
    } finally {
      setRegisteringId(null)
    }
  }

  if (loading) return <LoadingSpinner message="Loading event..." fullScreen />

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-600 mb-4">Event not found</p>
        <button
          onClick={() => navigate('/events')}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Back to Events
        </button>
      </div>
    )
  }

  const statusColors = {
    [RegistrationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [RegistrationStatus.APPROVED]: 'bg-green-100 text-green-800',
    [RegistrationStatus.REJECTED]: 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/events')}
        className="mb-6 text-blue-600 hover:underline"
      >
        ← Back to Events
      </button>

      <div className="bg-white p-8 rounded-lg shadow mb-8">
        <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
        <p className="text-gray-600 text-lg mb-4">{event.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>📍 Location:</strong> {event.location}
          </div>
          <div>
            <strong>📅 Dates:</strong> {event.startDate} – {event.endDate}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Available Positions</h2>
        {positions.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No positions available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {positions.map((position) => (
              <div key={position.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
                <h3 className="text-xl font-bold mb-3">{position.name}</h3>
                <div className="space-y-1 text-gray-600 mb-4">
                  <p><strong>Date:</strong> {position.date}</p>
                  <p><strong>Time:</strong> {position.startTime} – {position.endTime}</p>
                  <p><strong>Capacity:</strong> {position.capacity}</p>
                  <p><strong>Hourly Rate:</strong> {position.hourlyRate} CZK/h</p>
                </div>
                {isAdmin ? null : position.registration ? (
                  <span className={`block w-full text-center px-3 py-2 rounded font-medium ${statusColors[position.registration.status]}`}>
                    {formatStatus(position.registration.status)}
                  </span>
                ) : (
                  <button
                    onClick={() => handleRegister(position.id)}
                    disabled={registeringId !== null || (position.approvedCount ?? 0) >= position.capacity}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                  >
                    {registeringId === position.id ? 'Registering...' : (position.approvedCount ?? 0) >= position.capacity ? 'Full' : 'Register'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
