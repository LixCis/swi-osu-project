import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { parseUtc } from '../utils/formatting'
import { ConfirmDialog } from './ConfirmDialog'
import type { TimeRecord } from '../types'

interface TimeTrackerProps {
  registrationId: string
  onStateChange?: () => void
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcWorkSeconds(record: TimeRecord): number {
  if (!record.clockIn) return 0
  const clockIn = parseUtc(record.clockIn).getTime()
  const end = record.clockOut ? parseUtc(record.clockOut).getTime() : Date.now()
  let totalMs = end - clockIn

  for (const b of record.breaks || []) {
    const bStart = parseUtc(b.startTime).getTime()
    const bEnd = b.endTime ? parseUtc(b.endTime).getTime() : Date.now()
    totalMs -= (bEnd - bStart)
  }

  return Math.max(0, Math.floor(totalMs / 1000))
}

function calcBreakSeconds(record: TimeRecord): number {
  const openBreak = (record.breaks || []).find(b => !b.endTime)
  if (!openBreak) return 0
  const bStart = parseUtc(openBreak.startTime).getTime()
  return Math.max(0, Math.floor((Date.now() - bStart) / 1000))
}

export function TimeTracker({ registrationId, onStateChange }: TimeTrackerProps) {
  const [record, setRecord] = useState<TimeRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workElapsed, setWorkElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateTimers = useCallback(() => {
    if (!record) return
    setWorkElapsed(calcWorkSeconds(record))
    setBreakElapsed(calcBreakSeconds(record))
  }, [record])

  useEffect(() => {
    loadState()
  }, [registrationId])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!record) return

    const isActive = !!record.clockIn && !record.clockOut

    updateTimers()

    if (isActive) {
      intervalRef.current = setInterval(updateTimers, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [record, updateTimers])

  const loadState = async () => {
    try {
      const response = await api.get('/time/my')
      const matching = response.data.filter((r: TimeRecord) =>
        String(r.registrationId) === String(registrationId)
      )
      const active = matching.find((r: TimeRecord) => !r.clockOut)
      const last = matching.length > 0 ? matching[matching.length - 1] : null
      setRecord(active || last)
    } catch {
      setError('Nepodařilo se načíst stav sledování času')
    }
  }

  const isClocked = !!record?.clockIn && !record?.clockOut
  const onBreak = !!record?.onBreak
  const isDone = !!record?.clockOut

  const handleClockIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/time/clock-in?registrationId=${registrationId}`)
      setRecord(response.data)
      onStateChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nepodařilo se přihlásit do práce')
    } finally {
      setLoading(false)
    }
  }

  const handleBreakStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/time/break-start?recordId=${record?.id}`)
      setRecord(response.data)
      onStateChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nepodařilo se začít pauzu')
    } finally {
      setLoading(false)
    }
  }

  const handleBreakEnd = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/time/break-end?recordId=${record?.id}`)
      setRecord(response.data)
      onStateChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nepodařilo se skončit pauzu')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    setConfirmOpen(true)
  }

  const confirmClockOut = async () => {
    setConfirmOpen(false)
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/time/clock-out?recordId=${record?.id}`)
      setRecord(response.data)
      onStateChange?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nepodařilo se ukončit směnu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <ConfirmDialog
        open={confirmOpen}
        title="Ukončit směnu"
        message="Ukončit směnu? Tím finalizuješ své hodiny pro tuto směnu."
        confirmLabel="Ukončit"
        cancelLabel="Zrušit"
        onConfirm={confirmClockOut}
        onCancel={() => setConfirmOpen(false)}
        variant="danger"
      />
      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-6 mb-4">
        <div>
          <p className="text-sm text-gray-500">Stav</p>
          <p className={`text-lg font-semibold ${
            onBreak ? 'text-orange-600' : isClocked ? 'text-green-600' : isDone ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {onBreak ? '⏸ Pauza' : isClocked ? '▶ Pracuješ' : isDone ? '✓ Hotovo' : 'Nezahájeno'}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Odpracovaný čas</p>
          <p className="text-2xl font-mono font-bold text-green-700">
            {formatElapsed(workElapsed)}
          </p>
        </div>

        {onBreak && (
          <div>
            <p className="text-sm text-gray-500">Čas pauzy</p>
            <p className="text-2xl font-mono font-bold text-orange-600">
              {formatElapsed(breakElapsed)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(!record || isDone) && (
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            ▶ Začít
          </button>
        )}

        {isClocked && !onBreak && (
          <>
            <button
              onClick={handleBreakStart}
              disabled={loading}
              className="px-5 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 text-sm font-medium"
            >
              ⏸ Pauza
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
            >
              ⏹ Konec
            </button>
          </>
        )}

        {onBreak && (
          <button
            onClick={handleBreakEnd}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            ▶ Zpět
          </button>
        )}
      </div>
    </div>
  )
}
