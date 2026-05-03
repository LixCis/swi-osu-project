import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'
import { getErrorMessage } from '../utils/errors'
import type { Event } from '../types'

interface UseMyEventsResult {
  events: Event[]
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  loading: boolean
  error: string | null
  setError: (msg: string | null) => void
}

export function useMyEvents(): UseMyEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const response = await api.get<Event[]>('/events/my')
      setEvents(response.data)
      if (response.data.length > 0) {
        setSelectedEventId(response.data[0].id)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load events'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  return { events, selectedEventId, setSelectedEventId, loading, error, setError }
}
