import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score] : '#374151',
            transition: 'background 0.2s'
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const passwordValid = password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      if (!passwordValid) {
        setError('Password must be at least 8 characters.')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/dashboard')
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      })
      if (error) setError(error.message)
      else setMessage('Password reset email sent! Check your inbox.')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #1f2937', background: '#111827',
    color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            44<span style={{ color: '#7c3aed' }}>gen</span>
          </a>
          <p style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 28 }}>
          {mode !== 'reset' && (
            <>
              <button onClick={handleGoogle} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, background: '#fff', color: '#111', fontWeight: 600, padding: '10px 16px',
                borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, marginBottom: 20,
                transition: 'background 0.15s'
              }}
                onMouseEnter={e => e.target.style.background = '#f3f4f6'}
                onMouseLeave={e => e.target.style.background = '#fff'}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14z"/>
                  <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8 8 0 0 0 1.83 5.43L4.5 7.5c.68-2 2.54-3.92 4.48-3.92z"/>
                </svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#1f2937' }} />
                <span style={{ color: '#4b5563', fontSize: 12 }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#1f2937' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <input
                type="text" placeholder="Full name" value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={inputStyle} required
              />
            )}

            <input
              type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle} required
            />

            {mode !== 'reset' && (
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    minLength={8}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2
                  }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {mode === 'signup' && <PasswordStrength password={password} />}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : undefined
                  }}
                  required
                />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#86efac' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading || (mode === 'signup' && !passwordValid)} style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: loading ? '#4c1d95' : '#7c3aed', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: (mode === 'signup' && !passwordValid) ? 0.5 : 1,
              transition: 'background 0.15s'
            }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('reset'); setError(''); setMessage('') }} style={{
                  background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer'
                }}>
                  Forgot your password?
                </button>
                <p style={{ fontSize: 13, color: '#6b7280' }}>
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(''); setMessage('') }} style={{
                    background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: 13
                  }}>Sign up</button>
                </p>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setMessage('') }} style={{
                  background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: 13
                }}>Sign in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
