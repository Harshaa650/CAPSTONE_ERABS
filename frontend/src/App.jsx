import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Shell from './components/Shell'
import EmployeeDashboard from './pages/EmployeeDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import MyBookings from './pages/MyBookings'
import Resources from './pages/Resources'

function Guard({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-10">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Guard><Shell /></Guard>}>
          <Route path="/" element={<EmployeeDashboard />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/manager" element={<Guard roles={['manager','admin']}><ManagerDashboard /></Guard>} />
          <Route path="/admin" element={<Guard roles={['admin']}><AdminDashboard /></Guard>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
