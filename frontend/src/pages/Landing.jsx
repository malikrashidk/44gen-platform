import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Zap, Globe, Code2, Sparkles, Check, ChevronDown, Menu, X, Play } from 'lucide-react'

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
]

const EXAMPLES = [
  { name: 'SaaS Dashboard', tag: 'Dashboard', color: '#6366f1', bg: '#1e1b4b' },
  { name: 'E-commerce Store', tag: 'E-commerce', color: '#10b981', bg: '#064e3b' },
  { name: 'Portfolio Site', tag: 'Portfolio', color: '#f59e0b', bg: '#451a03' },
  { name: 'Landing Page', tag: 'Marketing', color: '#ec4899', bg: '#500724' },
  { name: 'Analytics Tool', tag: 'Tool', color: '#06b6d4', bg: '#083344' },
  { name: 'Blog Platform', tag: 'Content', color: '#8b5cf6', bg: '#2e1065' },
]

const STEPS = [
  {
    number: '01',
    title: 'Describe your idea',
    description: 'Tell 44gen what you want to build in plain English. No technical jargon needed — just describe your vision.',
    icon: '💬',
  },
  {
    number: '02',
    title: 'Review the plan',
    description: 'Our AI breaks your idea into a structured plan — files, steps, and estimated credits. Approve or refine before building.',
    icon: '📋',
  },
  {
    number: '03',
    title: 'Go live instantly',
    description: 'Watch your app build in real time. It deploys automatically to a live URL — ready to share in minutes.',
    icon: '🚀',
  },
]

const FEATURES = [
  {
    icon: <Zap size={22} />,
    title: 'Real-time generation',
    description: 'Watch your code being written live. No waiting, no black box — full transparency as your app comes to life.',
  },
  {
    icon: <Globe size={22} />,
    title: 'Instant deployment',
    description: 'Every app gets its own subdomain the moment it\'s built. Share a live link — no DevOps required.',
  },
  {
    icon: <Code2 size={22} />,
    title: 'Production-grade code',
    description: 'React + Tailwind CSS + Vite. Clean, maintainable code you can download, inspect, and own completely.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Iterate with chat',
    description: 'Refine any part of your app with natural language. Dark mode, new features, layout changes — just ask.',
  },
  {
    icon: <Check size={22} />,
    title: 'Auto-repair system',
    description: 'Build errors? 44gen detects and fixes them automatically before you even notice — up to 2 repair attempts.',
  },
  {
    icon: <Code2 size={22} />,
    title: 'Multi-file architecture',
    description: 'Complex apps get proper component structure. Navbar, Hero, Features — each in its own file, cleanly organized.',
  },
]

