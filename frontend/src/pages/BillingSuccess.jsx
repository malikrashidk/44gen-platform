import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function BillingSuccess() {
  const { user, fetchProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const timers = [700, 1800, 3500].map(delay =>
      setTimeout(() => fetchProfile(user.id), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [user, fetchProfile])

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans','Inter',sans-serif" }}>
      <div style={{ width: 'min(460px, 100%)', background: '#fff', border: '1px solid #ebe9e4', borderRadius: 18, padding: 28, textAlign: 'center', boxShadow: '0 20px 70px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <CheckCircle2 size={28} color="#10b981" />
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900, color: '#0f0f14', letterSpacing: '-0.5px' }}>Payment received</h1>
        <p style={{ margin: '0 0 18px', color: '#6b6b7b', fontSize: 14, lineHeight: 1.6 }}>
          Your plan is being synced from Polar. This usually takes a few seconds after the webhook arrives.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, color: '#6b6b7b', fontSize: 13, marginBottom: 22 }}>
          <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite', color: '#7c6af7' }} />
          Refreshing your account
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ border: 'none', background: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', color: '#fff', borderRadius: 10, padding: '10px 15px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            Go to dashboard
          </button>
          <Link to="/pricing" style={{ border: '1px solid #ebe9e4', color: '#6b6b7b', background: '#fff', borderRadius: 10, padding: '10px 15px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Back to pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
