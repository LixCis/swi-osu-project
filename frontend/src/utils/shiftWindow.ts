export type ShiftWindowStatus = 'before' | 'open' | 'after'

const WINDOW_PADDING_HOURS = 3

export function computeWindowStatus(
  positionDate?: string,
  positionStartTime?: string,
  positionEndTime?: string
): ShiftWindowStatus {
  if (!positionDate || !positionStartTime || !positionEndTime) return 'open'
  const windowOpen = new Date(`${positionDate}T${positionStartTime}Z`)
  windowOpen.setHours(windowOpen.getHours() - WINDOW_PADDING_HOURS)
  const windowClose = new Date(`${positionDate}T${positionEndTime}Z`)
  windowClose.setHours(windowClose.getHours() + WINDOW_PADDING_HOURS)
  const now = new Date()
  if (now.getTime() < windowOpen.getTime()) return 'before'
  if (now.getTime() > windowClose.getTime()) return 'after'
  return 'open'
}

export function computeCountdown(positionDate?: string, positionStartTime?: string): string {
  if (!positionDate || !positionStartTime) return ''
  const start = new Date(`${positionDate}T${positionStartTime}Z`)
  const diffMs = start.getTime() - Date.now()
  if (diffMs <= 0) return 'In progress'
  const totalMin = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `Starts in ${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`
  return `Starts in ${minutes}m`
}
