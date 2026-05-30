import { useState, useEffect } from 'react'
import { Check, ChevronDown, Zap, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BrandLoader from '../components/BrandLoader'
import { ParticleBackdrop, PublicButton, PublicPage } from '../components/PublicChrome'

const API = import.meta.env.VITE_API_URL

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    credits: '10 credits / month',
    note: 'For trying ideas and small prototypes.',
    cta: 'Start free',
    features: ['Live subdomain deployment', 'Code download', '5 deployed apps', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19.90',
    credits: '100 credits / month',
    note: 'For builders shipping real apps regularly.',
    cta: 'Start Pro',
    featured: true,
    features: ['Unlimited apps', 'Runtime QA', 'Pexels image search', 'GitHub export', 'Version rollback', 'Priority builds'],
  },
  {
    id: 'business',
    name: 'Business',
    price: '$49.90',
    credits: '260 credits / month',
    note: 'For heavier usage and client/product work.',
    cta: 'Start Business',
    features: ['Everything in Pro', 'Fastest queue', 'Early feature access', 'Priority support', 'Higher monthly credits', 'Usage visibility'],
  },
]

// Hardcoded packs — matches server billingPlans.js exactly
const PACKS = [
  { id: 'pack_50',  label: '50 Credits',  credits: 50,  price: '$10',  priceNum: 10  },
  { id: 'pack_100', label: '100 Credits', credits: 100, price: '$20',  priceNum: 20, popular: true },
  { id: 'pack_250', label: '250 Credits', credits: 250, price: '$50',  priceNum: 50  },
  { id: 'pack_500', label: '500 Credits', credits: 500, price: '$100', priceNum: 100 },
]

const faqs = [
  ['What is a credit?', 'Credits are based on AI usage. Planning is small, while larger multi-file builds use more credits. One credit = 10,000 AI tokens.'],
  ['Do credits roll over?', 'Monthly plan credits reset at the start of each billing cycle. Credit pack credits never expire.'],
  ['When do credit packs expire?', 'Credit pack credits never expire. They stay in your account until you use them.'],
  ['Can I cancel?', 'Yes. Manage billing from the dashboard or pricing page after upgrading. You keep access until the end of the billing period.'],
  ['Do I own the code?', 'Yes. You can download the generated code as a zip or export directly to GitHub.'],
  ['Who can buy credit packs?', 'Credit packs are available to Pro and Business subscribers. Upgrade your plan first, then top up whenever you need more.'],
]

