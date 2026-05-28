import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Check, ChevronDown, Star, Zap, Globe, Code2, Sparkles, Shield, RefreshCw } from 'lucide-react'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const O = {
  // Orange scale
  500: '#FF6B00',
  400: '#FF7A18',
  300: '#F97316',
  glow: 'rgba(255,107,0,0.35)',
  glowStrong: 'rgba(255,107,0,0.6)',
  // Gradient
  grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)',
  gradDiag: 'linear-gradient(135deg, #FF4500 0%, #FF7A18 50%, #FDBA74 100%)',
  // Text gradient
  textGrad: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
}
const BG = { deep: '#050505', base: '#0B0B0D', surface: '#111111', raised: '#161618' }
const BORDER = { subtle: 'rgba(255,255,255,0.06)', soft: 'rgba(255,255,255,0.1)', orange: 'rgba(255,107,0,0.25)' }

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROMPTS = [
  'Build a SaaS analytics dashboard',
  'Create a startup landing page',
  'Build a real-time expense tracker',
  'Design a UX designer portfolio',
  'Create an e-commerce product catalog',
  'Build a project management kanban board',
]

const REVIEWS = [
  { name: 'Sarah Chen', role: 'Founder @ Launchpad', avatar: 'SC', text: 'I built my entire MVP in one afternoon. What used to take weeks now takes minutes. 44gen is genuinely magic.' },
  { name: 'Marcus Williams', role: 'Product Designer', avatar: 'MW', text: 'The generated code is actually clean and readable. Not garbage output — real React components I can build on top of.' },
  { name: 'Priya Patel', role: 'Solo founder', avatar: 'PP', text: 'Shipped my SaaS landing page in 20 minutes. My co-founder thought I hired a dev. I didn\'t.' },
  { name: 'Alex Rivera', role: 'Marketing Lead', avatar: 'AR', text: 'We use 44gen for rapid prototyping internal tools. It\'s replaced an entire workflow that used to take days.' },
  { name: 'James Okafor', role: 'Indie Hacker', avatar: 'JO', text: 'Went from idea to live URL in 8 minutes. I have a screenshot to prove it. This thing is insane.' },
  { name: 'Lisa Nakamura', role: 'CTO @ Flowbase', avatar: 'LN', text: 'Multi-file architecture output is surprisingly solid. Real component separation, proper imports. I\'m impressed.' },
]

const FEATURES = [
  { icon: <Zap size={20} />, title: 'Builds in minutes', desc: 'From prompt to live deployed app in under 2 minutes. No setup, no config, no waiting.' },
  { icon: <Sparkles size={20} />, title: 'Intelligent planning', desc: 'AI breaks your idea into structured steps before writing a single line of code.' },
  { icon: <Globe size={20} />, title: 'Instant live URL', desc: 'Every app gets its own subdomain automatically. Share a link the moment it\'s done.' },
  { icon: <Code2 size={20} />, title: 'Multi-file architecture', desc: 'Real component structure — Navbar, Hero, Features — each in its own clean file.' },
  { icon: <RefreshCw size={20} />, title: 'Refine with chat', desc: 'Ask for changes in plain English. Dark mode, new sections — just describe it.' },
  { icon: <Shield size={20} />, title: 'Auto-repair', desc: 'Build errors? The system detects and fixes them automatically before you notice.' },
]

const SHOWCASE = [
  { title: 'FlowMetrics', tag: 'Dashboard', desc: 'Real-time analytics with charts and KPI cards', gradient: 'linear-gradient(135deg, #0f0c29, #302b63)', accent: '#818cf8', bars: [60,80,45,90,70,55,85], stats: ['$48K', '+12%', '1.8K'] },
  { title: 'NovaSend', tag: 'SaaS Landing', desc: 'High-converting marketing page with pricing', gradient: 'linear-gradient(135deg, #0a0a0a, #1a0a00)', accent: '#FF7A18', bars: [40,70,55,80,65,90,75], stats: ['4.2K', '+31%', '89%'] },
  { title: 'TrackHabit', tag: 'Productivity', desc: 'Daily habits with streaks and progress rings', gradient: 'linear-gradient(135deg, #0a1628, #0d2d44)', accent: '#34d399', bars: [85,90,70,95,80,75,88], stats: ['14🔥', '95%', '7/7'] },
  { title: 'ShopVault', tag: 'E-commerce', desc: 'Product catalog with cart and checkout', gradient: 'linear-gradient(135deg, #1a0a00, #2d1500)', accent: '#fb923c', bars: [50,65,80,45,70,85,60], stats: ['$467', '12+', '4.9★'] },
]

