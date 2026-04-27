import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { Registration } from '../types'
import { formatDate } from '../utils/formatting'

interface Props {
  registration: Registration
}

function computeCountdown(positionDate?: string, positionStartTime?: string): string {
  if (!positionDate || !positionStartTime) return ''
  const start = new Date(`${positionDate}T${positionStartTime}`)
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  if (diffMs <= 0) return 'Začalo'
  const totalMin = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `Začíná za ${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `Začíná za ${hours}h ${minutes}m`
  return `Začíná za ${minutes}m`
}

export function NextShiftCard({ registration }: Props) {
  const [countdown, setCountdown] = useState(computeCountdown(registration.positionDate, registration.positionStartTime))
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const i = setInterval(() => {
      setCountdown(computeCountdown(registration.positionDate, registration.positionStartTime))
    }, 1000)
    return () => clearInterval(i)
  }, [registration.positionDate, registration.positionStartTime])

  const handleClockIn = async () => {
    try {
      await api.post(`/time/clock-in?registrationId=${registration.id}`)
      navigate('/my-time')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Clock-in selhal')
    }
  }

  return (
    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl p-5 shadow-lg">
      <div className="text-sm opacity-90">{registration.eventName} · {registration.positionName}</div>
      <div className="text-2xl font-bold mt-1">{countdown}</div>
      <div className="text-sm opacity-85 mt-1">
        {formatDate(registration.positionDate || '')} · {registration.positionStartTime?.slice(0, 5)}–{registration.positionEndTime?.slice(0, 5)}
      </div>
      <button
        onClick={handleClockIn}
        className="mt-4 w-full py-3 bg-white text-emerald-700 rounded-lg font-bold text-base hover:bg-emerald-50 active:bg-emerald-100"
      >
        ⏱ Clock In
      </button>
      {error && <div className="mt-2 text-xs bg-red-700/40 px-3 py-2 rounded">{error}</div>}
    </div>
  )
}
