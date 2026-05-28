import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Zap, Globe, Code2, Sparkles, Check } from 'lucide-react'

// ─── Brand tokens (shared across pages) ──────────────────────────────────────
const O = {
  grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)',
  text: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  glow: 'rgba(255,107,0,0.35)',
}
const B = { subtle: 'rgba(255,255,255,0.06)', orange: 'rgba(255,107,0,0.25)' }

// ─── Password strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
  const score = checks.filter(Boolean).length
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score] : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />)}
      </div>
      <span style={{ fontSize: 11, color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}

// ─── Left panel — animated showcase ──────────────────────────────────────────
const TESTIMONIALS = [
  { av: 'SC', name: 'Sarah Chen', role: 'Founder @ Launchpad', text: 'Built my entire MVP in one afternoon. 44gen is genuinely magic.' },
  { av: 'JO', name: 'James Okafor', role: 'Indie Hacker', text: 'From idea to live URL in 8 minutes. I have a screenshot to prove it.' },
  { av: 'LN', name: 'Lisa Nakamura', role: 'CTO @ Flowbase', text: 'Real component separation, proper imports. I\'m genuinely impressed.' },
]

const FEATURES_LIST = [
  { icon: <Zap size={15}/>, text: 'Build and deploy in under 2 minutes' },
  { icon: <Globe size={15}/>, text: 'Instant live subdomain for every app' },
  { icon: <Code2 size={15}/>, text: 'Clean multi-file React architecture' },
  { icon: <Sparkles size={15}/>, text: 'AI planning before any code is written' },
]

function LeftPanel() {
  const [tIdx, setTIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setTIdx(i => (i + 1) % TESTIMONIALS.length); setFade(true) }, 350)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const t = TESTIMONIALS[tIdx]

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(40px,5vw,64px)', overflow: 'hidden', minHeight: '100%' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #0B0B0D 0%, #141008 60%, #0B0B0D 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      <div style={{ position: 'absolute', top: '15%', right: '-10%', width: 400, height: 400, borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,107,0,0.1)', animation: 'floatOrb 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 250, height: 250, borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,154,60,0.07)', animation: 'floatOrb2 12s ease-in-out infinite' }} />

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', boxShadow: `0 0 24px ${O.glow}` }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
      </div>

      {/* Middle content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 20 }}>Why 44Gen</div>
        <h2 style={{ fontSize: 'clamp(28px,3vw,42px)', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px', lineHeight: 1.05 }}>
          From idea to{' '}
          <span style={O.text}>live app</span>
          <br />in minutes.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 36, maxWidth: 340 }}>
          No code required. No DevOps. No waiting. Just describe what you want and watch it build.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
          {FEATURES_LIST.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, animation: `fadeIn 0.5s ease ${i * 0.1}s both` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF7A18', flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.orange}`, borderRadius: 16, padding: '20px 22px', transition: 'opacity 0.35s ease', opacity: fade ? 1 : 0 }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
            {[...Array(5)].map((_,i) => <span key={i} style={{ color: '#FF7A18', fontSize: 12 }}>★</span>)}
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', margin: '0 0 16px', lineHeight: 1.65 }}>"{t.text}"</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{t.av}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.role}</div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {TESTIMONIALS.map((_,i) => <div key={i} style={{ width: i === tIdx ? 20 : 6, height: 4, borderRadius: 2, background: i === tIdx ? '#FF6B00' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />)}
        </div>
      </div>

      {/* Bottom stats */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 0, borderTop: `1px solid ${B.subtle}`, paddingTop: 24 }}>
        {[['< 2 min','Build time'],['Free','To start'],['Live URL','Every app']].map(([v,l],i) => (
          <div key={l} style={{ flex: 1, paddingRight: i < 2 ? 24 : 0, borderRight: i < 2 ? `1px solid ${B.subtle}` : 'none', marginRight: i < 2 ? 24 : 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Input component ──────────────────────────────────────────────────────────
function Input({ type, placeholder, value, onChange, minLength, required, rightSlot }) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        minLength={minLength} required={required}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: '100%', padding: rightSlot ? '11px 44px 11px 14px' : '11px 14px',
          borderRadius: 10, border: `1px solid ${focus ? B.orange : B.subtle}`,
          background: focus ? 'rgba(255,107,0,0.04)' : 'rgba(255,255,255,0.03)',
          color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.2s, background 0.2s',
          fontFamily: 'inherit',
        }}
      />
      {rightSlot && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const passwordValid = password.length >= 8
  const switchMode = (m) => { setMode(m); setError(''); setMessage('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    if (mode === 'signup') {
      if (!passwordValid) { setError('Password must be at least 8 characters.'); setLoading(false); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return }
    }
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message); else navigate('/dashboard')
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (error) setError(error.message); else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` })
      if (error) setError(error.message); else setMessage('Password reset email sent! Check your inbox.')
    }
    setLoading(false)
  }

  const handleGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })

  const eyeBtn = (
    <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex' }}>
      {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: "'Sora','DM Sans',system-ui,sans-serif" }}>

      {/* ── Left panel ── */}
      <LeftPanel />

      {/* ── Right panel — form ── */}
      <div style={{ background: '#050505', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(32px,5vw,72px) clamp(32px,6vw,80px)', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle bg glow */}
        <div style={{ position: 'absolute', top: '30%', right: '-20%', width: 300, height: 300, borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,107,0,0.05)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 'clamp(22px,2.5vw,30px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', margin: '0 0 8px' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              {mode === 'login' ? 'Don\'t have an account? ' : mode === 'signup' ? 'Already have an account? ' : ''}
              {mode !== 'reset' && (
                <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#FF7A18', fontWeight: 700, cursor: 'pointer', fontSize: 14, padding: 0, fontFamily: 'inherit' }}>
                  {mode === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              )}
            </p>
          </div>

          {/* Google */}
          {mode !== 'reset' && (
            <>
              <button onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 14, marginBottom: 20, transition: 'background 0.2s', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/><path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8 8 0 0 0 1.83 5.43L4.5 7.5c.68-2 2.54-3.92 4.48-3.92z"/></svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>Full name</label>
                <Input type="text" placeholder="Your name" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>Email address</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            {mode !== 'reset' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('reset')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', padding: 0, transition: 'color 0.2s', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.target.style.color = '#FF7A18'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
                      Forgot?
                    </button>
                  )}
                </div>
                <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required rightSlot={eyeBtn} />
                {mode === 'signup' && <PasswordStrength password={password} />}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>Confirm password</label>
                <Input
                  type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
            )}

            {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5' }}>{error}</div>}
            {message && <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#86efac' }}>{message}</div>}

            <button type="submit" disabled={loading || (mode === 'signup' && !passwordValid)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: O.grad, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: (mode === 'signup' && !passwordValid) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 28px ${O.glow}`, transition: 'opacity 0.2s, box-shadow 0.2s', fontFamily: 'inherit', marginTop: 4 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = `0 4px 40px rgba(255,107,0,0.55)` }}
              onMouseLeave={e => e.currentTarget.style.boxShadow = `0 0 28px ${O.glow}`}>
              {loading ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> :
                <>{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'} <ArrowRight size={15}/></>}
            </button>
          </form>

          {mode === 'reset' && (
            <button onClick={() => switchMode('login')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
              ← Back to sign in
            </button>
          )}

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', marginTop: 24, lineHeight: 1.6 }}>
            By continuing, you agree to our{' '}
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes floatOrb  { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-20px) } }
        @keyframes floatOrb2 { 0%,100% { transform:translateY(0) } 50% { transform:translateY(16px) } }
        @keyframes fadeIn    { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        @keyframes spin      { to { transform:rotate(360deg) } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr"] > div:first-child { display: none !important; }
        }
      `}</style>
    </div>
  )
}