// ─── Atoms ────────────────────────────────────────────────────────────────────
const Orb = ({ style }) => (
  <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }} />
)

const Panel = ({ children, style, glow, ...props }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${glow ? BORDER.orange : BORDER.subtle}`,
    borderRadius: 20,
    boxShadow: glow ? `0 0 40px rgba(255,107,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
    ...style
  }} {...props}>{children}</div>
)

const OrangeBtn = ({ children, onClick, size = 'md', style }) => {
  const [hov, setHov] = useState(false)
  const pad = size === 'lg' ? '16px 36px' : size === 'sm' ? '9px 18px' : '12px 26px'
  const fs = size === 'lg' ? 17 : size === 'sm' ? 13 : 14
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: O.grad, color: '#fff', border: 'none', padding: pad, borderRadius: 12,
        fontSize: fs, fontWeight: 700, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: hov ? `0 8px 40px ${O.glowStrong}` : `0 0 24px ${O.glow}`,
        transform: hov ? 'translateY(-2px) scale(1.02)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...style
      }}>
      {children}
    </button>
  )
}

const GhostBtn = ({ children, onClick, style }) => {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        color: hov ? '#fff' : 'rgba(255,255,255,0.6)',
        border: `1px solid ${hov ? BORDER.soft : BORDER.subtle}`,
        padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        transition: 'all 0.2s ease', ...style
      }}>
      {children}
    </button>
  )
}

