interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'primary'
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'primary' }: Props) {
  if (!open) return null
  const btnClass = variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }} tabIndex={-1}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-700 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">{cancelLabel}</button>
          <button onClick={onConfirm} className={`px-4 py-2 ${btnClass} text-white rounded`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
