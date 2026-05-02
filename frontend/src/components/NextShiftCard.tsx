import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import type { Registration, TimeRecord } from '../types'
import { formatDate, parseUtc } from '../utils/formatting'

interface Props {
  registration: Registration
}

function computeWindowStatus(positionDate?: string, positionStartTime?: string, positionEndTime?: string): 'before' | 'open' | 'after' {
  if (!positionDate || !positionStartTime || !positionEndTime) return 'open'
  const windowOpen = new Date(`${positionDate}T${positionStartTime}Z`)
  windowOpen.setHours(windowOpen.getHours() - 3)
  const windowClose = new Date(`${positionDate}T${positionEndTime}Z`)
  windowClose.setHours(windowClose.getHours() + 3)
  const now = new Date()
  if (now.getTime() < windowOpen.getTime()) return 'before'
  if (now.getTime() > windowClose.getTime()) return 'after'
  return 'open'
}

function computeCountdown(positionDate?: string, positionStartTime?: string): string {
  if (!positionDate || !positionStartTime) return ''
  const start = new Date(`${positionDate}T${positionStartTime}Z`)
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  if (diffMs <= 0) return 'In progress'
  const totalMin = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `Starts in ${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`
  return `Starts in ${minutes}m`
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
  const [windowStatus, setWindowStatus] = useState<'before' | 'open' | 'after'>(computeWindowStatus(registration.positionDate, registration.positionStartTime, registration.positionEndTime))
  const [activeRecord, setActiveRecord] = useState<TimeRecord | null>(null)
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
      setWindowStatus(computeWindowStatus(registration.positionDate, registration.positionStartTime, registration.positionEndTime))
    }, 1000)
    return () => clearInterval(i)
  }, [registration.positionDate, registration.positionStartTime, registration.positionEndTime])

  const handleClockIn = async () => {
    setError(null)
    try {
      await api.post(`/time/clock-in?registrationId=${registration.id}`)
      navigate('/my-registrations')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Clock-in failed')
    }
  }

  if (activeRecord) {
    const elapsed = formatElapsed(parseUtc(activeRecord.clockIn), new Date())
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-5 shadow-lg">
        <div className="text-sm opacity-90">{registration.eventName} · {registration.positionName}</div>
        <div className="text-2xl font-bold mt-1">▶ Working — {elapsed}</div>
        <button
          onClick={() => navigate('/my-registrations')}
          className="mt-4 w-full py-3 bg-white text-blue-700 rounded-lg font-bold text-base hover:bg-blue-50"
        >
          Open time tracker
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
        disabled={windowStatus !== 'open'}
        className="mt-4 w-full py-3 bg-white text-emerald-700 rounded-lg font-bold text-base hover:bg-emerald-50 active:bg-emerald-100 disabled:bg-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed"
      >
        {windowStatus === 'before' && '⏱ Shift window not open yet'}
        {windowStatus === 'after' && '⏱ Shift window has closed'}
        {windowStatus === 'open' && '⏱ Clock In'}
      </button>
      {error && <div className="mt-2 text-xs bg-red-700/40 px-3 py-2 rounded">{error}</div>}
    </div>
  )
}
