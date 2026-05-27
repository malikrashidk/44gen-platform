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

export default function Terms() {
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
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16, ...GTEXT }}>Legal</div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-2px', margin: '0 0 16px', color: '#fff' }}>Terms of Service</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>Last updated: May 27, 2026</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px', marginBottom: 48, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          These Terms of Service govern your use of 44Gen ("Service"), operated by 44Gen ("we", "us", "our"). By accessing or using 44Gen, you agree to be bound by these terms. Please read them carefully.
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By creating an account or using 44Gen in any way, you confirm that you are at least 13 years old, have read and understood these Terms, and agree to be bound by them. If you are using 44Gen on behalf of an organization, you agree to these Terms on behalf of that organization.</p>
        </Section>

        <Section title="2. Description of Service">
          <p style={{ marginBottom: 12 }}>44Gen is an AI-powered app builder that allows users to describe applications in plain English and receive generated React code that is automatically built and deployed to a live URL. The service includes:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {['AI-powered code generation', 'Automatic build and deployment pipeline', 'Subdomain hosting for generated apps (*.44gen.com)', 'Code download and export features', 'Credit-based usage system'].map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
        </Section>

        <Section title="3. User Accounts">
          <p style={{ marginBottom: 12 }}>You are responsible for maintaining the security of your account credentials. You must not share your account with others or use another person's account without permission.</p>
          <p>You agree to provide accurate, current, and complete information when creating your account and to update it as necessary. We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </Section>

        <Section title="4. Credits and Billing">
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Free plan:</strong> Includes 10 credits per month at no charge, with no credit card required.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Paid plans:</strong> Pro ($19.9/month, 100 credits) and Business ($49.9/month, 260 credits) are billed monthly. Credits reset on your billing anniversary date.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Credit usage:</strong> Credits are consumed based on AI tokens used during generation. Planning costs approximately 0.5 credits; building costs 2–5 credits depending on complexity. Unused credits do not roll over.</p>
          <p><strong style={{ color: '#fff' }}>Refunds:</strong> We offer refunds within 7 days of a charge if you have not used any credits in that billing period. Contact us at hello@44gen.com to request a refund.</p>
        </Section>

        <Section title="5. Acceptable Use">
          <p style={{ marginBottom: 12 }}>You agree not to use 44Gen to generate apps that:</p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
            {[
              'Violate any applicable laws or regulations',
              'Infringe on the intellectual property rights of others',
              'Contain malware, phishing content, or other malicious code',
              'Harass, threaten, or harm other individuals',
              'Engage in fraud, deception, or misleading content',
              'Violate the privacy of others',
              'Generate or distribute spam',
            ].map(item => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}
          </ul>
          <p>We reserve the right to remove any deployed app and suspend any account that violates these guidelines, without prior notice.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Your content:</strong> You retain ownership of the apps and code generated through your prompts. By using 44Gen, you grant us a limited license to host, store, and serve your deployed apps.</p>
          <p style={{ marginBottom: 12 }}><strong style={{ color: '#fff' }}>Our platform:</strong> 44Gen, its logo, design, and underlying technology remain the exclusive property of 44Gen. You may not copy, modify, or distribute the platform itself.</p>
          <p><strong style={{ color: '#fff' }}>AI-generated code:</strong> Code generated by 44Gen is provided to you for your use. We make no warranties that generated code is free from third-party intellectual property claims.</p>
        </Section>

        <Section title="7. Uptime and Service Availability">
          <p style={{ marginBottom: 12 }}>We aim to maintain high availability but do not guarantee uninterrupted access to 44Gen. Scheduled maintenance, updates, and unexpected outages may temporarily affect service.</p>
          <p>Deployed app subdomains (*.44gen.com) are provided as-is. We reserve the right to change or discontinue subdomains with reasonable notice. For production use, we recommend downloading your code and self-hosting.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p style={{ marginBottom: 12 }}>44Gen is provided "as is" without warranties of any kind, express or implied. To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</p>
          <p>Our total liability to you for any claim arising from these Terms or your use of 44Gen shall not exceed the amount you paid us in the 3 months preceding the claim.</p>
        </Section>

        <Section title="9. Termination">
          <p style={{ marginBottom: 12 }}>You may cancel your account at any time from your account settings. Upon cancellation, your paid plan will remain active until the end of the current billing period.</p>
          <p>We reserve the right to terminate or suspend your account at any time for violation of these Terms, with or without notice. Upon termination, your access to 44Gen and your deployed apps will be removed.</p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>We may update these Terms from time to time. We will notify you of material changes by email or prominent notice on the platform. Continued use of 44Gen after changes take effect constitutes acceptance of the new Terms.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by and construed in accordance with applicable laws. Any disputes will be resolved through binding arbitration, except that either party may seek injunctive relief in court for intellectual property violations.</p>
        </Section>

        <Section title="12. Contact">
          <p>If you have questions about these Terms, please contact us at <a href="mailto:hello@44gen.com" style={{ color: '#ff3cac', textDecoration: 'none' }}>hello@44gen.com</a>.</p>
        </Section>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 18, color: '#fff' }}>44<span style={GTEXT}>Gen</span></Link>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/contact" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textDecoration: 'none' }}>Contact</Link>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>© 2026 44Gen</div>
        </div>
      </footer>
    </div>
  )
}
