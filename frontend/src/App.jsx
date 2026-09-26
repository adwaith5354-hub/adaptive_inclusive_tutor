import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, session, setUnauthorizedHandler } from './api/client.js'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LearningPage from './pages/LearningPage.jsx'
import AppShell from './components/AppShell.jsx'

export default function App() {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setStudent(null)
      navigate('/login')
    })
    if (!session.token()) return setLoading(false)
    api.me()
      .then(setStudent)
      .catch(() => session.clear())
      .finally(() => setLoading(false))
  }, [navigate])

  // Accessibility accommodations are applied app-wide.
  useEffect(() => {
    const p = student?.profile
    document.body.classList.toggle('readable-font', !!p?.readableFont)
    document.body.classList.toggle('calm-mode', !!p?.calmMode)
  }, [student])

  const onAuthenticated = ({ token, student: s }) => {
    session.set(token)
    setStudent(s)
    navigate('/home')
  }

  const onLogout = async () => {
    try { await api.logout() } catch { /* already logged out */ }
    session.clear()
    setStudent(null)
    navigate('/login')
  }

  if (loading) return <div className="center-screen">Loading…</div>

  const authed = (el) => (student ? el : <Navigate to="/login" />)
  const guest = (el) => (student ? <Navigate to="/home" /> : el)
  const shell = (el) => (<AppShell student={student} onLogout={onLogout}>{el}</AppShell>)

  return (
    <Routes>
      <Route path="/login" element={guest(<LoginPage onAuthenticated={onAuthenticated} />)} />
      <Route path="/signup" element={guest(<SignupPage onAuthenticated={onAuthenticated} />)} />
      <Route path="/home" element={authed(shell(<Dashboard student={student} />))} />
      <Route path="/learn/:chapterId" element={authed(shell(<LearningPage student={student} />))} />
      <Route path="*" element={<Navigate to={student ? '/home' : '/login'} />} />
    </Routes>
  )
}
