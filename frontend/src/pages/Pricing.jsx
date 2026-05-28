import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Check, ArrowRight, Zap, Loader2, ChevronDown } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

const O = {
  grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)',
  text: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  glow: 'rgba(255,107,0,0.35)',
}
const B = { subtle: 'rgba(255,255,255,0.06)', orange: 'rgba(255,107,0,0.25)' }

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, credits: 10, popular: false,
    description: 'Perfect for trying 44gen and building your first app.',
    features: ['10 credits per month', 'Up to 5 deployed apps', 'Live subdomain deployment', 'Code download (zip)', 'Community support'],
    cta: 'Get started free',
  },
  {
    id: 'pro', name: 'Pro', price: 19.9, credits: 100, popular: true,
    description: 'For builders shipping real products.',
    features: ['100 credits per month', 'Unlimited deployed apps', 'Priority build queue', 'Stock photo library (Pexels)', 'Image upload in editor', 'Visual element editor', 'Email support'],
    cta: 'Start Pro',
  },
  {
    id: 'business', name: 'Business', price: 49.9, credits: 260, popular: false,
    description: 'For teams and power users.',
    features: ['260 credits per month', 'Everything in Pro', 'Fastest build queue', 'Priority email support', 'Early access to new features', 'Usage dashboard'],
    cta: 'Start Business',
  },
]

const FAQS = [
  { q: 'What is a credit?', a: 'One credit covers roughly one AI build or update. Larger apps with more files use slightly more. Credits are based on AI token usage divided by 10,000.' },
  { q: 'Do unused credits roll over?', a: 'Credits reset monthly and do not roll over. Each billing cycle starts with a fresh allocation.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no lock-in. Cancel your plan anytime and keep access until the end of your billing period.' },
  { q: 'What happens if I run out of credits?', a: 'Builds pause until your credits refill at the start of the next billing cycle. You can upgrade your plan for more credits.' },
  { q: 'Is the Free plan really free?', a: 'Yes. No credit card required. The Free plan includes 10 credits every month so you can build 2–4 apps to try the platform.' },
  { q: 'Can I export my code?', a: 'Yes, all plans include code download as a zip. Pro and Business users can also export directly to GitHub.' },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [checkoutPlan, setCheckoutPlan] = useState('')
  const [billingError, setBillingError] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const handleCTA = async (plan) => {
    if (!user) { navigate('/auth'); return }
    if (plan.id === 'free') { navigate('/dashboard'); return }
    if (profile?.plan === plan.id) return
    setCheckoutPlan(plan.id); setBillingError('')
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ plan: plan.id }),
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
    setCheckoutPlan('portal'); setBillingError('')
    try {
      const res = await fetch(`${API}/api/billing/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open portal')
      window.location.href = data.url
    } catch (err) {
      setBillingError(err.message || 'Could not open billing portal')
      setCheckoutPlan('')
    }
  }

  return (
    <div style={{ fontFamily: "'Sora','DM Sans',system-ui,sans-serif", background: '#050505', minHeight: '100vh', color: '#fff' }}>

      {/* ── Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${B.subtle}`, padding: '0 clamp(20px,4vw,48px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          {user ? (
            <>
              {profile?.plan !== 'free' && (
                <button onClick={openBillingPortal} disabled={checkoutPlan === 'portal'} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: `1px solid ${B.subtle}`, padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {checkoutPlan === 'portal' ? 'Opening...' : 'Manage billing'}
                </button>
              )}
              <button onClick={() => navigate('/dashboard')} style={{ background: O.grad, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dashboard</button>
            </>
          ) : (
            <button onClick={() => navigate('/auth')} style={{ background: O.grad, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Get started free</button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ padding: 'clamp(64px,8vw,120px) clamp(20px,5vw,48px) clamp(40px,5vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,107,0,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', marginBottom: 24, fontSize: 12, color: '#FDBA74', fontWeight: 700 }}>
            <Zap size={12} color="#FF7A18" /> Simple, transparent pricing
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-2.5px', margin: '0 0 16px', lineHeight: 1.0 }}>
            <span style={{ color: '#fff' }}>Start free.</span>{' '}
            <span style={O.text}>Scale as you grow.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 17, maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
            Credits refill monthly. No hidden fees. Cancel anytime.
          </p>
          {user && profile?.plan && (
            <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${B.subtle}`, borderRadius: 100, padding: '6px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              Current plan: <strong style={{ color: '#FF7A18', textTransform: 'capitalize' }}>{profile.plan}</strong>
              {' · '}{profile.credits?.toFixed(1)} credits remaining
            </div>
          )}
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 clamp(20px,5vw,48px) clamp(80px,8vw,120px)' }}>
        {billingError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#fca5a5', marginBottom: 24, textAlign: 'center' }}>{billingError}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {PLANS.map((plan, i) => {
            const isCurrent = profile?.plan === plan.id
            const isLoading = checkoutPlan === plan.id
            return (
              <div key={plan.id} style={{
                background: plan.popular ? 'rgba(255,107,0,0.04)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${plan.popular ? B.orange : B.subtle}`,
                borderRadius: 20, padding: '32px 28px', position: 'relative',
                boxShadow: plan.popular ? `0 0 60px rgba(255,107,0,0.08)` : 'none',
                transition: 'transform 0.3s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: O.grad, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' }}>Most popular</div>
                )}
                {isCurrent && (
                  <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 100, padding: '3px 10px', fontSize: 10, color: '#4ade80', fontWeight: 700 }}>Current plan</div>
                )}

                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>/mo</span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>{plan.credits} credits/mo</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 24px', lineHeight: 1.6 }}>{plan.description}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Check size={13} color="#FF7A18" style={{ flexShrink: 0, marginTop: 2 }}/>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.52)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleCTA(plan)} disabled={Boolean(checkoutPlan) || isCurrent}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: plan.popular ? 'none' : `1px solid ${B.subtle}`, background: isCurrent ? 'rgba(255,255,255,0.04)' : plan.popular ? O.grad : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isCurrent || checkoutPlan ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: checkoutPlan && checkoutPlan !== plan.id ? 0.5 : 1, transition: 'opacity 0.2s', boxShadow: plan.popular ? `0 0 24px ${O.glow}` : 'none', fontFamily: 'inherit' }}>
                  {isLoading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }}/> : isCurrent ? 'Current plan' : <>{plan.cta} <ArrowRight size={14}/></>}
                </button>
              </div>
            )
          })}
        </div>

        {/* Compare note */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 32 }}>
          All plans include live subdomain deployment, code export, and the visual editor.
        </p>
      </div>

      {/* ── FAQs ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(20px,5vw,48px) clamp(80px,8vw,120px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', margin: 0 }}>Common questions</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${openFaq === i ? B.orange : B.subtle}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.25s' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '18px 22px', background: 'none', border: 'none', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{faq.q}</span>
                <ChevronDown size={16} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}/>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 22px 18px', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, animation: 'fadeIn 0.2s ease' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${B.subtle}`, padding: '32px clamp(20px,5vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ l:'Privacy', to:'/privacy' },{ l:'Terms', to:'/terms' },{ l:'Contact', to:'/contact' }].map(lk => (
            <Link key={lk.l} to={lk.to} style={{ color:'rgba(255,255,255,0.3)', fontSize:13, textDecoration:'none', transition:'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.3)'}>{lk.l}</Link>
          ))}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </div>
  )
}