export default function Pricing() {
  const { user, profile, session } = useAuth()
  const [openFaq, setOpenFaq] = useState(null)
  const [busyPlan, setBusyPlan] = useState('')
  const [busyPack, setBusyPack] = useState('')
  const [error, setError] = useState('')
  const isPaid = profile?.plan && profile.plan !== 'free'

  const startCheckout = async (plan) => {
    if (!user) { window.location.href = '/auth'; return }
    if (plan.id === 'free' || profile?.plan === plan.id) { window.location.href = '/dashboard'; return }
    setBusyPlan(plan.id); setError('')
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ plan: plan.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Could not start checkout')
      setBusyPlan('')
    }
  }

  const startPackCheckout = async (pack) => {
    if (!user) { window.location.href = '/auth'; return }
    if (!isPaid) {
      setError('Credit packs are available on Pro and Business plans. Upgrade your plan first.')
      return
    }
    setBusyPack(pack.id); setError('')
    try {
      const res = await fetch(`${API}/api/billing/pack-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pack: pack.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Could not start pack checkout')
      setBusyPack('')
    }
  }

  const openPortal = async () => {
    if (!session?.access_token) return
    setBusyPlan('portal'); setError('')
    try {
      const res = await fetch(`${API}/api/billing/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Could not open billing portal')
      setBusyPlan('')
    }
  }

  return (
    <PublicPage>
      {/* ── Hero ── */}
      <section className="public-section" style={{ textAlign: 'center', overflow: 'hidden' }}>
        <ParticleBackdrop density={34} />
        <div className="public-container">
          <div className="public-eyebrow">Pricing</div>
          <h1 className="public-title">Start free. <span>Scale when it clicks.</span></h1>
          <p className="public-copy" style={{ maxWidth: 560, margin: '22px auto 0' }}>
            Credits refill monthly. Free is for trying 44Gen, Pro unlocks the serious workflow, Business gives more room.
          </p>
          {user && profile && (
            <div className="public-card" style={{ display: 'inline-flex', gap: 10, alignItems: 'center', marginTop: 24, padding: '10px 14px', color: 'rgba(246,247,251,0.72)' }}>
              <Zap size={15} color="#ffca7a" />
              <span>Current plan: <strong style={{ textTransform: 'capitalize', color: '#f6f7fb' }}>{profile.plan || 'free'}</strong></span>
              <span>·</span>
              <span>{profile.credits ?? 0} credits</span>
              {isPaid && (
                <button onClick={openPortal} disabled={busyPlan === 'portal'} style={{ border: 0, background: 'transparent', color: '#7df1c7', fontWeight: 800, cursor: 'pointer' }}>
                  {busyPlan === 'portal' ? 'Opening...' : 'Manage'}
                </button>
              )}
            </div>
          )}
          {error && <div style={{ margin: '22px auto 0', maxWidth: 520, color: '#ffb4c9' }}>{error}</div>}
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="public-section" style={{ paddingTop: 24 }}>
        <div className="public-container">
          <div className="public-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {plans.map(plan => {
              const current = profile?.plan === plan.id
              const busy = busyPlan === plan.id
              return (
                <div key={plan.id} className="public-card public-card-hover" style={{ padding: 26, borderColor: plan.featured ? 'rgba(125,241,199,0.34)' : undefined, background: plan.featured ? 'rgba(125,241,199,0.07)' : undefined }}>
                  {plan.featured && <div style={{ color: '#7df1c7', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16 }}>Most useful</div>}
                  <h2 style={{ margin: 0, fontSize: 22 }}>{plan.name}</h2>
                  <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 44, fontWeight: 950, letterSpacing: '-0.07em' }}>{plan.price}</span>
                    {plan.id !== 'free' && <span style={{ color: 'rgba(246,247,251,0.42)' }}>/mo</span>}
                  </div>
                  <p style={{ color: '#ffca7a', fontWeight: 800, margin: '8px 0' }}>{plan.credits}</p>
                  <p style={{ color: 'rgba(246,247,251,0.55)', lineHeight: 1.65, minHeight: 52 }}>{plan.note}</p>
                  <PublicButton onClick={() => startCheckout(plan)} disabled={busy || current} variant={plan.featured ? 'primary' : 'secondary'} className="pricing-button">
                    {busy ? <BrandLoader label="" size={22} /> : current ? 'Current plan' : plan.cta}
                  </PublicButton>
                  <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
                    {plan.features.map(feature => (
                      <div key={feature} style={{ display: 'flex', gap: 10, color: 'rgba(246,247,251,0.68)', lineHeight: 1.45 }}>
                        <Check size={16} color="#7df1c7" style={{ flexShrink: 0, marginTop: 2 }} />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Credit Packs ── */}
      <section className="public-section" style={{ paddingTop: 48 }}>
        <div className="public-container">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="public-eyebrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Package size={13} /> Credit Packs
            </div>
            <h2 className="public-title" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', marginBottom: 10 }}>
              Run out of credits? <span>Top up instantly.</span>
            </h2>
            <p className="public-copy" style={{ maxWidth: 480, margin: '0 auto' }}>
              One-time purchases. Credits never expire. Available to Pro and Business subscribers.
            </p>
          </div>

          <div className="public-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {PACKS.map(pack => {
              const busy = busyPack === pack.id
              const perCredit = (pack.priceNum / pack.credits).toFixed(2)
              return (
                <div key={pack.id} className="public-card public-card-hover"
                  style={{
                    padding: '22px 20px',
                    textAlign: 'center',
                    position: 'relative',
                    borderColor: pack.popular ? 'rgba(125,241,199,0.34)' : undefined,
                    background: pack.popular ? 'rgba(125,241,199,0.05)' : undefined,
                  }}>
                  {pack.popular && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg,#73d8ff,#7df1c7)', color: '#0d1117', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 12px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                      Best value
                    </div>
                  )}
                  <div style={{ fontSize: 36, fontWeight: 950, letterSpacing: '-0.06em', marginBottom: 2 }}>{pack.price}</div>
                  <div style={{ color: '#ffca7a', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{pack.label}</div>
                  <div style={{ color: 'rgba(246,247,251,0.38)', fontSize: 12, marginBottom: 20 }}>${perCredit} per credit</div>
                  <PublicButton
                    onClick={() => startPackCheckout(pack)}
                    disabled={busy || (user && !isPaid)}
                    variant={pack.popular ? 'primary' : 'secondary'}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    {busy
                      ? <BrandLoader label="" size={18} />
                      : user && !isPaid
                        ? 'Pro/Business only'
                        : `Buy ${pack.label}`}
                  </PublicButton>
                </div>
              )
            })}
          </div>

          {user && !isPaid && (
            <p style={{ textAlign: 'center', color: 'rgba(246,247,251,0.38)', fontSize: 13, marginTop: 16 }}>
              Upgrade to Pro or Business to unlock credit packs.
            </p>
          )}
          {!user && (
            <p style={{ textAlign: 'center', color: 'rgba(246,247,251,0.38)', fontSize: 13, marginTop: 16 }}>
              <a href="/auth" style={{ color: '#7df1c7', textDecoration: 'none' }}>Sign in</a> and upgrade to a paid plan to buy credit packs.
            </p>
          )}
        </div>
      </section>

      {/* ── FAQs ── */}
      <section className="public-section" style={{ paddingTop: 38 }}>
        <div className="public-container" style={{ maxWidth: 760 }}>
          <div className="public-eyebrow">Questions</div>
          <h2 className="public-title" style={{ fontSize: 'clamp(32px, 4vw, 54px)', marginBottom: 24 }}>Simple answers.</h2>
          <div className="public-grid">
            {faqs.map(([question, answer], index) => (
              <div key={question} className="public-card" style={{ overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} style={{ width: '100%', border: 0, background: 'transparent', padding: 20, color: '#f6f7fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                  <strong>{question}</strong>
                  <ChevronDown size={16} style={{ transform: openFaq === index ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease', flexShrink: 0 }} />
                </button>
                {openFaq === index && <p style={{ margin: 0, padding: '0 20px 20px', color: 'rgba(246,247,251,0.58)', lineHeight: 1.7 }}>{answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
