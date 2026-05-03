import { useCallback, useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { LiveWorkerDto } from '../types'

interface UseLiveDashboardResult {
  workers: Map<string, LiveWorkerDto>
  connected: boolean
  setInitial: (initial: LiveWorkerDto[]) => void
}

export function useLiveDashboard(eventId: string | null, onUpdate?: () => void): UseLiveDashboardResult {
  const [workers, setWorkers] = useState<Map<string, LiveWorkerDto>>(new Map())
  const [connected, setConnected] = useState(false)
  const [prevEventId, setPrevEventId] = useState(eventId)
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  if (prevEventId !== eventId) {
    setPrevEventId(eventId)
    setWorkers(new Map())
  }

  const setInitial = useCallback((initial: LiveWorkerDto[]) => {
    setWorkers((prev) => {
      let changed = false
      const m = new Map(prev)
      initial.forEach((w) => {
        if (!m.has(w.workerId)) {
          m.set(w.workerId, w)
          changed = true
        }
      })
      return changed ? m : prev
    })
  }, [])

  useEffect(() => {
    if (!eventId) return
    const token = localStorage.getItem('token')
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS(`/ws?token=${encodeURIComponent(token)}`),
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        client.subscribe(`/topic/event/${eventId}/live`, (msg) => {
          try {
            const dto: LiveWorkerDto = JSON.parse(msg.body)
            setWorkers((prev) => {
              const next = new Map(prev)
              next.set(dto.workerId, dto)
              return next
            })
            onUpdateRef.current?.()
          } catch (e) {
            console.warn('Failed to parse live worker message:', e)
          }
        })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false)
    })

    client.activate()
    return () => {
      void client.deactivate()
    }
  }, [eventId])

  return { workers, connected, setInitial }
}
