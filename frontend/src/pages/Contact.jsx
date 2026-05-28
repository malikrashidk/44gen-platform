import { useState } from 'react'
import { CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react'
import { ParticleBackdrop, PublicButton, PublicPage } from '../components/PublicChrome'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [sent, setSent] = useState(false)

  const submit = (event) => {
    event.preventDefault()
    setSent(true)
  }

  const input = {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.055)',
    color: '#f6f7fb',
    borderRadius: 14,
    padding: '13px 14px',
    outline: 'none',
  }

  return (
    <PublicPage>
      <section className="public-section" style={{ overflow: 'hidden' }}>
        <ParticleBackdrop density={30} />
        <div className="public-container" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 34, alignItems: 'start' }}>
          <div>
            <div className="public-eyebrow">Contact</div>
            <h1 className="public-title">Tell us what you’re building.</h1>
            <p className="public-copy" style={{ marginTop: 22 }}>
              Product questions, billing help, feature ideas, partnerships, or support. Keep it plain and we’ll reply clearly.
            </p>
            <div className="public-grid" style={{ marginTop: 28 }}>
              <div className="public-card" style={{ padding: 20, display: 'flex', gap: 14 }}>
                <Mail color="#73d8ff" />
                <div>
                  <strong>Support</strong>
                  <p style={{ margin: '6px 0 0', color: 'rgba(246,247,251,0.55)' }}>support@44gen.com</p>
                </div>
              </div>
              <div className="public-card" style={{ padding: 20, display: 'flex', gap: 14 }}>
                <MessageCircle color="#7df1c7" />
                <div>
                  <strong>Response time</strong>
                  <p style={{ margin: '6px 0 0', color: 'rgba(246,247,251,0.55)' }}>Usually within 24 hours.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="public-card" style={{ padding: 26 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '50px 16px' }}>
                <CheckCircle2 size={44} color="#7df1c7" />
                <h2>Message received</h2>
                <p style={{ color: 'rgba(246,247,251,0.58)', lineHeight: 1.7 }}>Thanks. We’ll get back to you soon.</p>
                <PublicButton onClick={() => setSent(false)} variant="secondary">Send another</PublicButton>
              </div>
            ) : (
              <form onSubmit={submit} className="public-grid">
                <div className="public-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <label>
                    <span style={{ display: 'block', marginBottom: 8, color: 'rgba(246,247,251,0.62)' }}>Name</span>
                    <input required style={input} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
                  </label>
                  <label>
                    <span style={{ display: 'block', marginBottom: 8, color: 'rgba(246,247,251,0.62)' }}>Email</span>
                    <input required type="email" style={input} value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
                  </label>
                </div>
                <label>
                  <span style={{ display: 'block', marginBottom: 8, color: 'rgba(246,247,251,0.62)' }}>Topic</span>
                  <select style={input} value={form.topic} onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}>
                    <option value="">Choose a topic</option>
                    <option>Billing</option>
                    <option>Build issue</option>
                    <option>Feature request</option>
                    <option>Partnership</option>
                  </select>
                </label>
                <label>
                  <span style={{ display: 'block', marginBottom: 8, color: 'rgba(246,247,251,0.62)' }}>Message</span>
                  <textarea required rows={6} style={{ ...input, resize: 'vertical' }} value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))} />
                </label>
                <PublicButton>
                  <Send size={15} /> Send message
                </PublicButton>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
