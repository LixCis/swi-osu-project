import type { ReactNode } from 'react'

export interface QuickFilter {
  key: string
  label: string
  value: string
  field: string
}

interface Props {
  searchPlaceholder?: string
  search: string
  onSearchChange: (v: string) => void
  quickFilters?: QuickFilter[]
  activeFilters?: Record<string, string>
  onFilterToggle?: (field: string, value: string) => void
  resultCount?: number
  onClear?: () => void
  rightSlot?: ReactNode
}

export function SearchFilter({
  searchPlaceholder = 'Search…',
  search,
  onSearchChange,
  quickFilters = [],
  activeFilters = {},
  onFilterToggle,
  resultCount,
  onClear,
  rightSlot
}: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4">
      <div className="flex gap-2 items-center mb-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded text-sm"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        {rightSlot}
      </div>

      {quickFilters.length > 0 && (
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-xs uppercase text-slate-500 tracking-wide mr-1">Quick:</span>
          {quickFilters.map((qf) => {
            const active = activeFilters[qf.field] === qf.value
            return (
              <button
                key={qf.key}
                onClick={() => onFilterToggle?.(qf.field, active ? '' : qf.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {qf.label} {active && '✕'}
              </button>
            )
          })}
          {(Object.values(activeFilters).some((v) => v) || search) && (
            <button onClick={() => onClear?.()} className="text-xs text-slate-500 ml-2">Clear filters</button>
          )}
          {resultCount !== undefined && (
            <span className="ml-auto text-xs text-slate-500">{resultCount} results</span>
          )}
        </div>
      )}
    </div>
  )
}
