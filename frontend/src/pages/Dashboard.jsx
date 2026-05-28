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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.42)' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, width: 320, boxShadow: '0 24px 80px rgba(15,23,42,0.18)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>Delete project?</h3>
        <p style={{ fontSize: 12, color: '#667085', lineHeight: 1.5, margin: '0 0 18px' }}>
          <strong style={{ color: '#111827' }}>{projectName}</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 34, borderRadius: 9, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, height: 34, borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Delete</button>
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
  const [profileForm, setProfileForm] = useState({ fullName: '' })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
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
    danger: '#ef4444',
    grad: brandGradient,
  }

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Builder'
  const userInitial = (profile?.full_name?.[0] || user?.email?.[0] || '?').toUpperCase()
  const plan = String(profile?.plan || 'free').toLowerCase()
  const planCredits = plan === 'business' ? 260 : plan === 'pro' ? 100 : 10
  const creditsRemaining = Number(profile?.credits || 0)
  const creditsUsed = Math.max(0, planCredits - creditsRemaining)
  const usagePct = Math.min(100, Math.round((creditsUsed / planCredits) * 100))
  const deployed = projects.filter(project => project.status === 'deployed').length
  const building = projects.filter(project => project.status === 'building').length

  const navItems = useMemo(() => [
    { id: 'projects', label: 'Projects', icon: Home },
    { id: 'usage', label: 'Usage', icon: Activity },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'connectors', label: 'Connectors', icon: GitBranch },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ], [])

  useEffect(() => {
    if (user) {
      fetchProjects()
      fetchProfile(user.id)
    }
  }, [user])

  useEffect(() => {
    setProfileForm({ fullName: profile?.full_name || '' })
  }, [profile?.full_name])

  useEffect(() => {
    if (user && session?.access_token) loadGithubConnection()
  }, [user, session?.access_token])

  useEffect(() => {
    const handleGithubOAuthMessage = event => {
      if (event.data?.type !== '44gen_github_oauth') return
      setGithubLoading(false)
      if (event.data.ok) loadGithubConnection()
    }
    window.addEventListener('message', handleGithubOAuthMessage)
    return () => window.removeEventListener('message', handleGithubOAuthMessage)
  }, [session?.access_token])

  const card = {
    background: colors.surface,
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    boxShadow: d ? 'none' : '0 12px 34px rgba(16,24,40,0.045)'
  }

  const primaryButton = {
    minWidth: 156,
    height: 34,
    background: colors.grad,
    color: d ? '#071016' : '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: d ? '0 10px 24px rgba(115,216,255,0.14)' : '0 10px 24px rgba(14,165,233,0.14)'
  }

  const secondaryButton = {
    minWidth: 132,
    height: 34,
    background: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.line}`,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer'
  }

  const inputStyle = {
    width: '100%',
    height: 36,
    borderRadius: 9,
    border: `1px solid ${colors.line}`,
    background: d ? '#111820' : '#fff',
    color: colors.text,
    padding: '0 11px',
    fontSize: 12,
    outline: 'none'
  }

  const pageHeader = (title, copy, action) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 850, letterSpacing: '-0.035em', margin: 0 }}>{title}</h1>
        <p style={{ color: colors.muted, fontSize: 12, margin: '5px 0 0' }}>{copy}</p>
      </div>
      {action}
    </div>
  )

  const sectionTitle = (title, copy) => (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 850, margin: 0 }}>{title}</h2>
      {copy && <p style={{ color: colors.muted, fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>{copy}</p>}
    </div>
  )

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
    if (plan === 'free') {
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

  const saveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    setProfileNotice('')
    try {
      const fullName = profileForm.fullName.trim()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName || null })
        .eq('id', user.id)
      if (error) throw error
      await supabase.auth.updateUser({ data: { full_name: fullName } })
      await fetchProfile(user.id)
      setProfileNotice('Profile updated.')
    } catch (err) {
      setProfileNotice(err.message || 'Could not update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const updatePassword = async () => {
    setPasswordSaving(true)
    setPasswordNotice('')
    try {
      if (passwordForm.password.length < 8) throw new Error('Password must be at least 8 characters.')
      if (passwordForm.password !== passwordForm.confirm) throw new Error('Passwords do not match.')
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
      if (error) throw error
      setPasswordForm({ password: '', confirm: '' })
      setPasswordNotice('Password updated.')
    } catch (err) {
      setPasswordNotice(err.message || 'Could not update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('44gen-dark-mode', String(next))
  }

  const statusStyle = (status) => {
    if (status === 'deployed') return { bg: 'rgba(16,185,129,0.1)', color: colors.mint }
    if (status === 'building') return { bg: 'rgba(245,158,11,0.12)', color: colors.amber }
    return { bg: colors.faint, color: colors.muted }
  }

  const renderProjects = () => (
    <>
      {pageHeader(
        'Projects',
        `${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace`,
        <button onClick={createProject} disabled={creating}
          style={{ ...primaryButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: creating ? 0.7 : 1 }}>
          {creating ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Plus size={14} />} {creating ? 'Creating...' : 'New project'}
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {[
          ['Total projects', projects.length, FileCode, colors.accent],
          ['Deployed', deployed, CheckCircle2, colors.mint],
          ['Building', building, Zap, colors.amber],
          ['Credits left', creditsRemaining.toFixed(2), Activity, colors.accent],
        ].map(([label, value, Icon, color]) => (
          <div key={label} style={{ ...card, padding: 14, minHeight: 96 }}>
            <Icon size={15} color={color} />
            <div style={{ fontSize: 21, fontWeight: 850, marginTop: 12, letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ ...card, minHeight: 128, padding: 16, background: colors.faint }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ ...card, padding: 36, textAlign: 'center' }}>
          <Sparkles size={22} color={colors.accent} />
          <h3 style={{ fontSize: 15, margin: '12px 0 6px' }}>No projects yet</h3>
          <p style={{ color: colors.muted, fontSize: 12, margin: '0 auto 18px', maxWidth: 340 }}>Create your first app and 44Gen will open the editor with a live build flow.</p>
          <button onClick={createProject} style={primaryButton}>Create your first app</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
          {projects.map(project => {
            const s = statusStyle(project.status)
            return (
              <div key={project.id} onClick={() => navigate(`/editor/${project.id}`)}
                style={{ ...card, padding: 16, minHeight: 132, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 850, letterSpacing: '-0.02em', margin: 0 }}>{project.name}</h3>
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }) }}
                      style={{ color: colors.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.5, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.prompt || 'No description yet'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                  <span style={{ fontSize: 10, fontWeight: 850, background: s.bg, color: s.color, padding: '4px 8px', borderRadius: 999, textTransform: 'capitalize' }}>{project.status}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: colors.muted, fontSize: 11 }}>
                    {project.subdomain && (
                      <a href={`https://${project.subdomain}.44gen.com`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: colors.muted, display: 'flex' }}>
                        <ExternalLink size={12} />
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

  const renderUsage = () => (
    <div>
      {pageHeader(
        'Usage',
        'Monitor credits, builds, and paid feature availability.',
        <button onClick={() => navigate('/pricing')} style={primaryButton}>{plan === 'free' ? 'Upgrade plan' : 'Add credits'}</button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: 12 }}>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Credits', `${creditsUsed.toFixed(2)} used from your ${plan} allowance.`)}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
            <strong>{creditsRemaining.toFixed(2)} remaining</strong>
            <span style={{ color: colors.muted }}>{planCredits} monthly credits</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: colors.faint, overflow: 'hidden' }}>
            <div style={{ width: `${usagePct}%`, height: '100%', background: colors.grad }} />
          </div>
        </div>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Paid tools')}
          <div style={{ display: 'grid', gap: 10, fontSize: 12, color: colors.muted }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Runtime QA</span><strong style={{ color: plan === 'free' ? colors.amber : colors.mint }}>{plan === 'free' ? 'Upgrade' : 'Enabled'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GitHub export</span><strong style={{ color: colors.mint }}>Available</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Build history</span><strong style={{ color: colors.mint }}>Available</strong></div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBilling = () => (
    <div>
      {pageHeader(
        'Billing',
        'Manage your Polar subscription and plan limits.',
        <button onClick={openBilling} disabled={billingLoading} style={{ ...primaryButton, opacity: billingLoading ? 0.7 : 1 }}>
          {billingLoading ? 'Opening...' : plan === 'free' ? 'View plans' : 'Manage billing'}
        </button>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: 12 }}>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Current plan', 'Your plan controls credits, runtime QA, and export features.')}
          <div style={{ fontSize: 24, fontWeight: 850, textTransform: 'capitalize', letterSpacing: '-0.04em' }}>{plan}</div>
          <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.55, margin: '8px 0 0' }}>{creditsRemaining.toFixed(2)} credits available right now.</p>
        </div>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Subscription')}
          <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.muted }}>Status</span><strong>{profile?.polar_subscription_status || (plan === 'free' ? 'Free' : 'Active')}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: colors.muted }}>Provider</span><strong>Polar</strong></div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConnectors = () => (
    <div>
      {pageHeader('Connectors', 'Connect services 44Gen can use in the editor and chat.')}
      <div style={{ ...card, padding: 18, maxWidth: 720, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.faint, display: 'grid', placeItems: 'center' }}><GitBranch size={17} /></div>
          <div>
            <strong style={{ fontSize: 13 }}>GitHub</strong>
            <p style={{ margin: '3px 0 0', color: colors.muted, fontSize: 12 }}>
              {githubConnection ? `Connected as ${githubConnection.login}` : 'Export apps, read repos in chat, and push updates to selected repositories.'}
            </p>
          </div>
        </div>
        <button onClick={githubConnection ? disconnectGithub : startGithubConnect} disabled={githubLoading}
          style={{ ...(githubConnection ? secondaryButton : primaryButton), minWidth: 124, opacity: githubLoading ? 0.7 : 1 }}>
          {githubLoading ? 'Working...' : githubConnection ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>
  )

  const renderProfile = () => (
    <div>
      {pageHeader('Profile', 'Update account details and sign-in security.')}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 0.9fr)', gap: 12 }}>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Personal details', 'This is shown inside your workspace and editor.')}
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 800, color: colors.muted }}>
              Name
              <input value={profileForm.fullName} onChange={e => setProfileForm({ fullName: e.target.value })} style={inputStyle} placeholder="Your name" />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 800, color: colors.muted }}>
              Email
              <input value={user?.email || ''} readOnly style={{ ...inputStyle, color: colors.muted, background: colors.faint }} />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveProfile} disabled={profileSaving} style={{ ...primaryButton, opacity: profileSaving ? 0.7 : 1 }}>
                {profileSaving ? 'Saving...' : 'Save profile'}
              </button>
              {profileNotice && <span style={{ fontSize: 12, color: profileNotice.includes('updated') ? colors.mint : colors.danger }}>{profileNotice}</span>}
            </div>
          </div>
        </div>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Password', 'Use at least 8 characters.')}
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 800, color: colors.muted }}>
              New password
              <input type="password" value={passwordForm.password} onChange={e => setPasswordForm(prev => ({ ...prev, password: e.target.value }))} style={inputStyle} placeholder="••••••••" />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 800, color: colors.muted }}>
              Confirm password
              <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))} style={inputStyle} placeholder="••••••••" />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={updatePassword} disabled={passwordSaving} style={{ ...secondaryButton, opacity: passwordSaving ? 0.7 : 1 }}>
                {passwordSaving ? 'Updating...' : 'Update password'}
              </button>
              {passwordNotice && <span style={{ fontSize: 12, color: passwordNotice.includes('updated') ? colors.mint : colors.danger }}>{passwordNotice}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div>
      {pageHeader('Settings', 'Workspace preferences and session controls.')}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.8fr)', gap: 12 }}>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Appearance', 'Dashboard and editor are light by default.')}
          <button onClick={toggleDarkMode} style={{ ...secondaryButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {darkMode ? <Sun size={14} /> : <Moon size={14} />} Switch to {darkMode ? 'light' : 'dark'}
          </button>
        </div>
        <div style={{ ...card, padding: 18 }}>
          {sectionTitle('Session')}
          <button onClick={() => { signOut(); navigate('/') }} style={{ ...secondaryButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )

  const renderPanel = () => {
    if (activeView === 'projects') return renderProjects()
    if (activeView === 'usage') return renderUsage()
    if (activeView === 'billing') return renderBilling()
    if (activeView === 'connectors') return renderConnectors()
    if (activeView === 'profile') return renderProfile()
    return renderSettings()
  }

  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', display: 'grid', gridTemplateColumns: '248px 1fr' }}>
      {deleteTarget && <DeleteModal projectName={deleteTarget.name} onConfirm={executeDelete} onCancel={() => setDeleteTarget(null)} />}

      <aside style={{ background: colors.sidebar, borderRight: `1px solid ${colors.line}`, minHeight: '100vh', padding: 16, position: 'sticky', top: 0, alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${d ? 'linear-gradient(#111820,#111820)' : 'linear-gradient(#fff,#fff)'} padding-box, ${colors.grad} border-box`, border: '1px solid transparent', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>44</div>
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.04em' }}>Gen</span>
        </div>

        <button onClick={() => setActiveView('profile')} style={{ ...card, width: '100%', padding: 10, marginBottom: 14, boxShadow: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: colors.grad, color: d ? '#071016' : '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13 }}>{userInitial}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: colors.text, fontWeight: 850, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ color: colors.muted, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>
        </button>

        <nav style={{ display: 'grid', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, border: 'none', borderRadius: 9, padding: '8px 10px', minHeight: 34, background: active ? colors.faint : 'transparent', color: active ? colors.text : colors.muted, cursor: 'pointer', fontSize: 13, fontWeight: active ? 850 : 700, textAlign: 'left' }}>
                <Icon size={15} /> {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
          <div style={{ ...card, padding: 12, boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: colors.muted, fontSize: 11, fontWeight: 800 }}>Credits</span>
              <span style={{ color: colors.muted, fontSize: 11, textTransform: 'capitalize' }}>{plan}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <strong style={{ fontSize: 20, letterSpacing: '-0.04em' }}>{creditsRemaining.toFixed(2)}</strong>
              <span style={{ color: colors.muted, fontSize: 11 }}>left</span>
            </div>
            <button onClick={() => navigate('/pricing')} style={{ ...secondaryButton, minWidth: '100%', marginTop: 10, height: 32 }}>
              {plan === 'free' ? 'Upgrade' : 'Manage plan'}
            </button>
          </div>
          <button onClick={() => { signOut(); navigate('/') }} style={{ ...secondaryButton, minWidth: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ padding: '30px clamp(24px, 4vw, 44px)', maxWidth: 1260, width: '100%' }}>
        {renderPanel()}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 980px) {
          body .dashboard-shell { grid-template-columns: 1fr; }
          body .dashboard-shell aside { position: relative; min-height: auto; }
        }
        @media (max-width: 760px) {
          body .dashboard-shell main > div > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
