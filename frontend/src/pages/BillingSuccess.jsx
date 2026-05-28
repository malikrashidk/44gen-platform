import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const O = { grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)', glow: 'rgba(255,107,0,0.35)' }
const B = { subtle: 'rgba(255,255,255,0.06)', orange: 'rgba(255,107,0,0.25)' }

export default function BillingSuccess() {
  const { user, fetchProfile, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0=confirming, 1=confirmed

  useEffect(() => {
    if (!user) return
    // Poll a few times to catch Polar webhook
    const timers = [700, 1800, 3500].map(delay =>
      setTimeout(() => fetchProfile(user.id), delay)
    )
    const done = setTimeout(() => setStep(1), 2200)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [user, fetchProfile])

  return (
    <div style={{ fontFamily: "'Sora','DM Sans',system-ui,sans-serif", background: '#050505', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(74,222,128,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ width: 'min(480px,100%)', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', boxShadow: `0 0 24px ${O.glow}` }}>44</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
          </Link>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${step === 1 ? 'rgba(74,222,128,0.25)' : B.subtle}`, borderRadius: 20, padding: '40px 36px', textAlign: 'center', transition: 'border-color 0.5s', boxShadow: step === 1 ? '0 0 60px rgba(74,222,128,0.06)' : 'none' }}>

          {step === 0 ? (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ width: 22, height: 22, border: '2px solid #FF7A18', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.5px' }}>Confirming your plan…</h1>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>We're verifying your payment and activating your new credits. This only takes a moment.</p>
            </>
          ) : (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'popIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                <CheckCircle2 size={28} color="#4ade80" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 10px', letterSpacing: '-1px' }}>You're all set! 🎉</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.65 }}>
                Your{profile?.plan ? <strong style={{ color: '#FF7A18', textTransform: 'capitalize' }}> {profile.plan} </strong> : ' new '}plan is now active.
                {profile?.credits != null && <> You have <strong style={{ color: '#fff' }}>{profile.credits.toFixed(1)} credits</strong> ready to use.</>}
              </p>

              {/* Credits badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,107,0,0.08)', border: `1px solid ${B.orange}`, borderRadius: 12, padding: '12px 20px', marginBottom: 32 }}>
                <Zap size={16} color="#FF7A18" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{profile?.credits?.toFixed(1) ?? '—'} credits available</span>
              </div>

              <button onClick={() => navigate('/dashboard')} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: O.grad, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 28px ${O.glow}`, fontFamily: 'inherit', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 40px rgba(255,107,0,0.55)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 28px ${O.glow}`}>
                Start building <ArrowRight size={16}/>
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 20 }}>
          Need help? <a href="mailto:support@44gen.com" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}>Contact support</a>
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,0,0.3) } 50% { box-shadow: 0 0 0 10px rgba(255,107,0,0) } }
        @keyframes popIn { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  )
}
