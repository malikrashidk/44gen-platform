import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, ArrowRight } from 'lucide-react'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setLoading(true)
    // Simulate send — replace with actual email service
    await new Promise(r => setTimeout(r, 1200))
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: '#fafafa', minHeight: '100vh' }}>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(250,250,250,0.9)',
        backdropFilter: 'blur(16px)', borderBottom: '1px solid #ebe9e4',
        padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#0f0f14', letterSpacing: '-0.5px' }}>
            44<span style={{ color: '#7c6af7' }}>gen</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ label: 'Pricing', to: '/pricing' }, { label: 'Log in', to: '/auth' }].map(l => (
            <Link key={l.label} to={l.to} style={{ color: '#6b6b7b', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>{l.label}</Link>
          ))}
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Contact</div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-2px', margin: '0 0 16px' }}>
            Get in touch
          </h1>
          <p style={{ color: '#6b6b7b', fontSize: 17, maxWidth: 420, margin: '0 auto' }}>
            Have a question, feedback, or need help? We're here for you.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 40, alignItems: 'start' }}>

          {/* Left — contact info */}
          <div>
            <div style={{ background: '#fff', borderRadius: 20, padding: '32px', border: '1px solid #ebe9e4', marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6af7', marginBottom: 16 }}>
                <Mail size={20} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f0f14', marginBottom: 6 }}>Email us</div>
              <div style={{ fontSize: 14, color: '#6b6b7b', lineHeight: 1.6 }}>
                For support, billing, or partnerships — we usually reply within 24 hours.
              </div>
              <a href="mailto:hello@44gen.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, color: '#7c6af7', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                hello@44gen.com <ArrowRight size={14} />
              </a>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: '32px', border: '1px solid #ebe9e4' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6af7', marginBottom: 16 }}>
                <MessageCircle size={20} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f0f14', marginBottom: 6 }}>Common topics</div>
              {['Billing & credits', 'Build failures', 'Feature requests', 'Enterprise plans'].map(t => (
                <div key={t} style={{ fontSize: 14, color: '#6b6b7b', padding: '8px 0', borderBottom: '1px solid #f5f2ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {t} <ArrowRight size={13} color="#c4bef7" />
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', border: '1px solid #ebe9e4', boxShadow: '0 8px 40px rgba(0,0,0,0.04)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0f0f14', margin: '0 0 12px' }}>Message sent!</h3>
                <p style={{ color: '#6b6b7b', fontSize: 15, margin: 0 }}>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f0f14', margin: '0 0 28px' }}>Send a message</h2>
                {[
                  { label: 'Your name', key: 'name', type: 'text', placeholder: 'John Smith' },
                  { label: 'Email address', key: 'email', type: 'email', placeholder: 'john@example.com' },
                  { label: 'Subject', key: 'subject', type: 'text', placeholder: 'What\'s this about?' },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b4b5a', marginBottom: 8 }}>{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12,
                        border: '1px solid #e0dde8', fontSize: 15, color: '#0f0f14',
                        background: '#fafafa', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = '#7c6af7'}
                      onBlur={e => e.target.style.borderColor = '#e0dde8'}
                    />
                  </div>
                ))}
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b4b5a', marginBottom: 8 }}>Message</label>
                  <textarea
                    placeholder="Tell us more..."
                    rows={5}
                    value={form.message}
                    onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 12,
                      border: '1px solid #e0dde8', fontSize: 15, color: '#0f0f14',
                      background: '#fafafa', outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#7c6af7'}
                    onBlur={e => e.target.style.borderColor = '#e0dde8'}
                  />
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '14px 0', borderRadius: 12,
                  background: loading ? '#b8b2f7' : '#7c6af7', color: '#fff',
                  border: 'none', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s'
                }}>
                  {loading ? 'Sending...' : <><span>Send message</span><ArrowRight size={16} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#06060a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', marginTop: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>44<span style={{ color: '#7c6af7' }}>gen</span></div>
          </Link>
          <div style={{ display: 'flex', gap: 24 }}>
            {[{ label: 'Home', to: '/' }, { label: 'Pricing', to: '/pricing' }, { label: 'Log in', to: '/auth' }].map(l => (
              <Link key={l.label} to={l.to} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44gen</div>
        </div>
      </footer>
    </div>
  )
}
