import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface FilterState {
  search: string
  [key: string]: string
}

export function useSearchFilters(defaults: FilterState): {
  state: FilterState
  setField: (key: string, value: string) => void
  clear: () => void
} {
  const [searchParams, setSearchParams] = useSearchParams()

  const [state, setState] = useState<FilterState>(() => {
    const out: FilterState = { ...defaults }
    for (const k of Object.keys(defaults)) {
      const v = searchParams.get(k)
      if (v !== null) out[k] = v
    }
    return out
  })
  const [debouncedSearch, setDebouncedSearch] = useState(state.search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(state.search), 300)
    return () => clearTimeout(t)
  }, [state.search])

  useEffect(() => {
    const next = new URLSearchParams()
    Object.entries({ ...state, search: debouncedSearch }).forEach(([k, v]) => {
      if (v) next.set(k, v)
    })
    setSearchParams(next, { replace: true })
  }, [state, debouncedSearch, setSearchParams])

  return {
    state: { ...state, search: debouncedSearch },
    setField: (key, value) => setState((s) => ({ ...s, [key]: value })),
    clear: () => setState({ ...defaults })
  }
}
