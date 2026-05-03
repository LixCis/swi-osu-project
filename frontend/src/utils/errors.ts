import { AxiosError } from 'axios'

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return fallback
}
