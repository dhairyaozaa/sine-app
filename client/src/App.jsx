import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout    from './components/layout/AppLayout'
import LandingPage  from './pages/LandingPage'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard    from './pages/Dashboard'
import UploadPage   from './pages/UploadPage'
import Predictions  from './pages/Predictions'
import PlannerPage  from './pages/PlannerPage'
import NotesPage    from './pages/NotesPage'
import Attendance   from './pages/Attendance'
import Analytics    from './pages/Analytics'

function Private({ children }) {
  return useAuthStore(s => s.token) ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<Private><AppLayout /></Private>}>
        <Route index            element={<Dashboard />} />
        <Route path="upload"    element={<UploadPage />} />
        <Route path="predict"   element={<Predictions />} />
        <Route path="planner"   element={<PlannerPage />} />
        <Route path="notes"     element={<NotesPage />} />
        <Route path="attend"    element={<Attendance />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
