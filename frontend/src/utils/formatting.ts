export function parseUtc(iso: string): Date {
  if (iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10)) {
    return new Date(iso)
  }
  return new Date(iso + 'Z')
}

export function formatDateTime(iso: string): string {
  return parseUtc(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export function formatHours(decimal: number | null | undefined): string {
  const value = decimal ?? 0
  const totalSeconds = Math.round(value * 3600)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return parseUtc(iso).toLocaleDateString('en-GB')
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
  }
  return map[status] || status
}
