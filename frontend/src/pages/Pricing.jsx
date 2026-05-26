import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Check, ArrowRight, Zap } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    credits: 10,
    description: 'Perfect for trying out 44gen and building your first app.',
    features: [
      '10 credits per month',
      'Up to 5 deployed apps',
      'Live subdomain deployment',
      'Code download (zip)',
      'Community support',
    ],
    cta: 'Start for free',
    featured: false,
  },
  {
    name: 'Pro',
    price: 19.9,
    credits: 100,
    description: 'For builders who ship regularly and need more power.',
    features: [
      '100 credits per month',
      'Unlimited deployed apps',
      'Priority build queue',
      'Code download (zip)',
      'Multi-file architecture',
      'Email support',
    ],
    cta: 'Get started',
    featured: true,
  },
  {
    name: 'Business',
    price: 49.9,
    credits: 260,
    description: 'For teams and power users who build serious products.',
    features: [
      '260 credits per month',
      'Everything in Pro',
      'Fastest build priority',
      'Early access to features',
      'Priority email support',
      'Usage analytics',
    ],
    cta: 'Get started',
    featured: false,
  },
]

const FAQS = [
  {
    q: 'What is a credit?',
    a: 'Credits are based on AI tokens used during generation. A typical app build costs 2–5 credits. Planning a build costs ~0.5 credits. Unused credits reset monthly.',
  },
  {
    q: 'Can I try before buying?',
    a: 'Yes — the Free plan includes 10 credits every month, no credit card required. You can build 2–4 complete apps before spending a cent.',
  },
  {
    q: 'What kind of apps can I build?',
    a: 'Anything React-based: landing pages, dashboards, calculators, tools, portfolios, e-commerce, SaaS interfaces, and much more.',
  },
  {
    q: 'Do I own the code?',
    a: 'Yes, completely. Every app you build is yours. You can download the full source code as a zip file at any time.',
  },
  {
    q: 'How long does a build take?',
    a: 'Most apps build and deploy in 1–3 minutes. Complex multi-file apps may take up to 5 minutes.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no lock-in. Cancel your plan anytime and keep access until the end of your billing period.',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState(null)

  const handleCTA = () => navigate(user ? '/dashboard' : '/auth')

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
        <div style={{ display: 'flex', gap: 12 }}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: '#7c6af7', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/auth')} style={{ background: 'transparent', color: '#6b6b7b', border: '1px solid #e0dde8', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Log in</button>
              <button onClick={handleCTA} style={{ background: '#7c6af7', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Get started free</button>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{ fontSize: 13, color: '#7c6af7', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-2px', margin: '0 0 16px' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: '#6b6b7b', fontSize: 18, maxWidth: 440, margin: '0 auto' }}>
          Start free. Credits refill every month. No hidden fees.
        </p>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.featured ? '#7c6af7' : '#fff',
              borderRadius: 24, padding: '36px 32px',
              border: plan.featured ? 'none' : '1px solid #ebe9e4',
              boxShadow: plan.featured ? '0 24px 80px rgba(124,106,247,0.3)' : '0 4px 24px rgba(0,0,0,0.04)',
              transform: plan.featured ? 'scale(1.04)' : 'scale(1)',
              position: 'relative'
            }}>
              {plan.featured && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#0f0f14', color: '#fff', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '5px 16px', borderRadius: 100
                }}>Most popular</div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: plan.featured ? 'rgba(255,255,255,0.7)' : '#6b6b7b', marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: plan.featured ? '#fff' : '#0f0f14', letterSpacing: '-2px', lineHeight: 1 }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span style={{ fontSize: 15, color: plan.featured ? 'rgba(255,255,255,0.5)' : '#9b99aa' }}>/month</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <Zap size={14} color={plan.featured ? 'rgba(255,255,255,0.6)' : '#7c6af7'} />
                  <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.6)' : '#7c6af7', fontWeight: 600 }}>{plan.credits} credits/month</span>
                </div>
                <p style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.65)' : '#6b6b7b', lineHeight: 1.6, margin: 0 }}>{plan.description}</p>
              </div>

              <button onClick={handleCTA} style={{
                width: '100%', padding: '13px 0', borderRadius: 12,
                border: plan.featured ? '2px solid rgba(255,255,255,0.3)' : '2px solid #7c6af7',
                background: plan.featured ? 'rgba(255,255,255,0.15)' : '#7c6af7',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                marginBottom: 28, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {plan.cta} <ArrowRight size={15} />
              </button>

              <div style={{ borderTop: `1px solid ${plan.featured ? 'rgba(255,255,255,0.15)' : '#f0ede8'}`, paddingTop: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: plan.featured ? 'rgba(255,255,255,0.2)' : '#ede9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color={plan.featured ? '#fff' : '#7c6af7'} />
                    </div>
                    <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.85)' : '#4b4b5a' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Credit calculator note */}
        <div style={{ textAlign: 'center', marginTop: 48, padding: '28px 32px', background: '#fff', borderRadius: 16, border: '1px solid #ebe9e4' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0f0f14', marginBottom: 8 }}>💡 How credits work</div>
          <p style={{ fontSize: 14, color: '#6b6b7b', margin: 0, lineHeight: 1.7 }}>
            Credits are based on AI tokens used. <strong>Planning</strong> costs ~0.5 credits. <strong>Building</strong> costs 2–5 credits depending on complexity. Simple tools cost less, full multi-page apps cost more.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: '#fff', padding: '80px 24px', borderTop: '1px solid #f0ede8' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#0f0f14', letterSpacing: '-1.5px', textAlign: 'center', marginBottom: 48 }}>
            Frequently asked questions
          </h2>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid #f0ede8', overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: '100%', background: 'none', border: 'none', padding: '20px 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', textAlign: 'left'
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#0f0f14' }}>{faq.q}</span>
                <span style={{ fontSize: 20, color: '#7c6af7', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: 20 }}>
                  <p style={{ fontSize: 15, color: '#6b6b7b', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#06060a', padding: '100px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: '0 0 16px' }}>
          Ready to build?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 17, marginBottom: 36 }}>Start free — no credit card needed.</p>
        <button onClick={handleCTA} style={{
          background: '#7c6af7', color: '#fff', border: 'none', padding: '14px 32px',
          borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'opacity 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Get started free <ArrowRight size={16} />
        </button>
      </div>

      {/* Footer */}
      <footer style={{ background: '#06060a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>44<span style={{ color: '#7c6af7' }}>gen</span></div>
          </Link>
          <div style={{ display: 'flex', gap: 24 }}>
            {[{ label: 'Home', to: '/' }, { label: 'Contact', to: '/contact' }, { label: 'Log in', to: '/auth' }].map(l => (
              <Link key={l.label} to={l.to} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44gen</div>
        </div>
      </footer>
    </div>
  )
}
