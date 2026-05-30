import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CodePanel from '../components/editor/CodePanel'
import BrandLoader from '../components/BrandLoader'
import { useGitHubExport } from '../hooks/useGitHubExport'
import GitHubExportModal from '../components/editor/GitHubExportModal'
import VersionHistoryModal from '../components/editor/VersionHistoryModal'
import {
  ArrowLeft, Zap, Send, Check, X, ChevronRight, Globe,
  Code, Eye, Sun, Moon, Loader2, ExternalLink, Sparkles,
  AlertCircle, CheckCircle2, RefreshCw, Monitor, Smartphone,
  Share, LogOut, Activity, FileCode, Edit, MessageSquare, RefreshCcw,
  Plus, Copy, Shield, Key, Trash2, Save, EyeOff, Info
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
  const [secrets, setSecrets] = useState([])
  const [secretsLoading, setSecretsLoading] = useState(false)
  const [newSecretKey, setNewSecretKey] = useState('')
  const [newSecretVal, setNewSecretVal] = useState('')
  const [secretSaving, setSecretSaving] = useState(false)
  const [secretError, setSecretError] = useState('')
  const [secretSuccess, setSecretSuccess] = useState('')
  const [showSecretVal, setShowSecretVal] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [detailsLog, setDetailsLog] = useState([])
  const [fullCode, setFullCode] = useState('')
  const [codeFiles, setCodeFiles] = useState([])
  const [selectedCodeFile, setSelectedCodeFile] = useState('')
  const [codeFilesLoading, setCodeFilesLoading] = useState(false)
  const [downloadingProject, setDownloadingProject] = useState(false)
  const [runtimeQaLoading, setRuntimeQaLoading] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [rollbackLoading, setRollbackLoading] = useState('')
  // #26: GitHub export state extracted to useGitHubExport hook
  const {
    githubExportOpen, setGithubExportOpen,
    githubExporting,
    githubExportForm, setGithubExportForm,
    githubExportResult, setGithubExportResult,
    githubExportError, setGithubExportError,
    githubConnection,
    githubConnecting,
    githubRepos,
    githubReposLoading,
    loadGitHubConnection,
    startGitHubConnect,
    disconnectGitHub,
    handleGitHubOAuthMessage,
    handleGitHubExport,
  } = useGitHubExport({ session, projectId })
  const [savingCodeFile, setSavingCodeFile] = useState(false)
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
  const iframeRef = useRef(null)
  const [visualEditMode, setVisualEditMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState(null) // { tag, text, path, styles }
  const [visualPanel, setVisualPanel] = useState({ x: 0, y: 0, visible: false })
  const [editText, setEditText] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editBgColor, setEditBgColor] = useState('')
  const [editFontSize, setEditFontSize] = useState('')
  const [visualTab, setVisualTab] = useState('style') // 'style' | 'image'
  const [pexelsQuery, setPexelsQuery] = useState('')
  const [pexelsResults, setPexelsResults] = useState([])
  const [pexelsLoading, setPexelsLoading] = useState(false)
  const [pexelsError, setPexelsError] = useState('')
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] = useState(null)
  const imageUploadRef = useRef(null)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef(null)
  const [attachedImage, setAttachedImage] = useState(null) // { base64, mimeType, preview }
  const [attachedUrl, setAttachedUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
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
  const lastBuildPromptRef = useRef('')
  const lastBuildPlanRef = useRef(null)
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
  const isPaidPlan = ['pro', 'business'].includes(String(profile?.plan || '').toLowerCase())

  useEffect(() => { fetchProject() }, [projectId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (projectId) { loadConversations(); loadBuildProgress(); checkActiveBuildJob() } }, [projectId])
  useEffect(() => { if (projectId && activeTab === 'code') loadProjectFiles() }, [projectId, activeTab])
  useEffect(() => { if (projectId && activeTab === 'secrets') loadSecrets() }, [projectId, activeTab])
  useEffect(() => {
    if (project?.status === 'deployed') setPromptMode('build')
  }, [project?.status])
  // #26: GitHub OAuth handled by useGitHubExport hook via handleGitHubOAuthMessage
  useEffect(() => {
    const onGitHubOAuth = (event) => {
      const apiOrigin = getApiOrigin()
      if (![window.location.origin, apiOrigin].includes(event.origin) &&
          !event.origin?.endsWith('.44gen.com')) return
      handleGitHubOAuthMessage(event)
    }
    window.addEventListener('message', onGitHubOAuth)
    return () => window.removeEventListener('message', onGitHubOAuth)
  }, [handleGitHubOAuthMessage])

  const getApiOrigin = () => {
    if (!API) return ''
    try {
      return new URL(API, window.location.origin).origin
    } catch {
      return ''
    }
  }

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
        try {
          const parsed = JSON.parse(c.content)
          return { id: c.id, role: 'assistant', content: { ...parsed, fromHistory: true }, type: 'complete' }
        } catch { return null }
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

  const loadSecrets = async () => {
    if (!projectId || !sessionRef.current?.access_token) return
    setSecretsLoading(true)
    try {
      const res = await fetch(`${API}/api/secrets/${projectId}`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      })
      const data = await res.json()
      if (res.ok) setSecrets(data.secrets || [])
    } catch {}
    setSecretsLoading(false)
  }

  const saveSecret = async () => {
    const key = newSecretKey.trim().toUpperCase().replace(/\s+/g, '_')
    const val = newSecretVal.trim()
    if (!key || !val) { setSecretError('Both key name and value are required.'); return }
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)) {
      setSecretError('Key name must start with a letter and contain only letters, numbers, and underscores.')
      return
    }
    setSecretSaving(true); setSecretError(''); setSecretSuccess('')
    try {
      const res = await fetch(`${API}/api/secrets/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionRef.current.access_token}` },
        body: JSON.stringify({ key_name: key, value: val })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setNewSecretKey(''); setNewSecretVal(''); setShowSecretVal(false)
      setSecretSuccess(`${key} saved. Rebuild your app to apply it.`)
      await loadSecrets()
    } catch (err) { setSecretError(err.message) }
    setSecretSaving(false)
  }

  const deleteSecret = async (keyName) => {
    if (!window.confirm(`Delete secret "${keyName}"? This cannot be undone.`)) return
    try {
      await fetch(`${API}/api/secrets/${projectId}/${keyName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      })
      setSecrets(prev => prev.filter(s => s.key_name !== keyName))
    } catch {}
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

  const loadVersions = async () => {
    if (!sessionRef.current?.access_token) return
    setVersionsLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/versions`, {
        headers: { Authorization: `Bearer ${sessionRef.current.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load versions')
      setVersions(data.versions || [])
    } catch (err) {
      addMessage('assistant', err.message || 'Could not load version history.', 'error')
    } finally {
      setVersionsLoading(false)
    }
  }

  const openVersions = async () => {
    setVersionsOpen(true)
    await loadVersions()
  }

  const rollbackToVersion = async (version) => {
    if (!sessionRef.current?.access_token || rollbackLoading || loading) return
    setRollbackLoading(version.id)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/versions/${version.id}/rollback`, {
        method: 'POST',
        headers: authHeaders()
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rollback failed')
      setVersionsOpen(false)
      addMessage('assistant', `Restoring version ${data.restored_version}. I’ll rebuild and publish it now.`)
      setStage('building')
      setLoading(true)
      buildStartedRef.current = true
      setDetailsLog([])
      buildStreamMessageIdRef.current = null
      processedEventCountRef.current = 0
      stopPolling()
      upsertBuildStream({
        heading: `Restoring version ${data.restored_version}...`,
        subtext: '',
        phase: 'starting',
        step: { label: `Restoring version ${data.restored_version}`, tone: 'active' }
      })
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      streamEventSeenRef.current = false
      connectToStream(data.job_id)
    } catch (err) {
      addMessage('assistant', makeErrorContent({
        message: err.message || 'Rollback failed',
        details: err.message || 'Rollback failed',
        retryable: false,
        fixable: false
      }), 'error')
    } finally {
      setRollbackLoading('')
    }
  }

  const runRuntimeQaForApp = async () => {
    if (!previewUrl || runtimeQaLoading || loading) return
    if (!isPaidPlan) {
      addMessage('assistant', makeErrorContent({
        message: 'Runtime QA is available on Pro and Business plans.',
        details: 'Upgrade to run browser-based functionality checks for buttons, navigation, forms, and runtime errors.',
        retryable: false,
        fixable: false
      }), 'error')
      return
    }

    setRuntimeQaLoading(true)
    addMessage('assistant', 'Running Runtime QA in a browser...', 'status')
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/runtime-qa`, {
        method: 'POST',
        headers: authHeaders()
      })
      const data = await res.json()
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      if (!res.ok) {
        throw new Error(data.error || 'Runtime QA failed')
      }
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', type: 'qa_result', content: data }])
    } catch (err) {
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      addMessage('assistant', makeErrorContent({
        message: err.message || 'Runtime QA failed',
        details: err.message || 'Runtime QA failed',
        retryable: false,
        fixable: false
      }), 'error')
    } finally {
      setRuntimeQaLoading(false)
    }
  }

  const fixRuntimeQaIssues = async (qa) => {
    if (!qa?.issues?.length) return
    const issueText = qa.issues.map((issue, i) => `${i + 1}. ${issue.message}\n${issue.details || ''}`).join('\n\n')
    await startDirectBuild(`Fix the Runtime QA issues found in the current app. Preserve all existing working features and files.\n\nRuntime QA report:\n${issueText}`)
  }

  const parseGitHubRepoCommand = (textValue = '') => {
    const match = textValue.match(/(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/)
    if (!match) return null
    return { owner: match[1], repo: match[2].replace(/\.git$/i, '') }
  }

  const handleGitHubChatCommand = async (userPrompt) => {
    const repoRef = parseGitHubRepoCommand(userPrompt)
    if (!repoRef) return false
    const wantsPush = /\b(push|export|send|upload)\b/i.test(userPrompt) && /\b(github|repo|repository)\b/i.test(userPrompt)
    const wantsImport = /\b(read|import|pull|load|clone|bring)\b/i.test(userPrompt) && /\b(github|repo|repository)\b/i.test(userPrompt)
    if (!wantsPush && !wantsImport) return false

    if (wantsPush) {
      addMessage('assistant', `Exporting this app to ${repoRef.owner}/${repoRef.repo}...`, 'status')
      try {
        const res = await fetch(`${API}/api/projects/${projectId}/export/github`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            owner: repoRef.owner,
            repo: repoRef.repo,
            branch: 'main',
            commitMessage: `Export from 44Gen: ${project?.name || 'Generated app'}`,
            createRepo: true,
            privateRepo: true
          })
        })
        const data = await res.json()
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        if (!res.ok) throw new Error(data.error || 'GitHub export failed')
        addMessage('assistant', `Exported to GitHub: ${data.repo_url}${data.commit_sha ? ` (${data.commit_sha.slice(0, 7)})` : ''}`)
      } catch (err) {
        setMessages(prev => prev.filter(m => m.type !== 'status'))
        addMessage('assistant', makeErrorContent({
          message: err.message || 'GitHub export failed',
          details: err.message || 'GitHub export failed',
          retryable: false,
          fixable: false
        }), 'error')
      } finally {
        setLoading(false)
      }
      return true
    }

    addMessage('assistant', `Reading ${repoRef.owner}/${repoRef.repo} and preparing it for 44Gen...`, 'status')
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/import/github`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(repoRef)
      })
      const data = await res.json()
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      if (!res.ok) throw new Error(data.error || 'GitHub import failed')
      addMessage('assistant', `Imported ${data.files_imported} source files from ${data.repo}. I’ll rebuild it now.`)
      setStage('building')
      setLoading(true)
      buildStartedRef.current = true
      setDetailsLog([])
      buildStreamMessageIdRef.current = null
      processedEventCountRef.current = 0
      stopPolling()
      upsertBuildStream({
        heading: `Importing ${data.repo}...`,
        subtext: '',
        phase: 'starting',
        step: { label: `Importing ${data.repo}`, tone: 'active' }
      })
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      streamEventSeenRef.current = false
      connectToStream(data.job_id)
    } catch (err) {
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      addMessage('assistant', makeErrorContent({
        message: err.message || 'GitHub import failed',
        details: err.message || 'GitHub import failed',
        retryable: false,
        fixable: false
      }), 'error')
      setLoading(false)
    }
    return true
  }

  const openGitHubExport = () => {
    const repoName = (project?.name || '44gen-project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || '44gen-project'
    setGithubExportForm(prev => ({
      ...prev,
      repo: prev.repo || repoName,
      commitMessage: prev.commitMessage || `Export ${project?.name || '44Gen app'}`
    }))
    setGithubExportError('')
    setGithubExportResult(null)
    setGithubExportOpen(true)
    loadGitHubConnection()
  }

  const saveCodeFileAndBuild = async (filePath, content) => {
    if (!sessionRef.current?.access_token || savingCodeFile || loading) return
    setSavingCodeFile(true)
    buildStartedRef.current = true
    setLoading(true)
    setStage('building')
    setDetailsLog([])
    setFullCode('')
    codeChunksRef.current = ''
    buildStreamMessageIdRef.current = null
    processedEventCountRef.current = 0
    stopPolling()
    upsertBuildStream({
      heading: `Saving ${filePath}...`,
      subtext: '',
      phase: 'starting',
      step: { label: `Saving ${filePath}`, tone: 'active' }
    })

    try {
      const res = await fetch(`${API}/api/projects/${projectId}/files/save-and-build`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ path: filePath, content })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save file')

      setCodeFiles(prev => {
        const next = prev.some(file => file.path === filePath)
          ? prev.map(file => file.path === filePath ? { ...file, content } : file)
          : [...prev, { path: filePath, content }]
        return next.sort((a, b) => a.path.localeCompare(b.path))
      })
      if (filePath === 'src/App.jsx') setFullCode(content)

      upsertBuildStream({
        heading: 'File saved. Rebuilding preview...',
        subtext: '',
        phase: 'connecting',
        step: { label: 'Rebuilding with saved code', tone: 'active' }
      })
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      connectToStream(data.job_id)
    } catch (err) {
      addMessage('assistant', err.message || 'Failed to save file.', 'error')
      buildStartedRef.current = false
      setStage('idle')
      setLoading(false)
    } finally {
      setSavingCodeFile(false)
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

  const friendlyErrorMessage = (details) => {
    const raw = String(details || '')
    if (/insufficient credits/i.test(raw)) return 'You need more credits before I can continue this build.'
    if (/timed out/i.test(raw)) return 'The build took longer than expected. You can retry it now.'
    if (/rate|429|busy|high demand|unavailable/i.test(raw)) return 'The AI service is busy for a moment. You can retry safely.'
    if (/failed to fetch|network|eventsource/i.test(raw)) return 'The live connection dropped, but you can retry or let me fix the build.'
    return 'Something needs a quick fix. I can retry or repair it for you.'
  }

  const makeErrorContent = (error, fallbackPrompt = '') => {
    if (typeof error === 'object' && error?.message) {
      return {
        message: friendlyErrorMessage(error.details || error.message),
        details: error.details || error.message,
        retryPrompt: error.retryPrompt || fallbackPrompt || lastBuildPromptRef.current,
        retryAction: error.retryAction || 'build',
        retryable: error.retryable !== false,
        fixable: error.fixable !== false
      }
    }
    const details = String(error || 'Unknown error')
    return {
      message: friendlyErrorMessage(details),
      details,
      retryPrompt: fallbackPrompt || lastBuildPromptRef.current,
      retryAction: 'build',
      retryable: true,
      fixable: true
    }
  }

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
          heading: event.message || 'Fixing generated files after build error...',
          subtext: '',
          phase: 'code',
          file: event.file || 'generated files',
          actionVerb: 'Fixing',
          step: { label: event.message || 'Repairing generated code', tone: 'active' }
        })
        addDetail('🛠️', event.message || 'Repairing generated code', '#BC6045')
        break

      case 'repair_done':
        upsertBuildStream({
          heading: event.message || 'Updated generated files. Rebuilding...',
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
        addDetail('✅', 'Build ready — click Publish to go live', '#10b981')
        // Auto-open publish panel so user sees the Publish button immediately
        setShowPublishPanel(true)
        loadDomains()
        setMessages(prev => [
          ...prev
            .filter(m => !['build_stream', 'build_step', 'status', 'thought', 'code_stream', 'code_done'].includes(m.type))
            .filter(m => !(m.type === 'complete' && m.content?.fromHistory)),
          // Single complete message — summary renders all detail, no redundant "Done ·" header
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
        addMessage('assistant', makeErrorContent(event), 'error')
        setStage('idle')
        setLoading(false)
        reconnectAttemptsRef.current = 0
        addDetail('❌', event.message || 'Build issue', '#ef4444')
        if (esRef.current) esRef.current.close()
        break
    }
  }

  handleStreamEventRef.current = handleStreamEvent

  const submitPromptText = async (userPrompt) => {
    if (!userPrompt?.trim() || loading) return
    const imageRef = attachedImage
    const urlRef = attachedUrl.trim()
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    addMessage('user', userPrompt)
    await saveConversation('user', userPrompt)
    if (imageRef || urlRef) {
      setAttachedImage(null)
      setAttachedUrl('')
      setShowUrlInput(false)
    }

    if (previewUrl && /\b(test|check|qa|quality|functionality|make sure).*\b(app|site|buttons|navigation|forms|works|working)\b/i.test(userPrompt)) {
      setLoading(false)
      await runRuntimeQaForApp()
      return
    }

    if (await handleGitHubChatCommand(userPrompt)) {
      return
    }

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
        addMessage('assistant', makeErrorContent({
          message: clarifyData.error,
          details: clarifyData.error,
          retryPrompt: userPrompt,
          retryAction: 'prompt',
          retryable: clarifyData.retryable !== false,
          fixable: false
        }, userPrompt), 'error')
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
        await startDirectBuild(refinedPrompt, imageRef || null, urlRef || null)
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
        addMessage('assistant', makeErrorContent({
          message: planData.error,
          details: planData.error,
          retryPrompt: userPrompt,
          retryAction: 'prompt',
          retryable: planData.retryable !== false,
          fixable: false
        }, userPrompt), 'error')
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
      addMessage('assistant', makeErrorContent({
        message: 'Something went wrong. Try again.',
        details: 'Request failed before the build could start.',
        retryPrompt: userPrompt,
        retryAction: 'prompt',
        retryable: true,
        fixable: false
      }, userPrompt), 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const handleFixError = async (error) => {
    if (loading) return
    const details = typeof error === 'string' ? error : (error?.details || error?.message || 'Unknown app issue')
    const fixPrompt = `Fix this app issue automatically and keep the product fully working.

Error details:
${String(details).slice(0, 3000)}

Requirements:
- Find the root cause and repair the generated app.
- Preserve all existing working features and files.
- If this is a runtime issue, make the affected user flow work with React state.
- Do not leave dead buttons, placeholder actions, or broken navigation.`
    await startDirectBuild(fixPrompt)
  }

  // Visual editor: listen for element selection from iframe
  // FIX #16: deps changed from [loading] to [] — [loading] caused the listener to be
  // removed and re-added on every loading state flip, creating a window where messages
  // could be silently dropped. Use a stable ref callback pattern instead.
  const handleFixErrorRef = useRef(null)
  useEffect(() => { handleFixErrorRef.current = handleFixError }, [loading])

  useEffect(() => {
    const handleMessage = (e) => {
      // FIX #1: Validate message origin — only accept postMessages from our own preview subdomains
      // or same origin. Without this, any page open in the browser can trigger handleFixError()
      // which starts a real AI build job and deducts real credits.
      const allowedOrigins = [
        window.location.origin,
        // Accept *.44gen.com preview subdomains
        ...(e.origin?.endsWith('.44gen.com') ? [e.origin] : [])
      ]
      const isTrustedOrigin = allowedOrigins.includes(e.origin) ||
        (typeof e.origin === 'string' && e.origin.endsWith('.44gen.com'))

      if (!isTrustedOrigin) return

      if (e.data?.type === '__44gen_element_selected__') {
        const el = e.data
        setSelectedElement(el)
        setEditText(el.text || '')
        setEditColor(el.styles?.color || '')
        setEditBgColor(el.styles?.backgroundColor || '')
        setEditFontSize(el.styles?.fontSize || '')
        setVisualPanel({ visible: true })
      }
      if (e.data?.type === '__44gen_runtime_error__') {
        const content = makeErrorContent({
          message: 'Runtime error in preview',
          details: e.data.details,
          retryable: true,
          fixable: true
        })
        setMessages(prev => {
          if (prev.some(m => m.type === 'error' && m.content?.details === content.details)) return prev
          return [...prev, { id: Date.now() + Math.random(), role: 'assistant', type: 'error', content }]
        })
      }
      if (e.data?.type === '__44gen_runtime_error_fix__') {
        // Use ref so this always calls the latest version of handleFixError
        handleFixErrorRef.current?.({ details: e.data.details })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])  // FIX #16: stable [] — handleFixError accessed via ref above

  const toggleVisualEdit = () => {
    if (!previewUrl) return
    const iframe = iframeRef.current
    if (!iframe) return
    const next = !visualEditMode
    setVisualEditMode(next)
    setSelectedElement(null)
    setVisualPanel({ visible: false })
    try {
      iframe.contentWindow.postMessage(
        { type: next ? '__44gen_inspect_on__' : '__44gen_inspect_off__' },
        '*'
      )
    } catch {}
  }

  const applyVisualEdit = async () => {
    if (!selectedElement) return
    const changes = []
    const orig = selectedElement
    if (editText && editText !== orig.text) {
      changes.push(`Change the text "${orig.text.slice(0,60)}" to "${editText}"`)
    }
    if (editColor && editColor !== orig.styles?.color) {
      changes.push(`Change the text color of the ${orig.tag} element to ${editColor}`)
    }
    if (editBgColor && editBgColor !== orig.styles?.backgroundColor) {
      changes.push(`Change the background color of the ${orig.tag} element to ${editBgColor}`)
    }
    if (editFontSize && editFontSize !== orig.styles?.fontSize) {
      changes.push(`Change the font size of "${orig.text.slice(0,40)}" to ${editFontSize}`)
    }
    if (!changes.length) return

    const prompt = `Visual edit: ${changes.join('. ')}. Target element: ${orig.tag}${orig.path ? ' (' + orig.path.split('>').pop().trim() + ')' : ''}.`
    setVisualPanel({ visible: false })
    setSelectedElement(null)
    setVisualEditMode(false)
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: '__44gen_inspect_off__' }, '*')
    } catch {}
    await submitPromptText(prompt)
  }

  const dismissVisualPanel = () => {
    setVisualPanel({ visible: false })
    setSelectedElement(null)
  }

  const searchPexels = async (query) => {
    if (!query.trim()) return
    setPexelsLoading(true)
    setPexelsError('')
    setPexelsResults([])
    try {
      const res = await fetch(`${API}/api/images/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`, {
        headers: authHeaders()
      })
      const data = await res.json()
      if (data.upgrade_required) {
        setPexelsError('upgrade_required')
        return
      }
      if (data.error) throw new Error(data.error)
      setPexelsResults(data.photos || [])
    } catch (err) {
      setPexelsError(err.message || 'Search failed')
    } finally {
      setPexelsLoading(false)
    }
  }

  const applyImageToElement = async (imageUrl, alt = '') => {
    if (!selectedElement) return
    const prompt = `Visual edit: Replace the image or background image in the ${selectedElement.tag} element (path: ${selectedElement.path.split('>').pop().trim()}) with this image URL: "${imageUrl}". If it is a div used as an image placeholder, convert it to an <img> tag with src="${imageUrl}" alt="${alt}" and appropriate object-fit styling. If it already has a src or backgroundImage, update it to "${imageUrl}".`
    setVisualPanel({ visible: false })
    setSelectedElement(null)
    setVisualEditMode(false)
    setSelectedPexelsPhoto(null)
    setPexelsResults([])
    setPexelsQuery('')
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: '__44gen_inspect_off__' }, '*')
    } catch {}
    await submitPromptText(prompt)
  }

  const handleVisualImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1]
        const res = await fetch(`${API}/api/images/upload`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType: file.type, filename: file.name })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        await applyImageToElement(data.url, file.name.replace(/\.[^.]+$/, ''))
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const handleImageAttach = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1]
      setAttachedImage({ base64, mimeType: file.type, preview: ev.target.result, name: file.name })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveImage = () => setAttachedImage(null)

  const handleAttachUrl = () => {
    if (!attachedUrl.trim()) return
    setShowUrlInput(false)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!prompt.trim() || loading) return
    await submitPromptText(prompt.trim())
  }

  const promptWithAnswers = (clarification) => {
    const answerText = clarification.questions.map(q => {
      const value = clarification.answers?.[q.id]
      const customValue = clarification.answers?.[`${q.id}__custom`]
      const rendered = Array.isArray(value) ? value.join(', ') : value
      const parts = [rendered, customValue].filter(Boolean)
      return parts.length ? `${q.question}: ${parts.join(', ')}` : null
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

  const updateClarificationCustomAnswer = (messageId, question, value) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m
      const nextContent = {
        ...m.content,
        answers: { ...m.content.answers, [`${question.id}__custom`]: value }
      }
      setPendingClarification(nextContent)
      return { ...m, content: nextContent }
    }))
  }

  const continueClarification = async (messageId, clarification) => {
    const missing = clarification.questions.some(q => {
      const answer = clarification.answers?.[q.id]
      const customAnswer = clarification.answers?.[`${q.id}__custom`]
      return q.required && !answer?.length && !customAnswer?.trim()
    })
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
        addMessage('assistant', makeErrorContent({
          message: planData.error,
          details: planData.error,
          retryPrompt: finalPrompt,
          retryAction: 'prompt',
          retryable: planData.retryable !== false,
          fixable: false
        }, finalPrompt), 'error')
        setStage('idle')
      } else {
        buildStartedRef.current = false
        setPlan(planData)
        setStage('awaiting_approval')
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: planData, type: 'plan' }])
      }
    } catch {
      setMessages(prev => prev.filter(m => m.type !== 'status'))
      addMessage('assistant', makeErrorContent({
        message: 'Something went wrong. Try again.',
        details: 'Request failed before the plan could finish.',
        retryPrompt: finalPrompt,
        retryAction: 'prompt',
        retryable: true,
        fixable: false
      }, finalPrompt), 'error')
      setStage('idle')
    }
    setLoading(false)
  }

  const startDirectBuild = async (buildPrompt, imageData = null, referenceUrl = null) => {
    if (buildStartedRef.current) return
    buildStartedRef.current = true
    lastBuildPromptRef.current = buildPrompt
    lastBuildPlanRef.current = null
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
      const body = { prompt: buildPrompt, projectId }
      if (imageData) {
        body.referenceImage = { base64: imageData.base64, mimeType: imageData.mimeType }
      }
      if (referenceUrl) {
        body.referenceUrl = referenceUrl
      }
      const res = await fetch(`${API}/api/build/direct`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      })
      const { job_id, error } = await res.json()
      if (error) {
        addMessage('assistant', makeErrorContent({
          message: error,
          details: error,
          retryPrompt: buildPrompt,
          retryAction: 'build',
          retryable: true,
          fixable: true
        }, buildPrompt), 'error')
        buildStartedRef.current = false
        setStage('idle')
        setLoading(false)
        return
      }
      upsertBuildStream({ heading: 'Build job created. Opening live stream...', subtext: '', phase: 'connecting' })
      reconnectAttemptsRef.current = 0
      streamFinishedRef.current = false
      connectToStream(job_id)
    } catch (err) {
      addMessage('assistant', makeErrorContent({
        message: 'Failed to start build.',
        details: err?.message || 'Network request failed while starting the build.',
        retryPrompt: buildPrompt,
        retryAction: 'build',
        retryable: true,
        fixable: true
      }, buildPrompt), 'error')
      buildStartedRef.current = false
      setStage('idle')
      setLoading(false)
    }
  }

  const startBuild = async (buildPlan) => {
    if (buildStartedRef.current) return
    buildStartedRef.current = true
    lastBuildPromptRef.current = buildPlan?.understanding || ''
    lastBuildPlanRef.current = buildPlan
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
        addMessage('assistant', makeErrorContent({
          message: error,
          details: error,
          retryPrompt: buildPlan?.understanding,
          retryAction: 'plan',
          retryable: true,
          fixable: true
        }, buildPlan?.understanding), 'error')
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
    } catch (err) {
      addMessage('assistant', makeErrorContent({
        message: 'Failed to start build.',
        details: err?.message || 'Network request failed while starting the build.',
        retryPrompt: buildPlan?.understanding,
        retryAction: 'plan',
        retryable: true,
        fixable: true
      }, buildPlan?.understanding), 'error')
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
    if (originalPlan?.allow_phases !== true) return
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
    if (loading) return
    if (lastBuildPlanRef.current) {
      startBuild(lastBuildPlanRef.current)
      return
    }
    if (lastBuildPromptRef.current) {
      startDirectBuild(lastBuildPromptRef.current)
      return
    }
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

  const createLineDiff = (before = '', after = '') => {
    const beforeLines = String(before).split('\n')
    const afterLines = String(after).split('\n')
    if (beforeLines.length * afterLines.length > 90000) {
      return [
        ...beforeLines.slice(0, 120).map((text, i) => ({ type: 'remove', oldLine: i + 1, newLine: '', text })),
        ...afterLines.slice(0, 120).map((text, i) => ({ type: 'add', oldLine: '', newLine: i + 1, text }))
      ]
    }

    const dp = Array.from({ length: beforeLines.length + 1 }, () => Array(afterLines.length + 1).fill(0))
    for (let i = beforeLines.length - 1; i >= 0; i--) {
      for (let j = afterLines.length - 1; j >= 0; j--) {
        dp[i][j] = beforeLines[i] === afterLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }

    const rows = []
    let i = 0
    let j = 0
    while (i < beforeLines.length || j < afterLines.length) {
      if (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
        rows.push({ type: 'same', oldLine: i + 1, newLine: j + 1, text: beforeLines[i] })
        i++; j++
      } else if (j < afterLines.length && (i === beforeLines.length || dp[i][j + 1] >= dp[i + 1][j])) {
        rows.push({ type: 'add', oldLine: '', newLine: j + 1, text: afterLines[j] })
        j++
      } else {
        rows.push({ type: 'remove', oldLine: i + 1, newLine: '', text: beforeLines[i] })
        i++
      }
    }

    const keep = new Set()
    rows.forEach((row, index) => {
      if (row.type !== 'same') {
        for (let offset = -3; offset <= 3; offset++) keep.add(index + offset)
      }
    })

    const compact = []
    let skipped = 0
    rows.forEach((row, index) => {
      if (keep.has(index) || rows.length <= 180) {
        if (skipped) {
          compact.push({ type: 'skip', text: `${skipped} unchanged line${skipped === 1 ? '' : 's'} hidden` })
          skipped = 0
        }
        compact.push(row)
      } else {
        skipped++
      }
    })
    if (skipped) compact.push({ type: 'skip', text: `${skipped} unchanged line${skipped === 1 ? '' : 's'} hidden` })
    return compact.slice(0, 260)
  }

  // ── Message renderers ──────────────────────────────────
  const renderMessage = (msg) => {
    if (msg.type === 'build_stream') {
      const c = msg.content || {}
      const iconColor = c.phase === 'done' ? '#10b981' : muted
      const Icon = c.phase === 'code' ? Edit : c.phase === 'done' ? CheckCircle2 : Sparkles

      return (
        <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, color: muted, fontSize: 13, padding: '2px 2px', minWidth: 0 }}>
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
        </div>
      )
    }

    if (msg.type === 'status') return (
      <div key={msg.id} style={{ color: muted, fontSize: 13, padding: '2px 0' }}>
        {msg.content}
      </div>
    )

    if (msg.type === 'thought') return (
      <div key={msg.id} style={{ color: muted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic', padding: '2px 2px' }}>
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
        const error = makeErrorContent(msg.content)
        return (
          <div key={msg.id} style={{ background: d ? 'rgba(188,96,69,0.12)' : 'rgba(188,96,69,0.08)', border: '1px solid rgba(188,96,69,0.22)', borderRadius: 12, padding: '11px 12px', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, color: text, marginBottom: 8, lineHeight: 1.45 }}>
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{error.message}</span>
            </div>
            {error.details && (
              <details style={{ marginBottom: 9, color: muted, fontSize: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Details</summary>
                <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', margin: '7px 0 0', padding: 8, borderRadius: 8, background: d ? '#101010' : '#fff', border: `1px solid ${border}`, fontFamily: 'monospace', fontSize: 11 }}>{error.details}</pre>
              </details>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {error.retryable && (
                <button onClick={() => {
                  if (error.retryAction === 'prompt' && error.retryPrompt) submitPromptText(error.retryPrompt)
                  else if (error.retryAction === 'plan' && lastBuildPlanRef.current) startBuild(lastBuildPlanRef.current)
                  else if (error.retryPrompt) startDirectBuild(error.retryPrompt)
                  else handleRetry()
                }}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#fff', background: '#BC6045', border: '1px solid rgba(188,96,69,0.25)', padding: '6px 10px', borderRadius: 7, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 800 }}>
                  <RefreshCcw size={11} /> Retry
                </button>
              )}
              {error.fixable && (
                <button onClick={() => handleFixError(error)}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: text, background: surface, border: `1px solid ${border}`, padding: '6px 10px', borderRadius: 7, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 800 }}>
                  <Sparkles size={11} /> Fix it
                </button>
              )}
            </div>
          </div>
        )
      })()
    )

    if (msg.type === 'clarify') {
      const c = msg.content
      const missing = c.questions.some(q => {
        const answer = c.answers?.[q.id]
        const customAnswer = c.answers?.[`${q.id}__custom`]
        return q.required && !answer?.length && !customAnswer?.trim()
      })
      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 13, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#BC6045', fontWeight: 700, marginBottom: 10 }}>
            <Sparkles size={14} />
            Need a bit more detail
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {c.questions.map(q => (
              <div key={q.id}>
                <p style={{ color: text, fontWeight: 600, marginBottom: 7, lineHeight: 1.4 }}>{q.question}</p>
                {(q.type === 'single' || q.type === 'multi') && (
                  <div style={{ display: 'grid', gap: 8 }}>
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
                    <input value={c.answers?.[`${q.id}__custom`] || ''}
                      onChange={e => updateClarificationCustomAnswer(msg.id, q, e.target.value)}
                      placeholder="Custom answer..."
                      style={{ width: '100%', background: d ? '#111' : '#fff', border: `1px solid ${border}`, color: text, borderRadius: 9, padding: '8px 10px', fontSize: 12, outline: 'none' }} />
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
              background: 'transparent',
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: '8px 10px',
              cursor: 'pointer',
              color: text,
              textAlign: 'left'
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <CheckCircle2 size={13} style={{ color: muted, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Plan approved
              </span>
            </span>
            <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>View plan</span>
          </button>
        )
      }

      const hasPhases = p.allow_phases === true && p.total_phases > 1 && Array.isArray(p.phases)

      return (
        <div key={msg.id} style={{ background: surface, border: `1px solid ${d ? '#2a1f5e' : '#ede9fe'}`, borderRadius: 14, padding: 14, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#BC6045', fontWeight: 600 }}>
              <Sparkles size={13} />
              {hasPhases && p.current_phase > 1 ? `Phase ${p.current_phase} Plan` : 'Plan Ready'}
            </div>
            {hasPhases && (
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
              {hasPhases ? `Phase ${p.current_phase} Steps` : 'Steps'}
            </p>
            {(hasPhases ? p.phases?.[p.current_phase - 1]?.steps : p.steps)?.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, color: text, alignItems: 'flex-start' }}>
                <ChevronRight size={11} style={{ color: '#BC6045', marginTop: 3, flexShrink: 0 }} />
                <span style={{ lineHeight: 1.4 }}>{step}</span>
              </div>
            ))}
            {hasPhases && p.phases?.slice(p.current_phase).map((ph, i) => (
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
              <Zap size={11} style={{ color: '#BC6045' }} /> Credits shown after build
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

    if (msg.type === 'qa_result') {
      const qa = msg.content || {}
      const issues = qa.issues || []
      return (
        <div key={msg.id} style={{ border: `1px solid ${issues.length ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.25)'}`, background: issues.length ? (d ? 'rgba(245,158,11,0.08)' : '#fffbeb') : (d ? 'rgba(16,185,129,0.08)' : '#ecfdf5'), borderRadius: 12, padding: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: text, fontWeight: 800, marginBottom: 7 }}>
            {issues.length ? <AlertCircle size={14} style={{ color: '#f59e0b' }} /> : <CheckCircle2 size={14} style={{ color: '#10b981' }} />}
            Runtime QA {issues.length ? 'found issues' : 'passed'}
          </div>
          <p style={{ color: d ? '#d4d4d4' : '#444', lineHeight: 1.55, marginBottom: issues.length ? 9 : 0 }}>{qa.summary}</p>
          {issues.slice(0, 5).map((issue, i) => (
            <div key={i} style={{ color: d ? '#d4d4d4' : '#444', fontSize: 12, lineHeight: 1.45, marginBottom: 6 }}>
              <strong>{i + 1}. {issue.message}</strong>
              {issue.details && <div style={{ color: muted, marginTop: 2 }}>{issue.details.slice(0, 180)}</div>}
            </div>
          ))}
          {issues.length > 0 && (
            <button onClick={() => fixRuntimeQaIssues(qa)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, border: 'none', background: '#BC6045', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 800, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}>
              <Sparkles size={12} /> Fix issues
            </button>
          )}
        </div>
      )
    }

    if (msg.type === 'complete') {
      const c = msg.content
      const s = c.summary
      const filesWritten = s?.files_written || c.files_written || []
      const changes = c.changes || {}
      const addedFiles = changes.added_files || []
      const modifiedFiles = changes.modified_files || []
      const removedFiles = changes.removed_files || []
      const fileDiffs = changes.file_diffs || []
      const selectedDiffPath = c.selectedDiffPath || fileDiffs[0]?.path
      const selectedDiff = fileDiffs.find(file => file.path === selectedDiffPath) || fileDiffs[0]
      const diffRows = selectedDiff ? createLineDiff(selectedDiff.before, selectedDiff.after) : []
      const changeCount = addedFiles.length + modifiedFiles.length + removedFiles.length
      const completionDescription = s?.message || s?.description || c.plan?.understanding || 'Your app is live.'
      const isPublished = c.published !== false  // legacy builds treated as published
      return (
        <div key={msg.id} style={{ fontSize: 13 }}>
          <div style={{ marginBottom: 10 }}>

            {/* Title — bold, no green icon */}
            <p style={{ fontWeight: 800, fontSize: 14, color: text, margin: '0 0 8px', letterSpacing: '-0.2px' }}>
              {s?.title || 'Build complete'}
            </p>

            {/* Natural language description */}
            <p style={{ marginBottom: 14, color: d ? '#d4d4d4' : '#3f3a35', fontSize: 13, lineHeight: 1.65 }}>
              {completionDescription}
            </p>

            {/* What's working — plain list, no icons */}
            {(s?.what_works?.length > 0 || s?.features?.length > 0) && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>What's working</p>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(s.what_works || s.features || []).map((f, i) => (
                    <li key={i} style={{ color: d ? '#d4d4d4' : '#444', fontSize: 13, lineHeight: 1.5 }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested next — clickable chips that auto-send */}
            {(s?.suggested_next?.length > 0 || s?.next_steps?.length > 0) && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>What to build next</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(s.suggested_next || s.next_steps || []).map((step, i) => (
                    <button key={i} onClick={() => { setPrompt(step); setTimeout(() => document.querySelector('textarea')?.focus(), 50) }}
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, background: subtle, color: d ? '#d4d4d4' : '#3f3a35', fontSize: 13, cursor: 'pointer', lineHeight: 1.45, fontFamily: 'inherit', transition: 'background 0.15s, border-color 0.15s' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = d ? '#2a2a2a' : '#f0ece6'; ev.currentTarget.style.borderColor = '#BC6045' }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = subtle; ev.currentTarget.style.borderColor = border }}>
                      {step}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Publish / Update notice if not yet published */}
            {!isPublished && c.subdomain && (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(188,96,69,0.07)', border: '1px solid rgba(188,96,69,0.2)' }}>
                <p style={{ margin: 0, fontSize: 12, color: d ? '#d4d4d4' : '#3f3a35', lineHeight: 1.5 }}>
                  <strong>Ready to go live.</strong> Preview the app and click <strong>Publish</strong> when you're happy with it.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setActiveTab('preview'); setPreviewKey(k => k + 1) }}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${border}`, background: surface, color: text, fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Review live preview →
              </button>
            </div>
          </div>

          <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', background: 'transparent', marginBottom: 10 }}>
            <button onClick={() => setMessages(prev => prev.map(m =>
              m.id === msg.id ? { ...m, content: { ...m.content, detailsOpen: !detailsOpen } } : m
            ))}
              style={{ width: '100%', border: 'none', background: 'transparent', color: muted, cursor: 'pointer', padding: '9px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <ChevronRight size={13} style={{ transform: detailsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Build details</span>
                <span style={{ fontSize: 11, color: muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {changeCount || filesWritten.length} change{(changeCount || filesWritten.length) === 1 ? '' : 's'} · {c.credits_used} credits
                </span>
              </span>
              <span style={{ fontSize: 11, flexShrink: 0 }}>{detailsOpen ? 'Hide' : 'View'}</span>
            </button>

            {detailsOpen && (
              <div style={{ padding: '0 11px 11px', borderTop: `1px solid ${border}` }}>
                <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
                  {[
                    { id: 'changes', label: 'Changes' },
                    { id: 'diff', label: 'Diff' },
                    { id: 'files', label: 'Files' },
                    { id: 'activity', label: 'Activity' }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setMessages(prev => prev.map(m =>
                      m.id === msg.id ? { ...m, content: { ...m.content, detailsTab: tab.id } } : m
                    ))}
                      style={{ flex: 1, border: `1px solid ${detailsTab === tab.id ? 'rgba(188,96,69,0.35)' : border}`, background: detailsTab === tab.id ? 'rgba(188,96,69,0.1)' : 'transparent', color: detailsTab === tab.id ? '#BC6045' : muted, borderRadius: 7, padding: '6px 0', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailsTab === 'changes' && (
                  <div style={{ marginTop: 10 }}>
                    {changeCount > 0 ? (
                      [
                        { label: 'Added', files: addedFiles, color: '#10b981' },
                        { label: 'Modified', files: modifiedFiles, color: '#3b82f6' },
                        { label: 'Removed', files: removedFiles, color: '#ef4444' }
                      ].filter(group => group.files.length > 0).map(group => (
                        <div key={group.label} style={{ marginBottom: 8 }}>
                          <p style={{ fontWeight: 800, marginBottom: 5, fontSize: 11, color: group.color }}>{group.label}</p>
                          {group.files.map(file => (
                            <div key={file} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <FileCode size={11} style={{ color: group.color }} />
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{file}</span>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p style={{ color: muted, fontSize: 12, marginTop: 4 }}>No source file changes were detected for this build.</p>
                    )}
                  </div>
                )}

                {detailsTab === 'diff' && (
                  <div style={{ marginTop: 10 }}>
                    {fileDiffs.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          {fileDiffs.map(file => {
                            const active = file.path === selectedDiff?.path
                            const statusColor = file.status === 'added' ? '#10b981' : file.status === 'removed' ? '#ef4444' : '#3b82f6'
                            return (
                              <button key={file.path} onClick={() => setMessages(prev => prev.map(m =>
                                m.id === msg.id ? { ...m, content: { ...m.content, selectedDiffPath: file.path } } : m
                              ))}
                                style={{ border: `1px solid ${active ? statusColor : border}`, background: active ? (d ? '#1f1f1f' : '#fff') : 'transparent', color: active ? text : muted, borderRadius: 7, padding: '5px 7px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {file.status[0].toUpperCase()} {file.path}
                              </button>
                            )
                          })}
                        </div>
                        {selectedDiff?.truncated && (
                          <p style={{ color: muted, fontSize: 11, marginBottom: 7 }}>Large file diff truncated for chat display. Open the Code tab for the full file.</p>
                        )}
                        <div style={{ border: `1px solid ${border}`, borderRadius: 8, overflow: 'auto', maxHeight: 260, background: d ? '#0d1117' : '#f8fafc' }}>
                          {diffRows.map((row, i) => {
                            const isAdd = row.type === 'add'
                            const isRemove = row.type === 'remove'
                            const isSkip = row.type === 'skip'
                            return (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: isSkip ? '1fr' : '34px 34px 1fr', gap: 0, minWidth: 0, background: isAdd ? 'rgba(16,185,129,0.08)' : isRemove ? 'rgba(239,68,68,0.08)' : 'transparent', color: isSkip ? muted : text, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.45 }}>
                                {isSkip ? (
                                  <span style={{ padding: '4px 8px', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>{row.text}</span>
                                ) : (
                                  <>
                                    <span style={{ padding: '2px 5px', color: muted, textAlign: 'right', userSelect: 'none' }}>{row.oldLine}</span>
                                    <span style={{ padding: '2px 5px', color: muted, textAlign: 'right', userSelect: 'none' }}>{row.newLine}</span>
                                    <span style={{ padding: '2px 8px', whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isAdd ? '+ ' : isRemove ? '- ' : '  '}{row.text || ' '}</span>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <p style={{ color: muted, fontSize: 12 }}>Diffs will appear for builds created after this update.</p>
                    )}
                  </div>
                )}

                {detailsTab === 'files' && (
                  <div style={{ marginTop: 10 }}>
                    {filesWritten.length > 0 ? filesWritten.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <FileCode size={11} style={{ color: '#3b82f6' }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: muted }}>{f}</span>
                      </div>
                    )) : (
                      <p style={{ color: muted, fontSize: 12 }}>No files recorded.</p>
                    )}
                    {s?.tech?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                        {s.tech.map((t, i) => (
                          <span key={i} style={{ fontSize: 11, background: d ? '#222' : '#f0f0f0', color: muted, padding: '2px 8px', borderRadius: 5 }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {detailsTab === 'activity' && (
                  <div style={{ marginTop: 10 }}>
                    {detailsLog.length > 0 ? detailsLog.slice(-8).map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5, fontSize: 11 }}>
                        <span style={{ flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ color: item.color || text, flex: 1, lineHeight: 1.4 }}>{item.msg}</span>
                      </div>
                    )) : (
                      <p style={{ color: muted, fontSize: 12 }}>Activity log is available while the build is running.</p>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: muted, fontSize: 12, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${border}` }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Zap size={11} style={{ color: '#BC6045' }} /> {c.credits_used} credits used
                  </span>
                  <button onClick={() => setActiveTab('details')}
                    style={{ border: `1px solid ${border}`, background: 'transparent', color: text, borderRadius: 7, padding: '5px 9px', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                    Activity log
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ color: text, lineHeight: 1.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', color: muted, fontSize: 12, paddingTop: 2 }}>
              <a href={'https://' + c.subdomain + '.44gen.com'} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#BC6045', textDecoration: 'none', fontSize: 12 }}>
                <Globe size={11} /> {c.subdomain}.44gen.com <ExternalLink size={10} />
              </a>
            </div>

            {c.plan?.allow_phases === true && c.total_phases > 1 && c.phase < c.total_phases && (
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
        </div>
      )
    }

    // Regular user/assistant message
    return (
      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
        <div style={{
          maxWidth: '85%', borderRadius: 14, padding: msg.role === 'user' ? '9px 13px' : '2px 2px', fontSize: 13, lineHeight: 1.5,
          background: msg.role === 'user' ? userBubble : 'transparent',
          color: text,
          border: msg.role === 'user' ? `1px solid ${border}` : 'none'
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
          {previewUrl && (
            <button onClick={openVersions}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: muted, padding: '3px 10px', borderRadius: 7, background: subtle, border: `1px solid ${border}`, cursor: 'pointer' }}>
              <RefreshCcw size={11} /> Versions
            </button>
          )}
          <button onClick={toggleDarkMode}
            style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {previewUrl && (
            <button onClick={() => { const opening = !showPublishPanel; setShowPublishPanel(v => !v); if (opening) loadDomains() }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#BC6045,#9f4d38)', padding: '6px 13px', borderRadius: 9, border: 'none', cursor: 'pointer', boxShadow: '0 8px 18px rgba(188,96,69,0.22)' }}>
              <Globe size={11} /> <span className="hide-xs">{project?.status === "deployed" ? "Update" : "Publish"}</span>
            </button>
          )}
          {showPublishPanel && <div onClick={() => setShowPublishPanel(false)} style={{ position: 'fixed', inset: 0, zIndex: 80 }} />}
          {showPublishPanel && previewUrl && (
            <div style={{ position: 'absolute', right: 54, top: 48, width: 380, background: surface, border: `1px solid ${border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 100, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: text }}>
                    {project?.status === 'deployed' ? 'Your app is live' : 'Ready to publish'}
                  </h3>
                  <p style={{ fontSize: 12, color: muted, marginTop: 3, margin: '3px 0 0' }}>
                    {project?.status === 'deployed'
                      ? 'A new version is ready — publish to update the live URL.'
                      : 'Preview looks good? Click Publish to make it live.'}
                  </p>
                </div>
                {project?.status === 'deployed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 100, padding: '4px 10px', flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Live
                  </div>
                )}
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* URL row */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: text }}>44Gen URL</span>
                  </div>
                  <button onClick={copyPreviewUrl} style={{ width: '100%', minHeight: 44, borderRadius: 10, border: `1px solid ${border}`, background: subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', gap: 8 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, color: text }}>{previewUrl.replace('https://', '')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: copiedUrl ? '#059669' : muted, fontSize: 12, flexShrink: 0 }}>
                      {copiedUrl ? <CheckCircle2 size={13} /> : <Copy size={13} />} {copiedUrl ? 'Copied' : 'Copy'}
                    </span>
                  </button>
                </div>

                {/* Custom domain */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Custom domain</span>
                    {!showDomainInput && (
                      <button onClick={() => setShowDomainInput(true)} style={{ fontSize: 11, color: '#BC6045', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                        + Add domain
                      </button>
                    )}
                  </div>
                  {showDomainInput ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        placeholder="yourdomain.com"
                        value={domainInput}
                        onChange={ev => { setDomainInput(ev.target.value); setDomainError('') }}
                        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: subtle, color: text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        autoFocus
                      />
                      {domainError && <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{domainError}</p>}
                      <div style={{ display: 'flex', gap: 7 }}>
                        <button onClick={addCustomDomain} disabled={domainSaving || !domainInput.trim()}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#BC6045', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: domainSaving || !domainInput.trim() ? 0.5 : 1 }}>
                          {domainSaving ? 'Saving...' : 'Add'}
                        </button>
                        <button onClick={() => { setShowDomainInput(false); setDomainInput(''); setDomainError('') }}
                          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'none', color: muted, fontSize: 12, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : domains.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {domains.map(dom => (
                        <div key={dom.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: subtle, border: `1px solid ${border}` }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: dom.status === 'verified' ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 12, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dom.domain}</span>
                          <span style={{ fontSize: 10, color: dom.status === 'verified' ? '#059669' : '#d97706', fontWeight: 700, flexShrink: 0 }}>
                            {dom.status === 'verified' ? 'Verified' : 'Pending DNS'}
                          </span>
                          {dom.status === 'pending' && (
                            <button onClick={() => verifyDomain(dom)} style={{ fontSize: 10, color: '#BC6045', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, flexShrink: 0 }}>
                              Verify
                            </button>
                          )}
                        </div>
                      ))}
                      {domainInstructions && (
                        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(188,96,69,0.06)', border: '1px solid rgba(188,96,69,0.18)', fontSize: 11, color: d ? '#d4d4d4' : '#3f3a35', lineHeight: 1.6 }}>
                          <p style={{ fontWeight: 700, margin: '0 0 6px' }}>Add these DNS records:</p>
                          <p style={{ margin: '0 0 3px' }}>TXT <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: 3 }}>_44gen-verify.{domainInstructions.step1?.name?.split('.').slice(1).join('.')}</code></p>
                          <p style={{ margin: '0 0 3px', wordBreak: 'break-all' }}>Value: <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>{domainInstructions.step1?.value}</code></p>
                          <p style={{ margin: '6px 0 3px' }}>CNAME <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: 3 }}>www</code> → <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 4px', borderRadius: 3 }}>{domainInstructions.step2?.value}</code></p>
                          <p style={{ margin: '6px 0 0', color: muted }}>DNS can take up to 48h. Click Verify once records are added.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: muted, margin: 0 }}>No custom domains added yet.</p>
                  )}
                </div>

                {/* Visibility */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10, background: subtle, border: `1px solid ${border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Shield size={16} style={{ color: muted }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: 0 }}>Public</p>
                    <p style={{ fontSize: 11, color: muted, marginTop: 2, margin: '2px 0 0' }}>Anyone with the link can view your app.</p>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${border}`, background: 'none', color: text, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <ExternalLink size={12} /> Open
                  </a>
                  <button onClick={handlePublish} disabled={publishLoading}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#d18a74,#BC6045)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: publishLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {publishLoading
                      ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Publishing...</>
                      : project?.status === 'deployed' ? '⬆ Update live' : '🚀 Publish'}
                  </button>
                </div>
                {publishError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{publishError}</p>}
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
                  {/* Hidden file input */}
                  <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageAttach} style={{ display: 'none' }} />

                  {/* Attach button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      title="Attach image or reference URL"
                      disabled={loading || stage === 'building' || stage === 'awaiting_approval'}
                      onClick={() => setShowUrlInput(prev => !prev)}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${border}`, background: attachedImage || attachedUrl ? '#BC6045' : surface, color: attachedImage || attachedUrl ? '#fff' : muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <Plus size={15} />
                    </button>

                    {/* Dropdown: Image upload or URL */}
                    {showUrlInput && (
                      <div style={{ position: 'absolute', bottom: 40, left: 0, background: d ? '#1a1a1a' : '#fff', border: `1px solid ${border}`, borderRadius: 14, padding: 12, width: 260, zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attach reference</div>

                        {/* Image upload option */}
                        <button onClick={() => { imageInputRef.current?.click(); setShowUrlInput(false) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: text, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}>
                          🖼️ Upload image
                          <span style={{ fontSize: 11, color: muted, marginLeft: 'auto' }}>PNG, JPG, etc</span>
                        </button>

                        {/* URL input */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={attachedUrl}
                            onChange={e => setAttachedUrl(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { handleAttachUrl(); setShowUrlInput(false) } }}
                            placeholder="Paste design URL..."
                            style={{ flex: 1, background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, color: text, outline: 'none' }}
                          />
                          <button onClick={() => { handleAttachUrl(); setShowUrlInput(false) }}
                            style={{ padding: '8px 10px', borderRadius: 8, background: '#BC6045', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attached image preview chip */}
                  {attachedImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: d ? '#1a1a1a' : '#f5f0eb', border: `1px solid ${border}`, borderRadius: 999, padding: '4px 8px 4px 4px', maxWidth: 160 }}>
                      <img src={attachedImage.preview} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{attachedImage.name}</span>
                      <button onClick={handleRemoveImage} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: 0, display: 'flex', fontSize: 14, lineHeight: 1 }}>×</button>
                    </div>
                  )}

                  {/* Attached URL chip */}
                  {attachedUrl && !showUrlInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: d ? '#1a1a1a' : '#f5f0eb', border: `1px solid ${border}`, borderRadius: 999, padding: '4px 10px', maxWidth: 160 }}>
                      <span style={{ fontSize: 12 }}>🔗</span>
                      <span style={{ fontSize: 11, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{attachedUrl.replace('https://', '')}</span>
                      <button onClick={() => setAttachedUrl('')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', padding: 0, display: 'flex', fontSize: 14, lineHeight: 1 }}>×</button>
                    </div>
                  )}
                  <button
                    onClick={toggleVisualEdit}
                    disabled={!previewUrl || loading || stage === 'building'}
                    title={previewUrl ? (visualEditMode ? 'Exit visual edit mode' : 'Click elements to edit them visually') : 'Build your app first'}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, borderRadius: 999, border: `1px solid ${visualEditMode ? '#BC6045' : border}`, background: visualEditMode ? 'rgba(188,96,69,0.1)' : surface, color: visualEditMode ? '#BC6045' : (!previewUrl || loading ? muted : text), padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: previewUrl && !loading && stage !== 'building' ? 'pointer' : 'default', opacity: !previewUrl || loading ? 0.5 : 1, transition: 'all 0.2s' }}>
                    <Sparkles size={13} /> {visualEditMode ? 'Exit visual' : 'Visual edits'}
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
                Planning uses ~0.5 cr · Build cost depends on app size
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
                { id: 'secrets', icon: <Key size={12} />, label: 'Secrets', badge: secrets.length || undefined },
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
                <button onClick={runRuntimeQaForApp}
                  disabled={!previewUrl || runtimeQaLoading || loading}
                  title={isPaidPlan ? 'Run Runtime QA' : 'Runtime QA is available on Pro and Business plans'}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, borderRadius: 999, border: `1px solid ${border}`, background: isPaidPlan ? surface : subtle, color: isPaidPlan ? '#BC6045' : muted, padding: '0 10px', fontSize: 11, fontWeight: 800, cursor: previewUrl && !runtimeQaLoading && !loading ? 'pointer' : 'default', opacity: previewUrl ? 1 : 0.55 }}>
                  {runtimeQaLoading ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={12} />}
                  Test app
                </button>
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
                      <BrandLoader label="Loading preview" tone={d ? 'dark' : 'light'} size={44} />
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
                    ref={iframeRef}
                    src={previewUrl ? `${previewUrl}?__44gen_preview=1&v=${previewKey}` : previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none', opacity: iframeStatus === 'loaded' ? 1 : 0, cursor: visualEditMode ? 'crosshair' : 'default' }}
                    title="Preview"
                    onLoad={() => {
                      setIframeStatus('loaded')
                      // Re-enable inspect if visual edit mode was active
                      if (visualEditMode) {
                        setTimeout(() => {
                          try { iframeRef.current?.contentWindow?.postMessage({ type: '__44gen_inspect_on__' }, '*') } catch {}
                        }, 300)
                      }
                    }}
                    onError={() => setIframeStatus('error')}
                  />

                  {/* Visual edit mode overlay indicator */}
                  {visualEditMode && iframeStatus === 'loaded' && (
                    <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#BC6045', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 100, pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 12px rgba(188,96,69,0.4)' }}>
                      Click any element to edit
                    </div>
                  )}

                  {/* Visual edit panel */}
                  {visualPanel.visible && selectedElement && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: d ? '#1a1a1a' : '#fff', border: `1px solid ${border}`, borderRadius: 20, padding: '20px 20px 16px', width: 340, zIndex: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxHeight: '80vh', overflowY: 'auto' }}>

                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: text }}>Edit element</div>
                          <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', marginTop: 2 }}>{selectedElement.tag}</div>
                        </div>
                        <button onClick={dismissVisualPanel} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>

                      {/* Tabs */}
                      <div style={{ display: 'flex', gap: 4, background: d ? '#111' : '#f5f2ee', borderRadius: 10, padding: 4, marginBottom: 16 }}>
                        {['style', 'image'].map(tab => (
                          <button key={tab} onClick={() => setVisualTab(tab)} style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: visualTab === tab ? (d ? '#2a2a2a' : '#fff') : 'transparent', color: visualTab === tab ? text : muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', boxShadow: visualTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                            {tab === 'style' ? '🎨 Style' : '🖼️ Image'}
                          </button>
                        ))}
                      </div>

                      {/* Style tab */}
                      {visualTab === 'style' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {selectedElement.text && (
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text content</label>
                              <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ width: '100%', background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: text, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Text color</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px' }}>
                                <input type="color" value={editColor.startsWith('rgb') ? '#ffffff' : (editColor || '#000000')} onChange={e => setEditColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                                <input value={editColor} onChange={e => setEditColor(e.target.value)} placeholder="color" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: text, fontFamily: 'monospace' }} />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Background</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px' }}>
                                <input type="color" value={editBgColor.startsWith('rgb') ? '#ffffff' : (editBgColor || '#ffffff')} onChange={e => setEditBgColor(e.target.value)} style={{ width: 20, height: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                                <input value={editBgColor} onChange={e => setEditBgColor(e.target.value)} placeholder="bg color" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 11, color: text, fontFamily: 'monospace' }} />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Font size</label>
                            <input value={editFontSize} onChange={e => setEditFontSize(e.target.value)} placeholder="e.g. 24px or text-2xl" style={{ width: '100%', background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: text, outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <button onClick={dismissVisualPanel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={applyVisualEdit} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#BC6045', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(188,96,69,0.3)' }}>Apply with AI ✦</button>
                          </div>
                        </div>
                      )}

                      {/* Image tab */}
                      {visualTab === 'image' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                          {/* Upload own image — free for all */}
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: muted, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload your image</label>
                            <input ref={imageUploadRef} type="file" accept="image/*" onChange={handleVisualImageUpload} style={{ display: 'none' }} />
                            <button onClick={() => imageUploadRef.current?.click()} disabled={imageUploading} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: `2px dashed ${border}`, background: 'transparent', color: text, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#BC6045'} onMouseLeave={e => e.currentTarget.style.borderColor = border}>
                              {imageUploading ? '⏳ Uploading...' : '📁 Upload image (PNG, JPG, WebP)'}
                            </button>
                            <div style={{ fontSize: 11, color: muted, textAlign: 'center', marginTop: 5 }}>Free for all plans · Max 5MB</div>
                          </div>

                          {/* Divider */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 1, background: border }} />
                            <span style={{ fontSize: 11, color: muted, fontWeight: 600 }}>or search stock photos</span>
                            <div style={{ flex: 1, height: 1, background: border }} />
                          </div>

                          {/* Pexels search — paid only */}
                          {pexelsError === 'upgrade_required' ? (
                            <div style={{ background: d ? '#1a1208' : '#fffbf0', border: `1px solid #f59e0b`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ fontSize: 20, marginBottom: 8 }}>✨</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>Pro feature</div>
                              <div style={{ fontSize: 12, color: muted, marginBottom: 12, lineHeight: 1.6 }}>Stock photo search is available on Pro and Business plans. Upgrade to access millions of high-quality photos.</div>
                              <button onClick={() => window.open('/pricing', '_blank')} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#BC6045', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View plans →</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                  value={pexelsQuery}
                                  onChange={e => setPexelsQuery(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && searchPexels(pexelsQuery)}
                                  placeholder="Search millions of photos..."
                                  style={{ flex: 1, background: d ? '#111' : '#fafafa', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: text, outline: 'none' }}
                                />
                                <button onClick={() => searchPexels(pexelsQuery)} disabled={pexelsLoading} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#BC6045', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                  {pexelsLoading ? '...' : '🔍'}
                                </button>
                              </div>

                              {/* Quick search tags */}
                              {!pexelsResults.length && !pexelsLoading && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {['team working', 'modern office', 'technology', 'nature', 'city', 'abstract'].map(tag => (
                                    <button key={tag} onClick={() => { setPexelsQuery(tag); searchPexels(tag) }} style={{ padding: '4px 10px', borderRadius: 100, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#BC6045'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#BC6045' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; e.currentTarget.style.borderColor = border }}>
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {pexelsError && pexelsError !== 'upgrade_required' && (
                                <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{pexelsError}</div>
                              )}

                              {/* Photo grid */}
                              {pexelsResults.length > 0 && (
                                <div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                                    {pexelsResults.map(photo => (
                                      <div key={photo.id} onClick={() => setSelectedPexelsPhoto(photo)} style={{ aspectRatio: '16/10', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${selectedPexelsPhoto?.id === photo.id ? '#BC6045' : 'transparent'}`, transition: 'all 0.15s', position: 'relative' }}>
                                        <img src={photo.urls.small} alt={photo.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {selectedPexelsPhoto?.id === photo.id && (
                                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(188,96,69,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#BC6045', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✓</div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {selectedPexelsPhoto && (
                                    <div style={{ background: d ? '#111' : '#f5f2ee', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Selected: <strong style={{ color: text }}>{selectedPexelsPhoto.alt || 'Photo'}</strong></div>
                                      <div style={{ fontSize: 10, color: muted }}>By {selectedPexelsPhoto.photographer} · Pexels</div>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={dismissVisualPanel} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                    <button onClick={() => selectedPexelsPhoto && applyImageToElement(selectedPexelsPhoto.urls.large, selectedPexelsPhoto.alt)} disabled={!selectedPexelsPhoto} style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: selectedPexelsPhoto ? '#BC6045' : (d ? '#222' : '#e0ddd8'), color: selectedPexelsPhoto ? '#fff' : muted, fontSize: 13, fontWeight: 700, cursor: selectedPexelsPhoto ? 'pointer' : 'default', boxShadow: selectedPexelsPhoto ? '0 4px 12px rgba(188,96,69,0.3)' : 'none' }}>
                                      Use this photo ✦
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
            <CodePanel
              codeFiles={codeFiles}
              fullCode={fullCode}
              selectedCodeFile={selectedCodeFile}
              setSelectedCodeFile={setSelectedCodeFile}
              codeFilesLoading={codeFilesLoading}
              loadProjectFiles={loadProjectFiles}
              downloadProjectZip={downloadProjectZip}
              downloadingProject={downloadingProject}
              openGitHubExport={openGitHubExport}
              copiedFile={copiedFile}
              setCopiedFile={setCopiedFile}
              onSaveFile={saveCodeFileAndBuild}
              savingFile={savingCodeFile}
              darkMode={d}
              text={text}
              muted={muted}
            />
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

          {activeTab === 'secrets' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(188,96,69,0.07)', border: '1px solid rgba(188,96,69,0.18)', borderRadius: 10, padding: '10px 12px', marginBottom: 20 }}>
                <Info size={14} style={{ color: '#BC6045', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: d ? '#d4d4d4' : '#5c4a3a', lineHeight: 1.55, margin: 0 }}>
                  Secrets are encrypted and injected as <code style={{ background: d ? '#2a2a2a' : '#f0ece6', borderRadius: 3, padding: '1px 4px', fontSize: 11 }}>import.meta.env.VITE_KEY_NAME</code> at build time. Values are never shown after saving. <strong>Rebuild your app after adding or changing a secret.</strong>
                </p>
              </div>
              <p style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 10 }}>Add secret</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <input
                  placeholder="KEY_NAME (e.g. STRIPE_KEY)"
                  value={newSecretKey}
                  onChange={ev => { setNewSecretKey(ev.target.value.toUpperCase().replace(/\s+/g, '_')); setSecretError(''); setSecretSuccess('') }}
                  style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: subtle, color: text, fontSize: 13, fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSecretVal ? 'text' : 'password'}
                    placeholder="Value"
                    value={newSecretVal}
                    onChange={ev => { setNewSecretVal(ev.target.value); setSecretError(''); setSecretSuccess('') }}
                    style={{ padding: '9px 36px 9px 12px', borderRadius: 8, border: `1px solid ${border}`, background: subtle, color: text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button onClick={() => setShowSecretVal(v => !v)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 2, display: 'flex' }}>
                    <EyeOff size={13} />
                  </button>
                </div>
                {secretError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{secretError}</p>}
                {secretSuccess && <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>{secretSuccess}</p>}
                <button onClick={saveSecret} disabled={secretSaving || !newSecretKey || !newSecretVal}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 8, border: 'none', background: '#BC6045', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: secretSaving || !newSecretKey || !newSecretVal ? 0.5 : 1, width: '100%' }}>
                  {secretSaving ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={13} />}
                  {secretSaving ? 'Saving...' : 'Save secret'}
                </button>
              </div>
              <p style={{ fontSize: 12, fontWeight: 800, color: text, marginBottom: 10 }}>
                Saved secrets {secrets.length > 0 && <span style={{ fontWeight: 400, color: muted }}>({secrets.length})</span>}
              </p>
              {secretsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: muted, fontSize: 12 }}>
                  <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading...
                </div>
              ) : secrets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: muted }}>
                  <Key size={20} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, margin: 0 }}>No secrets saved yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {secrets.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: subtle, border: `1px solid ${border}` }}>
                      <Key size={12} style={{ color: '#BC6045', flexShrink: 0 }} />
                      <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.key_name}</code>
                      <span style={{ fontSize: 11, color: muted }}>••••••</span>
                      <button onClick={() => deleteSecret(s.key_name)} title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 2, display: 'flex' }}
                        onMouseEnter={ev => ev.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={ev => ev.currentTarget.style.color = muted}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <VersionHistoryModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        versions={versions}
        loading={versionsLoading}
        rollbackLoading={rollbackLoading}
        onRollback={rollbackToVersion}
        border={border}
        surface={surface}
        text={text}
        muted={muted}
      />

      <GitHubExportModal
        open={githubExportOpen}
        onClose={() => setGithubExportOpen(false)}
        connection={githubConnection}
        connecting={githubConnecting}
        exporting={githubExporting}
        form={githubExportForm}
        setForm={setGithubExportForm}
        error={githubExportError}
        result={githubExportResult}
        repos={githubRepos}
        reposLoading={githubReposLoading}
        onConnect={startGitHubConnect}
        onDisconnect={disconnectGitHub}
        onExport={handleGitHubExport}
        darkMode={d}
        surface={surface}
        border={border}
        text={text}
        muted={muted}
      />

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
