import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Check, ChevronDown, Star, Zap, Globe, Code2, Sparkles, Shield, RefreshCw } from 'lucide-react'

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const O = {
  grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)',
  text: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  glow: 'rgba(255,107,0,0.35)',
  glowHard: 'rgba(255,107,0,0.6)',
}
const BG = { deep: '#050505', base: '#0B0B0D' }
const B = { subtle: 'rgba(255,255,255,0.06)', soft: 'rgba(255,255,255,0.1)', orange: 'rgba(255,107,0,0.25)' }

// ─── Data ──────────────────────────────────────────────────────────────────────
const PROMPTS = [
  'Build a SaaS analytics dashboard',
  'Create a startup landing page',
  'Build a real-time expense tracker',
  'Design a UX designer portfolio',
  'Create an e-commerce store',
  'Build a project management board',
]
const REVIEWS = [
  { name: 'Sarah Chen', role: 'Founder @ Launchpad', av: 'SC', text: 'Built my entire MVP in one afternoon. What used to take weeks now takes minutes. 44gen is genuinely magic.' },
  { name: 'Marcus Williams', role: 'Product Designer', av: 'MW', text: 'The generated code is actually clean and readable. Real React components I can build on top of.' },
  { name: 'Priya Patel', role: 'Solo founder', av: 'PP', text: 'Shipped my SaaS landing page in 20 minutes. My co-founder thought I hired a dev. I didn\'t.' },
  { name: 'Alex Rivera', role: 'Marketing Lead', av: 'AR', text: 'We use 44gen for rapid prototyping internal tools. Replaced an entire workflow that used to take days.' },
  { name: 'James Okafor', role: 'Indie Hacker', av: 'JO', text: 'Went from idea to live URL in 8 minutes. I have a screenshot to prove it. This is insane.' },
  { name: 'Lisa Nakamura', role: 'CTO @ Flowbase', av: 'LN', text: 'Multi-file architecture output is surprisingly solid. Real component separation. I\'m impressed.' },
]
const FEATURES = [
  { icon: <Zap size={20}/>, title: 'Builds in minutes', desc: 'From prompt to live deployed app in under 2 minutes. No setup, no config.' },
  { icon: <Sparkles size={20}/>, title: 'Intelligent planning', desc: 'AI breaks your idea into structured steps before writing a single line of code.' },
  { icon: <Globe size={20}/>, title: 'Instant live URL', desc: 'Every app gets its own subdomain automatically. Share a link the moment it\'s done.' },
  { icon: <Code2 size={20}/>, title: 'Multi-file output', desc: 'Real component structure — Navbar, Hero, Features — each in its own clean file.' },
  { icon: <RefreshCw size={20}/>, title: 'Refine with chat', desc: 'Ask for changes in plain English. Dark mode, new sections — just describe it.' },
  { icon: <Shield size={20}/>, title: 'Auto-repair', desc: 'Build errors? The system detects and fixes them automatically.' },
]
const HOW_STEPS = [
  { n: '01', title: 'Describe your idea', desc: 'Tell 44gen what you want in plain English. No jargon, no specs, no setup.' },
  { n: '02', title: 'Review the plan', desc: 'AI structures your idea into clear steps. Approve or refine before a line is written.' },
  { n: '03', title: 'Watch it build', desc: 'See your app generated live, then deployed to a live URL — automatically.' },
]

// ─── Particle Canvas ────────────────────────────────────────────────────────────
function ParticleField() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf, W, H
    const particles = []
    const PARTICLE_COUNT = 80
    const MAX_DIST = 140

    const resize = () => {
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      // Update
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(255,107,0,${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      // Draw particles
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,154,60,0.35)'
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

// ─── Magnetic Button ────────────────────────────────────────────────────────────
function MagButton({ children, onClick, size = 'md', ghost, style }) {
  const ref = useRef()
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [hov, setHov] = useState(false)

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    setOff({ x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3 })
  }
  const onLeave = () => { setOff({ x: 0, y: 0 }); setHov(false) }

  const pad = size === 'lg' ? '16px 40px' : size === 'sm' ? '9px 20px' : '12px 28px'
  const fs = size === 'lg' ? 17 : size === 'sm' ? 13 : 14

  return (
    <button ref={ref} onClick={onClick}
      onMouseMove={onMove} onMouseEnter={() => setHov(true)} onMouseLeave={onLeave}
      style={{
        background: ghost ? (hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)') : O.grad,
        color: ghost ? (hov ? '#fff' : 'rgba(255,255,255,0.65)') : '#fff',
        border: ghost ? `1px solid ${hov ? B.soft : B.subtle}` : 'none',
        padding: pad, borderRadius: 12, fontSize: fs, fontWeight: 700,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        transform: `translate(${off.x}px, ${off.y}px) ${hov && !ghost ? 'scale(1.03)' : 'scale(1)'}`,
        boxShadow: !ghost ? (hov ? `0 8px 48px ${O.glowHard}` : `0 0 28px ${O.glow}`) : 'none',
        transition: off.x === 0 && off.y === 0 ? 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, background 0.2s, color 0.2s' : 'transform 0.08s linear, box-shadow 0.2s',
        position: 'relative', overflow: 'hidden',
        ...style
      }}>
      {/* Light sweep */}
      <span style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
        transform: hov ? 'translateX(100%)' : 'translateX(-100%)',
        transition: 'transform 0.5s ease',
        pointerEvents: 'none',
      }} />
      {children}
    </button>
  )
}

