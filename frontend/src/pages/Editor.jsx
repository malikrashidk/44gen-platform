import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe,
  Code, Eye, Sun, Moon, Loader2, ExternalLink, Sparkles,
  AlertCircle, CheckCircle2, RefreshCw, Monitor, Smartphone,
  Share, LogOut, Activity, FileCode, Edit, MessageSquare, RefreshCcw
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL

export default function Editor() {
  const { projectId } = useParams()
  const { user, profile, session, fetchProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [iframeStatus, setIframeStatus] = useState('idle') // 'idle'|'loading'|'loaded'|'error'
  const [activeTab, setActiveTab] = useState('preview')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('44gen-dark-mode')
    return saved !== null ? saved === 'true' : true
  })
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [detailsLog, setDetailsLog] = useState([])
  const [fullCode, setFullCode] = useState('')

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const esRef = useRef(null)

  const codeChunksRef = useRef('')
  const codeMessageIdRef = useRef(null)
  const codeFlushIntervalRef = useRef(null)

  const sessionRef = useRef(session)
  useEffect(() => { sessionRef.current = session }, [session])

  const stageRef = useRef(stage)
  useEffect(() => { stageRef.current = stage }, [stage])

  const handleStreamEventRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const streamFinishedRef = useRef(false)
  const streamEventSeenRef = useRef(false)
  const streamWatchdogRef = useRef(null)
  const buildStartedRef = useRef(false) // prevent double-approve

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#f5f5f5'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#2a2a2a' : '#e5e5e5'
  const text = d ? '#f0f0f0' : '#111111'
  const muted = d ? '#666' : '#999'
  const subtle = d ? '#1a1a1a' : '#f0f0f0'

  useEffect(() => { fetchProject() }, [projectId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (projectId) { loadConversations(); loadBuildProgress(); checkActiveBuildJob() } }, [projectId])

  // Reset iframe status when preview changes
  useEffect(() => {
    if (previewUrl) setIframeStatus('loading')
  }, [previewKey, previewUrl])

  // Cleanup on unmount
  useEffect(() => () => {
    stopCodeFlush()
    if (esRef.current) esRef.current.close()
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (streamWatchdogRef.current) clearTimeout(streamWatchdogRef.current)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('44gen-dark-mode', String(next))
  }

  const startCodeFlush = useCallback(() => {
    if (codeFlushIntervalRef.current) return
    codeFlushIntervalRef.current = setInterval(() => {
      if (codeMessageIdRef.current) {
        const snapshot = codeChunksRef.current
        setMessages(prev => prev.map(m =>
          m.id === codeMessageIdRef.current
            ? { ...m, content: { ...m.content, code: snapshot } }
            : m
        ))
      }
    }, 80)
  }, [])

  const stopCodeFlush = useCallback(() => {
    if (codeFlushIntervalRef.current) {
      clearInterval(codeFlushIntervalRef.current)
      codeFlushIntervalRef.current = null
    }
  }, [])

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects').select('*').eq('id', projectId).single()
    setProject(data)
    if (data?.subdomain) setPreviewUrl('https://' + data.subdomain + '.44gen.com')
    if (data?.name) setNewName(data.name)
  }

  const loadConversations = async () => {
    const { data } = await supabase
      .from('conversations').select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (!data?.length) return

    let latestCode = ''
    const loaded = data.map(c => {
      if (c.type === 'complete') {
        try { return { id: c.id, role: 'assistant', content: JSON.parse(c.content), type: 'complete' } }
        catch { return null }
      }
      if (c.type === 'code') {
        latestCode = c.content
        return { id: c.id, role: 'assistant', content: { file: 'src/App.jsx', code: c.content }, type: 'code_done' }
      }
      if (c.type === 'plan_approved') return null
      return { id: c.id, role: c.role, content: c.content, type: c.type || 'message' }
    }).filter(Boolean)

    if (latestCode) setFullCode(latestCode)
    setMessages(loaded)
  }

  const detailFromEvent = (event) => {
    const ts = event.ts || Date.now()
    switch (event.type) {
      case 'queued': return { icon: '⏳', msg: event.message, color: '#f59e0b', ts }
      case 'start': return { icon: '🚀', msg: event.message, color: '#7c3aed', ts }
      case 'thought': return { icon: '💡', msg: 'AI thinking...', color: '#f59e0b', ts }
      case 'code_start': return { icon: '✏️', msg: 'Writing src/App.jsx', color: '#3b82f6', ts }
      case 'code_end': return { icon: '✅', msg: 'Code generation complete', color: '#10b981', ts }
      case 'installing': return { icon: '📦', msg: event.message, color: '#6366f1', ts }
      case 'building': return { icon: '🔨', msg: event.message, color: '#8b5cf6', ts }
      case 'deploying': return { icon: '🚀', msg: 'Deploying...', color: '#06b6d4', ts }
      case 'summarizing': return { icon: '📝', msg: 'Generating summary...', color: '#84cc16', ts }
      case 'done':
      case 'complete': return { icon: '✅', msg: `Live → ${event.subdomain}.44gen.com`, color: '#10b981', ts }
      case 'error': return { icon: '❌', msg: event.message, color: '#ef4444', ts }
      default: return null
    }
  }

  const loadBuildProgress = async () => {
    const { data: jobs } = await supabase
      .from('build_jobs').select('progress')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }).limit(1)

    const details = (jobs?.[0]?.progress || []).map(detailFromEvent).filter(Boolean)
    if (details.length) setDetailsLog(details)
  }

  const checkActiveBuildJob = async () => {
    const { data: jobs } = await supabase
      .from('build_jobs').select('*')
      .eq('project_id', projectId)
      .in('status', ['queued', 'building'])
      .order('created_at', { ascending: false }).limit(1)

    if (jobs?.length) {
      setStage('building')
      setLoading(true)
      streamFinishedRef.current = false
      addMessage('assistant', 'Reconnecting to build...', 'status')
      connectToStream(jobs[0].id)
    }
  }

  const addMessage = (role, content, type = 'message') => {
    const id = Date.now() + Math.random()
    setMessages(prev => [...prev, { role, content, type, id }])
    return id
  }

  const saveConversation = async (role, content, type = 'message') => {
    await supabase.from('conversations').insert({
      project_id: projectId, role,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      type
    })
  }

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionRef.current?.access_token}`
  })

  const connectToStream = useCallback((jobId) => {
    if (streamFinishedRef.current) return
    if (esRef.current) esRef.current.close()
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    if (streamWatchdogRef.current) clearTimeout(streamWatchdogRef.current)

    codeChunksRef.current = ''
    codeMessageIdRef.current = null
    streamEventSeenRef.current = false

    const token = sessionRef.current?.access_token
    const es = new EventSource(`${API}/api/build/stream/${jobId}?token=${token}`)
    esRef.current = es

    es.onopen = () => {
      setDetailsLog(prev => [...prev, { icon: '🔌', msg: 'Live stream connected', color: '#7c3aed', ts: Date.now() }])
    }

    es.onmessage = (e) => {
      streamEventSeenRef.current = true
      try { handleStreamEventRef.current?.(JSON.parse(e.data)) } catch {}
    }

    streamWatchdogRef.current = setTimeout(() => {
      if (!streamFinishedRef.current && stageRef.current === 'building' && !streamEventSeenRef.current) {
        addMessage('assistant', 'Build started. Waiting for the live stream...', 'status')
        setDetailsLog(prev => [...prev, { icon: '⏱️', msg: 'Waiting for first build update...', color: '#f59e0b', ts: Date.now() }])
        loadBuildProgress()
      }
    }, 8000)

    es.onerror = () => {
      if (streamFinishedRef.current) {
        es.close()
        return
      }
      if (stageRef.current === 'building') return
      stopCodeFlush()
      setStage('idle')
      setLoading(false)
      reconnectAttemptsRef.current = 0
    }
  }, [stopCodeFlush])

  // handleStreamEvent as a plain function updated into ref each render
  const handleStreamEvent = (event) => {
    const addDetail = (icon, msg, color) =>
      setDetailsLog(prev => [...prev, { icon, msg, color, ts: Date.now() }])

    switch (event.type) {
      case 'queued':
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', event.message, 'status')
        addDetail('⏳', event.message, '#f59e0b')
        break

      case 'start':
        reconnectAttemptsRef.current = 0
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', event.message, 'status')
        addDetail('🚀', event.message, '#7c3aed')
        break

      case 'thought':
        addMessage('assistant', event.text, 'thought')
        addDetail('💡', 'AI thinking...', '#f59e0b')
        break

      case 'code_start': {
        addDetail('✏️', 'Writing src/App.jsx', '#3b82f6')
        const id = Date.now() + Math.random()
        codeMessageIdRef.current = id
        codeChunksRef.current = ''
        setMessages(prev => [...prev, {
          id, role: 'assistant',
          content: { file: 'src/App.jsx', code: '' },
          type: 'code_stream'
        }])
        startCodeFlush()
        break
      }

      case 'code_chunk':
        codeChunksRef.current += event.text
        setFullCode(codeChunksRef.current)
        break

      case 'code_end':
        stopCodeFlush()
        if (codeMessageIdRef.current) {
          const finalCode = codeChunksRef.current
          setMessages(prev => prev.map(m =>
            m.id === codeMessageIdRef.current
              ? { ...m, content: { ...m.content, code: finalCode }, type: 'code_done' }
              : m
          ))
          setFullCode(finalCode)
        }
        codeMessageIdRef.current = null
        addDetail('✅', 'Code generation complete', '#10b981')
        break

      case 'installing':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.type === 'build_step') return prev.map(m => m.id === last.id ? { ...m, content: event.message } : m)
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_step' }]
        })
        addDetail('📦', event.message, '#6366f1')
        break

      case 'building':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.type === 'build_step') return prev.map(m => m.id === last.id ? { ...m, content: event.message } : m)
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_step' }]
        })
        addDetail('🔨', event.message, '#8b5cf6')
        break

      case 'deploying':
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last?.type === 'build_step') return prev.map(m => m.id === last.id ? { ...m, content: event.message } : m)
          return [...prev, { id: Date.now(), role: 'assistant', content: event.message, type: 'build_step' }]
        })
        addDetail('🚀', 'Deploying...', '#06b6d4')
        break

      case 'summarizing':
        addDetail('📝', 'Generating summary...', '#84cc16')
        break

      case 'done':
      case 'complete':
        stopCodeFlush()
        streamFinishedRef.current = true
        buildStartedRef.current = false
        setPreviewUrl('https://' + event.subdomain + '.44gen.com')
        setPreviewKey(k => k + 1)
        setStage('done')
        setLoading(false)
        setPlan(null)
        reconnectAttemptsRef.current = 0
        fetchProfile(user.id)
        fetchProject()
        addDetail('✅', `Live → ${event.subdomain}.44gen.com`, '#10b981')
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'build_step' && m.type !== 'status'),
          { id: Date.now(), role: 'assistant', content: event, type: 'complete' }
        ])
        if (esRef.current) esRef.current.close()
        break

      case 'error':
        stopCodeFlush()
        buildStartedRef.current = false
        addMessage('assistant', event.message, 'error')
        setStage('idle')
        setLoading(false)
        reconnectAttemptsRef.current = 0
        addDetail('❌', event.message, '#ef4444')
        if (esRef.current) esRef.current.close()
        break
    }
  }

  handleStreamEventRef.current = handleStreamEvent

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!prompt.trim() || loading) return
    const userPrompt = prompt.trim()
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    addMessage('user', userPrompt)
    await saveConversation('user', userPrompt)

    try {
      setStage('planning')
      addMessage('assistant', 'Analyzing your request...', 'status')

      const res = await fetch(`${API}/api/plan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: userPrompt, projectId })
      })
      const planData = await res.json()

      if (planData.error) {
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', planData.error, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      buildStartedRef.current = false
      setPlan(planData)
      setStage('awaiting_approval')
      setMessages(prev => [
        ...prev.filter(m => m.type !== 'status'),
        { id: Date.now(), role: 'assistant', content: planData, type: 'plan' }
      ])
    } catch {
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      addMessage('assistant', 'Something went wrong. Try again.', 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const startBuild = async (buildPlan) => {
    if (buildStartedRef.current) return
    buildStartedRef.current = true
    setLoading(true)
    setStage('building')
    setActiveTab('details')
    setDetailsLog([])
    setFullCode('')
    codeChunksRef.current = ''
    addMessage('assistant', 'Build approved. Creating build job...', 'status')
    setDetailsLog([{ icon: '✅', msg: 'Plan approved', color: '#10b981', ts: Date.now() }])
    await saveConversation('assistant', `Building: ${buildPlan.app_name}`, 'plan_approved')

    try {
      const res = await fetch(`${API}/api/build`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ plan: buildPlan, projectId })
      })
      const { job_id, error } = await res.json()

      if (error) {
        addMessage('assistant', error, 'error')
        buildStartedRef.current = false
        setStage('idle'); setLoading(false); return
      }

      setMessages(prev => prev.filter(m => m.type !== 'plan'))
      addMessage('assistant', 'Build job created. Connecting to live stream...', 'status')
      setDetailsLog(prev => [...prev, { icon: '⏳', msg: 'Build job created', color: '#f59e0b', ts: Date.now() }])
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      connectToStream(job_id)
    } catch {
      addMessage('assistant', 'Failed to start build.', 'error')
      buildStartedRef.current = false
      setStage('idle'); setLoading(false)
    }
  }

  const handleApprovePlan = () => {
    if (!plan) return
    startBuild(plan)
    setPlan(null)
  }

  // Continue to the next phase using the plan stored in the completion event
  const handleContinuePhase = (nextPhase, originalPlan) => {
    const phasedPlan = { ...originalPlan, current_phase: nextPhase }
    setPlan(phasedPlan)
    setStage('awaiting_approval')
    setLoading(false)
    setMessages(prev => [
      ...prev,
      { id: Date.now(), role: 'assistant', content: phasedPlan, type: 'plan' }
    ])
  }

  const handleRejectPlan = () => {
    setPlan(null); setStage('idle'); setLoading(false)
    addMessage('assistant', "Plan cancelled. What would you like to change?")
  }

  const handleRetry = () => {
    setStage('idle')
    setLoading(false)
  }

  const handleRename = async () => {
    if (!newName.trim()) return
    await supabase.from('projects').update({ name: newName }).eq('id', projectId)
    setProject(p => ({ ...p, name: newName }))
    setRenaming(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const handlePromptChange = (e) => {
    setPrompt(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
  }

  const isBuilding = stage === 'building' || stage === 'planning'

  // ── Message renderers ──────────────────────────────────
  const renderMessage = (msg) => {
    if (msg.type === 'status') return (
      <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 13, padding: '2px 0' }}>
        <Loader2 size={13} style={{ color: '#7c3aed', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
        {msg.content}
      </div>
    )

    if (msg.type === 'thought') return (
      <div key={msg.id} style={{
        background: d ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.08)',
        border: `1px solid rgba(245,158,11,0.2)`,
        borderRadius: 10, padding: '8px 12px', fontSize: 12,
        color: d ? '#fcd34d' : '#92400e', lineHeight: 1.5, fontStyle: 'italic'
      }}>
        <span style={{ marginRight: 6 }}>💡</span>
        <span style={{ opacity: 0.9 }}>{msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}</span>
      </div>
    )

    if (msg.type === 'code_stream' || msg.type === 'code_done') {
      const code = msg.content?.code || ''
      const lines = code.split('\n').slice(0, 10)
      const streaming = msg.type === 'code_stream'
      return (
        <div key={msg.id} style={{ background: d ? '#0d1117' : '#f6f8fa', border: `1px solid ${d ? '#30363d' : '#d0d7de'}`, borderRadius: 10, overflow: 'hidden', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: d ? '#161b22' : '#f0f2f4', borderBottom: `1px solid ${d ? '#30363d' : '#d0d7de'}` }}>
            <FileCode size={11} style={{ color: '#3b82f6' }} />
            <span style={{ color: muted, fontFamily: 'monospace', fontSize: 11 }}>src/App.jsx</span>
            {streaming
              ? <Loader2 size={10} style={{ color: '#7c3aed', marginLeft: 'auto', animation: 'spin 0.8s linear infinite' }} />
              : <CheckCircle2 size={10} style={{ color: '#10b981', marginLeft: 'auto' }} />}
          </div>
          <div style={{ padding: '8px 10px', fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.5, maxHeight: 140, overflow: 'hidden' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line || ' '}</div>
            ))}
            {code.split('\n').length > 10 && (
              <div style={{ color: muted, marginTop: 2 }}>+{code.split('\n').length - 10} more lines</div>
            )}
            {streaming && (
              <span style={{ display: 'inline-block', width: 7, height: 13, background: '#7c3aed', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
            )}
          </div>
        </div>
      )
    }

    if (msg.type === 'build_step') return (
      <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 12, padding: '2px 0' }}>
        <Loader2 size={11} style={{ color: '#6366f1', flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
        {msg.content}
      </div>
    )

    if (msg.type === 'error') return (
      <div key={msg.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
        <div style={{ display: 'flex', gap: 8, color: '#f87171', marginBottom: 8 }}>
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          {msg.content}
        </div>
        <button onClick={handleRetry}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
          <RefreshCcw size={11} /> Try again
        </button>
      </div>
    )

    if (msg.type === 'plan') {
      const p = msg.content
      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${d ? '#2a1f5e' : '#ede9fe'}`, borderRadius: 14, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 600 }}>
              <Sparkles size={13} />
              {p.total_phases > 1 && p.current_phase > 1 ? `Phase ${p.current_phase} Plan` : 'Plan Ready'}
            </div>
            {p.is_complex && (
              <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 100 }}>
                Phase {p.current_phase}/{p.total_phases}
              </span>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Understanding</p>
            <p style={{ color: text, lineHeight: 1.5 }}>{p.understanding}</p>
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {p.is_complex ? `Phase ${p.current_phase} Steps` : 'Steps'}
            </p>
            {(p.is_complex ? p.phases?.[p.current_phase - 1]?.steps : p.steps)?.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, color: text, alignItems: 'flex-start' }}>
                <ChevronRight size={11} style={{ color: '#7c3aed', marginTop: 3, flexShrink: 0 }} />
                <span style={{ lineHeight: 1.4 }}>{step}</span>
              </div>
            ))}
            {p.is_complex && p.phases?.slice(p.current_phase).map((ph, i) => (
              <div key={i} style={{ marginTop: 6, color: muted, fontSize: 12 }}>
                Phase {p.current_phase + i + 1}: {ph.description}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Files</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {p.files?.map((f, i) => (
                <span key={i} style={{ fontSize: 10, background: d ? '#222' : '#f0f0f0', color: muted, padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>{f}</span>
              ))}
            </div>
          </div>

          {p.questions?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Questions</p>
              {p.questions.map((q, i) => <div key={i} style={{ color: '#f59e0b', fontSize: 12, marginBottom: 2 }}>• {q}</div>)}
            </div>
          )}

          {p.out_of_scope?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Out of Scope</p>
              {p.out_of_scope.map((item, i) => <div key={i} style={{ color: muted, fontSize: 12, marginBottom: 2 }}>• {item}</div>)}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted }}>
              <Zap size={11} style={{ color: '#7c3aed' }} /> Est. {p.estimated_credits} credits
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleRejectPlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, background: 'none', border: `1px solid ${border}`, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                <X size={11} /> Cancel
              </button>
              <button onClick={handleApprovePlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: '#7c3aed', border: 'none', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
                <Check size={11} /> Approve & Build
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
          <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> {s?.title || `Phase ${c.phase} Complete!`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setActiveTab('details')}
                style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                View details
              </button>
              <button onClick={() => { setActiveTab('preview'); setPreviewKey(k => k + 1) }}
                style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Preview →
              </button>
            </div>
          </div>

          {s && (
            <div style={{ color: text, lineHeight: 1.7 }}>
              <p style={{ marginBottom: 10, color: d ? '#ccc' : '#555', fontSize: 13 }}>{s.description}</p>

              {s.features?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>What was built:</p>
                  {s.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, color: d ? '#ccc' : '#444', fontSize: 13 }}>
                      <span style={{ color: '#10b981' }}>•</span> {f}
                    </div>
                  ))}
                </div>
              )}

              {s.files_written?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Files written:</p>
                  {s.files_written.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <FileCode size={11} style={{ color: '#3b82f6' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {s.tech?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {s.tech.map((t, i) => (
                    <span key={i} style={{ fontSize: 11, background: d ? '#222' : '#f0f0f0', color: muted, padding: '2px 8px', borderRadius: 5 }}>{t}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: muted, fontSize: 12, paddingTop: 8, borderTop: `1px solid ${border}` }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} style={{ color: '#7c3aed' }} /> {c.credits_used} credits
                </span>
                <a href={'https://' + c.subdomain + '.44gen.com'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7c3aed', textDecoration: 'none', fontSize: 12 }}>
                  <Globe size={11} /> {c.subdomain}.44gen.com <ExternalLink size={10} />
                </a>
              </div>

              {c.plan && c.total_phases > 1 && c.phase < c.total_phases && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
                  <p style={{ color: muted, fontSize: 12, marginBottom: 6 }}>
                    Ready for Phase {c.phase + 1}? {c.next_phase_description}
                  </p>
                  <button onClick={() => handleContinuePhase(c.phase + 1, c.plan)}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    Continue Phase {c.phase + 1} →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // Regular user/assistant message
    return (
      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
        <div style={{
          maxWidth: '85%', borderRadius: 14, padding: '9px 13px', fontSize: 13, lineHeight: 1.5,
          background: msg.role === 'user' ? '#7c3aed' : (d ? '#1a1a1a' : '#f0f0f0'),
          color: msg.role === 'user' ? '#fff' : text,
          border: msg.role === 'user' ? 'none' : `1px solid ${border}`
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', background: bg, color: text, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans','Inter',sans-serif", overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button onClick={() => navigate('/dashboard')} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ width: 1, height: 14, background: border, flexShrink: 0 }} />
          {/* Chat toggle — always visible, highlights when chat is hidden */}
          <button onClick={() => setShowChat(v => !v)}
            title={showChat ? 'Hide chat' : 'Show chat'}
            style={{ color: showChat ? '#7c3aed' : muted, background: showChat ? 'rgba(124,58,237,0.08)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}>
            <MessageSquare size={14} />
          </button>
          <div style={{ minWidth: 0 }}>
            {renaming ? (
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onBlur={handleRename} onKeyDown={e => e.key === 'Enter' && handleRename()}
                style={{ background: subtle, border: `1px solid #7c3aed`, borderRadius: 5, padding: '2px 7px', color: text, fontSize: 13, fontWeight: 500, outline: 'none', width: 140 }} />
            ) : (
              <button onClick={() => setRenaming(true)} style={{ background: 'none', border: 'none', color: text, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                {project?.name || 'Untitled App'}
              </button>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 100, flexShrink: 0,
            background: project?.status === 'deployed' ? 'rgba(16,185,129,0.1)' : (d ? '#222' : '#eee'),
            color: project?.status === 'deployed' ? '#10b981' : muted
          }}>
            {project?.status || 'draft'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isBuilding && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}` }}>
              <Loader2 size={10} style={{ color: '#7c3aed', animation: 'spin 0.8s linear infinite' }} /> Building...
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}` }}>
            <Zap size={11} style={{ color: '#7c3aed' }} /> {profile?.credits ?? 0}
          </div>
          {previewUrl && (
            <button onClick={() => navigator.clipboard.writeText(previewUrl)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}`, cursor: 'pointer' }}>
              <Share size={11} /> Share
            </button>
          )}
          <button onClick={toggleDarkMode}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {previewUrl && (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#fff', background: '#7c3aed', padding: '4px 12px', borderRadius: 7, textDecoration: 'none' }}>
              <Globe size={11} /> <span className="hide-xs">Publish</span>
            </a>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </button>
            {showUserMenu && <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />}
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 34, width: 210, background: surface, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '10px 13px', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: text, margin: 0 }}>{profile?.full_name || user?.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} style={{ color: '#7c3aed' }} /> {profile?.credits ?? 0} credits
                    </span>
                    <span style={{ fontSize: 10, background: '#7c3aed20', color: '#7c3aed', padding: '1px 7px', borderRadius: 100, fontWeight: 600 }}>
                      {(profile?.plan || 'FREE').toUpperCase()}
                    </span>
                  </div>
                </div>
                {[
                  { icon: <ArrowLeft size={12} />, label: 'Dashboard', action: () => navigate('/dashboard') },
                  { icon: <Edit size={12} />, label: 'Rename project', action: () => { setRenaming(true); setShowUserMenu(false) } },
                  { icon: darkMode ? <Sun size={12} /> : <Moon size={12} />, label: darkMode ? 'Light mode' : 'Dark mode', action: () => { toggleDarkMode(); setShowUserMenu(false) } },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 13px', background: 'none', border: 'none', color: text, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = subtle}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <span style={{ color: muted }}>{item.icon}</span>{item.label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${border}` }}>
                  <button onClick={() => { signOut(); navigate('/') }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 13px', background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Chat (collapsible) */}
        {showChat && (
          <div className="chat-panel" style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}` }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Sparkles size={18} style={{ color: '#7c3aed' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, color: text }}>What would you like to build?</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 16 }}>
                    Describe your app and I'll create a detailed plan for your approval before writing any code.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                    {['A todo app with categories', 'A landing page for my SaaS', 'A dashboard with charts'].map((s, i) => (
                      <button key={i} onClick={() => setPrompt(s)}
                        style={{ textAlign: 'left', fontSize: 12, background: subtle, border: `1px solid ${border}`, borderRadius: 8, padding: '7px 10px', color: muted, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed44'; e.currentTarget.style.color = text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}>
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
            <div style={{ padding: 10, borderTop: `1px solid ${border}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: d ? '#111' : '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: '7px 9px' }}>
                <textarea ref={textareaRef} value={prompt}
                  onChange={handlePromptChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    stage === 'awaiting_approval' ? 'Approve or cancel the plan first...' :
                    stage === 'building' ? 'Building your app...' :
                    'Describe your app or request changes...'
                  }
                  disabled={loading || stage === 'awaiting_approval' || stage === 'building'}
                  rows={1}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: text, lineHeight: 1.5, fontFamily: 'inherit', overflow: 'hidden' }}
                />
                <button onClick={handleSubmit}
                  disabled={loading || !prompt.trim() || stage === 'awaiting_approval' || stage === 'building'}
                  style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 7, background: prompt.trim() && stage === 'idle' ? '#7c3aed' : (d ? '#222' : '#e5e5e5'), border: 'none', cursor: prompt.trim() && stage === 'idle' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loading && stage === 'planning'
                    ? <Loader2 size={12} style={{ color: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    : <Send size={12} style={{ color: prompt.trim() && stage === 'idle' ? '#fff' : muted }} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: d ? '#444' : '#bbb', textAlign: 'center', marginTop: 5 }}>
                Plan ~0.5 credits · Build cost shown in plan
              </p>
            </div>
          </div>
        )}

        {/* RIGHT — Preview / Code / Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ height: 38, display: 'flex', alignItems: 'center', gap: 2, padding: '0 10px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0 }}>
            {[
              { id: 'preview', icon: <Eye size={12} />, label: 'Preview' },
              { id: 'code', icon: <Code size={12} />, label: 'Code' },
              { id: 'details', icon: <Activity size={12} />, label: 'Details', badge: detailsLog.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                  background: activeTab === tab.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  color: activeTab === tab.id ? '#7c3aed' : muted
                }}>
                {tab.icon} {tab.label}
                {tab.badge > 0 && (
                  <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', borderRadius: 100, padding: '0 4px', minWidth: 14, textAlign: 'center' }}>{tab.badge}</span>
                )}
              </button>
            ))}
            {previewUrl && activeTab === 'preview' && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="hide-xs" style={{ fontSize: 10, color: muted, fontFamily: 'monospace' }}>{previewUrl.replace('https://', '')}</span>
                <button onClick={() => setPreviewDevice(prev => prev === 'desktop' ? 'mobile' : 'desktop')}
                  style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {previewDevice === 'desktop' ? <Smartphone size={12} /> : <Monitor size={12} />}
                </button>
                <button onClick={() => setPreviewKey(k => k + 1)}
                  style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <RefreshCw size={12} />
                </button>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: muted, display: 'flex' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {activeTab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d ? '#080808' : '#e0e0e0', overflow: 'hidden', position: 'relative' }}>
              {previewUrl ? (
                <div style={{
                  width: previewDevice === 'mobile' ? 390 : '100%',
                  height: previewDevice === 'mobile' ? 844 : '100%',
                  maxHeight: '100%',
                  borderRadius: previewDevice === 'mobile' ? 14 : 0,
                  overflow: 'hidden',
                  boxShadow: previewDevice === 'mobile' ? '0 20px 60px rgba(0,0,0,0.5)' : 'none',
                  position: 'relative'
                }}>
                  {iframeStatus === 'loading' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d ? '#0d0d0d' : '#f0f0f0', zIndex: 1 }}>
                      <Loader2 size={22} style={{ color: '#7c3aed', animation: 'spin 0.8s linear infinite', marginBottom: 8 }} />
                      <p style={{ fontSize: 12, color: muted }}>Loading preview...</p>
                    </div>
                  )}
                  {iframeStatus === 'error' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d ? '#0d0d0d' : '#f0f0f0', zIndex: 1, gap: 8 }}>
                      <AlertCircle size={22} style={{ color: '#ef4444' }} />
                      <p style={{ fontSize: 13, color: muted }}>Preview failed to load</p>
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Open directly <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  <iframe
                    key={previewKey}
                    src={previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none', opacity: iframeStatus === 'loaded' ? 1 : 0 }}
                    title="Preview"
                    onLoad={() => setIframeStatus('loaded')}
                    onError={() => setIframeStatus('error')}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: muted }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: surface, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Eye size={20} style={{ opacity: 0.3 }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>No preview yet</p>
                  <p style={{ fontSize: 12, opacity: 0.5 }}>Build your app to see it here</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div style={{ flex: 1, overflow: 'auto', background: d ? '#0d1117' : '#f6f8fa' }}>
              {fullCode ? (
                <pre style={{ margin: 0, padding: 16, fontSize: 11, fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {fullCode}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted }}>
                  <Code size={22} style={{ opacity: 0.3, marginBottom: 6 }} />
                  <p style={{ fontSize: 12 }}>Code appears here after building</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {detailsLog.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: muted }}>
                  <Activity size={22} style={{ opacity: 0.3, marginBottom: 6 }} />
                  <p style={{ fontSize: 12 }}>Activity log appears here during build</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailsLog.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                      <span style={{ flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ color: item.color || text, flex: 1, lineHeight: 1.4 }}>{item.msg}</span>
                      <span style={{ color: muted, fontSize: 10, flexShrink: 0 }}>{new Date(item.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {isBuilding && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: muted, fontSize: 11 }}>
                      <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite', color: '#7c3aed' }} /> Working...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${d ? '#333' : '#ddd'}; border-radius: 2px }
        @media (max-width: 640px) {
          .chat-panel { width: 100% !important; position: absolute; inset: 46px 0 0 0; z-index: 40; }
          .hide-xs { display: none !important; }
        }
      `}</style>
    </div>
  )
}
