import { useEffect, useRef, useState } from 'react'
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
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

  const setInitial = (initial: LiveWorkerDto[]) => {
    const m = new Map<string, LiveWorkerDto>()
    initial.forEach((w) => m.set(w.workerId, w))
    setWorkers(m)
  }

  useEffect(() => {
    setWorkers(new Map())
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
      client.deactivate()
    }
  }, [eventId])

  return { workers, connected, setInitial }
}
