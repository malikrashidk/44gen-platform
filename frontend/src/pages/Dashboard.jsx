import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Zap, Clock, Trash2, ExternalLink, LogOut, Sun, Moon, Sparkles, ChevronRight } from 'lucide-react'

export default function Dashboard() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const navigate = useNavigate()

  const d = darkMode
  const bg = d ? '#0f0f0f' : '#f7f7f7'
  const surface = d ? '#161616' : '#ffffff'
  const border = d ? '#222' : '#e8e8e8'
  const text = d ? '#f0f0f0' : '#111'
  const muted = d ? '#666' : '#999'
  const subtle = d ? '#1a1a1a' : '#f0f0f0'

  useEffect(() => { fetchProjects(); if (user) fetchProfile(user.id) }, [user])

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const createProject = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('projects').insert({ user_id: user.id, name: 'Untitled App', prompt: '', status: 'draft' }).select().single()
    if (!error && data) navigate(`/editor/${data.id}`)
    setCreating(false)
  }

  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await supabase.from('projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  const statusBadge = (status) => {
    if (status === 'deployed') return { bg: 'rgba(16,185,129,0.1)', color: '#10b981' }
    if (status === 'building') return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' }
    return { bg: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: muted }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: text, fontFamily: "'DM Sans','Inter',sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${border}`, background: surface, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
            44<span style={{ color: '#7c3aed' }}>gen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: subtle, border: `1px solid ${border}`, borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
              <Zap size={11} color="#7c3aed" />
              <span style={{ fontWeight: 600 }}>{profile?.credits ?? 0}</span>
              <span style={{ color: muted }}>credits</span>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={() => { signOut(); navigate('/') }} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: muted }}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>Projects</h1>
            <p style={{ color: muted, fontSize: 13 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={createProject} disabled={creating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1 }}>
            <Plus size={15} /> {creating ? 'Creating...' : 'New Project'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 22, height: 22, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: 'rgba(124,58,237,0.08)', border: `1px solid rgba(124,58,237,0.15)`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Sparkles size={24} color="#7c3aed" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No projects yet</h3>
            <p style={{ color: muted, fontSize: 13, marginBottom: 20, maxWidth: 280, lineHeight: 1.5 }}>Build your first AI-powered app in seconds</p>
            <button onClick={createProject}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Create your first app <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {/* New project card */}
            <button onClick={createProject} disabled={creating}
              style={{ border: `2px dashed ${border}`, background: 'transparent', borderRadius: 14, padding: 20, minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: muted, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed66'; e.currentTarget.style.color = '#7c3aed' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>New Project</span>
            </button>

            {projects.map(project => {
              const s = statusBadge(project.status)
              return (
                <div key={project.id} onClick={() => navigate(`/editor/${project.id}`)}
                  style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 18, minHeight: 150, cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed44'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = border}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', lineHeight: 1.3 }}>{project.name}</h3>
                      <button onClick={e => deleteProject(project.id, e)}
                        style={{ color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 5, display: 'flex', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = muted}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p style={{ color: muted, fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.prompt || 'No description yet'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, background: s.bg, color: s.color, padding: '2px 7px', borderRadius: 5 }}>
                      {project.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {project.subdomain && (
                        <a href={'https://' + project.subdomain + '.44gen.com'} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()} style={{ color: muted, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'}
                          onMouseLeave={e => e.currentTarget.style.color = muted}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: muted, fontSize: 11 }}>
                        <Clock size={10} /> {new Date(project.created_at).toLocaleDateString()}
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
