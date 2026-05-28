import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Activity, ArrowRight, CheckCircle2, Download, Github, Layers3, Sparkles, Wand2, Zap } from 'lucide-react'
import { ParticleBackdrop, PublicButton, PublicFooter, PublicNav } from '../components/PublicChrome'

const features = [
  { icon: Wand2, title: 'Plans before code', copy: '44Gen asks useful questions, creates a build plan, then ships the full app instead of a decorative mockup.' },
  { icon: Layers3, title: 'Multi-file apps', copy: 'Generated apps can use real components, pages, shared styles, and editable source files.' },
  { icon: CheckCircle2, title: 'Self-repairing builds', copy: 'Build errors are inspected, repaired, and rebuilt automatically when generated code breaks.' },
  { icon: Activity, title: 'Runtime QA', copy: 'Paid users can ask 44Gen to test buttons, forms, navigation, and runtime errors in a browser.' },
  { icon: Github, title: 'GitHub connected', copy: 'Export apps to repositories, or ask chat to read a connected repository and rebuild it.' },
  { icon: Download, title: 'Own the code', copy: 'Download a clean ZIP, edit files in the Code tab, or keep iterating in chat.' },
]

const steps = [
  ['Describe', 'Tell 44Gen what the app should do. Simple prompts are enough, screenshots and URLs can add context.'],
  ['Approve', 'Review the plan, answer multiple-choice questions when needed, and keep scope clear.'],
  ['Ship', 'Watch the build run, open the live URL, refine details, export code, or roll back versions.'],
]

const examples = [
  'Client dashboard with working navigation and charts',
  'Booking website with service cards and intake form',
  'Internal CRM with pages for leads, tasks, and reports',
]

function HeroPromptBox({ onSubmit }) {
  return (
    <div className="public-card public-reveal" style={{ width: 'min(860px, 100%)', margin: '44px auto 0', padding: 12, textAlign: 'left', background: 'rgba(255,255,255,0.075)' }}>
      <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, background: 'rgba(5,8,12,0.58)', overflow: 'hidden' }}>
        <textarea
          rows={4}
          placeholder="Ask 44Gen to build a client dashboard with working navigation, charts, forms, and GitHub export..."
          style={{ width: '100%', minHeight: 136, resize: 'none', border: 0, outline: 'none', padding: 22, background: 'transparent', color: '#f6f7fb', fontSize: 16, lineHeight: 1.65 }}
        />
        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Functional app', 'Ask questions', 'Ship live'].map((tag, index) => (
              <span key={tag} style={{ padding: '7px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', color: index === 0 ? '#73d8ff' : index === 1 ? '#7df1c7' : '#ffca7a', fontSize: 12, fontWeight: 800 }}>
                {tag}
              </span>
            ))}
          </div>
          <PublicButton onClick={onSubmit}>Build app</PublicButton>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const go = () => navigate(user ? '/dashboard' : '/auth')

  return (
    <div className="public-page">
      <PublicNav transparent />

      <section className="public-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <ParticleBackdrop density={64} />
        <div className="public-container" style={{ paddingTop: 58, textAlign: 'center' }}>
          <div className="public-reveal" style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="public-eyebrow">AI app builder for real working products</div>
            <h1 className="public-title">Build the app. <span>Ship the product.</span></h1>
            <p className="public-copy" style={{ maxWidth: 680, margin: '24px auto 34px' }}>
              44Gen turns a plain-English request into a planned, built, deployed React app with editable code, version history, GitHub export, and browser QA.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              <PublicButton onClick={go}>Start building free</PublicButton>
              <PublicButton to="/pricing" variant="secondary">View pricing</PublicButton>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: '42px auto 0', maxWidth: 640 }}>
              {[
                ['Live URL', 'automatic deploys'],
                ['Editable code', 'Monaco file editing'],
                ['Rollback', 'version history'],
              ].map(([top, bottom]) => (
                <div key={top} className="public-card" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 900, color: '#f6f7fb' }}>{top}</div>
                  <div style={{ color: 'rgba(246,247,251,0.45)', fontSize: 12, marginTop: 4 }}>{bottom}</div>
                </div>
              ))}
            </div>
          </div>
          <HeroPromptBox onSubmit={go} />
        </div>
      </section>

      <section className="public-section" style={{ paddingTop: 38 }}>
        <div className="public-container">
          <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 32, alignItems: 'start' }}>
            <div>
              <div className="public-eyebrow">How it feels</div>
              <h2 className="public-title" style={{ fontSize: 'clamp(34px, 4.8vw, 64px)' }}>Less guessing. <span>More shipping.</span></h2>
            </div>
            <div className="public-grid">
              {steps.map(([title, copy], index) => (
                <div key={title} className="public-card public-card-hover" style={{ padding: 22, display: 'grid', gridTemplateColumns: '46px 1fr', gap: 16 }}>
                  <div style={{ color: index === 0 ? '#73d8ff' : index === 1 ? '#7df1c7' : '#ffca7a', fontSize: 24, fontWeight: 900 }}>0{index + 1}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 19 }}>{title}</h3>
                    <p style={{ margin: '8px 0 0', color: 'rgba(246,247,251,0.56)', lineHeight: 1.65 }}>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-container">
          <div style={{ maxWidth: 680, marginBottom: 34 }}>
            <div className="public-eyebrow">Platform</div>
            <h2 className="public-title" style={{ fontSize: 'clamp(34px, 4.8vw, 64px)' }}>Everything around the build matters.</h2>
          </div>
          <div className="public-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {features.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="public-card public-card-hover" style={{ padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', marginBottom: 18, background: 'rgba(115,216,255,0.1)', color: '#73d8ff' }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
                <p style={{ color: 'rgba(246,247,251,0.54)', lineHeight: 1.7, margin: '10px 0 0' }}>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-container">
          <div className="public-card" style={{ padding: 'clamp(26px, 5vw, 54px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, overflow: 'hidden' }}>
            <div>
              <div className="public-eyebrow">Try prompts like</div>
              <h2 className="public-title" style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>Ask for a finished app, not a placeholder.</h2>
              <p className="public-copy">The generation prompt now pushes for functional results. If something is too large for one pass, 44Gen explains what is next and asks to continue.</p>
              <PublicButton onClick={go}>Open builder</PublicButton>
            </div>
            <div className="public-grid">
              {examples.map((text, index) => (
                <div key={text} className="public-card" style={{ padding: 18, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Sparkles size={18} color={index === 0 ? '#73d8ff' : index === 1 ? '#7df1c7' : '#ffca7a'} />
                  <span style={{ color: 'rgba(246,247,251,0.78)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-section" style={{ textAlign: 'center', paddingTop: 72 }}>
        <div className="public-container">
          <Zap size={28} color="#ffca7a" />
          <h2 className="public-title" style={{ fontSize: 'clamp(38px, 6vw, 78px)', maxWidth: 780, margin: '18px auto' }}>Your next product can be live today.</h2>
          <p className="public-copy" style={{ maxWidth: 520, margin: '0 auto 28px' }}>Start free, build a working first version, then refine with chat, visual edits, and code.</p>
          <PublicButton onClick={go}>Start free</PublicButton>
          <div style={{ marginTop: 18 }}>
            <Link to="/pricing" style={{ color: 'rgba(246,247,251,0.55)', textDecoration: 'none', fontSize: 14 }}>
              Compare plans <ArrowRight size={13} style={{ display: 'inline', verticalAlign: '-2px' }} />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
