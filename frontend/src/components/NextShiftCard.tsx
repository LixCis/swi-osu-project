import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { Registration, TimeRecord } from '../types'
import { formatDate, parseUtc } from '../utils/formatting'

interface Props {
  registration: Registration
}

function computeCountdown(positionDate?: string, positionStartTime?: string): string {
  if (!positionDate || !positionStartTime) return ''
  const start = new Date(`${positionDate}T${positionStartTime}Z`)
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

function formatElapsed(start: Date, now: Date): string {
  const ms = now.getTime() - start.getTime()
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0')
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function NextShiftCard({ registration }: Props) {
  const [countdown, setCountdown] = useState(computeCountdown(registration.positionDate, registration.positionStartTime))
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null)
  const [, setTick] = useState(0)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<TimeRecord[]>('/time/my').then((res) => {
      const active = res.data.find(
        (r) => String(r.registrationId) === String(registration.id) && r.clockOut == null
      )
      setActiveRecord(active ?? null)
    }).catch(() => setActiveRecord(null))
  }, [registration.id])

  useEffect(() => {
    const i = setInterval(() => {
      setCountdown(computeCountdown(registration.positionDate, registration.positionStartTime))
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(i)
  }, [registration.positionDate, registration.positionStartTime])

  const handleClockIn = async () => {
    try {
      await api.post(`/time/clock-in?registrationId=${registration.id}`)
      navigate('/my-registrations')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Clock-in selhal')
    }
  }

  if (activeRecord) {
    const elapsed = formatElapsed(parseUtc(activeRecord.clockIn), new Date())
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-5 shadow-lg">
        <div className="text-sm opacity-90">{registration.eventName} · {registration.positionName}</div>
        <div className="text-2xl font-bold mt-1">▶ Pracuješ — {elapsed}</div>
        <button
          onClick={() => navigate('/my-registrations')}
          className="mt-4 w-full py-3 bg-white text-blue-700 rounded-lg font-bold text-base hover:bg-blue-50"
        >
          Otevřít time tracker
        </button>
      </div>
    )
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
