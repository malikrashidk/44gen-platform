import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, ArrowRight, Check } from 'lucide-react'

const O = { grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)', text: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }, glow: 'rgba(255,107,0,0.35)' }
const B = { subtle: 'rgba(255,255,255,0.06)', orange: 'rgba(255,107,0,0.25)' }

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setSent(true)
    setLoading(false)
  }

  const inputStyle = (field) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1px solid ${focus === field ? B.orange : B.subtle}`,
    background: focus === field ? 'rgba(255,107,0,0.04)' : 'rgba(255,255,255,0.03)',
    color: '#f9fafb', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s', fontFamily: 'inherit',
  })

  return (
    <div style={{ fontFamily: "'Sora','DM Sans',system-ui,sans-serif", background: '#050505', minHeight: '100vh', color: '#fff' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${B.subtle}`, padding: '0 clamp(20px,4vw,48px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.38)'}>← Back home</Link>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,48px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px,6vw,80px)', alignItems: 'start' }}>
        {/* Left */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 16 }}>Contact</div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', margin: '0 0 16px', lineHeight: 1.0 }}>
            Get in <span style={O.text}>touch</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 16, lineHeight: 1.75, marginBottom: 44, maxWidth: 340 }}>
            Have a question, feature request, or just want to say hello? We read every message.
          </p>
          {[
            { icon: <Mail size={18}/>, title: 'Email', val: 'support@44gen.com', href: 'mailto:support@44gen.com' },
            { icon: <MessageCircle size={18}/>, title: 'Response time', val: 'Usually within 24 hours', href: null },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF7A18', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.title}</div>
                {item.href ? <a href={item.href} style={{ fontSize: 15, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{item.val}</a> : <div style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>{item.val}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Right */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${B.subtle}`, borderRadius: 20, padding: '32px 28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={24} color="#4ade80"/>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Message sent!</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', margin: 0 }}>We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'name', label: 'Your name', type: 'text', ph: 'Alex Rivera', req: true },
                { key: 'email', label: 'Email address', type: 'email', ph: 'you@example.com', req: true },
                { key: 'subject', label: 'Subject (optional)', type: 'text', ph: 'Feature request, question...', req: false },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={() => setFocus(f.key)} onBlur={() => setFocus('')}
                    style={inputStyle(f.key)} required={f.req} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', display: 'block', marginBottom: 6 }}>Message</label>
                <textarea placeholder="Tell us what's on your mind..." value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  onFocus={() => setFocus('message')} onBlur={() => setFocus('')}
                  rows={5} style={{ ...inputStyle('message'), resize: 'vertical', display: 'block' }} required />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '12px 0', borderRadius: 10, border: 'none', background: O.grad, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 28px ${O.glow}`, fontFamily: 'inherit', marginTop: 4 }}>
                {loading ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/> : <>Send message <ArrowRight size={15}/></>}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer style={{ borderTop: `1px solid ${B.subtle}`, padding: '28px clamp(20px,5vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>© 2026 44gen. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[{ l:'Privacy', to:'/privacy' },{ l:'Terms', to:'/terms' }].map(lk => <Link key={lk.l} to={lk.to} style={{ color:'rgba(255,255,255,0.28)', fontSize:13, textDecoration:'none', transition:'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.28)'}>{lk.l}</Link>)}
        </div>
      </footer>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:700px){ div[style*="grid-template-columns: 1fr 1fr"]{grid-template-columns:1fr !important} }
      `}</style>
    </div>
  )
}
