import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { processJob, subscribeToJob, getJobHistory } from '../services/worker.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function createBuildJob({ projectId, userId, plan }) {
  const { data: profile } = await supabase
    .from('profiles').select('credits').eq('id', userId).single()
  if (!profile || profile.credits < 0.5) {
    const err = new Error('Insufficient credits')
    err.status = 402
    throw err
  }

  const { data: job, error } = await supabase
    .from('build_jobs')
    .insert({ project_id: projectId, user_id: userId, plan, status: 'queued', progress: [] })
    .select().single()
  if (error) throw error

  setTimeout(() => {
    processJob(job.id).catch(err => console.error('[Build] Job error:', err.message))
  }, 1500)

  return job
}

// POST /api/build — create job
router.post('/', requireAuth, async (req, res) => {
  const { plan, projectId } = req.body
  const userId = req.user.id

  if (!plan || !projectId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const job = await createBuildJob({ projectId, userId, plan })
    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build] Error:', err.message)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// POST /api/build/direct — create a hidden plan and build immediately
router.post('/direct', requireAuth, async (req, res) => {
  const { prompt, projectId } = req.body
  const userId = req.user.id

  if (!prompt || !projectId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id,name,prompt,status,user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const { data: appFile } = await supabase
      .from('project_files')
      .select('content')
      .eq('project_id', projectId)
      .eq('file_path', 'src/App.jsx')
      .maybeSingle()

    const currentCode = appFile?.content
      ? `\n\nCurrent src/App.jsx:\n\`\`\`jsx\n${appFile.content.slice(0, 45000)}\n\`\`\``
      : ''

    const plan = {
      understanding: `Update the existing app "${project.name || 'Untitled App'}" based on this user request: ${prompt}.${currentCode}\n\nReturn a complete updated src/App.jsx. Preserve existing functionality unless the user asked to change it.`,
      is_complex: false,
      app_name: project.name || 'Updated App',
      current_phase: 1,
      total_phases: 1,
      steps: [
        'Understand the requested change',
        'Update the existing React app while preserving unrelated behavior',
        'Return the complete updated src/App.jsx'
      ],
      files: ['src/App.jsx'],
      questions: [],
      out_of_scope: [],
      estimated_credits: 2.5,
      phases: null,
      hidden: true
    }

    const job = await createBuildJob({ projectId, userId, plan })
    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build Direct] Error:', err.message)
    if (err.status) return res.status(err.status).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// GET /api/build/stream/:jobId — SSE stream (auth via ?token= query param)
router.get('/stream/:jobId', requireAuth, async (req, res) => {
  const { jobId } = req.params
  const userId = req.user.id

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  let eventId = 0
  const lastId = parseInt(req.headers['last-event-id'] || '0', 10)

  const send = (event) => {
    try {
      eventId++
      res.write(`id: ${eventId}\ndata: ${JSON.stringify(event)}\n\n`)
    } catch {}
  }

  const keepalive = setInterval(() => {
    try { res.write(': keepalive\n\n') } catch {}
  }, 10000)

  try {
    const { data: job } = await supabase
      .from('build_jobs').select('*').eq('id', jobId).single()

    if (!job) {
      send({ type: 'error', message: 'Job not found' })
      clearInterval(keepalive)
      res.end()
      return
    }

    if (job.user_id !== userId) {
      send({ type: 'error', message: 'Forbidden' })
      clearInterval(keepalive)
      res.end()
      return
    }

    const history = getJobHistory(jobId)
    const source = history.length > 0 ? history : (job.progress || [])
    source.slice(lastId).forEach(e => send(e))

    if (job.status === 'done' || job.status === 'failed') {
      clearInterval(keepalive)
      setTimeout(() => res.end(), 300)
      return
    }

    const unsubscribe = subscribeToJob(jobId, (event) => {
      send(event)
      if (event.type === 'done' || event.type === 'error') {
        clearInterval(keepalive)
        setTimeout(() => res.end(), 500)
      }
    })

    req.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
    })
  } catch (err) {
    send({ type: 'error', message: err.message })
    clearInterval(keepalive)
    res.end()
  }
})

// GET /api/build/status/:jobId
router.get('/status/:jobId', requireAuth, async (req, res) => {
  const { data: job } = await supabase
    .from('build_jobs')
    .select('id,status,subdomain,credits_used,error,created_at,user_id')
    .eq('id', req.params.jobId).single()
  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
  res.json(job)
})

export default router
