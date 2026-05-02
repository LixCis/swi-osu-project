import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Role } from './types'

import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { HomePage } from './pages/HomePage'
import { EventsPage } from './pages/EventsPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { MyRegistrationsPage } from './pages/MyRegistrationsPage'
import { MyTimePage } from './pages/MyTimePage'

import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ManageEventsPage } from './pages/admin/ManageEventsPage'
import { ManageRegistrationsPage } from './pages/admin/ManageRegistrationsPage'

function WorkerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role === Role.ADMIN) {
    return <Navigate to="/events" replace />
  }
  return <>{children}</>
}

function AppContent() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <WorkerRoute>
              <Layout>
                <HomePage />
              </Layout>
            </WorkerRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <Layout>
              <EventsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EventDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-registrations"
        element={
          <ProtectedRoute>
            <WorkerRoute>
              <Layout>
                <MyRegistrationsPage />
              </Layout>
            </WorkerRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-time"
        element={
          <ProtectedRoute>
            <WorkerRoute>
              <Layout>
                <MyTimePage />
              </Layout>
            </WorkerRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole={Role.ADMIN}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/manage-events"
        element={
          <ProtectedRoute requiredRole={Role.ADMIN}>
            <Layout>
              <ManageEventsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/manage-registrations"
        element={
          <ProtectedRoute requiredRole={Role.ADMIN}>
            <Layout>
              <ManageRegistrationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