// ─── Light-sweep Panel ─────────────────────────────────────────────────────────
function GlowPanel({ children, style, active, onMouseEnter, onMouseLeave }) {
  const ref = useRef()
  const [sweep, setSweep] = useState({ x: 0, y: 0, show: false })

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    setSweep({ x: e.clientX - r.left, y: e.clientY - r.top, show: true })
  }
  const onLeave = () => { setSweep(s => ({ ...s, show: false })); if (onMouseLeave) onMouseLeave() }
  const onEnter = () => { if (onMouseEnter) onMouseEnter() }

  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? B.orange : B.subtle}`,
        borderRadius: 20, position: 'relative', overflow: 'hidden',
        boxShadow: active ? `0 0 40px rgba(255,107,0,0.08)` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        ...style
      }}>
      {/* Radial mouse-follow glow */}
      {sweep.show && (
        <div style={{
          position: 'absolute', pointerEvents: 'none', zIndex: 0,
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,0,0.07) 0%, transparent 70%)',
          transform: `translate(${sweep.x - 150}px, ${sweep.y - 150}px)`,
          transition: 'transform 0.05s linear',
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ─── Staggered headline ────────────────────────────────────────────────────────
function StaggerHeadline({ lines, style }) {
  const [shown, setShown] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  let wordIdx = 0
  return (
    <h2 ref={ref} style={{ margin: 0, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'block' }}>
          {line.words.map((word, wi) => {
            const idx = wordIdx++
            return (
              <span key={wi} style={{
                display: 'inline-block',
                opacity: shown ? 1 : 0,
                transform: shown ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.6s ease ${idx * 0.08}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${idx * 0.08}s`,
                ...(line.gradient ? O.text : { color: line.color || '#fff' }),
                marginRight: '0.28em',
              }}>{word}</span>
            )
          })}
        </div>
      ))}
    </h2>
  )
}

