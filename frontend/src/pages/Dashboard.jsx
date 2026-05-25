import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Zap, Clock, Trash2, ExternalLink, LogOut, Sun, Moon, Globe, Sparkles } from 'lucide-react'

export default function Dashboard() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
    if (user) fetchProfile(user.id)
  }, [user])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const createProject = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: 'Untitled App', prompt: '', status: 'draft' })
      .select().single()
    if (!error && data) navigate(`/editor/${data.id}`)
    setCreating(false)
  }

  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await supabase.from('projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#f8f8f8'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#2a2a2a' : '#e5e5e5'
  const text = d ? '#ffffff' : '#111111'
  const muted = d ? '#666' : '#999'
  const subtle = d ? '#1a1a1a' : '#f5f5f5'

  const statusStyle = (status) => {
    if (status === 'deployed') return { bg: 'rgba(16,185,129,0.1)', color: '#10b981' }
    if (status === 'building') return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
    return { bg: d ? '#222' : '#f0f0f0', color: muted }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans','Inter',sans-serif" }}>

      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${border}`, background: surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>
            44<span style={{ color: '#7c3aed' }}>gen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: subtle, border: `1px solid ${border}`, borderRadius: 10, padding: '6px 12px', fontSize: 13 }}>
              <Zap size={12} color="#7c3aed" />
              <span style={{ fontWeight: 500 }}>{profile?.credits ?? 0}</span>
              <span style={{ color: muted }}>credits</span>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={handleSignOut}
              style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>Projects</h1>
            <p style={{ color: muted, fontSize: 13, marginTop: 4 }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={createProject}
            disabled={creating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#7c3aed', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1
            }}
          >
            <Plus size={15} />
            {creating ? 'Creating...' : 'New Project'}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: subtle, border: `1px solid ${border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Sparkles size={22} color="#7c3aed" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>No projects yet</h3>
            <p style={{ color: muted, fontSize: 13, marginBottom: 20 }}>Build your first AI-powered app</p>
            <button
              onClick={createProject}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Create your first app →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>

            {/* New Project Card */}
            <button
              onClick={createProject}
              disabled={creating}
              style={{
                border: `2px dashed ${border}`, background: 'transparent',
                borderRadius: 16, padding: 24, minHeight: 160,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 10, cursor: 'pointer',
                color: muted, transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed66'; e.currentTarget.style.color = '#7c3aed' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={18} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>New Project</span>
            </button>

            {/* Project Cards */}
            {projects.map(project => {
              const s = statusStyle(project.status)
              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/editor/${project.id}`)}
                  style={{
                    background: surface, border: `1px solid ${border}`,
                    borderRadius: 16, padding: 20, minHeight: 160,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed44' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: '-0.2px' }}>{project.name}</h3>
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 6, display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = muted}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p style={{ color: muted, fontSize: 12, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.prompt || 'No description yet'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 6 }}>
                      {project.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {project.subdomain && (
                        <a
                          href={'https://' + project.subdomain + '.44gen.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ color: muted, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                          onMouseLeave={e => e.currentTarget.style.color = muted}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: muted, fontSize: 11 }}>
                        <Clock size={11} />
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
