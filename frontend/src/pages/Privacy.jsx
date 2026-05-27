import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const G = 'linear-gradient(135deg, #ff3cac 0%, #784ba0 50%, #2b86c5 100%)'
const GTEXT = { background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

export default function Privacy() {
  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: '#080811', minHeight: '100vh', color: '#fff' }}>
      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,17,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff' }}>44</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>Gen</span>
        </Link>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <ArrowLeft size={15} /> Back to home
        </Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px' }}>
        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Legal</div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 16px', color: '#fff' }}>Privacy Policy</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>Last updated: May 27, 2026</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          This Privacy Policy describes how 44Gen ("we", "us", or "our") collects, uses, and shares information about you when you use our service at 44gen.com. By using 44Gen, you agree to the collection and use of information in accordance with this policy.
        </div>

        <Section title="1. Information We Collect">
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Account information:</strong> When you create an account, we collect your email address and any profile information you provide (such as your name). If you sign in via Google OAuth, we receive your Google profile name and email.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Usage data:</strong> We collect information about how you use 44Gen, including prompts submitted, apps built, pages visited, and features used. This helps us improve the service.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Generated content:</strong> We store the apps you build, including the prompts you provided and the generated code, to serve your deployed apps and enable the editor experience.</p>
          <p><strong style={{ color: '#fff' }}>Payment information:</strong> If you upgrade to a paid plan, payment is processed by our payment provider. We do not store your full card details — only transaction records.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p style={{ marginBottom: 12 }}>We use the information we collect to:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {[
              'Provide, maintain, and improve 44Gen',
              'Process transactions and send billing-related communications',
              'Send important service updates and account notifications',
              'Respond to your support requests and questions',
              'Monitor usage to prevent abuse and enforce our Terms of Service',
              'Analyze aggregate trends to improve product features',
            ].map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="3. How We Share Your Information">
          <p style={{ marginBottom: 12 }}>We do not sell your personal information. We may share your information with:</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Service providers:</strong> Third-party vendors that help us operate the service (hosting, database, payment processing, email). These providers are bound by confidentiality agreements.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Legal requirements:</strong> We may disclose information if required by law or if we believe disclosure is necessary to protect our rights or the safety of others.</p>
          <p><strong style={{ color: '#fff' }}>Business transfers:</strong> If 44Gen is acquired or merges with another company, your information may be transferred as part of that transaction.</p>
        </Section>

        <Section title="4. Data Storage and Security">
          <p style={{ marginBottom: 12 }}>Your data is stored on secure servers. We use industry-standard security measures including HTTPS encryption, secure database access, and regular security reviews to protect your information.</p>
          <p>Your generated apps are hosted on our servers and served via Cloudflare's global CDN. While we take reasonable precautions, no method of transmission over the internet is 100% secure.</p>
        </Section>

        <Section title="5. Cookies">
          <p style={{ marginBottom: 12 }}>We use cookies and similar technologies to:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {['Keep you logged in to your account', 'Remember your preferences (such as dark/light mode)', 'Analyze usage patterns to improve the product'].map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <p style={{ marginTop: 12 }}>You can disable cookies in your browser settings, though this may affect your ability to use certain features.</p>
        </Section>

        <Section title="6. Data Retention">
          <p style={{ marginBottom: 12 }}>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or legitimate business purposes.</p>
          <p>Deployed app files may remain on our servers for up to 7 days after project deletion to allow for recovery if deleted accidentally.</p>
        </Section>

        <Section title="7. Your Rights">
          <p style={{ marginBottom: 12 }}>Depending on your location, you may have the right to:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {['Access the personal data we hold about you', 'Correct inaccurate data', 'Request deletion of your data', 'Object to or restrict our processing of your data', 'Export your data in a portable format'].map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <p style={{ marginTop: 12 }}>To exercise these rights, contact us at <a href="mailto:hello@44gen.com" style={{ color: '#ff3cac', textDecoration: 'none' }}>hello@44gen.com</a>.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>44Gen is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on the platform. Your continued use of 44Gen after changes are posted constitutes your acceptance of the updated policy.</p>
        </Section>

        <Section title="10. Contact Us">
          <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:hello@44gen.com" style={{ color: '#ff3cac', textDecoration: 'none' }}>hello@44gen.com</a>.</p>
        </Section>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, color: '#fff' }}>44<span style={{ ...GTEXT }}>Gen</span></Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>Terms of Service</Link>
            <Link to="/contact" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>Contact</Link>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44Gen</div>
        </div>
      </footer>
    </div>
  )
}
