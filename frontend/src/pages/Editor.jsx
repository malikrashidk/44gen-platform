import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe,
  Code, Eye, Sun, Moon, Loader2, ExternalLink, Sparkles,
  AlertCircle, CheckCircle2, RefreshCw, Monitor, Smartphone,
  Maximize2, Share, BookmarkPlus, Settings, LogOut, ChevronDown,
  Activity, FileCode, Package
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL

export default function Editor() {
  const { projectId } = useParams()
  const { user, profile, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [activeTab, setActiveTab] = useState('preview')
  const [darkMode, setDarkMode] = useState(true)
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [detailsLog, setDetailsLog] = useState([])
  const [currentJobId, setCurrentJobId] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const eventSourceRef = useRef(null)
  const codeBufferRef = useRef('')
  const codeMessageIdRef = useRef(null)

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#f8f8f8'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#2a2a2a' : '#e5e5e5'
  const text = d ? '#ffffff' : '#111111'
  const muted = d ? '#666' : '#999'
  const subtle = d ? '#1a1a1a' : '#f5f5f5'
  const inputBg = d ? '#111' : '#fff'

  useEffect(() => { fetchProject() }, [projectId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversation history on mount
  useEffect(() => {
    if (projectId) loadConversations()
  }, [projectId])

  // Check for active build job on mount
  useEffect(() => {
    if (projectId) checkActiveBuildJob()
  }, [projectId])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects').select('*').eq('id', projectId).single()
    setProject(data)
    if (data?.subdomain) setPreviewUrl('https://' + data.subdomain + '.44gen.com')
    if (data?.name) setNewName(data.name)
  }

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (!data || data.length === 0) return

    const loaded = data.map(conv => {
      if (conv.type === 'complete') {
        try {
          const content = JSON.parse(conv.content)
          return { id: conv.id, role: 'assistant', content, type: 'complete' }
        } catch { return null }
      }
      if (conv.type === 'code') {
        return { id: conv.id, role: 'assistant', content: conv.content, type: 'code_done' }
      }
      return { id: conv.id, role: conv.role, content: conv.content, type: conv.type || 'message' }
    }).filter(Boolean)

    setMessages(loaded)
  }

  const checkActiveBuildJob = async () => {
    const { data: jobs } = await supabase
      .from('build_jobs')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['queued', 'building'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (jobs && jobs.length > 0) {
      const job = jobs[0]
      setCurrentJobId(job.id)
      setStage('building')
      addMessage('assistant', `Reconnecting to build in progress...`, 'status')
      connectToStream(job.id)
    }
  }

  const addMessage = useCallback((role, content, type = 'message') => {
    const id = Date.now() + Math.random()
    setMessages(prev => [...prev, { role, content, type, id }])
    return id
  }, [])

  const updateMessage = useCallback((id, updater) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updater(m) } : m))
  }, [])

  const saveConversation = async (role, content, type = 'message') => {
    await supabase.from('conversations').insert({
      project_id: projectId,
      role,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      type
    })
  }

  const connectToStream = useCallback((jobId) => {
    if (eventSourceRef.current) eventSourceRef.current.close()

    codeBufferRef.current = ''
    codeMessageIdRef.current = null

    const es = new EventSource(`${API}/api/build/stream/${jobId}`)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        handleStreamEvent(event)
      } catch {}
    }

    es.onerror = () => {
      es.close()
      setStage('idle')
      setLoading(false)
    }
  }, [])

  const handleStreamEvent = useCallback((event) => {
    const addDetail = (icon, text, color) => {
      setDetailsLog(prev => [...prev, { icon, text, color, ts: Date.now() }])
    }

    switch (event.type) {
      case 'start':
        addMessage('assistant', event.message, 'status')
        addDetail('🚀', event.message, '#7c3aed')
        break

      case 'thought':
        addMessage('assistant', { text: event.text }, 'thought')
        addDetail('💡', `Thinking...`, '#f59e0b')
        break

      case 'code_start':
        addDetail('✏️', `Writing ${event.file}`, '#3b82f6')
        // Create a streaming code message
        const codeId = Date.now() + Math.random()
        codeMessageIdRef.current = codeId
        codeBufferRef.current = ''
        setMessages(prev => [...prev, {
          id: codeId,
          role: 'assistant',
          content: { file: event.file, code: '' },
          type: 'code_stream'
        }])
        break

      case 'code_chunk':
        codeBufferRef.current += event.text
        if (codeMessageIdRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === codeMessageIdRef.current
              ? { ...m, content: { ...m.content, code: codeBufferRef.current } }
              : m
          ))
        }
        setCodeContent(prev => prev + event.text)
        break

      case 'code_end':
        codeMessageIdRef.current = null
        addDetail('✅', 'Code generation complete', '#10b981')
        break

      case 'installing':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.type === 'build_progress') {
            return prev.map(m => m.id === last.id ? { ...m, content: event.message } : m)
          }
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_progress' }]
        })
        addDetail('📦', event.message, '#6366f1')
        break

      case 'building':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.type === 'build_progress') {
            return prev.map(m => m.id === last.id ? { ...m, content: event.message } : m)
          }
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_progress' }]
        })
        addDetail('🔨', event.message, '#8b5cf6')
        break

      case 'deploying':
        setMessages(prev => {
          const hasProgress = prev.some(m => m.type === 'build_progress')
          if (hasProgress) {
            return prev.map(m => m.type === 'build_progress' ? { ...m, content: event.message } : m)
          }
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_progress' }]
        })
        addDetail('🚀', 'Deploying...', '#06b6d4')
        break

      case 'summarizing':
        addDetail('📝', 'Generating summary...', '#84cc16')
        break

      case 'done':
        setPreviewUrl('https://' + event.subdomain + '.44gen.com')
        setPreviewKey(k => k + 1)
        setStage('done')
        setLoading(false)
        setPlan(null)
        fetchProfile(user.id)
        fetchProject()
        addDetail('✅', `Live at ${event.subdomain}.44gen.com`, '#10b981')
        // Remove build progress message and add completion card
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'build_progress'),
          { id: Date.now(), role: 'assistant', content: event, type: 'complete' }
        ])
        if (eventSourceRef.current) eventSourceRef.current.close()
        break

      case 'error':
        addMessage('assistant', event.message, 'error')
        setStage('idle')
        setLoading(false)
        addDetail('❌', event.message, '#ef4444')
        if (eventSourceRef.current) eventSourceRef.current.close()
        break

      default:
        break
    }
  }, [user, fetchProfile])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!prompt.trim() || loading) return

    const userPrompt = prompt.trim()
    setPrompt('')
    setLoading(true)
    addMessage('user', userPrompt)
    await saveConversation('user', userPrompt)

    try {
      setStage('planning')
      addMessage('assistant', 'Analyzing your request...', 'status')

      const planRes = await fetch(`${API}/api/plan`, {
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
      // Remove status message and add plan
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'status'),
        { id: Date.now(), role: 'assistant', content: planData, type: 'plan' }
      ])
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
    setDetailsLog([])
    addMessage('assistant', `Plan approved! Starting build...`, 'status')
    await saveConversation('assistant', `Plan approved for: ${plan.app_name}`, 'plan_approved')

    try {
      const res = await fetch(`${API}/api/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, projectId, userId: user.id })
      })

      const { job_id, error } = await res.json()

      if (error) {
        addMessage('assistant', error, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      setCurrentJobId(job_id)
      // Remove status message
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      connectToStream(job_id)

    } catch (err) {
      addMessage('assistant', 'Failed to start build. Please try again.', 'error')
      setStage('idle')
      setLoading(false)
    }
  }

  const handleRejectPlan = () => {
    setPlan(null)
    setStage('idle')
    addMessage('assistant', "Plan cancelled. What would you like to change?", 'message')
  }

  const handleRename = async () => {
    if (!newName.trim()) return
    await supabase.from('projects').update({ name: newName }).eq('id', projectId)
    setProject(p => ({ ...p, name: newName }))
    setRenaming(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const copyShareLink = () => {
    if (previewUrl) {
      navigator.clipboard.writeText(previewUrl)
      alert('Link copied!')
    }
  }

  // Render individual messages
  const renderMessage = (msg) => {
    if (msg.type === 'status') return (
      <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 13, padding: '4px 0' }}>
        <Loader2 size={13} className="animate-spin" style={{ color: '#7c3aed', flexShrink: 0 }} />
        {msg.content}
      </div>
    )

    if (msg.type === 'thought') return (
      <div key={msg.id} style={{
        background: d ? '#1a1500' : '#fffbeb',
        border: `1px solid ${d ? '#3d2e00' : '#fde68a'}`,
        borderRadius: 12, padding: '10px 14px', fontSize: 12,
        color: d ? '#fcd34d' : '#92400e', lineHeight: 1.5,
        fontStyle: 'italic'
      }}>
        <span style={{ marginRight: 6 }}>💡</span>
        {msg.content.text}
      </div>
    )

    if (msg.type === 'code_stream' || msg.type === 'code_done') {
      const code = msg.content?.code || msg.content || ''
      const lines = code.split('\n').slice(0, 8)
      const isStreaming = msg.type === 'code_stream'
      return (
        <div key={msg.id} style={{
          background: d ? '#0d1117' : '#f6f8fa',
          border: `1px solid ${d ? '#30363d' : '#d0d7de'}`,
          borderRadius: 12, overflow: 'hidden', fontSize: 11
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${d ? '#30363d' : '#d0d7de'}`, background: d ? '#161b22' : '#f0f2f4' }}>
            <FileCode size={12} style={{ color: '#3b82f6' }} />
            <span style={{ color: muted, fontFamily: 'monospace' }}>src/App.jsx</span>
            {isStreaming && <Loader2 size={10} className="animate-spin" style={{ color: '#7c3aed', marginLeft: 'auto' }} />}
          </div>
          <div style={{ padding: '10px 12px', fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.6, maxHeight: 160, overflow: 'hidden' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {line || '\u00a0'}
              </div>
            ))}
            {code.split('\n').length > 8 && (
              <div style={{ color: muted, marginTop: 4 }}>... {code.split('\n').length - 8} more lines</div>
            )}
            {isStreaming && <span style={{ display: 'inline-block', width: 8, height: 14, background: '#7c3aed', animation: 'blink 1s infinite', marginLeft: 2, verticalAlign: 'text-bottom' }} />}
          </div>
        </div>
      )
    }

    if (msg.type === 'build_progress') return (
      <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 13, padding: '2px 0' }}>
        <Loader2 size={12} className="animate-spin" style={{ color: '#6366f1', flexShrink: 0 }} />
        {msg.content}
      </div>
    )

    if (msg.type === 'error') return (
      <div key={msg.id} style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 12, padding: '10px 14px', color: '#f87171', fontSize: 13
      }}>
        <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        {msg.content}
      </div>
    )

    if (msg.type === 'plan') {
      const p = msg.content
      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${d ? '#2a1f5e' : '#ddd6fe'}`, borderRadius: 16, padding: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 600 }}>
              <Sparkles size={14} /> Plan Ready
            </div>
            {p.is_complex && (
              <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 100 }}>
                {p.total_phases} phases
              </span>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Understanding</p>
            <p style={{ color: text, lineHeight: 1.5 }}>{p.understanding}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {p.is_complex ? `Phase ${p.current_phase} — Building Now` : 'Steps'}
            </p>
            {(p.is_complex ? p.phases?.[0]?.steps : p.steps)?.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: text }}>
                <ChevronRight size={12} style={{ color: '#7c3aed', marginTop: 2, flexShrink: 0 }} />
                {step}
              </div>
            ))}
            {p.is_complex && p.phases?.slice(1).map((ph, i) => (
              <div key={i} style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, color: muted, marginBottom: 2 }}>Phase {i + 2} — {ph.description}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Files</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {p.files?.map((f, i) => (
                <span key={i} style={{ fontSize: 11, background: d ? '#222' : '#f0f0f0', color: muted, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>{f}</span>
              ))}
            </div>
          </div>

          {p.questions?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Questions</p>
              {p.questions.map((q, i) => <div key={i} style={{ color: '#f59e0b', fontSize: 13, marginBottom: 2 }}>• {q}</div>)}
            </div>
          )}

          {p.out_of_scope?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Out of Scope</p>
              {p.out_of_scope.map((item, i) => <div key={i} style={{ color: muted, fontSize: 13, marginBottom: 2 }}>• {item}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted }}>
              <Zap size={11} style={{ color: '#7c3aed' }} />
              Est. {p.estimated_credits} credits
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleRejectPlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, background: 'none', border: `1px solid ${border}`, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                <X size={12} /> Cancel
              </button>
              <button onClick={handleApprovePlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: '#7c3aed', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                <Check size={12} /> Approve & Build
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (msg.type === 'complete') {
      const c = msg.content
      const s = c.summary
      return (
        <div key={msg.id} style={{ fontSize: 13 }}>
          {/* Result card */}
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                {s?.title || `Phase ${c.phase} Complete!`}
              </div>
              <BookmarkPlus size={14} style={{ color: muted, cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setActiveTab('details')}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
              >
                View details
              </button>
              <button
                onClick={() => { setActiveTab('preview'); setPreviewKey(k => k + 1) }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                Preview →
              </button>
            </div>
          </div>

          {/* Summary */}
          {s && (
            <div style={{ color: text, lineHeight: 1.7 }}>
              <p style={{ marginBottom: 10 }}>{s.description}</p>

              {s.features?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>What was built:</p>
                  {s.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, color: d ? '#ccc' : '#444' }}>
                      <span style={{ color: '#10b981', marginTop: 2 }}>•</span> {f}
                    </div>
                  ))}
                </div>
              )}

              {s.files_written?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Files written:</p>
                  {s.files_written.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <FileCode size={11} style={{ color: '#3b82f6' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: muted }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {s.tech?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {s.tech.map((t, i) => (
                    <span key={i} style={{ fontSize: 11, background: d ? '#222' : '#f0f0f0', color: muted, padding: '2px 8px', borderRadius: 6 }}>{t}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: muted, fontSize: 12, paddingTop: 8, borderTop: `1px solid ${border}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} style={{ color: '#7c3aed' }} /> {c.credits_used} credits
                </span>
                <a href={'https://' + c.subdomain + '.44gen.com'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', textDecoration: 'none' }}>
                  <Globe size={11} /> {c.subdomain}.44gen.com <ExternalLink size={10} />
                </a>
              </div>

              {c.total_phases > 1 && c.phase < c.total_phases && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }}>
                  <p style={{ color: muted, marginBottom: 8 }}>Ready for Phase {c.phase + 1}? {c.next_phase_description}</p>
                  <button
                    onClick={() => setPrompt(`Continue to phase ${c.phase + 1}`)}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Continue Phase {c.phase + 1} →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // Regular message
    return (
      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
        <div style={{
          maxWidth: '85%', borderRadius: 16, padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
          background: msg.role === 'user' ? '#7c3aed' : (d ? '#1a1a1a' : '#f5f5f5'),
          color: msg.role === 'user' ? '#fff' : text,
          border: msg.role === 'user' ? 'none' : `1px solid ${border}`
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  const isBuilding = stage === 'building' || stage === 'planning'

  return (
    <div style={{ height: '100vh', background: bg, color: text, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans','Inter',sans-serif", overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0, zIndex: 10 }}>

        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/dashboard')} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6 }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 1, height: 16, background: border }} />
          <div>
            {renaming ? (
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                style={{ background: subtle, border: `1px solid #7c3aed`, borderRadius: 6, padding: '2px 8px', color: text, fontSize: 13, fontWeight: 500, outline: 'none' }}
              />
            ) : (
              <button
                onClick={() => setRenaming(true)}
                style={{ background: 'none', border: 'none', color: text, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0 }}
              >
                {project?.name || 'Untitled App'}
              </button>
            )}
            {isBuilding && (
              <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>Building...</span>
            )}
            {!isBuilding && project?.status === 'deployed' && (
              <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>Previewing last saved version</span>
            )}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
            background: project?.status === 'deployed' ? 'rgba(16,185,129,0.1)' : (d ? '#222' : '#f0f0f0'),
            color: project?.status === 'deployed' ? '#10b981' : muted
          }}>
            {project?.status || 'draft'}
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isBuilding && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: muted, padding: '4px 10px', borderRadius: 8, background: subtle, border: `1px solid ${border}` }}>
              <Loader2 size={11} className="animate-spin" style={{ color: '#7c3aed' }} />
              Building...
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '4px 10px', borderRadius: 8, background: subtle, border: `1px solid ${border}` }}>
            <Zap size={11} style={{ color: '#7c3aed' }} />
            {profile?.credits ?? 0}
          </div>
          {previewUrl && (
            <button onClick={copyShareLink} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '4px 10px', borderRadius: 8, background: subtle, border: `1px solid ${border}`, cursor: 'pointer' }}>
              <Share size={12} /> Share
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', padding: '5px 12px', borderRadius: 8, textDecoration: 'none' }}>
              <Globe size={12} /> Publish
            </a>
          )}

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </button>
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 38, width: 220, background: surface, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: text, margin: 0 }}>{profile?.full_name || user?.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted }}>
                      <Zap size={11} style={{ color: '#7c3aed' }} />
                      {profile?.credits ?? 0} credits
                    </div>
                    <span style={{ fontSize: 11, background: '#7c3aed20', color: '#7c3aed', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>
                      {profile?.plan || 'FREE'}
                    </span>
                  </div>
                </div>
                {[
                  { icon: <ArrowLeft size={13} />, label: 'Go to Dashboard', action: () => navigate('/dashboard') },
                  { icon: <Edit size={13} />, label: 'Rename project', action: () => { setRenaming(true); setShowUserMenu(false) } },
                  { icon: <Settings size={13} />, label: 'Settings', action: () => {} },
                  { icon: <Sun size={13} />, label: darkMode ? 'Light mode' : 'Dark mode', action: () => setDarkMode(!darkMode) },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', color: text, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = subtle}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ color: muted }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${border}` }}>
                  <button
                    onClick={() => { signOut(); navigate('/') }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
                  >
                    <LogOut size={13} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Chat */}
        <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}` }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 16px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Sparkles size={20} style={{ color: '#7c3aed' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: text }}>What would you like to build?</p>
                <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 20 }}>
                  Describe your app and I'll create a plan for your approval before writing any code.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                  {['A todo app with categories', 'A landing page for my SaaS', 'A dashboard with charts'].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(s)}
                      style={{ textAlign: 'left', fontSize: 12, background: subtle, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 12px', color: muted, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed44'; e.currentTarget.style.color = text }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
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
          <div style={{ padding: 12, borderTop: `1px solid ${border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: inputBg, border: `1px solid ${border}`, borderRadius: 14, padding: '8px 10px', transition: 'border-color 0.15s' }}
              onFocus={e => e.currentTarget.style.borderColor = '#7c3aed50'}
              onBlur={e => e.currentTarget.style.borderColor = border}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  stage === 'awaiting_approval' ? 'Approve or cancel the plan first...' :
                  stage === 'building' ? 'Building your app...' :
                  'Describe your app or request changes...'
                }
                disabled={loading || stage === 'awaiting_approval' || stage === 'building'}
                rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: text, lineHeight: 1.5, maxHeight: 120, fontFamily: 'inherit' }}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim() || stage === 'awaiting_approval' || stage === 'building'}
                style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: prompt.trim() && stage === 'idle' ? '#7c3aed' : (d ? '#222' : '#e5e5e5'), border: 'none', cursor: prompt.trim() && stage === 'idle' ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
              >
                {loading && stage === 'planning' ? <Loader2 size={13} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={13} style={{ color: prompt.trim() && stage === 'idle' ? '#fff' : muted }} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: d ? '#444' : '#ccc', textAlign: 'center', marginTop: 6 }}>
              Plan ~0.5 credits · Build cost shown in plan
            </p>
          </div>
        </div>

        {/* RIGHT — Preview/Code/Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Right Tab Bar */}
          <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0 }}>
            {[
              { id: 'preview', icon: <Eye size={12} />, label: 'Preview' },
              { id: 'code', icon: <Code size={12} />, label: 'Code' },
              { id: 'details', icon: <Activity size={12} />, label: 'Details' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: activeTab === tab.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  color: activeTab === tab.id ? '#7c3aed' : muted
                }}
              >
                {tab.icon} {tab.label}
                {tab.id === 'details' && detailsLog.length > 0 && (
                  <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 100, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>
                    {detailsLog.length}
                  </span>
                )}
              </button>
            ))}

            {previewUrl && activeTab === 'preview' && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{previewUrl.replace('https://', '')}</span>
                <button onClick={() => setPreviewDevice(d => d === 'desktop' ? 'mobile' : 'desktop')}
                  style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {previewDevice === 'desktop' ? <Smartphone size={13} /> : <Monitor size={13} />}
                </button>
                <button onClick={() => setPreviewKey(k => k + 1)}
                  style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <RefreshCw size={13} />
                </button>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: muted, display: 'flex' }}>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d ? '#080808' : '#e8e8e8', overflow: 'hidden' }}>
              {previewUrl ? (
                <div style={{
                  width: previewDevice === 'mobile' ? 390 : '100%',
                  height: previewDevice === 'mobile' ? 844 : '100%',
                  maxHeight: '100%',
                  borderRadius: previewDevice === 'mobile' ? 16 : 0,
                  overflow: 'hidden',
                  boxShadow: previewDevice === 'mobile' ? '0 20px 60px rgba(0,0,0,0.5)' : 'none'
                }}>
                  <iframe
                    key={previewKey}
                    src={previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="App Preview"
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: muted }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: surface, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Eye size={22} style={{ opacity: 0.3 }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No preview yet</p>
                  <p style={{ fontSize: 12, opacity: 0.6 }}>Build your app to see it here</p>
                </div>
              )}
            </div>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && (
            <div style={{ flex: 1, overflow: 'auto', background: d ? '#0d1117' : '#f6f8fa', padding: 0 }}>
              {codeContent ? (
                <pre style={{ margin: 0, padding: 20, fontSize: 12, fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {codeContent}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted }}>
                  <Code size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>No code generated yet</p>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {detailsLog.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted }}>
                  <Activity size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>Activity log will appear here during build</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailsLog.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ color: item.color || text, lineHeight: 1.5 }}>{item.text}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: muted, flexShrink: 0 }}>
                        {new Date(item.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {isBuilding && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 12 }}>
                      <Loader2 size={12} className="animate-spin" style={{ color: '#7c3aed' }} />
                      Working...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .animate-spin { animation: spin 0.8s linear infinite }
        * { box-sizing: border-box }
        textarea { overflow-y: hidden }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${d ? '#333' : '#ddd'}; border-radius: 2px }
      `}</style>
    </div>
  )
}
