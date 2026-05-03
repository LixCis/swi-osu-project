import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { EmptyState } from '../components/EmptyState'
import { NextShiftCard } from '../components/NextShiftCard'
import { getErrorMessage } from '../utils/errors'
import type { Registration } from '../types'

export function HomePage() {
  const [upcoming, setUpcoming] = useState<Registration[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  const [prevKey, setPrevKey] = useState(location.key)
  if (prevKey !== location.key) {
    setPrevKey(location.key)
    setError(null)
  }

  useEffect(() => {
    let cancelled = false
    api.get<Registration[]>('/registrations/my/upcoming')
      .then((res) => {
        if (cancelled) return
        setUpcoming(res.data)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(getErrorMessage(err, 'Failed to load shifts'))
      })
    return () => { cancelled = true }
  }, [location.key])

  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (upcoming === null) return <LoadingSpinner message="Loading your shifts" />
  if (upcoming.length === 0) {
    return (
      <EmptyState
        title="No upcoming shifts"
        message="Browse available events and register for a position."
        actionLabel="Browse Events"
        actionTo="/events"
      />
    )
  }

  const next = upcoming[0]
  const others = upcoming.slice(1)

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Your next shift</div>
      <NextShiftCard registration={next} />

      {others.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Other shifts ({others.length})</div>
          <div className="space-y-2">
            {others.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                <div className="font-semibold text-sm">{r.eventName} — {r.positionName}</div>
                <div className="text-xs text-slate-500">{r.positionDate} · {r.positionStartTime}–{r.positionEndTime}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
