import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Zap, Globe, Clock, Trash2, ExternalLink, LogOut } from 'lucide-react'

export default function Dashboard() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
    if (user) fetchProfile(user.id)
  }, [user])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  const createProject = async () => {
    setCreating(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: 'Untitled App',
        prompt: '',
        status: 'draft'
      })
      .select()
      .single()

    if (!error && data) {
      navigate(`/editor/${data.id}`)
    }
    setCreating(false)
  }

  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await supabase.from('projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'deployed': return 'text-green-400 bg-green-400/10'
      case 'building': return 'text-yellow-400 bg-yellow-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-xl font-bold">
            44<span className="text-purple-500">gen</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Credits */}
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
              <Zap size={14} className="text-purple-400" />
              <span className="text-sm text-white font-medium">
                {profile?.credits ?? 0} credits
              </span>
            </div>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-medium">
              {profile?.full_name?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Projects</h1>
            <p className="text-gray-400 text-sm mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={createProject}
            disabled={creating}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={18} />
            {creating ? 'Creating...' : 'New Project'}
          </button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Plus size={24} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Create your first app with AI
            </p>
            <button
              onClick={createProject}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-xl transition"
            >
              Create your first app →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* New Project Card */}
            <button
              onClick={createProject}
              disabled={creating}
              className="border-2 border-dashed border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-purple-400 transition group min-h-[180px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-900 group-hover:bg-purple-500/10 flex items-center justify-center transition">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">New Project</span>
            </button>

            {/* Project Cards */}
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/editor/${project.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer transition group min-h-[180px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white group-hover:text-purple-300 transition">
                      {project.name}
                    </h3>
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {project.prompt || 'No description yet'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <div className="flex items-center gap-3">
                    {project.subdomain && (
                      <a
                        href={"https://" + project.subdomain + ".44gen.com"}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-500 hover:text-purple-400 transition"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                      <Clock size={12} />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
