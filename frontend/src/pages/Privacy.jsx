import { PublicPage } from '../components/PublicChrome'

const sections = [
  ['Information We Collect', 'We collect account details, project content, prompts, generated apps, uploaded references, usage data, and payment-related records from our payment provider.'],
  ['How We Use Information', 'We use this information to operate 44Gen, build and deploy apps, process billing, improve product quality, provide support, and keep the platform secure.'],
  ['Service Providers', 'We use trusted providers for authentication, hosting, database, AI generation, payment processing, analytics, and support operations.'],
  ['Generated Content', 'Apps you create are yours. We store project files so you can edit, rebuild, export, and restore versions.'],
  ['Security', 'We use reasonable technical and organizational measures to protect data. No internet service can be guaranteed completely secure.'],
  ['Your Choices', 'You can download generated code, delete projects, manage billing, or contact us about account and data questions.'],
  ['Contact', 'Questions about privacy can be sent to support@44gen.com.'],
]

export default function Privacy() {
  return (
    <PublicPage>
      <section className="public-section">
        <div className="public-container" style={{ maxWidth: 780 }}>
          <div className="public-eyebrow">Legal</div>
          <h1 className="public-title">Privacy <span>Policy</span></h1>
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
