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

export default function Privacy() {
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
            Privacy <span style={O.text}>Policy</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14, margin: 0 }}>Last updated: May 28, 2026</p>
        </div>

        <Section title="1. Information We Collect">We collect information you provide directly, including your name, email address, and payment information when you create an account or make a purchase. We also automatically collect device information and usage data including IP addresses and browser type.</Section>
        <Section title="2. How We Use Your Information">We use collected information to provide and improve our services, process transactions, send technical notices and support messages, respond to your questions, and send marketing communications (opt out anytime).</Section>
        <Section title="3. Information Sharing">We do not sell or rent your personal information. We may share data with trusted service providers such as payment processors (Polar), authentication services (Supabase), and hosting providers who assist us in operating the platform.</Section>
        <Section title="4. Data Security">We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, or disclosure. No method of transmission over the Internet is 100% secure.</Section>
        <Section title="5. Your Generated Content">Apps you build using 44Gen are yours. We store your generated code to provide the service and do not claim ownership over any applications you create. You can download or delete your projects at any time.</Section>
        <Section title="6. Cookies">We use cookies and similar technologies to enhance your experience and understand usage. You can control cookies through your browser settings.</Section>
        <Section title="7. Data Retention">We retain your information while your account is active or as needed to provide services. You may request account deletion and data removal by contacting us.</Section>
        <Section title="8. Children's Privacy">Our services are not directed to children under 13. We do not knowingly collect information from children under 13.</Section>
        <Section title="9. Changes to This Policy">We may update this policy periodically. We will notify you of significant changes by posting the new policy and updating the effective date.</Section>
        <Section title="10. Contact Us">Questions about this Privacy Policy? Contact us at <a href="mailto:support@44gen.com" style={{ color: '#FF7A18', textDecoration: 'none' }}>support@44gen.com</a>.</Section>
      </div>

      <footer style={{ borderTop: `1px solid ${B.subtle}`, padding: '28px clamp(20px,5vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13 }}>© 2026 44gen. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/terms" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textDecoration: 'none' }}>Terms</Link>
          <Link to="/contact" style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, textDecoration: 'none' }}>Contact</Link>
        </div>
      </footer>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap'); *{box-sizing:border-box}`}</style>
    </div>
  )
}
