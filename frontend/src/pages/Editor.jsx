import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe,
  Code, Eye, Sun, Moon, Loader2, ExternalLink, MessageSquare,
  Sparkles, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'

export default function Editor() {
  const { projectId } = useParams()
  const { user, profile, fetchProfile } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [activeRightTab, setActiveRightTab] = useState('preview')
  const [darkMode, setDarkMode] = useState(true)
  const [previewKey, setPreviewKey] = useState(0)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { fetchProject() }, [projectId])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects').select('*').eq('id', projectId).single()
    setProject(data)
    if (data?.subdomain) setPreviewUrl('https://' + data.subdomain + '.44gen.com')
  }

  const addMessage = (role, content, type = 'message') => {
    setMessages(prev => [...prev, { role, content, type, id: Date.now() }])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const userPrompt = prompt.trim()
    setPrompt('')
    setLoading(true)
    addMessage('user', userPrompt)

    try {
      setStage('planning')
      addMessage('assistant', 'Analyzing your request...', 'status')

      const planRes = await fetch(`${import.meta.env.VITE_API_URL}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, projectId })
      })

      const planData = await planRes.json()

      if (planData.error) {
        addMessage('assistant', planData.error, 'error')
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
    addMessage('assistant', `Building Phase ${plan.current_phase}...`, 'building')

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
        addMessage('assistant', buildData.error, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      await supabase.from('projects').update({
        name: plan.app_name || project.name,
        prompt: plan.understanding,
        status: 'deployed',
        subdomain: buildData.subdomain
      }).eq('id', projectId)

      await supabase.from('profiles')
        .update({ credits: (profile?.credits ?? 0) - buildData.credits_used })
        .eq('id', user.id)

      fetchProfile(user.id)
      fetchProject()

      const url = 'https://' + buildData.subdomain + '.44gen.com'
      setPreviewUrl(url)
      setPreviewKey(k => k + 1)
      setStage('done')
      setPlan(null)
      setActiveRightTab('preview')

      addMessage('assistant', {
        subdomain: buildData.subdomain,
        credits_used: buildData.credits_used,
        phase: plan.current_phase,
        total_phases: plan.total_phases,
        next_phase_description: plan.phases?.[1]?.description
      }, 'complete')

    } catch (err) {
      addMessage('assistant', 'Build failed. Please try again.', 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const handleRejectPlan = () => {
    setPlan(null)
    setStage('idle')
    addMessage('assistant', "Plan cancelled. What would you like to change?", 'message')
  }

  const t = darkMode
    ? {
        bg: 'bg-[#0f0f0f]', surface: 'bg-[#1a1a1a]', border: 'border-[#2a2a2a]',
        text: 'text-white', muted: 'text-[#888]', input: 'bg-[#1a1a1a] border-[#2a2a2a]',
        hover: 'hover:bg-[#222]', card: 'bg-[#161616] border-[#2a2a2a]',
        tag: 'bg-[#222] text-[#888]', userBubble: 'bg-[#7c3aed] text-white',
        aiBubble: 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc]',
      }
    : {
        bg: 'bg-[#f8f8f8]', surface: 'bg-white', border: 'border-[#e5e5e5]',
        text: 'text-[#111]', muted: 'text-[#888]', input: 'bg-white border-[#e5e5e5]',
        hover: 'hover:bg-[#f5f5f5]', card: 'bg-white border-[#e5e5e5]',
        tag: 'bg-[#f0f0f0] text-[#555]', userBubble: 'bg-[#7c3aed] text-white',
        aiBubble: 'bg-white border border-[#e5e5e5] text-[#333]',
      }

  const renderMessage = (msg) => {
    if (msg.type === 'status') return (
      <div key={msg.id} className={`flex items-center gap-2 ${t.muted} text-sm py-1`}>
        <Loader2 size={13} className="animate-spin text-violet-500" />
        {msg.content}
      </div>
    )

    if (msg.type === 'building') return (
      <div key={msg.id} className={`flex items-center gap-2 text-violet-400 text-sm py-1`}>
        <Loader2 size={13} className="animate-spin" />
        {msg.content}
        <span className={`text-xs ${t.muted} ml-1`}>This may take 60–90 seconds</span>
      </div>
    )

    if (msg.type === 'error') return (
      <div key={msg.id} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        {msg.content}
      </div>
    )

    if (msg.type === 'plan') {
      const p = msg.content
      return (
        <div key={msg.id} className={`${t.card} border rounded-2xl p-4 space-y-3 text-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-400 font-semibold">
              <Sparkles size={14} />
              Plan Ready
            </div>
            {p.is_complex && (
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {p.total_phases} phases
              </span>
            )}
          </div>

          <div>
            <p className={`text-xs uppercase tracking-widest ${t.muted} mb-1`}>Understanding</p>
            <p className={t.text}>{p.understanding}</p>
          </div>

          {p.is_complex ? (
            <div>
              <p className={`text-xs uppercase tracking-widest ${t.muted} mb-2`}>Phase {p.current_phase} — Building Now</p>
              <ul className="space-y-1">
                {p.phases?.[0]?.steps?.map((step, i) => (
                  <li key={i} className={`flex items-start gap-2 ${t.text}`}>
                    <ChevronRight size={13} className="text-violet-400 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
              {p.phases?.slice(1).map((ph, i) => (
                <div key={i} className="mt-2">
                  <p className={`text-xs uppercase tracking-widest ${t.muted} mb-1`}>Phase {i + 2} — Later</p>
                  <p className={t.muted}>{ph.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className={`text-xs uppercase tracking-widest ${t.muted} mb-2`}>Steps</p>
              <ul className="space-y-1">
                {p.steps?.map((step, i) => (
                  <li key={i} className={`flex items-start gap-2 ${t.text}`}>
                    <ChevronRight size={13} className="text-violet-400 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className={`text-xs uppercase tracking-widest ${t.muted} mb-2`}>Files</p>
            <div className="flex flex-wrap gap-1">
              {p.files?.map((f, i) => (
                <span key={i} className={`text-xs ${t.tag} px-2 py-0.5 rounded-md font-mono`}>{f}</span>
              ))}
            </div>
          </div>

          {p.questions?.length > 0 && (
            <div>
              <p className={`text-xs uppercase tracking-widest ${t.muted} mb-2`}>Questions</p>
              <ul className="space-y-1">
                {p.questions.map((q, i) => (
                  <li key={i} className="text-amber-400">• {q}</li>
                ))}
              </ul>
            </div>
          )}

          {p.out_of_scope?.length > 0 && (
            <div>
              <p className={`text-xs uppercase tracking-widest ${t.muted} mb-2`}>Out of Scope</p>
              <ul className="space-y-1">
                {p.out_of_scope.map((item, i) => (
                  <li key={i} className={t.muted}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={`flex items-center justify-between pt-3 border-t ${t.border}`}>
            <div className={`flex items-center gap-1 text-xs ${t.muted}`}>
              <Zap size={11} className="text-violet-400" />
              Est. {p.estimated_credits} credits
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectPlan}
                className={`flex items-center gap-1 text-xs ${t.muted} hover:text-red-400 transition px-3 py-1.5 rounded-lg ${t.hover}`}
              >
                <X size={12} /> Cancel
              </button>
              <button
                onClick={handleApprovePlan}
                className="flex items-center gap-1 text-xs text-white bg-violet-600 hover:bg-violet-700 transition px-3 py-1.5 rounded-lg font-medium"
              >
                <Check size={12} /> Approve & Build
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (msg.type === 'complete') {
      const c = msg.content
      return (
        <div key={msg.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 size={14} />
            Phase {c.phase} Complete!
          </div>
          <a
            href={'https://' + c.subdomain + '.44gen.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition"
          >
            <Globe size={12} />
            {c.subdomain}.44gen.com
            <ExternalLink size={10} />
          </a>
          <div className={`flex items-center gap-1 text-xs ${darkMode ? 'text-[#666]' : 'text-[#999]'}`}>
            <Zap size={10} className="text-violet-400" />
            {c.credits_used} credits used
          </div>
          {c.total_phases > 1 && c.phase < c.total_phases && (
            <div className="pt-2 border-t border-emerald-500/20">
              <p className={`text-xs ${darkMode ? 'text-[#888]' : 'text-[#666]'} mb-2`}>
                Ready for Phase {c.phase + 1}? {c.next_phase_description}
              </p>
              <button
                onClick={() => setPrompt(`Continue to phase ${c.phase + 1}`)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition"
              >
                Continue Phase {c.phase + 1} →
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          msg.role === 'user' ? t.userBubble : t.aiBubble
        }`}>
          {msg.content}
        </div>
      </div>
    )
  }

  const isBuilding = stage === 'building' || stage === 'planning'

  return (
    <div className={`h-screen ${t.bg} ${t.text} flex flex-col overflow-hidden`} style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      {/* Top Bar */}
      <div className={`flex items-center justify-between px-4 h-12 border-b ${t.border} ${t.surface} shrink-0 z-10`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className={`${t.muted} hover:${t.text} transition p-1 rounded-lg ${t.hover}`}
          >
            <ArrowLeft size={16} />
          </button>
          <div className={`w-px h-4 ${darkMode ? 'bg-[#2a2a2a]' : 'bg-[#e5e5e5]'}`} />
          <span className={`text-sm font-medium ${t.text}`}>{project?.name || 'Untitled App'}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            project?.status === 'deployed'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-[#333] text-[#888]'
          }`}>
            {project?.status || 'draft'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBuilding && (
            <div className={`flex items-center gap-1.5 text-xs ${t.muted} px-3 py-1.5 rounded-lg ${t.surface} border ${t.border}`}>
              <Loader2 size={11} className="animate-spin text-violet-400" />
              Building...
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${t.muted} px-3 py-1.5 rounded-lg ${t.surface} border ${t.border}`}>
            <Zap size={11} className="text-violet-400" />
            {profile?.credits ?? 0}
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-1.5 rounded-lg ${t.surface} border ${t.border} ${t.muted} hover:${t.text} transition`}
          >
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition font-medium"
            >
              <Globe size={12} /> Live
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — Chat Panel */}
        <div className={`w-[380px] shrink-0 flex flex-col border-r ${t.border}`}>

          {/* Chat Header */}
          <div className={`px-4 py-2.5 border-b ${t.border} flex items-center gap-2`}>
            <MessageSquare size={13} className="text-violet-400" />
            <span className={`text-xs font-medium ${t.muted}`}>Chat</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col h-full items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-3">
                  <Sparkles size={18} className="text-violet-400" />
                </div>
                <p className={`text-sm font-medium ${t.text} mb-1`}>What would you like to build?</p>
                <p className={`text-xs ${t.muted} mb-4 leading-relaxed`}>
                  Describe your app and I'll create a plan for approval before writing any code.
                </p>
                <div className="space-y-2 w-full">
                  {[
                    'A todo app with categories and due dates',
                    'A landing page for my SaaS product',
                    'A dashboard with charts and analytics'
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      className={`w-full text-left text-xs ${t.card} border rounded-xl px-3 py-2.5 ${t.muted} hover:text-violet-400 hover:border-violet-500/30 transition`}
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
          <div className={`p-3 border-t ${t.border}`}>
            <div className={`flex items-end gap-2 ${t.input} border rounded-xl px-3 py-2 focus-within:border-violet-500/50 transition`}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  stage === 'awaiting_approval'
                    ? 'Approve or cancel the plan first...'
                    : stage === 'building'
                    ? 'Building your app...'
                    : 'Describe your app...'
                }
                disabled={loading || stage === 'awaiting_approval' || stage === 'building'}
                rows={1}
                style={{ resize: 'none', minHeight: '24px', maxHeight: '120px' }}
                className={`flex-1 bg-transparent text-sm ${t.text} placeholder-[#555] focus:outline-none disabled:opacity-40`}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim() || stage === 'awaiting_approval' || stage === 'building'}
                className="shrink-0 w-7 h-7 flex items-center justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-30 text-white rounded-lg transition"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
            <p className={`text-xs ${t.muted} mt-1.5 text-center`}>
              Plan ~0.5 credits · Build cost shown in plan
            </p>
          </div>
        </div>

        {/* RIGHT — Preview/Code Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Right Tab Bar */}
          <div className={`flex items-center gap-1 px-4 py-2 border-b ${t.border} ${t.surface}`}>
            {[
              { id: 'preview', icon: <Eye size={13} />, label: 'Preview' },
              { id: 'code', icon: <Code size={13} />, label: 'Code' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeRightTab === tab.id
                    ? 'bg-violet-500/10 text-violet-400'
                    : `${t.muted} ${t.hover}`
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}

            {previewUrl && (
              <div className="ml-auto flex items-center gap-2">
                <span className={`text-xs ${t.muted} font-mono`}>{previewUrl.replace('https://', '')}</span>
                <button
                  onClick={() => setPreviewKey(k => k + 1)}
                  className={`text-xs ${t.muted} hover:text-violet-400 transition px-2 py-1 rounded-lg ${t.hover}`}
                >
                  ↺
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          {activeRightTab === 'preview' && (
            <div className="flex-1 overflow-hidden">
              {previewUrl ? (
                <iframe
                  key={previewKey}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="App Preview"
                />
              ) : (
                <div className={`h-full flex flex-col items-center justify-center ${t.muted}`}>
                  <div className={`w-16 h-16 rounded-2xl ${t.surface} border ${t.border} flex items-center justify-center mb-4`}>
                    <Eye size={24} className="opacity-30" />
                  </div>
                  <p className="text-sm font-medium mb-1">No preview yet</p>
                  <p className="text-xs opacity-60">Build your app to see it here</p>
                </div>
              )}
            </div>
          )}

          {/* Code */}
          {activeRightTab === 'code' && (
            <div className={`flex-1 flex flex-col items-center justify-center ${t.muted}`}>
              <div className={`w-16 h-16 rounded-2xl ${t.surface} border ${t.border} flex items-center justify-center mb-4`}>
                <Code size={24} className="opacity-30" />
              </div>
              <p className="text-sm font-medium mb-1">Code view coming soon</p>
              <p className="text-xs opacity-60">GitHub export available on Pro plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
