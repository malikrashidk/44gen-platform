import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe,
  Code, Eye, Sun, Moon, Loader2, ExternalLink, Sparkles,
  AlertCircle, CheckCircle2, RefreshCw, Monitor, Smartphone,
  Share, LogOut, Activity, FileCode, Edit, MessageSquare, RefreshCcw,
  Download, FolderOpen, Plus, Copy, Shield
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
    return saved !== null ? saved === 'true' : false
  })
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPublishPanel, setShowPublishPanel] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [detailsLog, setDetailsLog] = useState([])
  const [fullCode, setFullCode] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeFilesLoading, setCodeFilesLoading] = useState(false)
  const [downloadingProject, setDownloadingProject] = useState(false)
  const [promptMode, setPromptMode] = useState('plan')
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(localStorage.getItem('44gen-chat-width'))
    return Number.isFinite(saved) && saved >= 300 && saved <= 520 ? saved : 380
  })
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedFile, setCopiedFile] = useState(false)
  const [, setPendingClarification] = useState(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const esRef = useRef(null)
  const resizingChatRef = useRef(false)

  const codeChunksRef = useRef('')
  const codeMessageIdRef = useRef(null)
  const buildStreamMessageIdRef = useRef(null)
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
  const pollIntervalRef = useRef(null)
  const processedEventCountRef = useRef(0)

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#fbfaf8'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#2a2a2a' : '#ece9e3'
  const text = d ? '#f0f0f0' : '#1f1f23'
  const muted = d ? '#777' : '#7b7670'
  const subtle = d ? '#1a1a1a' : '#f5f2ed'
  const userBubble = d ? '#262321' : '#f1eee9'

  useEffect(() => { fetchProject() }, [projectId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (projectId) { loadConversations(); loadBuildProgress(); checkActiveBuildJob() } }, [projectId])
  useEffect(() => { if (projectId && activeTab === 'code') loadProjectFiles() }, [projectId, activeTab])
  useEffect(() => {
    if (project?.status === 'deployed') setPromptMode('build')
  }, [project?.status])

  // Reset iframe status when preview changes
  useEffect(() => {
    if (previewUrl) setIframeStatus('loading')
  }, [previewKey, previewUrl])

  useEffect(() => {
    const stopResize = () => {
      resizingChatRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    const resizeChat = (event) => {
      if (!resizingChatRef.current) return
      const next = Math.min(520, Math.max(300, event.clientX))
      setChatWidth(next)
      localStorage.setItem('44gen-chat-width', String(next))
    }
    window.addEventListener('mousemove', resizeChat)
    window.addEventListener('mouseup', stopResize)
    return () => {
      window.removeEventListener('mousemove', resizeChat)
      window.removeEventListener('mouseup', stopResize)
      stopResize()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    stopCodeFlush()
    stopPolling()
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
      if (buildStreamMessageIdRef.current) {
        const snapshot = codeChunksRef.current
        const lineCount = snapshot ? snapshot.split('\n').length : 0
        setMessages(prev => prev.map(m =>
          m.id === buildStreamMessageIdRef.current
            ? {
                ...m,
                content: {
                  ...m.content,
                  code: snapshot,
                  codeLines: lineCount,
                  heading: `${m.content.actionVerb || 'Editing'} ${m.content.file || 'src/App.jsx'} · ${lineCount} lines`
                }
              }
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
    if (latestCode && codeFiles.length === 0) {
      setCodeFiles([{ path: 'src/App.jsx', content: latestCode }])
      setSelectedCodeFile('src/App.jsx')
    }
    setMessages(loaded)
  }

  const loadProjectFiles = async () => {
    if (!sessionRef.current?.access_token) return
    setCodeFilesLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/files`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load files')
      const files = data.files || []
      setCodeFiles(files)
      const preferred = files.find(f => f.path === selectedCodeFile)?.path ||
        files.find(f => f.path === 'src/App.jsx')?.path ||
        files[0]?.path ||
        ''
      setSelectedCodeFile(preferred)
      const appFile = files.find(f => f.path === 'src/App.jsx')
      if (appFile?.content) setFullCode(appFile.content)
    } catch {
      if (fullCode && codeFiles.length === 0) {
        setCodeFiles([{ path: 'src/App.jsx', content: fullCode }])
        setSelectedCodeFile('src/App.jsx')
      }
    } finally {
      setCodeFilesLoading(false)
    }
  }

  const downloadProjectZip = async () => {
    if (!sessionRef.current?.access_token || downloadingProject) return
    setDownloadingProject(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/download`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to download project')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const name = (project?.name || '44gen-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '44gen-project'
      link.href = url
      link.download = `${name}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      addMessage('assistant', err.message || 'Failed to download project.', 'error')
    } finally {
      setDownloadingProject(false)
    }
  }

  const detailFromEvent = (event) => {
    const ts = event.ts || Date.now()
    switch (event.type) {
      case 'queued': return { icon: '⏳', msg: event.message, color: '#f59e0b', ts }
      case 'start': return { icon: '🚀', msg: event.message, color: '#BC6045', ts }
      case 'thought': return { icon: '💡', msg: 'AI thinking...', color: '#f59e0b', ts }
      case 'code_start': return { icon: '✏️', msg: 'Writing src/App.jsx', color: '#3b82f6', ts }
      case 'code_end': return { icon: '✅', msg: 'Code generation complete', color: '#10b981', ts }
      case 'installing': return { icon: '📦', msg: event.message, color: '#6366f1', ts }
      case 'building': return { icon: '🔨', msg: event.message, color: '#8b5cf6', ts }
      case 'repair_start': return { icon: '🛠️', msg: event.message, color: '#BC6045', ts }
      case 'repair_done': return { icon: '✅', msg: event.message, color: '#10b981', ts }
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
      .from('build_jobs').select('progress, status, subdomain, credits_used')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }).limit(1)

    const job = jobs?.[0]
    const events = job?.progress || []

    // Always update details log
    const details = events.map(detailFromEvent).filter(Boolean)
    if (details.length) setDetailsLog(details)

    // Feed any new events into handleStreamEvent so chat updates live
    const newEvents = events.slice(processedEventCountRef.current)
    if (newEvents.length > 0) {
      processedEventCountRef.current = events.length
      newEvents.forEach(event => {
        try { handleStreamEventRef.current?.(event) } catch {}
      })
    }
  }

  const startPolling = () => {
    if (pollIntervalRef.current) return
    processedEventCountRef.current = 0
    pollIntervalRef.current = setInterval(() => {
      if (streamFinishedRef.current) {
        stopPolling()
        return
      }
      loadBuildProgress()
    }, 2000)
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
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
      upsertBuildStream({
        heading: 'Reconnecting to build...',
        subtext: '',
        phase: 'connecting',
        step: { label: 'Reconnecting to build', tone: 'active' }
      })
      connectToStream(jobs[0].id)
    }
  }

  const addMessage = (role, content, type = 'message') => {
    const id = Date.now() + Math.random()
    setMessages(prev => [...prev, { role, content, type, id }])
    return id
  }

  const upsertBuildStream = useCallback((patch = {}) => {
    const defaults = {
      heading: 'Starting build',
      subtext: 'Preparing your app...',
      phase: 'starting',
      code: '',
      codeLines: 0,
      steps: []
    }

    setMessages(prev => {
      let id = buildStreamMessageIdRef.current
      if (!id || !prev.some(m => m.id === id)) {
        id = [...prev].reverse().find(m => m.type === 'build_stream')?.id
        if (id) buildStreamMessageIdRef.current = id
      }
      const nextPatch = { ...patch }
      if (nextPatch.step) delete nextPatch.step

      if (!id || !prev.some(m => m.id === id)) {
        const newId = Date.now() + Math.random()
        buildStreamMessageIdRef.current = newId
        return [...prev, {
          id: newId,
          role: 'assistant',
          type: 'build_stream',
          content: {
            ...defaults,
            ...nextPatch,
            steps: patch.step ? [patch.step] : []
          }
        }]
      }

      return prev.map(m => {
        if (m.type === 'build_stream' && m.id !== id) return null
        if (m.id !== id) return m
        const steps = patch.step
          ? [...(m.content.steps || []).filter(s => s.label !== patch.step.label), patch.step].slice(-5)
          : (m.content.steps || [])
        return { ...m, content: { ...m.content, ...nextPatch, steps } }
      }).filter(Boolean)
    })
  }, [])

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
      setDetailsLog(prev => [...prev, { icon: '🔌', msg: 'Live stream connected', color: '#BC6045', ts: Date.now() }])
    }

    es.onmessage = (e) => {
      streamEventSeenRef.current = true
      try { handleStreamEventRef.current?.(JSON.parse(e.data)) } catch {}
    }

    streamWatchdogRef.current = setTimeout(() => {
      if (!streamFinishedRef.current && stageRef.current === 'building' && !streamEventSeenRef.current) {
        // SSE blocked by proxy/CDN — fall back to polling DB every 2s
        startPolling()
      }
    }, 3000)

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
  }, [stopCodeFlush, upsertBuildStream])

  // handleStreamEvent as a plain function updated into ref each render
  const handleStreamEvent = (event) => {
    const addDetail = (icon, msg, color) =>
      setDetailsLog(prev => [...prev, { icon, msg, color, ts: Date.now() }])

    switch (event.type) {
      case 'queued':
        upsertBuildStream({
          heading: event.message,
          subtext: '',
          phase: 'queued',
          step: { label: event.message, tone: 'active' }
        })
        addDetail('⏳', event.message, '#f59e0b')
        break

      case 'start':
        reconnectAttemptsRef.current = 0
        upsertBuildStream({
          heading: event.message || 'Starting code generation...',
          subtext: '',
          phase: 'thinking',
          step: { label: event.message || 'Build started', tone: 'active' }
        })
        addDetail('🚀', event.message, '#BC6045')
        break

      case 'thought':
        upsertBuildStream({
          heading: event.text?.slice(0, 180) || 'Planning the implementation...',
          subtext: '',
          phase: 'thinking'
        })
        addDetail('💡', 'AI thinking...', '#f59e0b')
        break

      case 'code_start': {
        addDetail('✏️', 'Writing src/App.jsx', '#3b82f6')
        codeMessageIdRef.current = null
        codeChunksRef.current = ''
        upsertBuildStream({
          heading: event.message || `Writing ${event.file || 'src/App.jsx'}...`,
          subtext: '',
          phase: 'code',
          file: event.file || 'src/App.jsx',
          actionVerb: 'Editing',
          code: '',
          codeLines: 0,
          step: { label: event.message || `Writing ${event.file || 'src/App.jsx'}`, tone: 'active' }
        })
        startCodeFlush()
        break
      }

      case 'code_chunk':
        codeChunksRef.current += event.text
        setFullCode(codeChunksRef.current)
        break

      case 'code_end':
        stopCodeFlush()
        setFullCode(codeChunksRef.current)
        upsertBuildStream({
          heading: event.message || 'Code generation complete',
          subtext: '',
          phase: 'installing',
          code: codeChunksRef.current,
          codeLines: codeChunksRef.current.split('\n').length,
          step: { label: event.message || 'Code generation complete', tone: 'done' }
        })
        codeMessageIdRef.current = null
        addDetail('✅', 'Code generation complete', '#10b981')
        break

      case 'installing':
        upsertBuildStream({
          heading: event.message,
          subtext: '',
          phase: 'installing',
          step: { label: event.message, tone: 'active' }
        })
        addDetail('📦', event.message, '#6366f1')
        break

      case 'building':
        upsertBuildStream({
          heading: event.message,
          subtext: '',
          phase: 'building',
          step: { label: event.message, tone: event.message?.includes('complete') ? 'done' : 'active' }
        })
        addDetail('🔨', event.message, '#8b5cf6')
        break

      case 'repair_start':
        upsertBuildStream({
          heading: event.message || 'Fixing src/App.jsx after build error...',
          subtext: '',
          phase: 'code',
          file: 'src/App.jsx',
          actionVerb: 'Fixing',
          step: { label: event.message || 'Repairing generated code', tone: 'active' }
        })
        addDetail('🛠️', event.message || 'Repairing generated code', '#BC6045')
        break

      case 'repair_done':
        upsertBuildStream({
          heading: event.message || 'Updated src/App.jsx. Rebuilding...',
          subtext: '',
          phase: 'building',
          step: { label: event.message || 'Repair complete', tone: 'done' }
        })
        loadProjectFiles()
        addDetail('✅', event.message || 'Repair complete', '#10b981')
        break

      case 'deploying':
        upsertBuildStream({
          heading: event.message || 'Publishing your app...',
          subtext: '',
          phase: 'deploying',
          step: { label: 'Deploying preview', tone: 'active' }
        })
        addDetail('🚀', 'Deploying...', '#06b6d4')
        break

      case 'summarizing':
        upsertBuildStream({
          heading: event.message || 'Generating summary...',
          subtext: '',
          phase: 'summarizing',
          step: { label: 'Generating summary', tone: 'active' }
        })
        addDetail('📝', 'Generating summary...', '#84cc16')
        break

      case 'done':
      case 'complete':
        stopCodeFlush()
        stopPolling()
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
        loadProjectFiles()
        addDetail('✅', `Live → ${event.subdomain}.44gen.com`, '#10b981')
        setMessages(prev => [
          ...prev
            .filter(m => !['build_stream', 'build_step', 'status', 'thought', 'code_stream', 'code_done'].includes(m.type)),
          {
            id: Date.now() + Math.random(),
            role: 'assistant',
            type: 'build_stream',
            content: {
              heading: `Done · ${event.subdomain}.44gen.com`,
              subtext: '',
              phase: 'done'
            }
          },
          { id: Date.now(), role: 'assistant', content: event, type: 'complete' }
        ])
        buildStreamMessageIdRef.current = null
        if (esRef.current) esRef.current.close()
        break

      case 'error':
        stopCodeFlush()
        stopPolling()
        buildStartedRef.current = false
        buildStreamMessageIdRef.current = null
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

  const submitPromptText = async (userPrompt) => {
    if (!userPrompt?.trim() || loading) return
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    addMessage('user', userPrompt)
    await saveConversation('user', userPrompt)

    try {
      setStage('clarifying')
      addMessage('assistant', 'Analyzing your request...', 'status')

      const clarifyRes = await fetch(`${API}/api/clarify`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: userPrompt, projectId, mode: promptMode })
      })
      const clarifyData = await clarifyRes.json()

      if (clarifyData.error) {
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', {
          message: clarifyData.error,
          retryPrompt: userPrompt,
          retryable: clarifyData.retryable !== false
        }, 'error')
        setStage('idle')
        setLoading(false)
        return
      }

      if (clarifyData.action === 'answer') {
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'status'),
          { id: Date.now(), role: 'assistant', content: clarifyData.answer || 'I can help with that.', type: 'message' }
        ])
        await saveConversation('assistant', clarifyData.answer || 'I can help with that.')
        setStage('idle')
        setLoading(false)
        return
      }

      if (clarifyData.action === 'questions' && clarifyData.questions?.length) {
        const questionCard = {
          mode: promptMode,
          originalPrompt: userPrompt,
          refinedPrompt: clarifyData.refined_prompt || userPrompt,
          questions: clarifyData.questions,
          answers: {}
        }
        setPendingClarification(questionCard)
        setMessages(prev => [
          ...prev.filter(m => m.type !== 'status'),
          { id: Date.now(), role: 'assistant', content: questionCard, type: 'clarify' }
        ])
        setStage('awaiting_clarification')
        setLoading(false)
        return
      }

      const refinedPrompt = clarifyData.refined_prompt || userPrompt
      if (promptMode === 'build') {
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        await startDirectBuild(refinedPrompt)
        return
      }

      setStage('planning')
      const res = await fetch(`${API}/api/plan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: refinedPrompt, projectId })
      })
      const planData = await res.json()

      if (planData.error) {
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', {
          message: planData.error,
          retryPrompt: userPrompt,
          retryable: planData.retryable !== false
        }, 'error')
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
      addMessage('assistant', {
        message: 'Something went wrong. Try again.',
        retryPrompt: userPrompt,
        retryable: true
      }, 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!prompt.trim() || loading) return
    await submitPromptText(prompt.trim())
  }

  const promptWithAnswers = (clarification) => {
    const answerText = clarification.questions.map(q => {
      const value = clarification.answers?.[q.id]
      const rendered = Array.isArray(value) ? value.join(', ') : value
      return rendered ? `${q.question}: ${rendered}` : null
    }).filter(Boolean).join('\n')

    return `${clarification.refinedPrompt || clarification.originalPrompt}

Clarifying answers:
${answerText}`
  }

  const updateClarificationAnswer = (messageId, question, value) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const current = m.content.answers?.[question.id]
      let nextValue = value
      if (question.type === 'multi') {
        const list = Array.isArray(current) ? current : []
        nextValue = list.includes(value) ? list.filter(item => item !== value) : [...list, value]
      }
      const nextContent = {
        ...m.content,
        answers: { ...m.content.answers, [question.id]: nextValue }
      }
      setPendingClarification(nextContent)
      return { ...m, content: nextContent }
    }))
  }

  const continueClarification = async (messageId, clarification) => {
    const missing = clarification.questions.some(q => q.required && !clarification.answers?.[q.id]?.length)
    if (missing || loading) return
    const finalPrompt = promptWithAnswers(clarification)
    setMessages(prev => prev.filter(m => m.id !== messageId))
    setPendingClarification(null)
    setLoading(true)

    if (clarification.mode === 'build') {
      await startDirectBuild(finalPrompt)
      return
    }

    try {
      setStage('planning')
      addMessage('assistant', 'Creating plan...', 'status')
      const res = await fetch(`${API}/api/plan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: finalPrompt, projectId })
      })
      const planData = await res.json()
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      if (planData.error) {
        addMessage('assistant', { message: planData.error, retryPrompt: finalPrompt, retryable: planData.retryable !== false }, 'error')
        setStage('idle')
      } else {
        buildStartedRef.current = false
        setPlan(planData)
        setStage('awaiting_approval')
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: planData, type: 'plan' }])
      }
    } catch {
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      addMessage('assistant', { message: 'Something went wrong. Try again.', retryPrompt: finalPrompt, retryable: true }, 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const startDirectBuild = async (buildPrompt) => {
    if (buildStartedRef.current) return
    buildStartedRef.current = true
    setLoading(true)
    setStage('building')
    setDetailsLog([])
    setFullCode('')
    codeChunksRef.current = ''
    buildStreamMessageIdRef.current = null
    processedEventCountRef.current = 0
    stopPolling()
    upsertBuildStream({ heading: 'Creating build job...', subtext: '', phase: 'starting' })

    try {
      const res = await fetch(`${API}/api/build/direct`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: buildPrompt, projectId })
      })
      const { job_id, error } = await res.json()
      if (error) {
        addMessage('assistant', error, 'error')
        buildStartedRef.current = false
        setStage('idle')
        setLoading(false)
        return
      }
      upsertBuildStream({ heading: 'Build job created. Opening live stream...', subtext: '', phase: 'connecting' })
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      connectToStream(job_id)
    } catch {
      addMessage('assistant', 'Failed to start build.', 'error')
      buildStartedRef.current = false
      setStage('idle')
      setLoading(false)
    }
  }

  const startBuild = async (buildPlan) => {
    if (buildStartedRef.current) return
    buildStartedRef.current = true
    setLoading(true)
    setStage('building')
    setDetailsLog([])
    setFullCode('')
    codeChunksRef.current = ''
    buildStreamMessageIdRef.current = null
    upsertBuildStream({
      heading: 'Creating build job...',
      subtext: '',
      phase: 'starting',
      step: { label: 'Creating build job', tone: 'active' }
    })
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

      upsertBuildStream({
        heading: 'Build job created. Opening live stream...',
        subtext: '',
        phase: 'connecting',
        step: { label: 'Live stream connecting', tone: 'active' }
      })
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
    setMessages(prev => prev.map(m =>
      m.type === 'plan'
        ? { ...m, content: { ...m.content, approved: true, collapsed: true } }
        : m
    ))
    setPromptMode('build')
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

  const copyPreviewUrl = () => {
    if (!previewUrl) return
    navigator.clipboard.writeText(previewUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1400)
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
  const visibleCodeFiles = codeFiles.length
    ? codeFiles
    : (fullCode ? [{ path: 'src/App.jsx', content: fullCode }] : [])
  const selectedFile = visibleCodeFiles.find(file => file.path === selectedCodeFile) || visibleCodeFiles[0]
  const copySelectedFile = () => {
    if (!selectedFile?.content) return
    navigator.clipboard.writeText(selectedFile.content)
    setCopiedFile(true)
    setTimeout(() => setCopiedFile(false), 1400)
  }

  // ── Message renderers ──────────────────────────────────
  const renderMessage = (msg) => {
    if (msg.type === 'build_stream') {
      const c = msg.content || {}
      const iconColor = c.phase === 'done' ? '#10b981' : c.phase === 'code' ? '#3b82f6' : '#9ca3af'
      const Icon = c.phase === 'code' ? Edit : c.phase === 'done' ? CheckCircle2 : Sparkles

      return (
        <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 9, color: muted, fontSize: 14, padding: '4px 2px', minWidth: 0 }}>
          <Icon size={15} style={{ color: iconColor, flexShrink: 0 }} />
          <span className={c.phase === 'done' ? '' : 'streaming-heading'} style={{
            minWidth: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            color: c.phase === 'done' ? '#10b981' : undefined
          }}>
            {c.heading || 'Working...'}
          </span>
          {c.phase !== 'done' && (
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: '#9f4d38', background: 'rgba(188,96,69,0.1)', border: '1px solid rgba(188,96,69,0.16)', borderRadius: 999, padding: '1px 6px' }}>
              {promptMode}
            </span>
          )}
        </div>
      )
    }

    if (msg.type === 'status') return (
      <div key={msg.id} style={{ color: muted, fontSize: 13, padding: '2px 0' }}>
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
              ? <Loader2 size={10} style={{ color: '#BC6045', marginLeft: 'auto', animation: 'spin 0.8s linear infinite' }} />
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
              <span style={{ display: 'inline-block', width: 7, height: 13, background: '#BC6045', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.8s step-end infinite' }} />
            )}
          </div>
        </div>
      )
    }

    if (msg.type === 'build_step') return (
      <div key={msg.id} style={{ color: muted, fontSize: 12, padding: '2px 0' }}>
        {msg.content}
      </div>
    )

    if (msg.type === 'error') return (
      (() => {
        const error = typeof msg.content === 'string' ? { message: msg.content, retryable: true } : msg.content
        return (
          <div key={msg.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, color: '#f87171', marginBottom: 8 }}>
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              {error.message}
            </div>
            {error.retryable && (
              <button onClick={() => error.retryPrompt ? submitPromptText(error.retryPrompt) : handleRetry()}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '4px 10px', borderRadius: 6, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                <RefreshCcw size={11} /> Try again
              </button>
            )}
          </div>
        )
      })()
    )

    if (msg.type === 'clarify') {
      const c = msg.content
      const missing = c.questions.some(q => q.required && !c.answers?.[q.id]?.length)
      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${d ? '#2a1f5e' : '#ede9fe'}`, borderRadius: 14, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#BC6045', fontWeight: 700, marginBottom: 10 }}>
            <Sparkles size={14} />
            Need a bit more detail
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.questions.map(q => (
              <div key={q.id}>
                <p style={{ color: text, fontWeight: 600, marginBottom: 7, lineHeight: 1.4 }}>{q.question}</p>
                {(q.type === 'single' || q.type === 'multi') && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {q.options?.map(option => {
                      const current = c.answers?.[q.id]
                      const active = q.type === 'multi'
                        ? Array.isArray(current) && current.includes(option)
                        : current === option
                      return (
                        <button key={option} onClick={() => updateClarificationAnswer(msg.id, q, option)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: `1px solid ${active ? '#BC6045' : border}`,
                            background: active ? 'rgba(188,96,69,0.12)' : subtle,
                            color: active ? '#BC6045' : text,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: active ? 600 : 500
                          }}>
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}
                {q.type === 'text' && (
                  <input value={c.answers?.[q.id] || ''}
                    onChange={e => updateClarificationAnswer(msg.id, q, e.target.value)}
                    placeholder="Type your answer..."
                    style={{ width: '100%', background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '9px 10px', fontSize: 13, outline: 'none' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${border}` }}>
            <button onClick={() => { setMessages(prev => prev.filter(m => m.id !== msg.id)); setPendingClarification(null); setStage('idle') }}
              style={{ fontSize: 12, color: muted, background: 'none', border: `1px solid ${border}`, padding: '6px 11px', borderRadius: 8, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => continueClarification(msg.id, c)}
              disabled={missing || loading}
              style={{ fontSize: 12, color: '#fff', background: missing || loading ? '#BC604566' : '#BC6045', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: missing || loading ? 'default' : 'pointer', fontWeight: 700 }}>
              Continue
            </button>
          </div>
        </div>
      )
    }

    if (msg.type === 'plan') {
      const p = msg.content
      if (p.collapsed) {
        return (
          <button key={msg.id} onClick={() => setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, content: { ...m.content, collapsed: false } } : m
          ))}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              width: '100%',
              background: d ? 'rgba(16,185,129,0.07)' : 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.18)',
              borderRadius: 12,
              padding: '9px 11px',
              cursor: 'pointer',
              color: text,
              textAlign: 'left'
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Plan approved
              </span>
            </span>
            <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>View plan</span>
          </button>
        )
      }

      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${d ? '#2a1f5e' : '#ede9fe'}`, borderRadius: 14, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#BC6045', fontWeight: 600 }}>
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
                <ChevronRight size={11} style={{ color: '#BC6045', marginTop: 3, flexShrink: 0 }} />
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
              <Zap size={11} style={{ color: '#BC6045' }} /> Est. {p.estimated_credits} credits
            </div>
            {p.approved ? (
              <button onClick={() => setMessages(prev => prev.map(m =>
                m.id === msg.id ? { ...m, content: { ...m.content, collapsed: true } } : m
              ))}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', padding: '5px 10px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
                <CheckCircle2 size={11} /> Collapse
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleRejectPlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, background: 'none', border: `1px solid ${border}`, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>
                  <X size={11} /> Cancel
                </button>
                <button onClick={handleApprovePlan} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: '#BC6045', border: 'none', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
                  <Check size={11} /> Approve & Build
                </button>
              </div>
            )}
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
                  <Zap size={11} style={{ color: '#BC6045' }} /> {c.credits_used} credits
                </span>
                <a href={'https://' + c.subdomain + '.44gen.com'} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#BC6045', textDecoration: 'none', fontSize: 12 }}>
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
          background: msg.role === 'user' ? userBubble : (d ? '#1a1a1a' : '#f3f1ed'),
          color: text,
          border: `1px solid ${border}`
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', background: bg, color: text, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans','Inter',sans-serif", overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0, zIndex: 50, position: 'relative', boxShadow: d ? 'none' : '0 1px 8px rgba(17,17,17,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button onClick={() => navigate('/dashboard')} style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ width: 1, height: 14, background: border, flexShrink: 0 }} />
          {/* Chat toggle — always visible, highlights when chat is hidden */}
          <button onClick={() => setShowChat(v => !v)}
            title={showChat ? 'Hide chat' : 'Show chat'}
            style={{ color: showChat ? '#BC6045' : muted, background: showChat ? 'rgba(188,96,69,0.08)' : 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px 6px', borderRadius: 6, flexShrink: 0 }}>
            <MessageSquare size={14} />
          </button>
          <div style={{ minWidth: 0 }}>
            {renaming ? (
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onBlur={handleRename} onKeyDown={e => e.key === 'Enter' && handleRename()}
                style={{ background: subtle, border: `1px solid #BC6045`, borderRadius: 5, padding: '2px 7px', color: text, fontSize: 13, fontWeight: 500, outline: 'none', width: 140 }} />
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
              <Loader2 size={10} style={{ color: '#BC6045', animation: 'spin 0.8s linear infinite' }} /> Building...
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}` }}>
            <Zap size={11} style={{ color: '#BC6045' }} /> {profile?.credits ?? 0}
          </div>
          {previewUrl && (
            <button onClick={copyPreviewUrl}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}`, cursor: 'pointer' }}>
              {copiedUrl ? <CheckCircle2 size={11} /> : <Share size={11} />} {copiedUrl ? 'Copied' : 'Share'}
            </button>
          )}
          <button onClick={toggleDarkMode}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {previewUrl && (
            <button onClick={() => setShowPublishPanel(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#BC6045,#9f4d38)', padding: '6px 13px', borderRadius: 9, border: 'none', cursor: 'pointer', boxShadow: '0 8px 18px rgba(188,96,69,0.22)' }}>
              <Globe size={11} /> <span className="hide-xs">Publish</span>
            </button>
          )}
          {showPublishPanel && <div onClick={() => setShowPublishPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 80 }} />}
          {showPublishPanel && previewUrl && (
            <div style={{ position: 'absolute', right: 54, top: 48, width: 360, background: surface, border: `1px solid ${border}`, borderRadius: 16, boxShadow: d ? '0 20px 70px rgba(0,0,0,0.55)' : '0 22px 70px rgba(34,28,20,0.16)', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: 18, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: text }}>{project?.status === 'deployed' ? 'Published' : 'Draft'}</h3>
                  <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>{project?.status === 'deployed' ? 'Your app is live and shareable.' : 'Publish after the next successful build.'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(16,185,129,0.22)', background: 'rgba(16,185,129,0.08)', color: '#059669', borderRadius: 10, padding: '7px 10px', fontSize: 12, fontWeight: 800 }}>
                  <CheckCircle2 size={13} /> Live
                </div>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: text }}>Website URL</span>
                    <button disabled title="Coming soon" style={{ display: 'flex', alignItems: 'center', gap: 5, color: muted, background: 'none', border: 'none', fontSize: 12, cursor: 'default', opacity: 0.65 }}>
                      <Globe size={12} /> Custom domain soon
                    </button>
                  </div>
                  <button onClick={copyPreviewUrl} style={{ width: '100%', minHeight: 48, borderRadius: 12, border: `1px solid ${border}`, background: d ? '#111' : '#fbfaf8', color: text, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 13px', cursor: 'pointer', fontSize: 13 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{previewUrl.replace('https://', '')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: copiedUrl ? '#059669' : muted, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {copiedUrl ? <CheckCircle2 size={14} /> : <Copy size={14} />} {copiedUrl ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12, background: subtle, border: `1px solid ${border}` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9f4d38', border: `1px solid ${border}` }}>
                    <Shield size={17} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 800, color: text, margin: 0 }}>Public</p>
                    <p style={{ fontSize: 12, color: muted, marginTop: 2 }}>Anyone with the URL can view this website.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <button disabled title="Coming soon" style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${border}`, background: subtle, color: muted, fontSize: 13, fontWeight: 700, cursor: 'default', opacity: 0.72 }}>Security soon</button>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${border}`, background: surface, color: text, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>Open site</a>
                </div>
                <div style={{ background: 'linear-gradient(135deg,#d18a74,#BC6045)', color: '#fff', borderRadius: 10, padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 800 }}>
                  Up to date
                </div>
              </div>
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: '#BC6045', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </button>
            {showUserMenu && <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />}
            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 34, width: 210, background: surface, border: `1px solid ${border}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '10px 13px', borderBottom: `1px solid ${border}` }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: text, margin: 0 }}>{profile?.full_name || user?.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Zap size={10} style={{ color: '#BC6045' }} /> {profile?.credits ?? 0} credits
                    </span>
                    <span style={{ fontSize: 10, background: '#BC604520', color: '#BC6045', padding: '1px 7px', borderRadius: 100, fontWeight: 600 }}>
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
          <div className="chat-panel" style={{ width: chatWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${border}`, background: surface }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(188,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Sparkles size={18} style={{ color: '#BC6045' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, color: text }}>What would you like to build?</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 16 }}>
                    Describe your app and I'll create a detailed plan for your approval before writing any code.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                    {['Build a premium SaaS landing page', 'Create a client dashboard', 'Make a GPA calculator'].map((s, i) => (
                      <button key={i} onClick={() => setPrompt(s)}
                        style={{ textAlign: 'left', fontSize: 12, background: subtle, border: `1px solid ${border}`, borderRadius: 8, padding: '7px 10px', color: muted, cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#BC604544'; e.currentTarget.style.color = text }}
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
            <div style={{ padding: 12, borderTop: `1px solid ${border}`, flexShrink: 0, background: surface }}>
              <div style={{ background: d ? '#111' : '#fffdf9', border: `1px solid ${border}`, borderRadius: 18, padding: 10, boxShadow: d ? 'none' : '0 10px 30px rgba(42,35,24,0.08)' }}>
                <textarea ref={textareaRef} value={prompt}
                  onChange={handlePromptChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    stage === 'awaiting_approval' ? 'Approve or cancel the plan first...' :
                    stage === 'awaiting_clarification' ? 'Answer the questions first...' :
                    stage === 'building' ? 'Building your app...' :
                    promptMode === 'plan' ? 'Describe your app to plan...' : 'Ask, refine, or request changes...'
                  }
                  disabled={loading || stage === 'awaiting_approval' || stage === 'awaiting_clarification' || stage === 'building'}
                  rows={1}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: text, lineHeight: 1.5, fontFamily: 'inherit', overflow: 'hidden', minHeight: 34 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                  <button disabled title="Attach files coming soon" style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${border}`, background: surface, color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', opacity: 0.65 }}>
                    <Plus size={15} />
                  </button>
                  <button disabled title="Visual edits coming soon" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, borderRadius: 999, border: `1px solid ${border}`, background: surface, color: muted, padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'default', opacity: 0.72 }}>
                    <Sparkles size={13} /> Visual edits
                  </button>
                  <button onClick={() => setPromptMode(promptMode === 'plan' ? 'build' : 'plan')}
                    disabled={loading || stage === 'building' || stage === 'awaiting_approval' || stage === 'awaiting_clarification'}
                    style={{ marginLeft: 'auto', height: 32, border: 'none', background: 'transparent', color: text, padding: '0 4px', fontSize: 12, fontWeight: 800, cursor: loading ? 'default' : 'pointer', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {promptMode} <ChevronRight size={12} style={{ transform: 'rotate(90deg)', color: muted }} />
                  </button>
                  <button onClick={handleSubmit}
                    disabled={loading || !prompt.trim() || stage === 'awaiting_approval' || stage === 'awaiting_clarification' || stage === 'building'}
                    style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: prompt.trim() && !loading && !['awaiting_approval', 'awaiting_clarification', 'building'].includes(stage) ? '#BC6045' : (d ? '#222' : '#d8d3cc'), border: 'none', cursor: prompt.trim() && !loading && !['awaiting_approval', 'awaiting_clarification', 'building'].includes(stage) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: prompt.trim() ? '0 8px 16px rgba(188,96,69,0.22)' : 'none' }}>
                    {loading && (stage === 'planning' || stage === 'clarifying')
                      ? <Loader2 size={13} style={{ color: '#fff', animation: 'spin 0.8s linear infinite' }} />
                      : <Send size={13} style={{ color: prompt.trim() && !loading && !['awaiting_approval', 'awaiting_clarification', 'building'].includes(stage) ? '#fff' : muted }} />}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 11, color: d ? '#444' : '#bbb', textAlign: 'center', marginTop: 5 }}>
                Plan ~0.5 credits · Build cost shown in plan
              </p>
            </div>
          </div>
        )}

        {showChat && (
          <div
            className="chat-resizer"
            onMouseDown={() => {
              resizingChatRef.current = true
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
            }}
            title="Resize chat"
            style={{ width: 7, flexShrink: 0, cursor: 'col-resize', background: d ? '#141414' : '#f7f4ef', borderRight: `1px solid ${border}`, position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: '50%', left: 2, width: 2, height: 34, transform: 'translateY(-50%)', borderRadius: 99, background: d ? '#333' : '#d8d0c8' }} />
          </div>
        )}

        {/* RIGHT — Preview / Code / Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: `1px solid ${border}`, background: surface, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: 3, border: `1px solid ${border}`, borderRadius: 999, background: subtle }}>
              {[
                { id: 'preview', icon: <Eye size={12} />, label: 'Preview' },
                { id: 'code', icon: <Code size={12} />, label: 'Code' },
                { id: 'details', icon: <Activity size={12} />, label: 'Details', badge: detailsLog.length },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999,
                    fontSize: 12, fontWeight: 800, cursor: 'pointer', border: 'none',
                    background: activeTab === tab.id ? surface : 'transparent',
                    color: activeTab === tab.id ? '#BC6045' : muted,
                    boxShadow: activeTab === tab.id && !d ? '0 1px 5px rgba(34,28,20,0.08)' : 'none'
                  }}>
                  {tab.icon} {tab.label}
                  {tab.badge > 0 && (
                    <span style={{ fontSize: 10, background: '#BC6045', color: '#fff', borderRadius: 100, padding: '0 4px', minWidth: 14, textAlign: 'center' }}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>
            {activeTab === 'preview' && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <div className="hide-xs" style={{ minWidth: 0, maxWidth: 280, height: 30, borderRadius: 999, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', gap: 7, padding: '0 11px', color: muted, fontSize: 11, fontFamily: 'monospace' }}>
                  <Monitor size={12} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{previewUrl ? previewUrl.replace('https://', '') : '/'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: 2, borderRadius: 999, border: `1px solid ${border}`, background: subtle }}>
                  {[
                    { id: 'desktop', icon: <Monitor size={12} />, title: 'Desktop preview' },
                    { id: 'mobile', icon: <Smartphone size={12} />, title: 'Mobile preview' },
                  ].map(device => (
                    <button key={device.id} title={device.title} onClick={() => setPreviewDevice(device.id)}
                      style={{ width: 28, height: 24, borderRadius: 999, border: 'none', background: previewDevice === device.id ? surface : 'transparent', color: previewDevice === device.id ? '#BC6045' : muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      {device.icon}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPreviewKey(k => k + 1)}
                  disabled={!previewUrl}
                  title="Refresh preview"
                  style={{ width: 30, height: 30, color: muted, background: subtle, border: `1px solid ${border}`, borderRadius: 999, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: previewUrl ? 1 : 0.5 }}>
                  <RefreshCw size={12} />
                </button>
                <a href={previewUrl || undefined} target="_blank" rel="noopener noreferrer" title="Open preview"
                  style={{ width: 30, height: 30, color: muted, background: subtle, border: `1px solid ${border}`, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: previewUrl ? 'auto' : 'none', opacity: previewUrl ? 1 : 0.5 }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {activeTab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: d ? '#080808' : '#f3f1ed', overflow: 'hidden', position: 'relative', padding: previewUrl && previewDevice === 'desktop' ? 14 : 0 }}>
              {previewUrl ? (
                <div style={{
                  width: previewDevice === 'mobile' ? 390 : '100%',
                  height: previewDevice === 'mobile' ? 844 : '100%',
                  maxHeight: '100%',
                  borderRadius: previewDevice === 'mobile' ? 18 : 14,
                  overflow: 'hidden',
                  border: `1px solid ${d ? '#222' : '#e3ded6'}`,
                  boxShadow: previewDevice === 'mobile' ? '0 20px 60px rgba(0,0,0,0.5)' : (d ? 'none' : '0 18px 60px rgba(45,38,28,0.08)'),
                  position: 'relative'
                }}>
                  {iframeStatus === 'loading' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d ? '#0d0d0d' : '#f0f0f0', zIndex: 1 }}>
                      <Loader2 size={22} style={{ color: '#BC6045', animation: 'spin 0.8s linear infinite', marginBottom: 8 }} />
                      <p style={{ fontSize: 12, color: muted }}>Loading preview...</p>
                    </div>
                  )}
                  {iframeStatus === 'error' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d ? '#0d0d0d' : '#f0f0f0', zIndex: 1, gap: 8 }}>
                      <AlertCircle size={22} style={{ color: '#ef4444' }} />
                      <p style={{ fontSize: 13, color: muted }}>Preview failed to load</p>
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#BC6045', display: 'flex', alignItems: 'center', gap: 4 }}>
                        Open directly <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  <iframe
                    key={previewKey}
                    src={previewUrl ? `${previewUrl}?v=${previewKey}` : previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none', opacity: iframeStatus === 'loaded' ? 1 : 0 }}
                    title="Preview"
                    onLoad={() => setIframeStatus('loaded')}
                    onError={() => setIframeStatus('error')}
                  />
                </div>
              ) : (
                <div style={{ width: 'min(760px, calc(100% - 52px))', minHeight: 440, borderRadius: 22, border: `1px solid ${border}`, background: surface, boxShadow: d ? 'none' : '0 24px 80px rgba(45,38,28,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 42, borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', background: d ? '#121212' : '#fffdf9' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e7dfd8' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#d7ccc2' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#c8b9ae' }} />
                    <span style={{ marginLeft: 10, fontSize: 11, color: muted, fontFamily: 'monospace' }}>/</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '70px 24px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(188,96,69,0.08)', border: '1px solid rgba(188,96,69,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Eye size={20} style={{ color: '#BC6045' }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 5, color: text }}>No preview yet</p>
                    <p style={{ fontSize: 13, opacity: 0.75, maxWidth: 260, lineHeight: 1.5 }}>Approve a plan or switch to Build mode to generate the first live preview.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'code' && (
            <div style={{ flex: 1, display: 'flex', minHeight: 0, background: d ? '#0d1117' : '#f6f8fa' }}>
              {visibleCodeFiles.length ? (
                <>
                  <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${d ? '#30363d' : '#d0d7de'}`, background: d ? '#0d1117' : '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ height: 42, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: `1px solid ${d ? '#30363d' : '#d0d7de'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text, fontSize: 12, fontWeight: 700, minWidth: 0 }}>
                        <FolderOpen size={13} style={{ color: '#BC6045', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Files</span>
                        <span style={{ color: muted, fontWeight: 600 }}>({visibleCodeFiles.length})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <button onClick={loadProjectFiles}
                          disabled={codeFilesLoading}
                          title="Refresh files"
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${d ? '#30363d' : '#d0d7de'}`, background: d ? '#161b22' : '#f6f8fa', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: codeFilesLoading ? 'default' : 'pointer', opacity: codeFilesLoading ? 0.6 : 1 }}>
                          <RefreshCw size={12} style={{ animation: codeFilesLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                        </button>
                        <button onClick={downloadProjectZip}
                          disabled={downloadingProject}
                          title="Download project ZIP"
                          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${d ? '#30363d' : '#d0d7de'}`, background: d ? '#161b22' : '#f6f8fa', color: '#BC6045', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: downloadingProject ? 'default' : 'pointer', opacity: downloadingProject ? 0.6 : 1 }}>
                          {downloadingProject ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={12} />}
                        </button>
                      </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                      {visibleCodeFiles.map(file => {
                        const active = file.path === selectedFile?.path
                        return (
                          <button key={file.path} onClick={() => setSelectedCodeFile(file.path)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '7px 8px',
                              borderRadius: 6,
                              border: 'none',
                              background: active ? 'rgba(188,96,69,0.12)' : 'transparent',
                              color: active ? '#BC6045' : muted,
                              cursor: 'pointer',
                              fontSize: 12,
                              textAlign: 'left',
                              fontFamily: 'monospace'
                            }}>
                            <FileCode size={12} style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 42, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${d ? '#30363d' : '#d0d7de'}`, color: muted, fontSize: 12, fontFamily: 'monospace' }}>
                      <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{codeFilesLoading ? 'Loading files...' : selectedFile?.path}</span>
                      <button onClick={copySelectedFile}
                        disabled={!selectedFile?.content}
                        title="Copy current file"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 27, borderRadius: 7, border: `1px solid ${d ? '#30363d' : '#d0d7de'}`, background: d ? '#161b22' : '#fff', color: copiedFile ? '#059669' : muted, padding: '0 9px', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, cursor: selectedFile?.content ? 'pointer' : 'default', opacity: selectedFile?.content ? 1 : 0.55 }}>
                        {copiedFile ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        {copiedFile ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre style={{ flex: 1, overflow: 'auto', margin: 0, padding: 16, fontSize: 11, fontFamily: 'monospace', color: d ? '#c9d1d9' : '#24292f', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedFile?.content || ''}
                    </pre>
                  </div>
                </>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10, marginBottom: 4, borderBottom: `1px solid ${border}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: text }}>Build activity</p>
                      <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{detailsLog.length} events recorded locally</p>
                    </div>
                    <button onClick={() => setDetailsLog([])}
                      style={{ height: 30, padding: '0 10px', borderRadius: 8, border: `1px solid ${border}`, background: surface, color: muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Clear logs
                    </button>
                  </div>
                  {detailsLog.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                      <span style={{ flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ color: item.color || text, flex: 1, lineHeight: 1.4 }}>{item.msg}</span>
                      <span style={{ color: muted, fontSize: 10, flexShrink: 0 }}>{new Date(item.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {isBuilding && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: muted, fontSize: 11 }}>
                      <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite', color: '#BC6045' }} /> Working...
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
        @keyframes streamShimmer {
          0% { background-position: 120% 0; opacity: 0.72; }
          50% { opacity: 1; }
          100% { background-position: -120% 0; opacity: 0.72; }
        }
        @keyframes streamGlow {
          0%,100% { transform: translateX(-35%); opacity: 0.28; }
          50% { transform: translateX(35%); opacity: 0.48; }
        }
        .streaming-heading {
          background: linear-gradient(90deg, #BC6045 0%, #d18a74 34%, #9f4d38 68%, #BC6045 100%);
          background-size: 240% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: streamShimmer 2.4s ease-in-out infinite;
        }
        .stream-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(188,96,69,0.16), transparent);
          animation: streamGlow 2.8s ease-in-out infinite;
        }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        textarea::placeholder { color: ${d ? '#666' : '#8d867d'}; opacity: 1; }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: ${d ? '#333' : '#ddd'}; border-radius: 2px }
        .chat-resizer:hover div { background: #BC6045 !important; }
        @media (max-width: 640px) {
          .chat-panel { width: 100% !important; position: absolute; inset: 54px 0 0 0; z-index: 40; }
          .chat-resizer { display: none !important; }
          .hide-xs { display: none !important; }
        }
      `}</style>
    </div>
  )
}