const PROMPTS = [
  'Build a SaaS dashboard with analytics and user management',
  'Create a landing page for my mobile fitness app',
  'Build a real-time expense tracker with charts',
  'Design a portfolio site for a UX designer',
  'Create an e-commerce product catalog',
  'Build a project management tool with kanban board',
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const typingRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Typewriter effect for prompt examples
  useEffect(() => {
    const current = PROMPTS[promptIdx]
    if (typing) {
      if (displayed.length < current.length) {
        typingRef.current = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 38)
      } else {
        typingRef.current = setTimeout(() => setTyping(false), 2200)
      }
    } else {
      if (displayed.length > 0) {
        typingRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 18)
      } else {
        setPromptIdx((i) => (i + 1) % PROMPTS.length)
        setTyping(true)
      }
    }
    return () => clearTimeout(typingRef.current)
  }, [displayed, typing, promptIdx])

  const handleCTA = () => navigate(user ? '/dashboard' : '/auth')

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(6,6,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}>
            44<span style={{ color: '#7c6af7' }}>gen</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
          {NAV_LINKS.map(link => (
            link.href.startsWith('/') ? (
              <Link key={link.label} to={link.href} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
              >{link.label}</Link>
            ) : (
              <a key={link.label} href={link.href} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
              >{link.label}</a>
            )
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: '#7c6af7', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.target.style.opacity = '0.85'}
              onMouseLeave={e => e.target.style.opacity = '1'}
            >Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/auth')} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.target.style.color = '#fff'; e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                onMouseLeave={e => { e.target.style.color = 'rgba(255,255,255,0.7)'; e.target.style.borderColor = 'rgba(255,255,255,0.15)' }}
              >Log in</button>
              <button onClick={handleCTA} style={{ background: '#7c6af7', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.target.style.opacity = '0.85'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >Get started free</button>
            </>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }} className="mobile-menu-btn">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        minHeight: '100vh', background: '#06060a',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,106,247,0.18) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: '30%', right: '15%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(124,106,247,0.12)', border: '1px solid rgba(124,106,247,0.25)',
          borderRadius: 100, padding: '6px 16px', marginBottom: 32,
          fontSize: 13, color: '#a89cf7', fontWeight: 500
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c6af7', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Powered by Gemini 2.5 Flash
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 800,
          lineHeight: 1.05, letterSpacing: '-2.5px', margin: '0 0 24px',
          color: '#fff', maxWidth: 820
        }}>
          From idea to{' '}
          <span style={{
            background: 'linear-gradient(135deg, #7c6af7 0%, #ec4899 50%, #f59e0b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>live app</span>
          <br />in minutes
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.7 }}>
          Describe your app in plain English. 44gen plans, builds, and deploys it to a live URL — no code, no DevOps, no waiting.
        </p>

        {/* Typewriter prompt box */}
        <div style={{
          width: '100%', maxWidth: 640, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
          padding: '16px 20px', marginBottom: 32, textAlign: 'left',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 500 }}>Try something like...</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.5, minHeight: 24 }}>
              {displayed}<span style={{ opacity: 0.5, animation: 'blink 1s infinite' }}>|</span>
            </span>
            <button onClick={handleCTA} style={{
              background: '#7c6af7', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#6a59e8'}
              onMouseLeave={e => e.currentTarget.style.background = '#7c6af7'}
            >
              Build this <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={handleCTA} style={{
            background: '#7c6af7', color: '#fff', border: 'none',
            padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s', boxShadow: '0 0 40px rgba(124,106,247,0.35)'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 50px rgba(124,106,247,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,106,247,0.35)' }}
          >
            Start building free <ArrowRight size={16} />
          </button>
          <Link to="/pricing" style={{
            color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 500,
            textDecoration: 'none', padding: '14px 20px', transition: 'color 0.2s'
          }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
          >See pricing →</Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { value: '< 2 min', label: 'Average build time' },
            { value: 'Free', label: 'To start' },
            { value: '∞', label: 'App types supported' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
          <ChevronDown size={20} color="rgba(255,255,255,0.2)" />
        </div>
      </div>

      {/* App examples strip — dark */}
      <div style={{ background: '#0a0a10', padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>
            Apps you can build in minutes
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {EXAMPLES.map(ex => (
              <div key={ex.name} style={{
                background: ex.bg, border: `1px solid ${ex.color}25`,
                borderRadius: 14, padding: '20px 16px',
                transition: 'all 0.2s', cursor: 'default'
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = ex.color + '60' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = ex.color + '25' }}
              >
                <div style={{ fontSize: 11, color: ex.color, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{ex.tag}</div>
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{ex.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works — light */}
      <div id="how-it-works" style={{ background: '#fafafa', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-1.5px', margin: 0 }}>
              Three steps from idea to live
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {STEPS.map((step, i) => (
              <div key={step.number} style={{ position: 'relative' }}>
                <div style={{
                  background: '#fff', borderRadius: 20, padding: '36px 32px',
                  border: '1px solid #ebe9e4', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                  height: '100%'
                }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{step.icon}</div>
                  <div style={{ fontSize: 12, color: '#7c6af7', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12 }}>STEP {step.number}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f0f14', margin: '0 0 12px', letterSpacing: '-0.5px' }}>{step.title}</h3>
                  <p style={{ fontSize: 15, color: '#6b6b7b', lineHeight: 1.7, margin: 0 }}>{step.description}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    display: 'none', // hidden on mobile, shown via CSS would need media query
                    position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)',
                    color: '#d0cdc8', fontSize: 20, fontWeight: 300
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features — white */}
      <div id="features" style={{ background: '#fff', padding: '100px 24px', borderTop: '1px solid #f0ede8' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-1.5px', margin: '0 0 16px' }}>
              Everything you need to ship
            </h2>
            <p style={{ color: '#6b6b7b', fontSize: 17, maxWidth: 480, margin: '0 auto' }}>No configuration. No deployment pipelines. Just describe and build.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: '#fafafa', borderRadius: 16, padding: '28px 28px',
                border: '1px solid #ebe9e4', transition: 'all 0.2s'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f2ff'; e.currentTarget.style.borderColor = '#c4bef7' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#ebe9e4' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6af7', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f0f14', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#6b6b7b', lineHeight: 1.65, margin: 0 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing preview — light gray */}
      <div style={{ background: '#f5f2ff', padding: '100px 24px', borderTop: '1px solid #e8e4f8' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-1.5px', margin: '0 0 16px' }}>
            Start free. Scale as you grow.
          </h2>
          <p style={{ color: '#6b6b7b', fontSize: 17, marginBottom: 48 }}>No credit card required to start. Credits refill monthly.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
            {[
              { name: 'Free', price: '$0', credits: '10 credits/month', features: ['5 apps', 'Live deployment', 'Community support'], featured: false },
              { name: 'Pro', price: '$19.9', credits: '100 credits/month', features: ['Unlimited apps', 'Priority builds', 'Email support', 'Download code'], featured: true },
              { name: 'Business', price: '$49.9', credits: '260 credits/month', features: ['Everything in Pro', 'Faster generation', 'Priority support', 'Early features'], featured: false },
            ].map(plan => (
              <div key={plan.name} style={{
                background: plan.featured ? '#7c6af7' : '#fff',
                borderRadius: 20, padding: '32px 28px', textAlign: 'left',
                border: plan.featured ? 'none' : '1px solid #e0daf8',
                boxShadow: plan.featured ? '0 20px 60px rgba(124,106,247,0.3)' : '0 4px 20px rgba(0,0,0,0.04)',
                transform: plan.featured ? 'scale(1.04)' : 'scale(1)',
                transition: 'transform 0.2s'
              }}>
                {plan.featured && <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Most popular</div>}
                <div style={{ fontSize: 18, fontWeight: 700, color: plan.featured ? '#fff' : '#0f0f14', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: plan.featured ? '#fff' : '#0f0f14', letterSpacing: '-1.5px', marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: plan.featured ? 'rgba(255,255,255,0.6)' : '#9b99aa', marginBottom: 24 }}>{plan.credits}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Check size={14} color={plan.featured ? 'rgba(255,255,255,0.8)' : '#7c6af7'} />
                    <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.85)' : '#4b4b5a' }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <Link to="/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: '#7c6af7', fontSize: 15, fontWeight: 600, textDecoration: 'none',
            transition: 'gap 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.gap = '12px'}
            onMouseLeave={e => e.currentTarget.style.gap = '8px'}
          >See full pricing details <ArrowRight size={16} /></Link>
        </div>
      </div>

      {/* Final CTA — dark */}
      <div style={{
        background: '#06060a', padding: '120px 24px', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,106,247,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800,
            color: '#fff', letterSpacing: '-2px', margin: '0 0 20px'
          }}>
            Your app is one prompt away.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, marginBottom: 40, maxWidth: 440, margin: '0 auto 40px' }}>
            No credit card. No setup. Just describe what you want to build.
          </p>
          <button onClick={handleCTA} style={{
            background: '#7c6af7', color: '#fff', border: 'none',
            padding: '16px 36px', borderRadius: 14, fontSize: 16, fontWeight: 700,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s', boxShadow: '0 0 50px rgba(124,106,247,0.4)'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 60px rgba(124,106,247,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(124,106,247,0.4)' }}
          >
            Start building for free <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#06060a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px', marginBottom: 8 }}>
              44<span style={{ color: '#7c6af7' }}>gen</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>From idea to live app in minutes.</div>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'Pricing', to: '/pricing' },
              { label: 'Contact', to: '/contact' },
              { label: 'Log in', to: '/auth' },
            ].map(link => (
              <Link key={link.label} to={link.to} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}
              >{link.label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44gen. All rights reserved.</div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(6px) } }
      `}</style>
    </div>
  )
}
