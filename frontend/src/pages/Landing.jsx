import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 max-w-7xl mx-auto">
        <div className="text-xl font-bold">
          44<span className="text-purple-500">gen</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            {user ? 'Dashboard' : 'Sign in'}
          </button>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-sm mb-8">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          AI-Powered App Builder
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Build apps with
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI</span>
          <br />in seconds
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Describe your app in plain English. 44gen plans, builds, and deploys it instantly.
          No coding required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/auth')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-8 py-4 rounded-xl transition text-lg w-full sm:w-auto"
          >
            Start Building Free →
          </button>
          <button className="text-gray-400 hover:text-white transition text-lg">
            See examples
          </button>
        </div>

        {/* Prompt Demo */}
        <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left">
          <p className="text-gray-500 text-sm mb-3">Try describing your app...</p>
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
            <span className="text-gray-300 text-sm flex-1">
              Build me a SaaS dashboard with user auth, analytics charts, and a billing page
            </span>
            <button
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition shrink-0"
            >
              Generate →
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need to build fast
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🧠',
              title: 'Plan & Approve',
              desc: 'AI analyzes your request, creates a detailed plan, and waits for your approval before writing any code.'
            },
            {
              icon: '⚡',
              title: 'Instant Generation',
              desc: 'Full React apps generated in seconds. Complete with routing, components, and Tailwind styling.'
            },
            {
              icon: '🚀',
              title: 'One-Click Deploy',
              desc: 'Your app goes live instantly on your own subdomain. Share it with the world immediately.'
            },
            {
              icon: '💬',
              title: 'Chat to Edit',
              desc: 'Refine your app by chatting with AI. Change colors, add features, fix bugs — all in plain English.'
            },
            {
              icon: '🔐',
              title: 'Auth Built-in',
              desc: 'User authentication, database, and backend powered by Supabase. Production-ready from day one.'
            },
            {
              icon: '💻',
              title: 'Own Your Code',
              desc: 'Export your code to GitHub anytime. No vendor lock-in. You own everything you build.'
            }
          ].map((f, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Simple pricing</h2>
        <p className="text-gray-400 text-center mb-12">Credits scale with what you build. Pay only for what you use.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              name: 'Free',
              price: '$0',
              credits: '10 credits/month',
              features: ['Public apps only', '44gen subdomain', 'Community support', 'Watermark on apps'],
              cta: 'Get Started',
              highlight: false
            },
            {
              name: 'Pro',
              price: '$15',
              credits: '100 credits/month',
              features: ['Private apps', 'Custom domain', 'Remove watermark', 'GitHub export', 'Priority AI'],
              cta: 'Start Pro',
              highlight: true
            },
            {
              name: 'Business',
              price: '$35',
              credits: '500 credits/month',
              features: ['Everything in Pro', 'Team members', 'Advanced analytics', 'Priority support'],
              cta: 'Start Business',
              highlight: false
            }
          ].map((plan, i) => (
            <div key={i} className={`rounded-2xl p-6 border ${plan.highlight ? 'bg-purple-600 border-purple-500' : 'bg-gray-900 border-gray-800'}`}>
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <div className="text-3xl font-bold mb-1">{plan.price}<span className="text-sm font-normal opacity-70">/mo</span></div>
              <div className={`text-sm mb-6 ${plan.highlight ? 'text-purple-200' : 'text-gray-400'}`}>{plan.credits}</div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className={`text-sm flex items-center gap-2 ${plan.highlight ? 'text-purple-100' : 'text-gray-400'}`}>
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
                className={`w-full py-3 rounded-xl font-medium transition ${plan.highlight ? 'bg-white text-purple-600 hover:bg-gray-100' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 44gen. Built with AI, for everyone.</p>
      </footer>
    </div>
  )
}
