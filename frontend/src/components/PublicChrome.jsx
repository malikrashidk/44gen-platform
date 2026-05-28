import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const publicTheme = {
  bg: '#0b0d10',
  bg2: '#101419',
  panel: 'rgba(255,255,255,0.055)',
  panelStrong: 'rgba(255,255,255,0.085)',
  line: 'rgba(255,255,255,0.11)',
  text: '#f6f7fb',
  muted: 'rgba(246,247,251,0.62)',
  faint: 'rgba(246,247,251,0.38)',
  blue: '#73d8ff',
  mint: '#7df1c7',
  amber: '#ffca7a',
  rose: '#ff8fb3',
  grad: 'linear-gradient(135deg, #73d8ff 0%, #7df1c7 48%, #ffca7a 100%)',
}

export function ParticleBackdrop({ density = 58 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let width = 0
    let height = 0
    let particles = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio))
      height = canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio))
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22 * window.devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.22 * window.devicePixelRatio,
        r: (Math.random() * 1.2 + 0.4) * window.devicePixelRatio,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(115,216,255,0.42)'
      ctx.strokeStyle = 'rgba(125,241,199,0.075)'
      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy
        if (particle.x < 0 || particle.x > width) particle.vx *= -1
        if (particle.y < 0 || particle.y > height) particle.vy *= -1
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130 * window.devicePixelRatio) {
            ctx.globalAlpha = 1 - dist / (130 * window.devicePixelRatio)
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return <canvas ref={ref} className="public-particles" aria-hidden="true" />
}

export function PublicButton({ children, to, onClick, variant = 'primary', disabled = false, className = '' }) {
  const content = (
    <>
      <span>{children}</span>
      {variant !== 'quiet' && <ArrowRight size={15} />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`public-button public-button-${variant} ${className}`}>
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} className={`public-button public-button-${variant} ${className}`}>
      {content}
    </button>
  )
}

export function PublicNav({ transparent = false }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <nav className={`public-nav ${transparent ? 'public-nav-transparent' : ''}`}>
      <Link to="/" className="public-brand">
        <span className="public-brand-mark">44</span>
        <span className="public-brand-word">Gen</span>
      </Link>
      <div className="public-nav-links">
        <Link to="/pricing">Pricing</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy">Privacy</Link>
      </div>
      <div className="public-nav-actions">
        {user ? (
          <PublicButton onClick={() => navigate('/dashboard')}>Dashboard</PublicButton>
        ) : (
          <>
            <PublicButton to="/auth" variant="quiet">Log in</PublicButton>
            <PublicButton to="/auth">Start free</PublicButton>
          </>
        )}
      </div>
    </nav>
  )
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <Link to="/" className="public-brand">
          <span className="public-brand-mark">44</span>
          <span className="public-brand-word">Gen</span>
        </Link>
        <p>Build, refine, deploy, and export real React apps from one calm workspace.</p>
      </div>
      <div className="public-footer-links">
        <div className="public-footer-group">
          <div className="public-footer-heading">Product</div>
          <Link to="/">Builder</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/auth">Dashboard</Link>
        </div>
        <div className="public-footer-group">
          <div className="public-footer-heading">Support</div>
          <Link to="/contact">Contact</Link>
          <Link to="/pricing">Billing</Link>
          <Link to="/auth">Sign in</Link>
        </div>
        <div className="public-footer-group">
          <div className="public-footer-heading">Company</div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  )
}

export function PublicPage({ children }) {
  return (
    <div className="public-page">
      <PublicNav />
      {children}
      <PublicFooter />
    </div>
  )
}
