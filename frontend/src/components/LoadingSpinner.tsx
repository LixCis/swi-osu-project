interface LoadingSpinnerProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  const wrapper = fullScreen
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-12'

  return (
    <div className={wrapper}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
