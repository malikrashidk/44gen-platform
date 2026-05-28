import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import BillingSuccess from './pages/BillingSuccess'
import ProtectedRoute from './components/ProtectedRoute'

// ─── Cinematic page transition wrapper ───────────────────────────────────────
function PageTransition({ children }) {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [key, setKey] = useState(location.pathname)
  const prev = useRef(location.pathname)

  useEffect(() => {
    if (prev.current !== location.pathname) {
      // Out
      setVisible(false)
      const t = setTimeout(() => {
        setKey(location.pathname)
        prev.current = location.pathname
        // In
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      }, 250)
      return () => clearTimeout(t)
    } else {
      setVisible(true)
    }
  }, [location.pathname])

  return (
    <div key={key} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {children}
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #FF6B00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <PageTransition>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/editor/:projectId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  )
}

export default App
