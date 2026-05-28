import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const O = { grad: 'linear-gradient(135deg, #FF6B00 0%, #FF9A3C 100%)', text: { background: 'linear-gradient(135deg, #FF6B00 0%, #FDBA74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } }
const B = { subtle: 'rgba(255,255,255,0.06)' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.4px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.85 }}>{children}</div>
    </div>
  )
}

export default function Terms() {
  return (
    <div style={{ fontFamily: "'Sora','DM Sans',system-ui,sans-serif", background: '#050505', minHeight: '100vh', color: '#fff' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${B.subtle}`, padding: '0 clamp(20px,4vw,48px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: O.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.38)'}>
          <ArrowLeft size={14}/> Back home
        </Link>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,48px)' }}>
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FF7A18', marginBottom: 14 }}>Legal</div>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: '#fff', letterSpacing: '-2px', margin: '0 0 12px', lineHeight: 1.0 }}>
            Terms of <span style={O.text}>Service</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14, margin: 0 }}>Last updated: May 28, 2026</p>
        </div>

        <Section title="1. Acceptance of Terms">By accessing or using 44Gen, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our services.</Section>
        <Section title="2. Description of Service">44Gen is an AI-powered application builder that allows users to create and deploy React web applications through natural language prompts. We provide hosting on 44gen.com subdomains and tools for modifying generated applications.</Section>
        <Section title="3. User Accounts">You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when creating your account.</Section>
        <Section title="4. Credits and Payments">Our service operates on a credit system. Free plan users receive 10 credits monthly. Paid plans provide additional credits as described on our Pricing page. Credits reset monthly and do not roll over. All payments are processed securely through Polar.</Section>
        <Section title="5. Ownership of Generated Content">You own the code and applications generated through your use of 44Gen. We grant you a perpetual, non-exclusive license to use, modify, and distribute your generated applications. You are responsible for ensuring your applications comply with applicable laws.</Section>
        <Section title="6. Acceptable Use">You agree not to use 44Gen to create applications that are illegal, harmful, or violate the rights of others. Prohibited uses include generating malware, spam tools, phishing sites, or content that violates third-party intellectual property rights.</Section>
        <Section title="7. Service Availability">We strive for high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue any aspect of the service at any time. Deployed apps on 44gen.com subdomains are subject to our hosting policies.</Section>
        <Section title="8. Limitation of Liability">44Gen is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount paid by you in the past 12 months.</Section>
        <Section title="9. Changes to Terms">We may update these Terms at any time. Continued use of the service after changes constitutes acceptance. We will provide notice of significant changes via email or through the service.</Section>
        <Section title="10. Contact">Questions about these Terms? Contact us at <a href="mailto:support@44gen.com" style={{ color: '#FF7A18', textDecoration: 'none' }}>support@44gen.com</a>.</Section>
      </div>

      <footer style={{ borderTop: `1px solid ${B.subtle}`, padding: '28px clamp(20px,5vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>© 2026 44gen. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textDecoration: 'none' }}>Privacy</Link>
          <Link to="/contact" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textDecoration: 'none' }}>Contact</Link>
        </div>
      </footer>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box}`}</style>
    </div>
  )
}
