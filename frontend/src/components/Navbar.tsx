import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

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
                  <Link to="/home" className={isActive('/home') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                    Domů
                  </Link>
                )}
                <Link to="/events" className={isActive('/events') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                  Akce
                </Link>

                {user?.role === Role.WORKER && (
                  <>
                    <Link to="/my-registrations" className={isActive('/my-registrations') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                      Moje směny
                    </Link>
                    <Link to="/my-time" className={isActive('/my-time') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                      Moje hodiny
                    </Link>
                  </>
                )}

                {user?.role === Role.ADMIN && (
                  <>
                    <Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                      Dashboard
                    </Link>
                    <Link to="/admin/manage-events" className={isActive('/admin/manage-events') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
                      Manage Events
                    </Link>
                    <Link to="/admin/manage-registrations" className={isActive('/admin/manage-registrations') ? 'font-bold underline text-blue-200' : 'hover:text-blue-200'}>
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
                Přihlášení
              </Link>
              <Link to="/register" className="hover:text-blue-200">
                Registrace
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