// ─── AI Workspace (hero right) ────────────────────────────────────────────────
function AIWorkspace({ mouse }) {
  const [phase, setPhase] = useState(0) // 0=idle 1=typing 2=planning 3=files 4=done
  const [chars, setChars] = useState(0)
  const [files, setFiles] = useState([])
  const prompt = 'Create a SaaS analytics dashboard'
  const fileList = ['src/App.jsx', 'src/components/Header.jsx', 'src/components/Sidebar.jsx', 'src/pages/Dashboard.jsx', 'src/components/Chart.jsx']

  useEffect(() => {
    const t = []
    t.push(setTimeout(() => setPhase(1), 600))
    const type = setInterval(() => setChars(c => { if (c >= prompt.length) { clearInterval(type); return c } return c + 1 }), 44)
    t.push(setTimeout(() => setPhase(2), 2200))
    t.push(setTimeout(() => setPhase(3), 3400))
    fileList.forEach((_, i) => t.push(setTimeout(() => setFiles(f => [...f, fileList[i]]), 3600 + i * 350)))
    t.push(setTimeout(() => setPhase(4), 5600))
    return () => { t.forEach(clearTimeout); clearInterval(type) }
  }, [])

  const dx = mouse.x * 18, dy = mouse.y * 12

  return (
    <div style={{ width: '100%', maxWidth: 520, position: 'relative', transition: 'transform 0.1s linear', transform: `translate(${dx}px, ${dy}px)` }}>
      <div style={{ position: 'absolute', inset: -80, background: 'radial-gradient(ellipse, rgba(255,107,0,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Main panel */}
      <GlowPanel active style={{ overflow: 'visible' }}>
        {/* Title bar */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B.subtle}`, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff5f57','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 5, margin: '0 8px', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>44gen.com/build</span>
          </div>
        </div>

        <div style={{ padding: 20, minHeight: 320 }}>
          {/* Prompt */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your prompt</div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${phase >= 1 ? B.orange : B.subtle}`, borderRadius: 10, padding: '12px 16px', fontSize: 14, color: phase >= 1 ? '#fff' : 'rgba(255,255,255,0.25)', transition: 'all 0.4s', minHeight: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={14} color={phase >= 1 ? '#FF7A18' : 'rgba(255,255,255,0.15)'} style={{ flexShrink: 0 }} />
              <span>{phase >= 1 ? prompt.slice(0, chars) : 'Describe your app...'}<span style={{ animation: phase === 1 && chars < prompt.length ? 'blink 0.8s infinite' : 'none' }}>|</span></span>
            </div>
          </div>

          {/* Planning tags */}
          {phase >= 2 && (
            <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI planning</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Analyzing scope', 'Component map', 'Data flow', 'Routing plan'].map((t, i) => (
                  <div key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', color: '#FDBA74', fontWeight: 600, animation: `fadeUp 0.3s ease ${i * 0.08}s both` }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {phase >= 3 && (
            <div style={{ marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Generating</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp 0.2s ease' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                    <div style={{ flex: 1, height: 1, background: B.subtle }} />
                    <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>✓</span>
                  </div>
                ))}
                {phase === 3 && files.length < fileList.length && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF7A18', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>generating…</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Done */}
          {phase >= 4 && (
            <div style={{ animation: 'fadeUp 0.5s ease' }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>Deployed live</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→ app-8f3d.44gen.com</span>
              </div>
            </div>
          )}
        </div>
      </GlowPanel>

      {/* Floating badges */}
      <GlowPanel style={{ position: 'absolute', top: -20, right: -52, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'floatBadge1 5s ease-in-out infinite', zIndex: 10, minWidth: 120 }}>
        <Zap size={13} color="#FF7A18" />
        <div><div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>1m 42s</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Build time</div></div>
      </GlowPanel>
      <GlowPanel style={{ position: 'absolute', bottom: -16, left: -48, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'floatBadge2 6s ease-in-out infinite', zIndex: 10, minWidth: 120 }}>
        <Code2 size={13} color="#FF7A18" />
        <div><div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>5 files</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Generated</div></div>
      </GlowPanel>
    </div>
  )
}

// ─── Sticky How It Works ───────────────────────────────────────────────────────
function StickySteps() {
  const [active, setActive] = useState(0)
  const containerRef = useRef()

  useEffect(() => {
    const handler = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scrolled = -rect.top
      const total = rect.height - window.innerHeight
      const progress = Math.max(0, Math.min(1, scrolled / total))
      setActive(Math.min(2, Math.floor(progress * 3.5)))
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ height: '260vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${BG.deep} 0%, ${BG.base} 50%, ${BG.deep} 100%)` }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 clamp(20px,5vw,80px)', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>How it works</div>
            <StaggerHeadline
              lines={[{ words: ['Three', 'steps.'], color: '#fff' }, { words: ['Live', 'app.'], gradient: true }]}
              style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {HOW_STEPS.map((s, i) => (
              <GlowPanel key={s.n} active={active === i}
                style={{ padding: '36px 32px', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)', transform: active === i ? 'translateY(-8px) scale(1.02)' : active > i ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)', opacity: active >= i ? 1 : 0.35 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: O.grad, opacity: active === i ? 1 : 0, transition: 'opacity 0.4s', borderRadius: '20px 20px 0 0' }} />
                <div style={{ fontSize: 52, fontWeight: 900, ...O.text, lineHeight: 1, marginBottom: 20, letterSpacing: '-2px' }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </GlowPanel>
            ))}
          </div>
          {/* Progress indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 40 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: i === active ? 28 : 8, height: 4, borderRadius: 2, background: i === active ? '#FF6B00' : 'rgba(255,255,255,0.12)', transition: 'all 0.4s ease' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Interactive Demo ─────────────────────────────────────────────────────────
function InteractiveDemo() {
  const [step, setStep] = useState(-1)
  const [userText, setUserText] = useState('')
  const [aiText, setAiText] = useState('')
  const [codeText, setCodeText] = useState('')
  const [uiVisible, setUiVisible] = useState(false)
  const ref = useRef()
  const started = useRef(false)

  const USER_MSG = 'Create a SaaS landing page'
  const AI_MSG = '✓ Plan ready · 4 components · Deploying in ~90s'
  const CODE = `export default function Hero() {
  return (
    <section className="hero">
      <h1>Ship faster with AI</h1>
      <p>From idea to live app in minutes.</p>
      <button>Start building</button>
    </section>
  )
}`

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        runSequence()
      }
    }, { threshold: 0.4 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const runSequence = () => {
    const t = []
    t.push(setTimeout(() => setStep(0), 400))
    // Type user message
    let i = 0
    const typeUser = setInterval(() => {
      i++
      setUserText(USER_MSG.slice(0, i))
      if (i >= USER_MSG.length) clearInterval(typeUser)
    }, 55)
    t.push(setTimeout(() => setStep(1), 400 + USER_MSG.length * 55 + 300))
    // Type AI response
    let j = 0
    t.push(setTimeout(() => {
      const typeAi = setInterval(() => {
        j++
        setAiText(AI_MSG.slice(0, j))
        if (j >= AI_MSG.length) clearInterval(typeAi)
      }, 30)
    }, 400 + USER_MSG.length * 55 + 600))
    t.push(setTimeout(() => setStep(2), 400 + USER_MSG.length * 55 + AI_MSG.length * 30 + 1000))
    // Type code
    let k = 0
    t.push(setTimeout(() => {
      const typeCode = setInterval(() => {
        k++
        setCodeText(CODE.slice(0, k))
        if (k >= CODE.length) clearInterval(typeCode)
      }, 12)
    }, 400 + USER_MSG.length * 55 + AI_MSG.length * 30 + 1200))
    t.push(setTimeout(() => setUiVisible(true), 400 + USER_MSG.length * 55 + AI_MSG.length * 30 + CODE.length * 12 + 800))
    return () => { t.forEach(clearTimeout); clearInterval(typeUser) }
  }

  return (
    <div ref={ref} style={{ maxWidth: 960, margin: '0 auto', padding: '0 clamp(20px,5vw,80px)' }}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Live demo</div>
        <StaggerHeadline
          lines={[{ words: ['See', '44Gen'], color: '#fff' }, { words: ['in', 'action'], gradient: true }]}
          style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Chat panel */}
        <GlowPanel style={{ padding: '24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Chat</div>

          {/* User bubble */}
          {step >= 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, animation: 'fadeUp 0.3s ease' }}>
              <div style={{ background: O.grad, padding: '10px 16px', borderRadius: '14px 14px 4px 14px', fontSize: 13, color: '#fff', maxWidth: '80%', fontWeight: 500 }}>
                {userText}<span style={{ animation: step === 0 && userText.length < USER_MSG.length ? 'blink 0.8s infinite' : 'none' }}>|</span>
              </div>
            </div>
          )}

          {/* AI bubble */}
          {step >= 1 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, animation: 'fadeUp 0.3s ease', alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>44</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${B.orange}`, padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 13, color: 'rgba(255,255,255,0.8)', maxWidth: '80%' }}>
                {aiText}<span style={{ animation: aiText.length < AI_MSG.length ? 'blink 0.8s infinite' : 'none' }}>|</span>
              </div>
            </div>
          )}

          {/* Typing dots */}
          {step === 0 && userText.length >= USER_MSG.length && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>44</div>
              <div style={{ display: 'flex', gap: 4, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: 14 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF7A18', animation: `dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </GlowPanel>

        {/* Code + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Code */}
          {step >= 2 && (
            <GlowPanel active style={{ padding: '18px', animation: 'fadeUp 0.4s ease' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Generated code</div>
              <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', margin: 0, lineHeight: 1.6, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
                {codeText}
              </pre>
            </GlowPanel>
          )}

          {/* UI preview */}
          {uiVisible && (
            <GlowPanel active style={{ padding: '20px', animation: 'fadeUp 0.5s ease' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Live preview</div>
              <div style={{ background: 'linear-gradient(135deg, #0a0a14, #141420)', borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Ship faster with AI</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>From idea to live app in minutes.</div>
                <div style={{ display: 'inline-block', background: O.grad, color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 8, boxShadow: `0 0 20px ${O.glow}` }}>Start building</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Deployed · app-demo.44gen.com</span>
              </div>
            </GlowPanel>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [promptIdx, setPromptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)
  const [reviewPage, setReviewPage] = useState(0)
  const [visible, setVisible] = useState({})
  const [entered, setEntered] = useState(false)
  const typingRef = useRef(null)
  const heroRef = useRef()

  const REVIEWS_PER_PAGE = 3
  const totalPages = Math.ceil(REVIEWS.length / REVIEWS_PER_PAGE)
  const handleCTA = () => navigate(user ? '/dashboard' : '/auth')

  // Page entrance
  useEffect(() => { requestAnimationFrame(() => setEntered(true)) }, [])

  // Scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Mouse parallax (hero only)
  useEffect(() => {
    const fn = (e) => {
      if (!heroRef.current) return
      const r = heroRef.current.getBoundingClientRect()
      if (e.clientY > r.bottom) return
      setMouse({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 })
    }
    window.addEventListener('mousemove', fn, { passive: true })
    return () => window.removeEventListener('mousemove', fn)
  }, [])

  // Section observer
  useEffect(() => {
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.s]: true })) }), { threshold: 0.1 })
    document.querySelectorAll('[data-s]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  // Typewriter
  useEffect(() => {
    const cur = PROMPTS[promptIdx]
    if (typing) {
      if (displayed.length < cur.length) typingRef.current = setTimeout(() => setDisplayed(cur.slice(0, displayed.length + 1)), 44)
      else typingRef.current = setTimeout(() => setTyping(false), 2500)
    } else {
      if (displayed.length > 0) typingRef.current = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 16)
      else { setPromptIdx(i => (i + 1) % PROMPTS.length); setTyping(true) }
    }
    return () => clearTimeout(typingRef.current)
  }, [displayed, typing, promptIdx])

  // Review auto-rotate
  useEffect(() => {
    const t = setInterval(() => setReviewPage(p => (p + 1) % totalPages), 5500)
    return () => clearInterval(t)
  }, [totalPages])

  const fu = (key, delay = 0) => ({
    opacity: visible[key] ? 1 : 0,
    transform: visible[key] ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  })

  const parallaxBg = { transform: `translate(${mouse.x * -25}px, ${mouse.y * -15}px)`, transition: 'transform 0.15s linear' }
  const parallaxMid = { transform: `translate(${mouse.x * -40}px, ${mouse.y * -25}px)`, transition: 'transform 0.1s linear' }

  const visibleReviews = REVIEWS.slice(reviewPage * REVIEWS_PER_PAGE, (reviewPage + 1) * REVIEWS_PER_PAGE)

  return (
    <div style={{ fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif", background: BG.deep, color: '#fff', overflowX: 'hidden',
      opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(12px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease' }}>

      {/* ── Navbar ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, height: 64, padding: '0 clamp(20px,4vw,56px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(5,5,5,0.9)' : 'transparent', backdropFilter: scrolled ? 'blur(28px) saturate(1.5)' : 'none', borderBottom: scrolled ? `1px solid ${B.subtle}` : 'none', transition: 'all 0.35s ease' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', boxShadow: `0 0 20px ${O.glow}` }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 19, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {[{ l: 'How it works', h: '#how' }, { l: 'Features', h: '#features' }, { l: 'Demo', h: '#demo' }, { l: 'Pricing', h: '/pricing' }].map(({ l, h }) => (
            h.startsWith('/') ?
              <Link key={l} to={h} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</Link> :
              <a key={l} href={h} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user ? <MagButton onClick={() => navigate('/dashboard')} size="sm">Dashboard</MagButton> : (
            <>
              <MagButton onClick={() => navigate('/auth')} size="sm" ghost>Log in</MagButton>
              <MagButton onClick={handleCTA} size="sm">Start free <ArrowRight size={13}/></MagButton>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '100px clamp(20px,5vw,80px) 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Particle field */}
        <ParticleField />

        {/* Parallax bg layers */}
        <div style={{ position: 'absolute', inset: 0, ...parallaxBg }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 60% at 65% 40%, rgba(255,107,0,0.09) 0%, transparent 65%)` }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div style={{ position: 'absolute', width: 500, height: 500, top: '-5%', right: '8%', borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,107,0,0.12)', animation: 'floatA 9s ease-in-out infinite', ...parallaxMid }} />
        <div style={{ position: 'absolute', width: 280, height: 280, bottom: '10%', left: '3%', borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,154,60,0.07)', animation: 'floatB 12s ease-in-out infinite', ...parallaxBg }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px,6vw,100px)', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 32, fontSize: 12, color: '#FDBA74', fontWeight: 700, animation: 'heroIn 0.7s ease both' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              AI-powered app builder · Free to start
            </div>

            {/* Staggered headline */}
            <div style={{ fontSize: 'clamp(44px,5.5vw,80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: 28, animation: 'heroIn 0.8s ease 0.1s both' }}>
              {[
                { text: 'Build apps.', color: '#fff' },
                { text: 'Ship instantly.', gradient: true },
                { text: 'No code needed.', color: 'rgba(255,255,255,0.8)' },
              ].map((line, li) => (
                <div key={li} style={{ overflow: 'hidden' }}>
                  {line.text.split(' ').map((word, wi) => (
                    <span key={wi} style={{
                      display: 'inline-block', marginRight: '0.28em',
                      ...(line.gradient ? O.text : { color: line.color }),
                      animation: `wordIn 0.7s cubic-bezier(0.16,1,0.3,1) ${0.15 + li * 0.15 + wi * 0.07}s both`,
                    }}>{word}</span>
                  ))}
                </div>
              ))}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 18, maxWidth: 460, marginBottom: 44, lineHeight: 1.75, animation: 'heroIn 0.8s ease 0.5s both' }}>
              Describe your app in plain English. 44gen plans, builds, and deploys it to a live URL in minutes.
            </p>

            {/* Typewriter box */}
            <div style={{ marginBottom: 36, animation: 'heroIn 0.8s ease 0.6s both' }}>
              <GlowPanel active style={{ padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: O.grad, opacity: 0.8 }} />
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Try something like...</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, flex: 1, minHeight: 24 }}>
                    {displayed}<span style={{ animation: 'blink 1s infinite', opacity: 0.6 }}>|</span>
                  </span>
                  <MagButton onClick={handleCTA} size="sm">Build this <ArrowRight size={13}/></MagButton>
                </div>
              </GlowPanel>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 56, animation: 'heroIn 0.8s ease 0.7s both' }}>
              <MagButton onClick={handleCTA} size="lg">Start building free <ArrowRight size={17}/></MagButton>
              <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: 5 }} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.38)'}>View pricing →</Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 0, animation: 'heroIn 0.8s ease 0.8s both' }}>
              {[['< 2 min','Build time'],['Free','To start'],['Live URL','Auto deploy']].map(([v,l],i) => (
                <div key={l} style={{ paddingRight: 36, marginRight: 36, borderRight: i < 2 ? `1px solid ${B.subtle}` : 'none' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4, fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — workspace */}
          <div style={{ display: 'flex', justifyContent: 'center', animation: 'heroIn 0.9s ease 0.2s both' }}>
            <AIWorkspace mouse={mouse} />
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2.5s ease-in-out infinite' }}>
          <ChevronDown size={20} color="rgba(255,255,255,0.12)" />
        </div>
      </section>

      {/* ── Sticky How it works ── */}
      <div id="how">
        <StickySteps />
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)' }} data-s="features">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Features</div>
            <StaggerHeadline
              lines={[{ words: ['Everything', 'you', 'need'], color: '#fff' }, { words: ['to', 'ship.'], gradient: true }]}
              style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <GlowPanel key={f.title}
                style={{ padding: '32px 28px', transition: 'transform 0.3s ease', cursor: 'default', ...fu('features', i * 0.07) }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF7A18', marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </GlowPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Demo ── */}
      <section id="demo" style={{ padding: 'clamp(80px,10vw,120px) 0', position: 'relative', overflow: 'hidden' }} data-s="demo">
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${BG.deep} 0%, ${BG.base} 50%, ${BG.deep} 100%)` }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <InteractiveDemo />
        </div>
      </section>

      {/* ── Showcase ── */}
      <section id="showcase" style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }} data-s="showcase">
        <div style={{ position: 'absolute', width: 400, height: 400, top: '10%', right: '-8%', borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,107,0,0.06)', animation: 'floatB 11s ease-in-out infinite' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Showcase</div>
            <StaggerHeadline
              lines={[{ words: ['Real', 'apps'], color: '#fff' }, { words: ['built', 'with', '44Gen'], gradient: true }]}
              style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { title: 'FlowMetrics', tag: 'Dashboard', desc: 'Real-time analytics with charts and KPI cards', gradient: 'linear-gradient(135deg, #0f0c29, #302b63)', accent: '#818cf8', bars: [60,80,45,90,70,55,85] },
              { title: 'NovaSend', tag: 'SaaS Landing', desc: 'High-converting marketing page with pricing', gradient: 'linear-gradient(135deg, #0a0a0a, #1a0a00)', accent: '#FF7A18', bars: [40,70,55,80,65,90,75] },
              { title: 'TrackHabit', tag: 'Productivity', desc: 'Daily habits with streaks and progress rings', gradient: 'linear-gradient(135deg, #0a1628, #0d2d44)', accent: '#34d399', bars: [85,90,70,95,80,75,88] },
              { title: 'ShopVault', tag: 'E-commerce', desc: 'Product catalog with cart and checkout', gradient: 'linear-gradient(135deg, #1a0a00, #2d1500)', accent: '#fb923c', bars: [50,65,80,45,70,85,60] },
            ].map((p, i) => (
              <GlowPanel key={p.title}
                style={{ overflow: 'hidden', transition: 'transform 0.35s ease', cursor: 'default', ...fu('showcase', i * 0.08) }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px) scale(1.01)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ height: 160, background: p.gradient, position: 'relative', padding: 14, overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 7, padding: '7px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {['#ff5f57','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
                    <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginLeft: 6 }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
                    {p.bars.map((h, k) => <div key={k} style={{ flex: 1, height: `${h}%`, background: p.accent, opacity: 0.55 + k * 0.05, borderRadius: '2px 2px 0 0' }} />)}
                  </div>
                </div>
                <div style={{ padding: '18px 20px' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: `${p.accent}18`, color: p.accent }}>{p.tag}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '8px 0 4px' }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.33)', lineHeight: 1.6 }}>{p.desc}</div>
                </div>
              </GlowPanel>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative', overflow: 'hidden' }} data-s="reviews">
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${BG.deep} 0%, ${BG.base} 50%, ${BG.deep} 100%)` }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Reviews</div>
            <StaggerHeadline
              lines={[{ words: ['Builders'], color: '#fff' }, { words: ['love', '44Gen'], gradient: true }]}
              style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            {visibleReviews.map((r, i) => (
              <GlowPanel key={r.name}
                style={{ padding: '28px', transition: 'transform 0.35s ease, opacity 0.4s ease', ...fu('reviews', i * 0.1) }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} fill="#FF7A18" color="#FF7A18"/>)}
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, margin: '0 0 20px', fontStyle: 'italic' }}>"{r.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{r.av}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>{r.role}</div>
                  </div>
                </div>
              </GlowPanel>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setReviewPage(i)} style={{ width: i === reviewPage ? 24 : 8, height: 4, borderRadius: 2, background: i === reviewPage ? '#FF6B00' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,80px)', position: 'relative' }} data-s="pricing">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Pricing</div>
            <StaggerHeadline
              lines={[{ words: ['Start', 'free.'], color: '#fff' }, { words: ['Scale', 'as', 'you', 'grow.'], gradient: true }]}
              style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1 }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 36 }}>
            {[
              { name: 'Free', price: '$0', credits: '10 credits/mo', popular: false, features: ['5 apps', 'Live deployment', 'Code download', 'Community support'] },
              { name: 'Pro', price: '$19.9', credits: '100 credits/mo', popular: true, features: ['Unlimited apps', 'Priority builds', 'Stock photos', 'Email support'] },
              { name: 'Business', price: '$49.9', credits: '260 credits/mo', popular: false, features: ['Everything in Pro', 'Fastest builds', 'Priority support', 'Early access'] },
            ].map((plan, i) => (
              <GlowPanel key={plan.name} active={plan.popular}
                style={{ padding: '32px 28px', position: 'relative', transition: 'transform 0.3s', ...fu('pricing', i * 0.1) }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: O.grad, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>Most popular</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', marginBottom: 24 }}>{plan.credits}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Check size={13} color="#FF7A18"/>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.52)' }}>{f}</span>
                  </div>
                ))}
                <MagButton onClick={handleCTA} ghost={!plan.popular} style={{ marginTop: 24, width: '100%', justifyContent: 'center', borderRadius: 12 }}>Get started</MagButton>
              </GlowPanel>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6 }} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.32)'}>
              Full pricing details <ArrowRight size={14}/>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: 'clamp(120px,14vw,200px) clamp(20px,5vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }} data-s="cta">
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,107,0,0.11) 0%, transparent 70%)` }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', filter: 'blur(80px)', background: 'rgba(255,107,0,0.1)', animation: 'floatA 10s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 36, fontSize: 12, color: '#FDBA74', fontWeight: 700, ...fu('cta') }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B00', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            No credit card required
          </div>

          <div style={{ fontSize: 'clamp(50px,8vw,100px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 0.95, marginBottom: 28, ...fu('cta', 0.05) }}>
            {['Your app is', 'one prompt', 'away.'].map((line, i) => (
              <div key={i} style={{ overflow: 'hidden' }}>
                {line.split(' ').map((w, j) => (
                  <span key={j} style={{
                    display: 'inline-block', marginRight: '0.25em',
                    ...(i === 1 ? O.text : { color: i === 2 ? 'rgba(255,255,255,0.7)' : '#fff' }),
                    animation: visible['cta'] ? `wordIn 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 0.2 + j * 0.08}s both` : 'none',
                    opacity: visible['cta'] ? undefined : 0,
                  }}>{w}</span>
                ))}
              </div>
            ))}
          </div>

          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 18, marginBottom: 52, maxWidth: 380, margin: '0 auto 52px', lineHeight: 1.7, ...fu('cta', 0.2) }}>
            No credit card. No setup. Just describe what you want to build.
          </p>

          <div style={{ ...fu('cta', 0.3) }}>
            <MagButton onClick={handleCTA} size="lg" style={{ fontSize: 18, padding: '18px 48px', borderRadius: 16 }}>
              Start building for free <ArrowRight size={20}/>
            </MagButton>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${B.subtle}`, padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,80px) 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 52 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7, maxWidth: 240, margin: '0 0 20px' }}>From idea to live app in minutes. Build React apps with AI, deploy instantly.</p>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.16)' }}>© 2026 44gen. All rights reserved.</div>
            </div>
            {[
              { title: 'Product', links: [{ l:'How it works', h:'#how' }, { l:'Features', h:'#features' }, { l:'Pricing', to:'/pricing' }, { l:'Contact', to:'/contact' }] },
              { title: 'Account', links: [{ l:'Log in', to:'/auth' }, { l:'Sign up free', to:'/auth' }, { l:'Dashboard', to:'/dashboard' }] },
              { title: 'Legal', links: [{ l:'Privacy Policy', to:'/privacy' }, { l:'Terms of Service', to:'/terms' }] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>{col.title}</div>
                {col.links.map(lk => (
                  lk.to ? <Link key={lk.l} to={lk.to} style={{ display:'block', color:'rgba(255,255,255,0.3)', fontSize:14, textDecoration:'none', marginBottom:12, transition:'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>{lk.l}</Link> :
                  <a key={lk.l} href={lk.h} style={{ display:'block', color:'rgba(255,255,255,0.3)', fontSize:14, textDecoration:'none', marginBottom:12, transition:'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>{lk.l}</a>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop:`1px solid ${B.subtle}`, paddingTop:28, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {[...Array(5)].map((_,i)=><Star key={i} size={12} fill="#FF7A18" color="#FF7A18"/>)}
              <span style={{ color:'rgba(255,255,255,0.22)', fontSize:13, marginLeft:8 }}>Loved by builders worldwide</span>
            </div>
            <MagButton onClick={handleCTA} size="sm">Start building free <ArrowRight size={13}/></MagButton>
          </div>
        </div>
      </footer>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        @keyframes heroIn {
          from { opacity:0; transform:translateY(20px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes wordIn {
          from { opacity:0; transform:translateY(100%) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes floatA {
          0%,100% { transform:translateX(-50%) translateY(0) }
          50%     { transform:translateX(-50%) translateY(-22px) }
        }
        @keyframes floatB {
          0%,100% { transform:translateY(0) }
          50%     { transform:translateY(-16px) }
        }
        @keyframes floatBadge1 {
          0%,100% { transform:translateY(0) }
          50%     { transform:translateY(-8px) }
        }
        @keyframes floatBadge2 {
          0%,100% { transform:translateY(0) }
          50%     { transform:translateY(8px) }
        }
        @keyframes pulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(255,107,0,0.5) }
          50%     { opacity:0.7; box-shadow:0 0 0 6px rgba(255,107,0,0) }
        }
        @keyframes blink {
          0%,100% { opacity:1 } 50% { opacity:0 }
        }
        @keyframes bounce {
          0%,100% { transform:translateX(-50%) translateY(0) }
          50%     { transform:translateX(-50%) translateY(8px) }
        }
        @keyframes dot {
          0%,80%,100% { transform:scale(0.6); opacity:0.4 }
          40%         { transform:scale(1); opacity:1 }
        }

        ::-webkit-scrollbar { width:6px }
        ::-webkit-scrollbar-track { background:#050505 }
        ::-webkit-scrollbar-thumb { background:rgba(255,107,0,0.28); border-radius:3px }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,107,0,0.5) }

        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-workspace { display: none !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .demo-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
