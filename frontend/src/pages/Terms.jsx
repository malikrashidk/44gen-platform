import { PublicPage } from '../components/PublicChrome'

const sections = [
  ['Acceptance', 'By using 44Gen, you agree to these terms and our Privacy Policy. If you do not agree, do not use the service.'],
  ['The Service', '44Gen helps users plan, generate, edit, deploy, download, and export React applications through AI-assisted workflows.'],
  ['Accounts', 'You are responsible for your account, credentials, billing choices, projects, and activity under your login.'],
  ['Credits and Payments', 'Plans use monthly credits. Free users receive limited monthly credits. Paid billing is processed by Polar, and credits reset each billing cycle.'],
  ['Generated Apps', 'You own the applications and source code generated in your account. You are responsible for reviewing outputs before using them publicly.'],
  ['Acceptable Use', 'Do not use 44Gen to create malware, phishing pages, spam tools, illegal content, or applications that violate third-party rights.'],
  ['Availability', 'We work to keep 44Gen reliable, but the service is provided as-is and may change, pause, or fail from time to time.'],
  ['Liability', 'To the fullest extent allowed by law, 44Gen is not liable for indirect, incidental, special, or consequential damages.'],
  ['Contact', 'Questions about these terms can be sent to support@44gen.com.'],
]

export default function Terms() {
  return (
    <PublicPage>
      <section className="public-section">
        <div className="public-container" style={{ maxWidth: 780 }}>
          <div className="public-eyebrow">Legal</div>
          <h1 className="public-title">Terms of <span>Service</span></h1>
          <p className="public-copy" style={{ marginTop: 18 }}>Last updated: May 28, 2026</p>
          <div className="public-grid" style={{ marginTop: 44 }}>
            {sections.map(([title, copy]) => (
              <section key={title} className="public-card" style={{ padding: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
                <p style={{ margin: '10px 0 0', color: 'rgba(246,247,251,0.6)', lineHeight: 1.75 }}>{copy}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
