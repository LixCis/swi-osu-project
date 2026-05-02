import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { LiveWorkerDto } from '../types'
import { LiveWorkerStatus } from '../types'

interface Props {
  workers: LiveWorkerDto[]
  connected: boolean
}

const LABELS: Record<LiveWorkerStatus, { title: string; color: string; bg: string }> = {
  WORKING: { title: '⚡ Working', color: 'text-emerald-700', bg: 'border-emerald-500' },
  ON_BREAK: { title: '☕ Break', color: 'text-amber-700', bg: 'border-amber-500' },
  NOT_ARRIVED: { title: '⏳ Not yet', color: 'text-slate-500', bg: 'border-slate-400' },
  FINISHED: { title: '✓ Finished', color: 'text-blue-700', bg: 'border-blue-500' }
}

function elapsedSince(since: string | null): string {
  if (!since) return ''
  const start = new Date(since.endsWith('Z') ? since : since + 'Z')
  const ms = Math.max(0, Date.now() - start.getTime())
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function WorkerCard({ w }: { w: LiveWorkerDto }) {
  const c = LABELS[w.status]
  const initials = w.workerName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <motion.div
      layout
      layoutId={w.workerId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`bg-white rounded p-2 border-l-4 ${c.bg} mb-2 flex items-center gap-2`}
    >
      <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{w.workerName}</div>
        <div className={`text-[11px] ${c.color}`}>{w.positionName}{w.since ? ` · ${elapsedSince(w.since)}` : ''}</div>
      </div>
    </motion.div>
  )
}

export function LiveKanban({ workers, connected }: Props) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const groups = {
    WORKING: workers.filter((w) => w.status === LiveWorkerStatus.WORKING),
    ON_BREAK: workers.filter((w) => w.status === LiveWorkerStatus.ON_BREAK),
    NOT_ARRIVED: workers.filter((w) => w.status === LiveWorkerStatus.NOT_ARRIVED),
    FINISHED: workers.filter((w) => w.status === LiveWorkerStatus.FINISHED)
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
        <strong>⚡ LIVE</strong>
        <span className={`text-xs flex items-center gap-1 ${connected ? 'text-emerald-300' : 'text-red-300'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-50">
        {(['WORKING', 'ON_BREAK', 'NOT_ARRIVED', 'FINISHED'] as LiveWorkerStatus[]).map((s) => (
          <div key={s}>
            <div className={`text-xs font-bold uppercase mb-2 ${LABELS[s].color}`}>
              {LABELS[s].title} ({groups[s].length})
            </div>
            <AnimatePresence>
              {groups[s].map((w) => <WorkerCard key={w.workerId} w={w} />)}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
