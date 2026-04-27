import type { Registration } from '../types'

interface Props {
  registration: Registration
}

export function NextShiftCard({ registration }: Props) {
  return (
    <div className="bg-emerald-600 text-white rounded-xl p-5 shadow-lg">
      <div className="text-sm opacity-90">{registration.eventName} · {registration.positionName}</div>
      <div className="text-base mt-2">{registration.positionDate} · {registration.positionStartTime}–{registration.positionEndTime}</div>
    </div>
  )
}
