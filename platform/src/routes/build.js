import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { processJob, subscribeToJob, getJobHistory } from '../services/worker.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

// POST /api/build — create job
router.post('/', requireAuth, async (req, res) => {
  const { plan, projectId } = req.body
  const userId = req.user.id

  if (!plan || !projectId)
    return res.status(400).json({ error: 'Missing required fields' })

  try {
    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', userId).single()
    if (!profile || profile.credits < 0.5)
      return res.status(402).json({ error: 'Insufficient credits' })

    const { data: job, error } = await supabase
      .from('build_jobs')
      .insert({ project_id: projectId, user_id: userId, plan, status: 'queued', progress: [] })
      .select().single()
    if (error) throw error

    // Delay start so SSE client can connect first
    setTimeout(() => {
      processJob(job.id).catch(err => console.error('[Build] Job error:', err.message))
    }, 1500)

    res.json({ job_id: job.id })
  } catch (err) {
    console.error('[Build] Error:', err.message)
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
