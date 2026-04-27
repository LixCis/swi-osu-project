import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          BrigadnikApp
        </Link>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-6">
                {user?.role === Role.WORKER && (
                  <Link to="/home" className="hover:text-blue-200">
                    Home
                  </Link>
                )}
                <Link to="/events" className="hover:text-blue-200">
                  Events
                </Link>

                {user?.role === Role.WORKER && (
                  <>
                    <Link to="/my-registrations" className="hover:text-blue-200">
                      My Registrations
                    </Link>
                    <Link to="/my-time" className="hover:text-blue-200">
                      My Hours
                    </Link>
                  </>
                )}

                {user?.role === Role.ADMIN && (
                  <>
                    <Link to="/admin/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link to="/admin/manage-events" className="hover:text-blue-200">
                      Manage Events
                    </Link>
                    <Link to="/admin/manage-registrations" className="hover:text-blue-200">
                      Manage Registrations
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm">
                  {user?.firstName} {user?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-4">
              <Link to="/login" className="hover:text-blue-200">
                Login
              </Link>
              <Link to="/register" className="hover:text-blue-200">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
