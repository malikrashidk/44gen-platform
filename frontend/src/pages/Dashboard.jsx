import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Activity, CheckCircle2, CreditCard, ExternalLink, FileCode, GitBranch, Home,
  Loader2, LogOut, Moon, Plus, Settings, Sparkles, Sun, Trash2, User, Zap
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL

function DeleteModal({ projectName, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, width: 340, boxShadow: '0 24px 80px rgba(15,23,42,0.2)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Delete project?</h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.55, margin: '0 0 20px' }}>
          <strong style={{ color: '#111827' }}>{projectName}</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, session, signOut, fetchProfile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeView, setActiveView] = useState('projects')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('44gen-dark-mode')
    return saved !== null ? saved === 'true' : false
  })
  const [billingLoading, setBillingLoading] = useState(false)
  const [githubConnection, setGithubConnection] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const navigate = useNavigate()

  const d = darkMode
  const brandGradient = d
    ? 'linear-gradient(135deg,#73d8ff,#7df1c7,#ffca7a)'
    : 'linear-gradient(135deg,#0ea5e9,#10b981,#f59e0b)'
  const colors = {
    bg: d ? '#0b0d10' : '#f6f8fb',
    sidebar: d ? '#101419' : '#ffffff',
    surface: d ? '#151a21' : '#ffffff',
    line: d ? '#222a35' : '#e6eaf0',
    text: d ? '#f6f7fb' : '#101827',
    muted: d ? '#97a1af' : '#667085',
    faint: d ? '#1a2029' : '#eef3f8',
    accent: '#0ea5e9',
    mint: '#10b981',
    amber: '#f59e0b',
    grad: brandGradient,
  }

  useEffect(() => {
    if (user) {
      fetchProjects()
      fetchProfile(user.id)
    }
  }, [user])

  useEffect(() => {
    if (user && session?.access_token) {
      loadGithubConnection()
    }
  }, [user, session?.access_token])

  const deployed = projects.filter(project => project.status === 'deployed').length
  const building = projects.filter(project => project.status === 'building').length
  const plan = String(profile?.plan || 'free').toLowerCase()
  const planCredits = plan === 'business' ? 260 : plan === 'pro' ? 100 : 10
  const creditsUsed = Math.max(0, planCredits - Number(profile?.credits || 0))
  const usagePct = Math.min(100, Math.round((creditsUsed / planCredits) * 100))

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'
  const userInitial = (profile?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()

  const navItems = useMemo(() => [
    { id: 'projects', label: 'Projects', icon: Home },
    { id: 'usage', label: 'Usage', icon: Activity },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'connectors', label: 'Connectors', icon: GitBranch },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ], [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('44gen-dark-mode', String(next))
  }

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error) setProjects(data || [])
    setLoading(false)
  }

  const loadGithubConnection = async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${API}/api/github/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setGithubConnection(data.connected ? data : null)
    } catch {
      setGithubConnection(null)
    }
  }

  useEffect(() => {
    const handleGithubOAuthMessage = event => {
      if (event.data?.type !== '44gen_github_oauth') return
      setGithubLoading(false)
      if (event.data.ok) loadGithubConnection()
    }
    window.addEventListener('message', handleGithubOAuthMessage)
    return () => window.removeEventListener('message', handleGithubOAuthMessage)
  }, [session?.access_token])

  const startGithubConnect = async () => {
    if (!session?.access_token) return
    setGithubLoading(true)
    try {
      const res = await fetch(`${API}/api/github/connect/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ origin: window.location.origin })
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not connect GitHub')
      const popup = window.open(data.url, '44gen-github-oauth', 'width=600,height=700,scrollbars=yes')
      if (!popup) throw new Error('Popup was blocked')
      window.setTimeout(() => {
        setGithubLoading(false)
        loadGithubConnection()
      }, 120000)
    } catch (err) {
      console.error(err.message)
      setGithubLoading(false)
    }
  }

  const disconnectGithub = async () => {
    if (!session?.access_token) return
    setGithubLoading(true)
    try {
      await fetch(`${API}/api/github/connection`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setGithubConnection(null)
    } catch (err) {
      console.error(err.message)
    } finally {
      setGithubLoading(false)
    }
  }

  const createProject = async () => {
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ user_id: user.id, name: 'Untitled App', prompt: '', status: 'draft' })
        .select().single()
      if (error) throw error
      navigate(`/editor/${data.id}`)
    } catch (err) {
      console.error('Failed to create project:', err.message)
    } finally {
      setCreating(false)
    }
  }

  const executeDelete = async () => {
    const { id } = deleteTarget
    setDeleteTarget(null)
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(project => project.id !== id))
  }

  const openBilling = async () => {
    if (!session?.access_token) return
    if ((profile?.plan || 'free') === 'free') {
      navigate('/pricing')
      return
    }
    setBillingLoading(true)
    try {
      const res = await fetch(`${API}/api/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal')
      window.location.href = data.url
    } catch {
      navigate('/pricing')
    } finally {
      setBillingLoading(false)
    }
  }

  const statusStyle = (status) => {
    if (status === 'deployed') return { bg: 'rgba(16,185,129,0.1)', color: colors.mint }
    if (status === 'building') return { bg: 'rgba(245,158,11,0.12)', color: colors.amber }
    return { bg: colors.faint, color: colors.muted }
  }

  const card = {
    background: colors.surface,
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    boxShadow: d ? 'none' : '0 14px 42px rgba(16,24,40,0.06)'
  }

  const primaryButton = {
    background: colors.grad,
    color: d ? '#071016' : '#fff',
    border: 'none',
    borderRadius: 12,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: d ? '0 12px 30px rgba(115,216,255,0.16)' : '0 12px 30px rgba(14,165,233,0.16)'
  }

  const renderProjects = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: 0 }}>Projects</h1>
          <p style={{ color: colors.muted, fontSize: 14, margin: '6px 0 0' }}>{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button onClick={createProject} disabled={creating}
          style={{ ...primaryButton, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', fontSize: 13, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1 }}>
          {creating ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={15} />} {creating ? 'Creating...' : 'New project'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 22 }}>
        {[
          ['Total projects', projects.length, FileCode, colors.accent],
          ['Deployed', deployed, CheckCircle2, colors.mint],
          ['Building', building, Zap, colors.amber],
          ['Credits left', profile?.credits ?? 0, Activity, colors.accent],
        ].map(([label, value, Icon, color]) => (
          <div key={label} style={{ ...card, padding: 18 }}>
            <Icon size={18} color={color} />
            <div style={{ fontSize: 26, fontWeight: 850, marginTop: 10 }}>{value}</div>
            <div style={{ color: colors.muted, fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ ...card, minHeight: 156, padding: 18, background: colors.faint }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ ...card, padding: 58, textAlign: 'center' }}>
          <Sparkles size={28} color={colors.accent} />
          <h3 style={{ fontSize: 20, margin: '14px 0 6px' }}>No projects yet</h3>
          <p style={{ color: colors.muted, margin: '0 auto 20px', maxWidth: 360 }}>Create your first app and 44Gen will open the editor with a live build flow.</p>
          <button onClick={createProject} style={{ ...primaryButton, padding: '10px 16px' }}>Create your first app</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
          {projects.map(project => {
            const s = statusStyle(project.status)
            return (
              <div key={project.id} onClick={() => navigate(`/editor/${project.id}`)}
                style={{ ...card, padding: 18, minHeight: 162, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{project.name}</h3>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }) }}
                      style={{ color: colors.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.55, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.prompt || 'No description yet'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, padding: '4px 8px', borderRadius: 999, textTransform: 'capitalize' }}>{project.status}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: colors.muted, fontSize: 11 }}>
                    {project.subdomain && (
                      <a href={`https://${project.subdomain}.44gen.com`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: colors.muted, display: 'flex' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  const renderPanel = () => {
    if (activeView === 'projects') return renderProjects()

    if (activeView === 'usage') return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Usage</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>Track credits and active build capacity.</p>
        <div style={{ ...card, padding: 24, maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong>{creditsUsed.toFixed(1)} used</strong>
            <span style={{ color: colors.muted }}>{profile?.credits ?? 0} remaining of {planCredits}</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: colors.faint, overflow: 'hidden' }}>
            <div style={{ width: `${usagePct}%`, height: '100%', background: colors.grad }} />
          </div>
        </div>
      </div>
    )

    if (activeView === 'billing') return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Billing</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>Manage your plan and Polar subscription.</p>
        <div style={{ ...card, padding: 24, maxWidth: 680 }}>
          <div style={{ textTransform: 'capitalize', fontWeight: 850, fontSize: 22 }}>{profile?.plan || 'free'} plan</div>
          <p style={{ color: colors.muted }}>{profile?.credits ?? 0} credits available. Runtime QA and GitHub export are best on paid plans.</p>
          <button onClick={openBilling} disabled={billingLoading} style={{ ...primaryButton, padding: '10px 16px', cursor: billingLoading ? 'default' : 'pointer', opacity: billingLoading ? 0.7 : 1 }}>
            {billingLoading ? 'Opening...' : plan === 'free' ? 'View plans' : 'Manage billing'}
          </button>
        </div>
      </div>
    )

    if (activeView === 'connectors') return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Connectors</h1>
        <p style={{ color: colors.muted, marginTop: 0 }}>Connect services 44Gen can use today.</p>
        <div style={{ ...card, padding: 24, maxWidth: 720, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: colors.faint, display: 'grid', placeItems: 'center' }}><GitBranch size={20} /></div>
            <div>
              <strong>GitHub</strong>
              <p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 13 }}>
                {githubConnection ? `Connected as ${githubConnection.login}` : 'Export generated apps and import repositories from chat.'}
              </p>
            </div>
          </div>
          <button onClick={githubConnection ? disconnectGithub : startGithubConnect} disabled={githubLoading} style={{ ...(githubConnection ? { background: colors.faint, color: colors.text, border: `1px solid ${colors.line}`, borderRadius: 12, fontWeight: 850 } : primaryButton), padding: '10px 14px', cursor: githubLoading ? 'default' : 'pointer', opacity: githubLoading ? 0.7 : 1 }}>
            {githubLoading ? 'Working...' : githubConnection ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    )

    if (activeView === 'profile') return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Profile</h1>
        <div style={{ ...card, padding: 24, maxWidth: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: colors.grad, color: d ? '#071016' : '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{userInitial}</div>
            <div>
              <div style={{ fontWeight: 850, fontSize: 18 }}>{userName}</div>
              <div style={{ color: colors.muted }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </div>
    )

    return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 850, letterSpacing: '-0.04em', margin: '0 0 8px' }}>Settings</h1>
        <div style={{ ...card, padding: 24, maxWidth: 620 }}>
          <button onClick={toggleDarkMode} style={{ background: colors.faint, color: colors.text, border: `1px solid ${colors.line}`, borderRadius: 12, padding: '10px 14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />} Switch to {darkMode ? 'light' : 'dark'} mode
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', display: 'grid', gridTemplateColumns: '280px 1fr' }}>
      {deleteTarget && <DeleteModal projectName={deleteTarget.name} onConfirm={executeDelete} onCancel={() => setDeleteTarget(null)} />}

      <aside style={{ background: colors.sidebar, borderRight: `1px solid ${colors.line}`, minHeight: '100vh', padding: 20, position: 'sticky', top: 0, alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: `${d ? 'linear-gradient(#111820,#111820)' : 'linear-gradient(#fff,#fff)'} padding-box, ${colors.grad} border-box`, border: '1px solid transparent', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900 }}>44</div>
          <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em' }}>Gen</span>
        </div>

        <div style={{ ...card, padding: 12, marginBottom: 18, boxShadow: 'none' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: colors.grad, color: d ? '#071016' : '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{userInitial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 850, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ color: colors.muted, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          </div>
        </div>

        <nav style={{ display: 'grid', gap: 6 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 12, padding: '10px 12px', background: active ? colors.faint : 'transparent', color: active ? colors.text : colors.muted, cursor: 'pointer', fontWeight: active ? 850 : 700, textAlign: 'left' }}>
                <Icon size={16} /> {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 22, display: 'grid', gap: 10 }}>
          <div style={{ ...card, padding: 14, boxShadow: 'none' }}>
            <div style={{ color: colors.muted, fontSize: 12 }}>Credits</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <strong style={{ fontSize: 22 }}>{profile?.credits ?? 0}</strong>
              <span style={{ color: colors.muted, fontSize: 12 }}>left</span>
            </div>
          </div>
          <button onClick={() => { signOut(); navigate('/') }} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${colors.line}`, background: 'transparent', color: colors.muted, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontWeight: 800 }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ padding: '32px clamp(24px, 4vw, 48px)' }}>
        {renderPanel()}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 860px) {
          body .dashboard-shell { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
