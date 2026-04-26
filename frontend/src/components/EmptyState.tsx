import { Link } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  message?: string
  actionLabel?: string
  actionTo?: string
}

export function EmptyState({ title, message, actionLabel, actionTo }: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      {message && <p className="text-gray-500 mb-4">{message}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
