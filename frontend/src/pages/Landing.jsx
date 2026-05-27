import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Zap, Globe, Code2, Sparkles, Check, ChevronDown, Menu, X, Star } from 'lucide-react'

const PROMPTS = [
  'Build a SaaS dashboard with analytics',
  'Create a landing page for my startup',
  'Build a real-time expense tracker',
  'Design a portfolio for a UX designer',
  'Create an e-commerce product catalog',
  'Build a project management kanban board',
]

const REVIEWS = [
  { name: 'Sarah Chen', role: 'Founder @ Launchpad', avatar: 'SC', rating: 5, text: 'I built my entire MVP in one afternoon. What used to take weeks of dev time now takes minutes. 44gen is genuinely magic.' },
  { name: 'Marcus Williams', role: 'Product Designer', avatar: 'MW', rating: 5, text: 'The generated code is actually clean and readable. Not some garbage output — real React components I can build on top of.' },
  { name: 'Priya Patel', role: 'Solo founder', avatar: 'PP', rating: 5, text: 'Shipped my SaaS landing page in 20 minutes. My co-founder thought I hired a dev. I didn\'t.' },
  { name: 'Alex Rivera', role: 'Marketing Lead @ Vercel', avatar: 'AR', rating: 5, text: 'We use 44gen for rapid prototyping internal tools. It\'s replaced an entire workflow that used to take days.' },
  { name: 'James Okafor', role: 'Indie Hacker', avatar: 'JO', rating: 5, text: 'Went from idea to live URL in 8 minutes. I have a screenshot to prove it. This thing is insane.' },
  { name: 'Lisa Nakamura', role: 'CTO @ Flowbase', avatar: 'LN', rating: 5, text: 'The multi-file architecture output is surprisingly solid. Real component separation, proper imports. I\'m impressed.' },
]

const FEATURES = [
  { icon: '⚡', title: 'Builds in minutes', desc: 'From prompt to live deployed app in under 2 minutes. No setup, no config, no waiting.' },
  { icon: '🧠', title: 'Intelligent planning', desc: 'Our AI breaks your idea into structured steps before writing a single line of code. No guessing.' },
  { icon: '🌐', title: 'Instant live URL', desc: 'Every app gets its own subdomain automatically. Share a link the moment it\'s done.' },
  { icon: '🏗️', title: 'Multi-file architecture', desc: 'Real component structure — Navbar, Hero, Features — each in its own clean file.' },
  { icon: '💬', title: 'Refine with chat', desc: 'Ask for changes in plain English. Dark mode, new sections, layout tweaks — just describe it.' },
  { icon: '🔧', title: 'Auto-repair', desc: 'Build errors? Our system detects and fixes them automatically before you notice.' },
]

const STEPS = [
  { num: '01', title: 'Describe your idea', desc: 'Tell 44gen what you want in plain English. No jargon needed.' },
  { num: '02', title: 'Review the plan', desc: 'AI breaks it into structured steps. Approve or refine before a single line is written.' },
  { num: '03', title: 'Watch it build live', desc: 'See your app being written in real time, then deployed to a live URL automatically.' },
]

