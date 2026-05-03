import { useState, type SubmitEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getErrorMessage } from '../utils/errors'

interface LocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      const from = (location.state as LocationState | null)?.from?.pathname || '/'
      navigate(from)
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const testAccounts = [
    { email: 'admin@brigadnik.cz', password: 'admin123', label: 'Admin Boss', role: 'ADMIN' },
    { email: 'jana@brigadnik.cz', password: 'worker123', label: 'Jana Novakova', role: 'WORKER' },
    { email: 'petr@brigadnik.cz', password: 'worker123', label: 'Petr Svoboda', role: 'WORKER' },
    { email: 'lucie@brigadnik.cz', password: 'worker123', label: 'Lucie Kralova', role: 'WORKER' },
  ]

  const fillAccount = (account: typeof testAccounts[0]) => {
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-2 text-center">Quick fill (testing)</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {testAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillAccount(account)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  account.role === 'ADMIN'
                    ? 'border-purple-300 text-purple-700 hover:bg-purple-50'
                    : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              >
                {account.label} ({account.role})
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
