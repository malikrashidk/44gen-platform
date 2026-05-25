import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe, Code, Eye } from 'lucide-react'

export default function Editor() {
  const { projectId } = useParams()
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [plan, setPlan] = useState(null)
  const [phase, setPhase] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle') // idle | planning | awaiting_approval | building | done
  const [previewUrl, setPreviewUrl] = useState(null)
  const [activeTab, setActiveTab] = useState('chat') // chat | preview | code
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    setProject(data)
    if (data?.subdomain) setPreviewUrl(`https://${data.subdomain}.44gen.com`)
  }

  const addMessage = (role, content, type = 'message') => {
    setMessages(prev => [...prev, { role, content, type, id: Date.now() }])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const userPrompt = prompt.trim()
    setPrompt('')
    setLoading(true)
    addMessage('user', userPrompt)

    try {
      // Stage 1: Generate Plan
      setStage('planning')
      addMessage('assistant', '🧠 Analyzing your request...', 'status')

      const planRes = await fetch(`${import.meta.env.VITE_API_URL}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, projectId })
      })

      const planData = await planRes.json()

      if (planData.error) {
        addMessage('assistant', `Error: ${planData.error}`, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      setPlan(planData)
      setStage('awaiting_approval')
      addMessage('assistant', planData, 'plan')

    } catch (err) {
      addMessage('assistant', 'Something went wrong. Please try again.', 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const handleApprovePlan = async () => {
    if (!plan) return
    setLoading(true)
    setStage('building')

    // Deduct plan credits
    addMessage('assistant', `✅ Plan approved! Building Phase ${plan.current_phase}...`, 'status')

    try {
      const buildController = new AbortController()
      const buildTimeout = setTimeout(() => buildController.abort(), 300000)
      const buildRes = await fetch(`${import.meta.env.VITE_API_URL}/api/build`, {
        signal: buildController.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, projectId, userId: user.id })
      })

      clearTimeout(buildTimeout)
      const buildData = await buildRes.json()

      if (buildData.error) {
        addMessage('assistant', `Build error: ${buildData.error}`, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      // Update project
      await supabase
        .from('projects')
        .update({
          name: plan.app_name || project.name,
          prompt: plan.understanding,
          status: 'deployed',
          subdomain: buildData.subdomain
        })
        .eq('id', projectId)

      // Deduct credits
      await supabase
        .from('profiles')
        .update({ credits: (profile?.credits ?? 0) - buildData.credits_used })
        .eq('id', user.id)

      fetchProfile(user.id)
      fetchProject()

      setPreviewUrl(`https://${buildData.subdomain}.44gen.com`)
      setStage('done')
      setPlan(null)

      // Show completion message
      addMessage('assistant', {
        subdomain: buildData.subdomain,
        credits_used: buildData.credits_used,
        phase: plan.current_phase,
        total_phases: plan.total_phases,
        next_phase_description: plan.phases?.[1]?.description
      }, 'complete')

      setActiveTab('preview')

    } catch (err) {
      addMessage('assistant', 'Build failed. Please try again.', 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const handleRejectPlan = () => {
    setPlan(null)
    setStage('idle')
    addMessage('assistant', 'Plan cancelled. Tell me what you\'d like to change and I\'ll create a new plan.', 'message')
  }

  const renderMessage = (msg) => {
    if (msg.type === 'status') {
      return (
        <div key={msg.id} className="flex items-center gap-2 text-gray-400 text-sm py-1">
          <div className="w-4 h-4 border border-purple-500 border-t-transparent rounded-full animate-spin" />
          {msg.content}
        </div>
      )
    }

    if (msg.type === 'error') {
      return (
        <div key={msg.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {msg.content}
        </div>
      )
    }

    if (msg.type === 'plan') {
      const p = msg.content
      return (
        <div key={msg.id} className="bg-gray-900 border border-purple-500/30 rounded-2xl p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <span>📋</span> Plan Ready
            {p.is_complex && (
              <span className="ml-auto text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                Complex — {p.total_phases} phases
              </span>
            )}
          </div>

          {/* Understanding */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">🔍 Understanding</p>
            <p className="text-gray-300 text-sm">{p.understanding}</p>
          </div>

          {/* Steps */}
          {p.is_complex ? (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                🛠️ Phase {p.current_phase} (building now)
              </p>
              <ul className="space-y-1">
                {p.phases?.[0]?.steps?.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <ChevronRight size={14} className="text-purple-400 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
              {p.phases?.slice(1).map((ph, i) => (
                <div key={i} className="mt-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">
                    📦 Phase {i + 2} (later)
                  </p>
                  <p className="text-gray-500 text-sm">{ph.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">🛠️ Steps</p>
              <ul className="space-y-1">
                {p.steps?.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <ChevronRight size={14} className="text-purple-400 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Files */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">📁 Files</p>
            <div className="flex flex-wrap gap-2">
              {p.files?.map((f, i) => (
                <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-lg font-mono">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Questions */}
          {p.questions?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">❓ Questions</p>
              <ul className="space-y-1">
                {p.questions.map((q, i) => (
                  <li key={i} className="text-yellow-400 text-sm">• {q}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Out of scope */}
          {p.out_of_scope?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">🚫 Out of Scope</p>
              <ul className="space-y-1">
                {p.out_of_scope.map((item, i) => (
                  <li key={i} className="text-gray-500 text-sm">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Credits estimate */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Zap size={14} className="text-purple-400" />
              Est. {p.estimated_credits} credits
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectPlan}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={handleApprovePlan}
                className="flex items-center gap-1 text-sm text-white bg-purple-600 hover:bg-purple-700 transition px-4 py-1.5 rounded-lg font-medium"
              >
                <Check size={14} /> Approve & Build
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (msg.type === 'complete') {
      const c = msg.content
      return (
        <div key={msg.id} className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-green-400 font-semibold">✅ Phase {c.phase} Complete!</p>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-400" />
            <a
              href={"https://" + c.subdomain + ".44gen.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              {c.subdomain}.44gen.com
            </a>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Zap size={12} className="text-purple-400" />
            {c.credits_used} credits used
          </div>
          {c.total_phases > 1 && c.phase < c.total_phases && (
            <div className="pt-2 border-t border-green-500/20">
              <p className="text-sm text-gray-300 mb-2">
                Ready for Phase {c.phase + 1}?
                <span className="text-gray-500 ml-1">{c.next_phase_description}</span>
              </p>
              <button
                onClick={() => setPrompt(`Continue to phase ${c.phase + 1}`)}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                Continue Phase {c.phase + 1} →
              </button>
            </div>
          )}
        </div>
      )
    }

    // Regular message
    return (
      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          msg.role === 'user'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-900 border border-gray-800 text-gray-300'
        }`}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition">
            <ArrowLeft size={18} />
          </button>
          <span className="font-medium text-sm">{project?.name || 'Untitled App'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            project?.status === 'deployed' ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'
          }`}>
            {project?.status || 'draft'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Zap size={14} className="text-purple-400" />
            {profile?.credits ?? 0}
          </div>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              <Globe size={14} /> Live
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4 shrink-0">
        {[
          { id: 'chat', icon: <Send size={14} />, label: 'Chat' },
          { id: 'preview', icon: <Eye size={14} />, label: 'Preview' },
          { id: 'code', icon: <Code size={14} />, label: 'Code' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition ${
              activeTab === tab.id
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-4">✨</div>
                  <h3 className="text-lg font-medium mb-2">What would you like to build?</h3>
                  <p className="text-gray-400 text-sm max-w-sm">
                    Describe your app and I'll create a plan for your approval before building anything.
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-6 w-full max-w-sm">
                    {[
                      'A todo app with categories and due dates',
                      'A landing page for my SaaS product',
                      'A dashboard with charts and user management'
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(s)}
                        className="text-left text-sm bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-xl px-4 py-3 text-gray-400 hover:text-white transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => renderMessage(msg))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={stage === 'awaiting_approval' ? 'Approve or cancel the plan above first...' : 'Describe your app or request changes...'}
                  disabled={loading || stage === 'awaiting_approval' || stage === 'building'}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim() || stage === 'awaiting_approval' || stage === 'building'}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl transition"
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="text-xs text-gray-600 mt-2 text-center">
                Plan costs ~0.5 credits • Build cost shown in plan
              </p>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="App Preview"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Eye size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No preview yet</p>
                <p className="text-xs mt-1">Build your app first</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center text-gray-500">
              <Code size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Code view coming soon</p>
              <p className="text-xs mt-1">GitHub export available on Pro plan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
