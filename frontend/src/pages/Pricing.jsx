import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Check, ArrowRight, Zap, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

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
    id: 'free',
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
    id: 'pro',
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
    id: 'business',
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
  const { user, session, profile } = useAuth()
  const [openFaq, setOpenFaq] = useState(null)
  const [checkoutPlan, setCheckoutPlan] = useState('')
  const [billingError, setBillingError] = useState('')

  const handleCTA = async (plan) => {
    if (!user) {
      navigate('/auth')
      return
    }
    if (plan.id === 'free') {
      navigate('/dashboard')
      return
    }
    if (profile?.plan === plan.id) {
      navigate('/dashboard')
      return
    }

    setCheckoutPlan(plan.id)
    setBillingError('')
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ plan: plan.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setBillingError(err.message || 'Could not start checkout')
      setCheckoutPlan('')
    }
  }

  const openBillingPortal = async () => {
    if (!user) return navigate('/auth')
    setCheckoutPlan('portal')
    setBillingError('')
    try {
      const res = await fetch(`${API}/api/billing/portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch (err) {
      setBillingError(err.message || 'Could not open billing portal')
      setCheckoutPlan('')
    }
  }

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
            44<span style={{ color: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)' }}>Gen</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{ background: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/auth')} style={{ background: 'transparent', color: '#6b6b7b', border: '1px solid #e0dde8', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Log in</button>
              <button onClick={() => navigate('/auth')} style={{ background: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Get started free</button>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{ fontSize: 13, color: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#0f0f14', letterSpacing: '-2px', margin: '0 0 16px' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: '#6b6b7b', fontSize: 18, maxWidth: 440, margin: '0 auto' }}>
          Start free. Credits refill every month. No hidden fees.
        </p>
        {user && profile?.plan && (
          <div style={{ marginTop: 18, fontSize: 13, color: '#6b6b7b' }}>
            Current plan: <strong style={{ color: '#0f0f14', textTransform: 'capitalize' }}>{profile.plan}</strong>
            {profile.plan !== 'free' && (
              <button onClick={openBillingPortal} disabled={checkoutPlan === 'portal'}
                style={{ marginLeft: 10, border: '1px solid #ebe9e4', background: '#fff', borderRadius: 9, padding: '7px 10px', fontSize: 12, fontWeight: 700, color: '#0f0f14', cursor: checkoutPlan === 'portal' ? 'default' : 'pointer' }}>
                {checkoutPlan === 'portal' ? 'Opening...' : 'Manage billing'}
              </button>
            )}
          </div>
        )}
        {billingError && (
          <div style={{ maxWidth: 520, margin: '18px auto 0', padding: '10px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13 }}>
            {billingError}
          </div>
        )}
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.featured ? 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)' : '#fff',
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
                  <Zap size={14} color={plan.featured ? 'rgba(255,255,255,0.6)' : 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)'} />
                  <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.6)' : 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', fontWeight: 600 }}>{plan.credits} credits/month</span>
                </div>
                <p style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.65)' : '#6b6b7b', lineHeight: 1.6, margin: 0 }}>{plan.description}</p>
              </div>

              <button onClick={() => handleCTA(plan)} disabled={Boolean(checkoutPlan)} style={{
                width: '100%', padding: '13px 0', borderRadius: 12,
                border: plan.featured ? '2px solid rgba(255,255,255,0.3)' : '2px solid #7c6af7',
                background: plan.featured ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: checkoutPlan ? 'default' : 'pointer',
                marginBottom: 28, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: checkoutPlan && checkoutPlan !== plan.id ? 0.65 : 1
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {checkoutPlan === plan.id ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                {profile?.plan === plan.id ? 'Current plan' : plan.cta} <ArrowRight size={15} />
              </button>

              <div style={{ borderTop: `1px solid ${plan.featured ? 'rgba(255,255,255,0.15)' : '#f0ede8'}`, paddingTop: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: plan.featured ? 'rgba(255,255,255,0.2)' : 'rgba(255,60,172,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color={plan.featured ? '#fff' : 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)'} />
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
                <span style={{ fontSize: 20, color: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
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
        <button onClick={() => handleCTA(PLANS[0])} style={{
          background: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)', color: '#fff', border: 'none', padding: '14px 32px',
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
            <div style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>44<span style={{ color: 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)' }}>Gen</span></div>
          </Link>
          <div style={{ display: 'flex', gap: 24 }}>
            {[{ label: 'Home', to: '/' }, { label: 'Contact', to: '/contact' }, { label: 'Log in', to: '/auth' }].map(l => (
              <Link key={l.label} to={l.to} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44Gen</div>
        </div>
      </footer>
    </div>
  )
}