// ─── Fake AI workspace preview ──────────────────────────────────────────────
function AIWorkspace() {
  const [step, setStep] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [files, setFiles] = useState([])
  const prompt = 'Create a SaaS analytics dashboard'
  const fileList = ['src/App.jsx', 'src/components/Header.jsx', 'src/components/Sidebar.jsx', 'src/pages/Dashboard.jsx', 'src/components/Chart.jsx']
  const codeLines = [
    "import { useState } from 'react'",
    "import { LineChart, BarChart } from 'recharts'",
    '',
    'export default function Dashboard() {',
    '  const [data] = useState(metrics)',
    '  return (',
    '    <div className="dashboard">',
    '      <Header title="Analytics" />',
    '      <Sidebar nav={routes} />',
    '      <MetricCard value={data.revenue} />',
    '    </div>',
    '  )',
    '}',
  ]

  useEffect(() => {
    const timers = []
    timers.push(setTimeout(() => setStep(1), 800))
    timers.push(setTimeout(() => setStep(2), 2000))
    const typeInterval = setInterval(() => {
      setCharIdx(c => {
        if (c >= prompt.length) { clearInterval(typeInterval); return c }
        return c + 1
      })
    }, 45)
    timers.push(setTimeout(() => setStep(3), 3200))
    fileList.forEach((_, i) => {
      timers.push(setTimeout(() => setFiles(f => [...f, fileList[i]]), 3400 + i * 300))
    })
    timers.push(setTimeout(() => setStep(4), 5200))
    return () => { timers.forEach(clearTimeout); clearInterval(typeInterval) }
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
      {/* Ambient glow behind workspace */}
      <div style={{ position: 'absolute', inset: -60, background: 'radial-gradient(ellipse, rgba(255,107,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Main window */}
      <Panel style={{ overflow: 'hidden', position: 'relative' }} glow>
        {/* Title bar */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER.subtle}`, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 6, margin: '0 8px', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>44gen.com/build</span>
          </div>
        </div>

        <div style={{ padding: '20px', minHeight: 340 }}>
          {/* Step 0-1: Prompt input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Your prompt</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${step >= 1 ? BORDER.orange : BORDER.subtle}`, borderRadius: 10, padding: '12px 16px', fontSize: 14, color: step >= 1 ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.4s', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color={step >= 1 ? '#FF7A18' : 'rgba(255,255,255,0.15)'} style={{ flexShrink: 0, transition: 'color 0.4s' }} />
              <span>{step >= 1 ? prompt.slice(0, charIdx) : 'Describe your app...'}<span style={{ animation: step >= 1 && charIdx < prompt.length ? 'blink 0.8s infinite' : 'none', opacity: 0.7 }}>|</span></span>
            </div>
          </div>

          {/* Step 2: Planning */}
          {step >= 2 && (
            <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AI planning</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Analyzing requirements', 'Component structure', 'Data flow', 'Routing'].map((t, i) => (
                  <div key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', color: '#FDBA74', fontWeight: 600, animation: `fadeUp 0.3s ease ${i * 0.1}s both` }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Files generating */}
          {step >= 3 && (
            <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Generating files</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {files.map((f, i) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp 0.25s ease' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                    <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>✓</span>
                  </div>
                ))}
                {step < 4 && files.length < fileList.length && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF7A18', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontFamily: "'Fira Code', monospace", color: 'rgba(255,255,255,0.3)' }}>generating...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Live */}
          {step >= 4 && (
            <div style={{ animation: 'fadeUp 0.5s ease' }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>Deployed live</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>→ app-8f3d.44gen.com</span>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Floating stat cards */}
      <Panel style={{ position: 'absolute', top: -24, right: -48, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'float1 5s ease-in-out infinite', zIndex: 10 }}>
        <Zap size={14} color='#FF7A18' />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>1m 42s</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Build time</div>
        </div>
      </Panel>

      <Panel style={{ position: 'absolute', bottom: -20, left: -44, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'float2 6s ease-in-out infinite', zIndex: 10 }}>
        <Code2 size={14} color='#FF7A18' />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>5 files</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Generated</div>
        </div>
      </Panel>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const [reviewPage, setReviewPage] = useState(0)
  const [visible, setVisible] = useState({})
  const [activeStep, setActiveStep] = useState(0)
  const refs = useRef({})
  const typingRef = useRef(null)

  const REVIEWS_PER_PAGE = 3
  const totalPages = Math.ceil(REVIEWS.length / REVIEWS_PER_PAGE)

  const handleCTA = () => navigate(user ? '/dashboard' : '/auth')

  // Scroll + section observer
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.s]: true })) })
    }, { threshold: 0.12 })
    Object.values(refs.current).forEach(r => r && obs.observe(r))
    return () => obs.disconnect()
  }, [])

  const reg = key => el => { if (el) { el.dataset.s = key; refs.current[key] = el } }

  // Typewriter
  useEffect(() => {
    const cur = PROMPTS[promptIdx]
    if (typing) {
      if (displayed.length < cur.length) typingRef.current = setTimeout(() => setDisplayed(cur.slice(0, displayed.length + 1)), 42)
      else typingRef.current = setTimeout(() => setTyping(false), 2600)
    } else {
      if (displayed.length > 0) typingRef.current = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 15)
      else { setPromptIdx(i => (i + 1) % PROMPTS.length); setTyping(true) }
    }
    return () => clearTimeout(typingRef.current)
  }, [displayed, typing, promptIdx])

  // Review auto-rotate
  useEffect(() => {
    const t = setInterval(() => setReviewPage(p => (p + 1) % totalPages), 5500)
    return () => clearInterval(t)
  }, [totalPages])

  // How it works step cycle
  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 3), 3000)
    return () => clearInterval(t)
  }, [])

  const fu = (key, delay = 0) => ({
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
  })

  const visibleReviews = REVIEWS.slice(reviewPage * REVIEWS_PER_PAGE, (reviewPage + 1) * REVIEWS_PER_PAGE)

  return (
    <div style={{ fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif", background: BG.deep, color: '#fff', overflowX: 'hidden', lineHeight: 1.5 }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, height: 64,
        padding: '0 clamp(20px, 4vw, 56px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(5,5,5,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(28px) saturate(1.5)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER.subtle}` : 'none',
        transition: 'all 0.35s ease',
      }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', boxShadow: `0 0 20px ${O.glow}` }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 19, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {[{ l: 'How it works', h: '#how' }, { l: 'Features', h: '#features' }, { l: 'Showcase', h: '#showcase' }, { l: 'Pricing', h: '/pricing' }].map(({ l, h }) => (
            h.startsWith('/') ?
              <Link key={l} to={h} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</Link> :
              <a key={l} href={h} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {user ? (
            <OrangeBtn onClick={() => navigate('/dashboard')} size="sm">Dashboard</OrangeBtn>
          ) : (
            <>
              <GhostBtn onClick={() => navigate('/auth')} style={{ padding: '9px 18px', fontSize: 13 }}>Log in</GhostBtn>
              <OrangeBtn onClick={handleCTA} size="sm">Start free <ArrowRight size={13} /></OrangeBtn>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px clamp(20px, 5vw, 80px) 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Atmospheric background */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 60% 40%, rgba(255,107,0,0.08) 0%, transparent 65%)` }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <Orb style={{ width: 500, height: 500, top: '-10%', right: '5%', background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 65%)', animation: 'floatA 9s ease-in-out infinite' }} />
        <Orb style={{ width: 300, height: 300, bottom: '10%', left: '0%', background: 'rgba(255,154,60,0.08)', animation: 'floatB 12s ease-in-out infinite' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px, 6vw, 100px)', alignItems: 'center' }}>
          {/* Left */}
          <div>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 32, fontSize: 12, color: '#FDBA74', fontWeight: 700, letterSpacing: '0.04em', animation: 'heroIn 0.8s ease both' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: `0 0 8px ${O.glow}` }} />
              AI-powered app builder · Free to start
            </div>

            <h1 style={{ fontSize: 'clamp(42px, 5.5vw, 78px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', margin: '0 0 28px', animation: 'heroIn 0.8s ease 0.1s both' }}>
              <span style={{ color: '#fff' }}>Build apps.</span>
              <br />
              <span style={O.textGrad}>Ship instantly.</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>No code needed.</span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 18, maxWidth: 480, marginBottom: 44, lineHeight: 1.75, animation: 'heroIn 0.8s ease 0.2s both' }}>
              Describe your app in plain English. 44gen plans, builds, and deploys it to a live URL in minutes.
            </p>

            {/* Typewriter prompt */}
            <div style={{ marginBottom: 36, animation: 'heroIn 0.8s ease 0.3s both' }}>
              <Panel style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden' }} glow>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: O.grad, opacity: 0.7 }} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Try something like...</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, flex: 1, minHeight: 24 }}>
                    {displayed}<span style={{ animation: 'blink 1s infinite', opacity: 0.6 }}>|</span>
                  </span>
                  <OrangeBtn onClick={handleCTA} size="sm">Build this <ArrowRight size={13} /></OrangeBtn>
                </div>
              </Panel>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 56, animation: 'heroIn 0.8s ease 0.4s both' }}>
              <OrangeBtn onClick={handleCTA} size="lg">Start building free <ArrowRight size={17} /></OrangeBtn>
              <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 5 }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                View pricing →
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 0, animation: 'heroIn 0.8s ease 0.5s both' }}>
              {[['< 2 min', 'Build time'], ['Free', 'To start'], ['Live URL', 'Auto deploy']].map(([val, label], i) => (
                <div key={label} style={{ paddingRight: 36, marginRight: 36, borderRight: i < 2 ? `1px solid ${BORDER.subtle}` : 'none' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — AI workspace */}
          <div style={{ display: 'flex', justifyContent: 'center', animation: 'heroIn 0.9s ease 0.15s both' }}>
            <AIWorkspace />
          </div>
        </div>

        {/* Scroll cue */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2.5s ease-in-out infinite' }}>
          <ChevronDown size={20} color="rgba(255,255,255,0.12)" />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how" style={{ padding: 'clamp(80px,10vw,140px) clamp(20px,5vw,80px)', position: 'relative' }} ref={reg('how')}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${BG.deep} 0%, ${BG.base} 50%, ${BG.deep} 100%)` }} />

        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', margin: 0, ...fu('how') }}>
              Three steps. Live app.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { n: '01', title: 'Describe your idea', desc: 'Tell 44gen what you want in plain English. No jargon, no specs.' },
              { n: '02', title: 'Review the plan', desc: 'AI structures your idea into steps. Approve or refine before code is written.' },
              { n: '03', title: 'Watch it build', desc: 'See your app written live, then deployed to a URL — automatically.' },
            ].map((s, i) => (
              <Panel key={s.n}
                glow={activeStep === i}
                style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden', transition: 'all 0.4s ease', transform: activeStep === i ? 'translateY(-6px)' : 'none', ...fu('how', i * 0.12) }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: O.grad, opacity: activeStep === i ? 0.9 : 0, transition: 'opacity 0.4s' }} />
                <div style={{ fontSize: 52, fontWeight: 900, ...O.textGrad, lineHeight: 1, marginBottom: 20, letterSpacing: '-2px' }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }} ref={reg('features')}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 14px', ...fu('features') }}>Everything you need to ship</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, maxWidth: 380, margin: '0 auto', ...fu('features', 0.1) }}>No config. No DevOps. Just describe and build.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Panel key={f.title} style={{ padding: '32px 28px', transition: 'all 0.3s ease', cursor: 'default', ...fu('features', i * 0.07) }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = BORDER.orange }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = BORDER.subtle }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF7A18', marginBottom: 20 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase ──────────────────────────────────────────────────── */}
      <section id="showcase" style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }} ref={reg('showcase')}>
        <Orb style={{ width: 400, height: 400, top: '10%', right: '-8%', background: 'rgba(255,107,0,0.07)', animation: 'floatB 11s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Showcase</div>
            <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 14px', ...fu('showcase') }}>Real apps built with 44Gen</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, maxWidth: 400, margin: '0 auto', ...fu('showcase', 0.1) }}>From landing pages to dashboards — shipped in minutes.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {SHOWCASE.map((p, i) => (
              <Panel key={p.title} style={{ overflow: 'hidden', transition: 'all 0.35s ease', cursor: 'default', ...fu('showcase', i * 0.08) }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = `0 28px 60px rgba(0,0,0,0.5)` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                {/* App preview */}
                <div style={{ height: 160, background: p.gradient, position: 'relative', padding: 14, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 7, padding: '7px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {['#ff5f57','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
                    <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginLeft: 6 }} />
                  </div>
                  {/* Bar chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
                    {p.bars.map((h, k) => (
                      <div key={k} style={{ flex: 1, height: `${h}%`, background: p.accent, opacity: 0.6 + k * 0.04, borderRadius: '2px 2px 0 0', transition: 'height 0.5s ease' }} />
                    ))}
                  </div>
                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {p.stats.map((v, k) => (
                      <div key={k} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: k === 0 ? p.accent : '#fff' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(transparent, rgba(0,0,0,0.3))' }} />
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: `${p.accent}18`, color: p.accent, letterSpacing: '0.06em' }}>{p.tag}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '8px 0 4px' }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{p.desc}</div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }} ref={reg('reviews')}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${BG.deep} 0%, ${BG.base} 50%, ${BG.deep} 100%)` }} />
        <Orb style={{ width: 500, height: 500, bottom: '-15%', left: '-5%', background: 'rgba(255,107,0,0.05)', animation: 'floatA 13s ease-in-out infinite' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Reviews</div>
            <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 12px', ...fu('reviews') }}>Builders love 44Gen</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, ...fu('reviews', 0.1) }}>Real feedback. Real builders.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            {visibleReviews.map((r, i) => (
              <Panel key={r.name} style={{ padding: '28px', transition: 'all 0.35s ease', ...fu('reviews', i * 0.1) }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = BORDER.orange; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER.subtle; e.currentTarget.style.transform = 'none' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#FF7A18" color="#FF7A18" />)}
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 20px', fontStyle: 'italic' }}>"{r.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{r.role}</div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setReviewPage(i)} style={{ width: i === reviewPage ? 24 : 8, height: 8, borderRadius: 100, background: i === reviewPage ? '#FF6B00' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ───────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative' }} ref={reg('pricing')}>
        <Orb style={{ width: 400, height: 400, top: '0%', right: '5%', background: 'rgba(255,107,0,0.06)', animation: 'floatC 10s ease-in-out infinite' }} />
        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 800, letterSpacing: '-1.5px', margin: '0 0 14px', ...fu('pricing') }}>Start free. Scale as you grow.</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17, ...fu('pricing', 0.1) }}>Credits refill monthly. No hidden fees. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 36 }}>
            {[
              { name: 'Free', price: '$0', credits: '10 credits/mo', tag: null, features: ['5 apps', 'Live deployment', 'Code download', 'Community support'] },
              { name: 'Pro', price: '$19.9', credits: '100 credits/mo', tag: 'Most popular', features: ['Unlimited apps', 'Priority builds', 'Stock photo library', 'Email support'] },
              { name: 'Business', price: '$49.9', credits: '260 credits/mo', tag: null, features: ['Everything in Pro', 'Fastest builds', 'Priority support', 'Early access features'] },
            ].map((plan, i) => (
              <Panel key={plan.name} glow={!!plan.tag}
                style={{ padding: '32px 28px', position: 'relative', transition: 'all 0.3s ease', ...fu('pricing', i * 0.1) }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = plan.tag ? `0 20px 60px ${O.glow}` : '0 20px 40px rgba(0,0,0,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                {plan.tag && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: O.grad, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>{plan.tag}</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 24 }}>{plan.credits}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Check size={13} color="#FF7A18" />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                  </div>
                ))}
                <button onClick={handleCTA} style={{ marginTop: 24, width: '100%', padding: '12px 0', borderRadius: 12, background: plan.tag ? O.grad : 'rgba(255,255,255,0.06)', color: '#fff', border: plan.tag ? 'none' : `1px solid ${BORDER.soft}`, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: plan.tag ? `0 0 24px ${O.glow}` : 'none' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Get started
                </button>
              </Panel>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6 }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
              Full pricing details <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(120px,14vw,180px) clamp(20px,5vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,107,0,0.1) 0%, transparent 70%)` }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <Orb style={{ width: 600, height: 600, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 65%)', animation: 'floatA 10s ease-in-out infinite' }} />

        <div style={{ position: 'relative', zIndex: 1 }} ref={reg('cta')}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 36, fontSize: 12, color: '#FDBA74', fontWeight: 700, ...fu('cta') }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            No credit card required
          </div>

          <h2 style={{ fontSize: 'clamp(44px,7vw,88px)', fontWeight: 900, letterSpacing: '-3px', margin: '0 0 24px', lineHeight: 1.0, ...fu('cta', 0.05) }}>
            <span style={{ color: '#fff' }}>Your app is </span>
            <span style={O.textGrad}>one prompt</span>
            <br /><span style={{ color: '#fff' }}>away.</span>
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, marginBottom: 48, maxWidth: 400, margin: '0 auto 48px', ...fu('cta', 0.1) }}>
            No credit card. No setup. Just describe what you want to build.
          </p>

          <div style={{ ...fu('cta', 0.15) }}>
            <OrangeBtn onClick={handleCTA} size="lg" style={{ fontSize: 18, padding: '18px 44px', borderRadius: 16 }}>
              Start building for free <ArrowRight size={20} />
            </OrangeBtn>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${BORDER.subtle}`, padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,80px) 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 52 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', lineHeight: 1.7, maxWidth: 240, margin: '0 0 20px' }}>From idea to live app in minutes. Build React apps with AI, deploy instantly.</p>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>© 2026 44gen. All rights reserved.</div>
            </div>
            {[
              { title: 'Product', links: [{ l: 'How it works', h: '#how' }, { l: 'Features', h: '#features' }, { l: 'Pricing', to: '/pricing' }, { l: 'Contact', to: '/contact' }] },
              { title: 'Account', links: [{ l: 'Log in', to: '/auth' }, { l: 'Sign up free', to: '/auth' }, { l: 'Dashboard', to: '/dashboard' }] },
              { title: 'Legal', links: [{ l: 'Privacy Policy', to: '/privacy' }, { l: 'Terms of Service', to: '/terms' }] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>{col.title}</div>
                {col.links.map(lk => (
                  lk.to ?
                    <Link key={lk.l} to={lk.to} style={{ display: 'block', color: 'rgba(255,255,255,0.32)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.32)'}>{lk.l}</Link> :
                    <a key={lk.l} href={lk.h} style={{ display: 'block', color: 'rgba(255,255,255,0.32)', fontSize: 14, textDecoration: 'none', marginBottom: 12, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.32)'}>{lk.l}</a>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${BORDER.subtle}`, paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#FF7A18" color="#FF7A18" />)}
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginLeft: 8 }}>Loved by builders worldwide</span>
            </div>
            <OrangeBtn onClick={handleCTA} size="sm">Start building free <ArrowRight size={13} /></OrangeBtn>
          </div>
        </div>
      </footer>

      {/* ── Google font + keyframes ────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; }

        @keyframes heroIn {
          from { opacity: 0; transform: translateY(24px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes floatA {
          0%,100% { transform: translateX(-50%) translateY(0) }
          50%     { transform: translateX(-50%) translateY(-22px) }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0) rotate(0deg) }
          50%     { transform: translateY(-16px) rotate(2deg) }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-12px) }
        }
        @keyframes float1 {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-8px) }
        }
        @keyframes float2 {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(8px) }
        }
        @keyframes pulse {
          0%,100% { opacity:1; box-shadow: 0 0 0 0 rgba(255,107,0,0.5) }
          50%     { opacity:0.7; box-shadow: 0 0 0 6px rgba(255,107,0,0) }
        }
        @keyframes blink {
          0%,100% { opacity:1 } 50% { opacity:0 }
        }
        @keyframes bounce {
          0%,100% { transform: translateX(-50%) translateY(0) }
          50%     { transform: translateX(-50%) translateY(8px) }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }

        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px }
        ::-webkit-scrollbar-track { background: #050505 }
        ::-webkit-scrollbar-thumb { background: rgba(255,107,0,0.3); border-radius: 3px }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,107,0,0.5) }

        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