function FloatingOrb({ style }) {
  return <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }} />
}

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      ...style
    }}>{children}</div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const [reviewPage, setReviewPage] = useState(0)
  const [visibleSections, setVisibleSections] = useState({})
  const typingRef = useRef(null)
  const sectionRefs = useRef({})

  const REVIEWS_PER_PAGE = 3
  const totalPages = Math.ceil(REVIEWS.length / REVIEWS_PER_PAGE)
  const visibleReviews = REVIEWS.slice(reviewPage * REVIEWS_PER_PAGE, (reviewPage + 1) * REVIEWS_PER_PAGE)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisibleSections(prev => ({ ...prev, [entry.target.dataset.section]: true }))
        }
      })
    }, { threshold: 0.1 })
    Object.values(sectionRefs.current).forEach(ref => ref && observer.observe(ref))
    return () => observer.disconnect()
  }, [])

  const registerSection = (key) => (el) => { if (el) { el.dataset.section = key; sectionRefs.current[key] = el } }

  useEffect(() => {
    const current = PROMPTS[promptIdx]
    if (typing) {
      if (displayed.length < current.length) {
        typingRef.current = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 40)
      } else {
        typingRef.current = setTimeout(() => setTyping(false), 2400)
      }
    } else {
      if (displayed.length > 0) {
        typingRef.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 16)
      } else {
        setPromptIdx(i => (i + 1) % PROMPTS.length)
        setTyping(true)
      }
    }
    return () => clearTimeout(typingRef.current)
  }, [displayed, typing, promptIdx])

  // Auto-rotate reviews
  useEffect(() => {
    const t = setInterval(() => setReviewPage(p => (p + 1) % totalPages), 5000)
    return () => clearInterval(t)
  }, [totalPages])

  const handleCTA = () => navigate(user ? '/dashboard' : '/auth')

  const fadeUp = (key, delay = 0) => ({
    opacity: visibleSections[key] ? 1 : 0,
    transform: visibleSections[key] ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  })

  // Colors: hot pink → violet → electric blue
  const G = 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)'
  const GTEXT = { background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: '#080811', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: 64, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,17,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.4s ease',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>

        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {[{ label: 'How it works', href: '#how' }, { label: 'Features', href: '#features' }, { label: 'Reviews', href: '#reviews' }, { label: 'Pricing', href: '/pricing' }].map(l => (
            l.href.startsWith('/') ?
              <Link key={l.label} to={l.href} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l.label}</Link> :
              <a key={l.label} href={l.href} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l.label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: G, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/auth')} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>Log in</button>
              <button onClick={handleCTA} style={{ background: G, color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(255,60,172,0.35)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 36px rgba(255,60,172,0.55)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 24px rgba(255,60,172,0.35)'}>Get started free</button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '140px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Orbs */}
        <FloatingOrb style={{ width: 700, height: 700, top: '-10%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(255,60,172,0.2) 0%, rgba(120,75,160,0.12) 40%, transparent 70%)', animation: 'floatA 8s ease-in-out infinite' }} />
        <FloatingOrb style={{ width: 400, height: 400, top: '20%', left: '-5%', background: 'rgba(43,134,197,0.15)', animation: 'floatB 10s ease-in-out infinite' }} />
        <FloatingOrb style={{ width: 300, height: 300, top: '30%', right: '-3%', background: 'rgba(255,60,172,0.12)', animation: 'floatC 12s ease-in-out infinite' }} />
        <FloatingOrb style={{ width: 200, height: 200, bottom: '15%', left: '20%', background: 'rgba(120,75,160,0.18)', animation: 'floatA 9s ease-in-out infinite reverse' }} />

        {/* Floating glass cards — decorative */}
        <GlassCard style={{ position: 'absolute', top: '18%', left: '6%', padding: '14px 18px', animation: 'floatB 6s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>App deployed live</span>
        </GlassCard>

        <GlassCard style={{ position: 'absolute', top: '25%', right: '7%', padding: '14px 18px', animation: 'floatC 7s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Build time</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>1 min 42s</div>
          </div>
        </GlassCard>

        <GlassCard style={{ position: 'absolute', bottom: '22%', right: '8%', padding: '14px 18px', animation: 'floatA 8s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🎨</span>
          <div>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>6 files generated</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Navbar, Hero, Features...</div>
          </div>
        </GlassCard>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 100, background: 'rgba(255,60,172,0.1)', border: '1px solid rgba(255,60,172,0.25)', marginBottom: 36, fontSize: 13, color: '#ff9ad5', fontWeight: 600, animation: 'fadeInDown 0.8s ease both' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3cac', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          AI-powered app builder · Free to start
        </div>

        <h1 style={{ fontSize: 'clamp(48px, 8vw, 90px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', margin: '0 0 28px', maxWidth: 900, animation: 'fadeInUp 0.9s ease 0.1s both' }}>
          <span style={{ color: '#fff' }}>From idea to </span>
          <span style={GTEXT}>live app</span>
          <br />
          <span style={{ color: '#fff' }}>in minutes</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 19, maxWidth: 520, margin: '0 auto 52px', lineHeight: 1.7, animation: 'fadeInUp 0.9s ease 0.2s both' }}>
          Describe your app in plain English. 44gen plans, builds, and deploys it to a live URL — no code required.
        </p>

        {/* Typewriter box */}
        <div style={{ width: '100%', maxWidth: 660, marginBottom: 36, animation: 'fadeInUp 0.9s ease 0.3s both' }}>
          <GlassCard style={{ padding: '20px 24px', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: G, opacity: 0.6 }} />
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Try something like...</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, minHeight: 26, flex: 1 }}>
                {displayed}<span style={{ animation: 'blink 1s infinite', opacity: 0.6 }}>|</span>
              </span>
              <button onClick={handleCTA} style={{ background: G, color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 20px rgba(255,60,172,0.3)', flexShrink: 0, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 32px rgba(255,60,172,0.5)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,60,172,0.3)'}>
                Build this <ArrowRight size={14} />
              </button>
            </div>
          </GlassCard>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72, animation: 'fadeInUp 0.9s ease 0.4s both' }}>
          <button onClick={handleCTA} style={{ background: G, color: '#fff', border: 'none', padding: '15px 32px', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 50px rgba(255,60,172,0.4)', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 60px rgba(255,60,172,0.6)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 0 50px rgba(255,60,172,0.4)' }}>
            Start building free <ArrowRight size={17} />
          </button>
          <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 6 }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
            View pricing →
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, animation: 'fadeInUp 0.9s ease 0.5s both' }}>
          {[['< 2 min', 'Avg build time'], ['Free', 'To start'], ['Live URL', 'Instant deploy']].map(([val, label], i) => (
            <div key={label} style={{ padding: '0 40px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{val}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite' }}>
          <ChevronDown size={22} color="rgba(255,255,255,0.15)" />
        </div>
      </div>

      {/* ── How it works ── */}
      <div id="how" style={{ padding: '120px 24px', position: 'relative' }} ref={registerSection('how')}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #080811 0%, #0d0d1a 50%, #080811 100%)', zIndex: 0 }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: 0, ...fadeUp('how') }}>
              Three steps from idea to live
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {STEPS.map((step, i) => (
              <GlassCard key={step.num} style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden', ...fadeUp('how', i * 0.15) }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: G, opacity: 0.5 }} />
                <div style={{ fontSize: 48, fontWeight: 900, ...GTEXT, lineHeight: 1, marginBottom: 20, letterSpacing: '-2px' }}>{step.num}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div id="features" style={{ padding: '100px 24px', position: 'relative' }} ref={registerSection('features')}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Features</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px', ...fadeUp('features') }}>Everything you need to ship</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, maxWidth: 420, margin: '0 auto', ...fadeUp('features', 0.1) }}>No config. No DevOps. Just describe and build.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <GlassCard key={f.title} style={{ padding: '32px 28px', transition: 'all 0.3s', cursor: 'default', ...fadeUp('features', i * 0.08) }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(255,60,172,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ fontSize: 32, marginBottom: 18 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── Reviews ── */}
      <div id="reviews" style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }} ref={registerSection('reviews')}>
        <FloatingOrb style={{ width: 500, height: 500, bottom: '-10%', right: '-5%', background: 'rgba(43,134,197,0.12)', animation: 'floatB 10s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Reviews</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 12px', ...fadeUp('reviews') }}>Builders love 44gen</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, ...fadeUp('reviews', 0.1) }}>Real feedback from real users.</p>
          </div>

          {/* Review cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32, transition: 'all 0.4s ease' }}>
            {visibleReviews.map((r, i) => (
              <GlassCard key={r.name} style={{ padding: '28px', transition: 'all 0.4s ease', ...fadeUp('reviews', i * 0.1) }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[...Array(r.rating)].map((_, j) => <Star key={j} size={14} fill="#ff3cac" color="#ff3cac" />)}
                </div>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{r.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{r.role}</div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setReviewPage(i)} style={{ width: i === reviewPage ? 24 : 8, height: 8, borderRadius: 100, background: i === reviewPage ? '#ff3cac' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        </div>
      </div>


      {/* ── Built with 44Gen ── */}
      <div style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }} ref={registerSection('built')}>
        <FloatingOrb style={{ width: 450, height: 450, top: '20%', right: '-5%', background: 'rgba(120,75,160,0.12)', animation: 'floatB 11s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Showcase</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px', ...fadeUp('built') }}>
              Real apps built with 44Gen
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, maxWidth: 440, margin: '0 auto', ...fadeUp('built', 0.1) }}>
              From landing pages to dashboards — shipped in minutes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {[
              {
                title: 'FlowMetrics — Analytics Dashboard',
                tag: 'Dashboard',
                desc: 'Real-time analytics with charts, KPI cards, and user activity feed.',
                gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                accent: '#818cf8',
                ui: [
                  { type: 'bar', label: 'Revenue Overview' },
                  { type: 'stats', values: ['$48,293', '+12.4%', '1,847'] },
                ]
              },
              {
                title: 'NovaSend — Email SaaS Landing',
                tag: 'Landing Page',
                desc: 'High-converting marketing page with pricing, testimonials, and CTA.',
                gradient: 'linear-gradient(135deg, #0d1117 0%, #1a0533 50%, #0d1117 100%)',
                accent: '#e879f9',
                ui: [
                  { type: 'hero', label: 'Send smarter emails' },
                  { type: 'pills', values: ['Free', 'Pro', 'Enterprise'] },
                ]
              },
              {
                title: 'TrackHabit — Habit Tracker',
                tag: 'Productivity App',
                desc: 'Daily habit tracker with streak counts, progress rings, and journal.',
                gradient: 'linear-gradient(135deg, #0a1628 0%, #0d2d44 50%, #0a1628 100%)',
                accent: '#34d399',
                ui: [
                  { type: 'rings', values: ['85%', '60%', '95%'] },
                  { type: 'streak', label: '🔥 14 day streak' },
                ]
              },
              {
                title: 'ShopVault — E-commerce Store',
                tag: 'E-commerce',
                desc: 'Product catalog with filters, cart, and checkout flow.',
                gradient: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
                accent: '#fb923c',
                ui: [
                  { type: 'products', values: ['$129', '$89', '$249'] },
                  { type: 'cart', label: '3 items · $467' },
                ]
              },
              {
                title: 'Portfol.io — Developer Portfolio',
                tag: 'Portfolio',
                desc: 'Minimal dark portfolio with projects, skills, and contact form.',
                gradient: 'linear-gradient(135deg, #020817 0%, #0c1a2e 50%, #020817 100%)',
                accent: '#38bdf8',
                ui: [
                  { type: 'hero', label: 'Hi, I'm Alex Rivera' },
                  { type: 'pills', values: ['React', 'Node.js', 'AWS'] },
                ]
              },
              {
                title: 'BudgetFlow — Finance Tracker',
                tag: 'Tool',
                desc: 'Expense tracker with category breakdowns, monthly charts, and budgets.',
                gradient: 'linear-gradient(135deg, #001a0f 0%, #002d1a 50%, #001a0f 100%)',
                accent: '#4ade80',
                ui: [
                  { type: 'bar', label: 'Monthly Spending' },
                  { type: 'stats', values: ['$3,200', '-8.2%', '$800'] },
                ]
              },
            ].map((project, i) => (
              <GlassCard key={project.title} style={{ overflow: 'hidden', transition: 'all 0.35s', cursor: 'default', ...fadeUp('built', i * 0.07) }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 24px 60px rgba(0,0,0,0.5)` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* App preview mockup */}
                <div style={{ height: 180, background: project.gradient, position: 'relative', overflow: 'hidden', padding: '16px' }}>
                  {/* Browser chrome */}
                  <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 14, marginLeft: 8 }} />
                  </div>
                  {/* UI preview */}
                  {project.ui.map((el, j) => (
                    <div key={j} style={{ marginBottom: 8 }}>
                      {el.type === 'bar' && (
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>{el.label}</div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 36 }}>
                            {[60, 80, 45, 90, 70, 55, 85].map((h, k) => (
                              <div key={k} style={{ flex: 1, height: `${h}%`, background: project.accent, opacity: 0.7 + k * 0.04, borderRadius: '2px 2px 0 0' }} />
                            ))}
                          </div>
                        </div>
                      )}
                      {el.type === 'stats' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {el.values.map((v, k) => (
                            <div key={k} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '6px 10px', flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: k === 1 ? project.accent : '#fff' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {el.type === 'hero' && (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{el.label}</div>
                          <div style={{ width: '60%', height: 6, background: project.accent, borderRadius: 3, opacity: 0.8, marginBottom: 6 }} />
                          <div style={{ width: '40%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
                        </div>
                      )}
                      {el.type === 'pills' && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {el.values.map((v, k) => (
                            <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: k === 1 ? project.accent : 'rgba(255,255,255,0.1)', color: k === 1 ? '#000' : 'rgba(255,255,255,0.7)' }}>{v}</span>
                          ))}
                        </div>
                      )}
                      {el.type === 'rings' && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {el.values.map((v, k) => (
                            <div key={k} style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${project.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {el.type === 'streak' && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{el.label}</span>
                        </div>
                      )}
                      {el.type === 'products' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          {el.values.map((v, k) => (
                            <div key={k} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                              <div style={{ width: '100%', height: 28, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 5 }} />
                              <div style={{ fontSize: 11, fontWeight: 700, color: project.accent }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {el.type === 'cart' && (
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{el.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: project.accent }}>Checkout →</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Glow overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(transparent, rgba(0,0,0,0.3))` }} />
                </div>

                {/* Card info */}
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: `${project.accent}18`, color: project.accent, letterSpacing: '0.06em' }}>{project.tag}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{project.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{project.desc}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pricing preview ── */}
      <div style={{ padding: '100px 24px', position: 'relative' }} ref={registerSection('pricing')}>
        <FloatingOrb style={{ width: 400, height: 400, top: '10%', left: '-5%', background: 'rgba(255,60,172,0.1)', animation: 'floatC 11s ease-in-out infinite' }} />
        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px', ...fadeUp('pricing') }}>Start free. Scale as you grow.</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, ...fadeUp('pricing', 0.1) }}>Credits refill monthly. No hidden fees. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 40 }}>
            {[
              { name: 'Free', price: '$0', credits: '10 credits/mo', tag: null, features: ['5 apps', 'Live deployment', 'Code download', 'Community support'] },
              { name: 'Pro', price: '$19.9', credits: '100 credits/mo', tag: 'Most popular', features: ['Unlimited apps', 'Priority builds', 'Email support', 'Multi-file output'] },
              { name: 'Business', price: '$49.9', credits: '260 credits/mo', tag: null, features: ['Everything in Pro', 'Fastest builds', 'Priority support', 'Early access'] },
            ].map((plan, i) => (
              <GlassCard key={plan.name} style={{ padding: '32px 28px', position: 'relative', transition: 'all 0.3s', border: plan.tag ? '1px solid rgba(255,60,172,0.35)' : '1px solid rgba(255,255,255,0.08)', ...fadeUp('pricing', i * 0.1) }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = plan.tag ? '0 20px 60px rgba(255,60,172,0.2)' : '0 20px 40px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {plan.tag && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: G, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>{plan.tag}</div>}
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>{plan.credits}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Check size={13} color="#ff3cac" />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                  </div>
                ))}
                <button onClick={handleCTA} style={{ marginTop: 24, width: '100%', padding: '12px 0', borderRadius: 12, background: plan.tag ? G : 'rgba(255,255,255,0.08)', color: '#fff', border: plan.tag ? 'none' : '1px solid rgba(255,255,255,0.12)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: plan.tag ? '0 0 24px rgba(255,60,172,0.3)' : 'none' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Get started
                </button>
              </GlassCard>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6 }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              View full pricing details <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div style={{ padding: '140px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <FloatingOrb style={{ width: 600, height: 600, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(255,60,172,0.18) 0%, rgba(43,134,197,0.1) 50%, transparent 70%)', animation: 'floatA 9s ease-in-out infinite' }} />
        <div style={{ position: 'relative', zIndex: 1 }} ref={registerSection('cta')}>
          <h2 style={{ fontSize: 'clamp(40px, 6vw, 76px)', fontWeight: 900, letterSpacing: '-2.5px', margin: '0 0 24px', lineHeight: 1.05, ...fadeUp('cta') }}>
            <span style={{ color: '#fff' }}>Your app is </span>
            <span style={GTEXT}>one prompt</span>
            <br /><span style={{ color: '#fff' }}>away.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, marginBottom: 44, maxWidth: 420, margin: '0 auto 44px', ...fadeUp('cta', 0.1) }}>
            No credit card. No setup. Just describe what you want to build.
          </p>
          <button onClick={handleCTA} style={{ background: G, color: '#fff', border: 'none', padding: '18px 40px', borderRadius: 16, fontSize: 17, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 0 60px rgba(255,60,172,0.45)', transition: 'all 0.25s', ...fadeUp('cta', 0.2) }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 80px rgba(255,60,172,0.65)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(255,60,172,0.45)' }}>
            Start building for free <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 32px 40px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
                <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 260, margin: '0 0 20px' }}>From idea to live app in minutes. Build React apps with AI, deploy instantly.</p>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44gen. All rights reserved.</div>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Product</div>
              {[{ label: 'How it works', href: '#how' }, { label: 'Features', href: '#features' }, { label: 'Pricing', to: '/pricing' }, { label: 'Contact', to: '/contact' }].map(l => (
                l.to ? <Link key={l.label} to={l.to} style={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l.label}</Link> :
                  <a key={l.label} href={l.href} style={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l.label}</a>
              ))}
            </div>

            {/* Account */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Account</div>
              {[{ label: 'Log in', to: '/auth' }, { label: 'Sign up free', to: '/auth' }, { label: 'Dashboard', to: '/dashboard' }].map(l => (
                <Link key={l.label} to={l.to} style={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l.label}</Link>
              ))}
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Legal</div>
              {[{ label: 'Privacy Policy', to: '/privacy' }, { label: 'Terms of Service', to: '/terms' }].map(l => (
                <Link key={l.label} to={l.to} style={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#ff3cac" color="#ff3cac" />)}
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginLeft: 8 }}>Loved by builders worldwide</span>
            </div>
            <button onClick={handleCTA} style={{ background: G, color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 20px rgba(255,60,172,0.25)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 32px rgba(255,60,172,0.45)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,60,172,0.25)'}>
              Start building free <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes floatA { 0%, 100% { transform: translateX(-50%) translateY(0px) } 50% { transform: translateX(-50%) translateY(-24px) } }
        @keyframes floatB { 0%, 100% { transform: translateY(0px) rotate(0deg) } 50% { transform: translateY(-18px) rotate(3deg) } }
        @keyframes floatC { 0%, 100% { transform: translateY(0px) } 50% { transform: translateY(-14px) } }
        @keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255,60,172,0.4) } 50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(255,60,172,0) } }
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0) } 50% { transform: translateX(-50%) translateY(8px) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
