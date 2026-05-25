import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Zap, Globe, Code, MessageSquare, Shield, GitBranch, Sun, Moon, Check } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [darkMode, setDarkMode] = useState(true)

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#fafafa'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#2a2a2a' : '#e8e8e8'
  const text = d ? '#ffffff' : '#111111'
  const muted = d ? '#888' : '#888'
  const subtle = d ? '#1a1a1a' : '#f5f5f5'
  const accent = '#7c3aed'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans','Inter',sans-serif", overflowX: 'hidden' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: d ? 'rgba(15,15,15,0.8)' : 'rgba(250,250,250,0.8)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>
            44<span style={{ color: accent }}>gen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              style={{ color: muted, background: 'none', border: 'none', padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
            >
              {user ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              style={{ background: accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 100, padding: '4px 14px', fontSize: 12, color: accent, marginBottom: 28, fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          AI-Powered App Builder
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 20px' }}>
          Build apps with{' '}
          <span style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI
          </span>
          <br />in seconds
        </h1>

        <p style={{ color: muted, fontSize: 18, maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Describe your app in plain English. 44gen plans, builds, and deploys it instantly.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 60 }}>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: accent, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Start Building Free <ArrowRight size={16} />
          </button>
        </div>

        {/* Demo Box */}
        <div style={{ maxWidth: 640, margin: '0 auto', background: surface, border: `1px solid ${border}`, borderRadius: 20, padding: 20, textAlign: 'left' }}>
          <p style={{ color: muted, fontSize: 12, marginBottom: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Try it</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: subtle, borderRadius: 12, padding: '10px 14px' }}>
            <span style={{ color: d ? '#ccc' : '#444', fontSize: 14, flex: 1, lineHeight: 1.5 }}>
              Build me a SaaS dashboard with user auth, analytics charts, and a billing page
            </span>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              style={{ background: accent, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Generate →
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 40 }}>
          Everything you need to ship fast
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { icon: <MessageSquare size={18} />, title: 'Plan & Approve', desc: 'AI creates a detailed plan with steps, files, and estimates. You approve before any code is written.' },
            { icon: <Zap size={18} />, title: 'Instant Generation', desc: 'Full React apps generated in seconds. Complete with routing, components, and Tailwind CSS.' },
            { icon: <Globe size={18} />, title: 'One-Click Deploy', desc: 'Your app goes live on your subdomain instantly. Share it with the world in one click.' },
            { icon: <MessageSquare size={18} />, title: 'Chat to Edit', desc: 'Refine your app by chatting with AI. Change colors, add features, fix bugs — all in plain English.' },
            { icon: <Shield size={18} />, title: 'Auth Built-in', desc: 'User authentication, database, and backend powered by Supabase. Production-ready from day one.' },
            { icon: <GitBranch size={18} />, title: 'Own Your Code', desc: 'Export your code to GitHub anytime. No vendor lock-in. You own everything you build.' },
          ].map((f, i) => (
            <div
              key={i}
              style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: 24, transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${accent}44`}
              onMouseLeave={e => e.currentTarget.style.borderColor = border}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, marginBottom: 14 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.2px' }}>{f.title}</h3>
              <p style={{ color: muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>Simple pricing</h2>
        <p style={{ textAlign: 'center', color: muted, fontSize: 14, marginBottom: 40 }}>Credits scale with what you build. Pay only for what you use.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, maxWidth: 920, margin: '0 auto' }}>
          {[
            { name: 'Free', price: '$0', credits: '10 credits/month', features: ['Public apps only', '44gen subdomain', 'Community support', 'Watermark on apps'], cta: 'Get Started', highlight: false },
            { name: 'Pro', price: '$15', credits: '100 credits/month', features: ['Private apps', 'Custom domain', 'Remove watermark', 'GitHub export', 'Priority AI'], cta: 'Start Pro', highlight: true },
            { name: 'Business', price: '$35', credits: '500 credits/month', features: ['Everything in Pro', 'Team members', 'Advanced analytics', 'Priority support'], cta: 'Start Business', highlight: false },
          ].map((plan, i) => (
            <div
              key={i}
              style={{
                borderRadius: 20, padding: 28,
                background: plan.highlight ? accent : surface,
                border: `1px solid ${plan.highlight ? accent : border}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: plan.highlight ? 'rgba(255,255,255,0.8)' : muted }}>{plan.name}</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 4, color: plan.highlight ? '#fff' : text }}>
                {plan.price}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.6 }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: plan.highlight ? 'rgba(255,255,255,0.6)' : muted, marginBottom: 20 }}>{plan.credits}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.85)' : (d ? '#ccc' : '#555') }}>
                    <Check size={13} color={plan.highlight ? '#fff' : '#10b981'} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: plan.highlight ? '#fff' : subtle,
                  color: plan.highlight ? accent : text,
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: '24px', textAlign: 'center', color: muted, fontSize: 13 }}>
        © 2026 44gen. Built with AI, for everyone.
      </footer>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </div>
  )
}
