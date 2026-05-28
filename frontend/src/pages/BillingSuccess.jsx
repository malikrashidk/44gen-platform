import { useEffect } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ParticleBackdrop, PublicButton, PublicPage } from '../components/PublicChrome'

export default function BillingSuccess() {
  const navigate = useNavigate()
  const { user, fetchProfile } = useAuth()

  useEffect(() => {
    if (!user) return
    const timers = [600, 1800, 3600].map(delay => setTimeout(() => fetchProfile(user.id), delay))
    return () => timers.forEach(clearTimeout)
  }, [user, fetchProfile])

  return (
    <PublicPage>
      <section className="public-section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
        <ParticleBackdrop density={26} />
        <div className="public-card public-reveal" style={{ width: 'min(520px, 100%)', padding: 34 }}>
          <CheckCircle2 size={46} color="#7df1c7" />
          <h1 className="public-title" style={{ fontSize: 'clamp(34px, 6vw, 58px)', marginTop: 18 }}>Payment received.</h1>
          <p className="public-copy">Polar is syncing your subscription. Your plan and credits usually update in a few seconds.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, color: 'rgba(246,247,251,0.58)', marginBottom: 24 }}>
            <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
            Refreshing account
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <PublicButton onClick={() => navigate('/dashboard')}>Go to dashboard</PublicButton>
            <PublicButton to="/pricing" variant="secondary">View plans</PublicButton>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
