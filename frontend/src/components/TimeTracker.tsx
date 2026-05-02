import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../api/axios'
import { parseUtc } from '../utils/formatting'
import { ConfirmDialog } from './ConfirmDialog'
import type { TimeRecord } from '../types'

interface TimeTrackerProps {
  registrationId: string
  onStateChange?: () => void
  positionDate?: string
  positionStartTime?: string
  positionEndTime?: string
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

function calcTotalBreakSeconds(record: TimeRecord): number {
  let total = 0
  for (const b of record.breaks || []) {
    if (b.endTime) {
      const bStart = parseUtc(b.startTime).getTime()
      const bEnd = parseUtc(b.endTime).getTime()
      total += Math.floor((bEnd - bStart) / 1000)
    }
  }
  return Math.max(0, total)
}

export function TimeTracker({ registrationId, onStateChange, positionDate, positionStartTime, positionEndTime }: TimeTrackerProps) {
  const [record, setRecord] = useState<TimeRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workElapsed, setWorkElapsed] = useState(0)
  const [breakElapsed, setBreakElapsed] = useState(0)
  const [totalBreakSeconds, setTotalBreakSeconds] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [windowStatus, setWindowStatus] = useState<'before' | 'open' | 'after'>(computeWindowStatus(positionDate, positionStartTime, positionEndTime))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const windowStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const updateTimers = useCallback(() => {
    if (!record) return
    setWorkElapsed(calcWorkSeconds(record))
    setBreakElapsed(calcBreakSeconds(record))
    setTotalBreakSeconds(calcTotalBreakSeconds(record))
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
    setWindowStatus(computeWindowStatus(positionDate, positionStartTime, positionEndTime))

    if (isActive) {
      intervalRef.current = setInterval(() => {
        updateTimers()
        setWindowStatus(computeWindowStatus(positionDate, positionStartTime, positionEndTime))
      }, 1000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [record, updateTimers, positionDate, positionStartTime, positionEndTime])

  useEffect(() => {
    if (windowStatusIntervalRef.current) {
      clearInterval(windowStatusIntervalRef.current)
      windowStatusIntervalRef.current = null
    }

    windowStatusIntervalRef.current = setInterval(() => {
      setWindowStatus(computeWindowStatus(positionDate, positionStartTime, positionEndTime))
    }, 60000)

    return () => {
      if (windowStatusIntervalRef.current) clearInterval(windowStatusIntervalRef.current)
    }
  }, [positionDate, positionStartTime, positionEndTime])

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
      setError('Failed to load time tracking state')
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
      setError(err.response?.data?.message || 'Clock-in failed')
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
      setError(err.response?.data?.message || 'Failed to start break')
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
      setError(err.response?.data?.message || 'Failed to end break')
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
      setError(err.response?.data?.message || 'Failed to end shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <ConfirmDialog
        open={confirmOpen}
        title="End your work session?"
        message="This will finalize your hours for this shift."
        confirmLabel="End"
        cancelLabel="Cancel"
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
          <p className="text-sm text-gray-500">Status</p>
          <p className={`text-lg font-semibold ${
            onBreak ? 'text-orange-600' : isClocked ? 'text-green-600' : isDone ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {onBreak ? '⏸ On Break' : isClocked ? '▶ Working' : isDone ? '✓ Done' : 'Not Started'}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Work Time</p>
          <p className="text-2xl font-mono font-bold text-green-700">
            {formatElapsed(workElapsed)}
          </p>
        </div>

        {(onBreak || (isClocked && totalBreakSeconds > 0) || (isDone && totalBreakSeconds > 0)) && (
          <div>
            <p className="text-sm text-gray-500">Break Time</p>
            <p className="text-2xl font-mono font-bold text-orange-600">
              {formatElapsed(onBreak ? totalBreakSeconds + breakElapsed : totalBreakSeconds)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(!record || isDone) && (
          <button
            onClick={handleClockIn}
            disabled={loading || windowStatus !== 'open'}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
            title={windowStatus === 'before' ? 'Shift window not open yet' : windowStatus === 'after' ? 'Shift window has closed' : ''}
          >
            {windowStatus === 'open' && '▶ '}
            {windowStatus === 'before' && 'Shift window not open yet'}
            {windowStatus === 'after' && 'Shift window has closed'}
            {windowStatus === 'open' && 'Start'}
          </button>
        )}

        {isClocked && !onBreak && (
          <>
            <button
              onClick={handleBreakStart}
              disabled={loading}
              className="px-5 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 text-sm font-medium"
            >
              ⏸ Break
            </button>
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="px-5 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
            >
              ⏹ End
            </button>
          </>
        )}

        {onBreak && (
          <button
            onClick={handleBreakEnd}
            disabled={loading}
            className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
          >
            ▶ Resume
          </button>
        )}
      </div>
    </div>
  )
}
